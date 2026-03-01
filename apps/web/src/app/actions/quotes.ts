"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@resonansia/db";
import {
  generateQuoteProposal,
  createProposal,
  approveQuoteProposal,
  generateQuoteToken,
} from "@resonansia/core";
import { deliverQuote } from "@resonansia/core/src/quotes/deliver";
import { generateQuotePdf } from "@resonansia/pdf";
import { getTenantId, getSession } from "@/lib/supabase-server";
import { sql } from "drizzle-orm";
import { SmsAdapter, WhatsAppAdapter, ResendEmailAdapter, SupabaseStorageAdapter } from "@resonansia/integrations";

const TWINS_URL = process.env.TWINS_URL || "http://localhost:9999";

/**
 * Generates a new AI quote proposal for a project.
 */
export async function generateQuoteAction(projectId: string) {
  const tenantId = await getTenantId();
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  const db = getDb();

  // Get project details for ROT/RUT
  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : projectResult.rows) as any[];
  const project = projectRows[0]?.data;

  // Get customer for personnummer
  const customerResult = await db.execute(sql`
    SELECT n.data FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
  const customer = customerRows[0]?.data;

  const rotRutType = project?.rot_applicable
    ? ("rot" as const)
    : project?.rut_applicable
      ? ("rut" as const)
      : ("none" as const);

  const proposal = await generateQuoteProposal(db, {
    tenantId,
    projectId,
    description: project?.description || project?.name || "",
    rotRutType,
    personNumber: customer?.rot_rut_person_number,
    previouslyClaimedThisYear: 0,
    createdBy: user.id,
  });

  // Store proposal
  await createProposal(db, proposal);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quotes`);

  return proposal;
}

/**
 * Approves a quote proposal, creating events.
 */
export async function approveQuoteAction(proposalId: string, projectId: string) {
  const tenantId = await getTenantId();
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  const db = getDb();
  const events = await approveQuoteProposal(db, tenantId, proposalId, user.id);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quotes`);

  return events;
}

/**
 * Sends a quote to the customer via the chosen channel.
 */
export async function sendQuoteAction(
  projectId: string,
  channel: "sms" | "email" | "whatsapp",
  recipientPhone?: string,
  recipientEmail?: string
) {
  const tenantId = await getTenantId();
  const db = getDb();

  // Generate quote view token
  const token = generateQuoteToken(projectId, tenantId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const quoteViewUrl = `${baseUrl}/quote/${token}`;

  // Load tenant, customer, project for PDF
  const tenantResult = await db.execute(sql`
    SELECT n.data FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'org'
    WHERE n.tenant_id = ${tenantId} LIMIT 1
  `);
  const tenantRows = (Array.isArray(tenantResult) ? tenantResult : tenantResult.rows) as any[];
  const tenantData = tenantRows[0]?.data || { name: "Företag" };

  const customerResult = await db.execute(sql`
    SELECT n.data FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
  const customerData = customerRows[0]?.data || { name: "Kund" };

  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : projectResult.rows) as any[];
  const projectData = projectRows[0]?.data || { name: "Projekt" };

  // Load active quote lines for PDF
  const linesResult = await db.execute(sql`
    WITH ranked AS (
      SELECT COALESCE(e.ref_id, e.id) AS root_id, e.id, e.qty, e.unit_id, e.unit_price, e.data,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(e.ref_id, e.id) ORDER BY e.id DESC) AS rn
      FROM events e
      JOIN labels l ON l.id = e.type_id AND l.domain = 'event_type' AND l.code = 'quote_line'
      WHERE e.tenant_id = ${tenantId} AND e.node_id = ${projectId}
    )
    SELECT * FROM ranked WHERE rn = 1
  `);
  const lineRows = (Array.isArray(linesResult) ? linesResult : linesResult.rows) as any[];

  const lines = lineRows.map((row: any) => ({
    tempId: row.id,
    description: row.data?.description || "",
    qty: parseFloat(row.qty) || 0,
    unitId: row.unit_id || 5,
    unitPrice: parseFloat(row.unit_price) || 0,
    total: (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0),
    isLabor: row.data?.is_labor || false,
    vatRate: row.data?.vat_rate || 0.25,
    sortOrder: row.data?.sort_order || 0,
  }));

  // Generate PDF
  const pdfBuffer = await generateQuotePdf({
    tenant: {
      name: tenantData.name,
      orgNumber: tenantData.org_number,
      address: tenantData.address ? { street: tenantData.address.street, postalCode: tenantData.address.postal_code, city: tenantData.address.city } : null,
      contact: tenantData.contact,
      logoUrl: tenantData.logo_url,
      bankgiro: tenantData.bankgiro,
      plusgiro: tenantData.plusgiro,
      paymentTermsDays: tenantData.payment_terms_days,
    },
    customer: {
      name: customerData.name,
      address: customerData.address ? { street: customerData.address.street, postalCode: customerData.address.postal_code, city: customerData.address.city } : null,
    },
    project: {
      name: projectData.name,
      address: projectData.address ? { street: projectData.address.street, postalCode: projectData.address.postal_code, city: projectData.address.city } : null,
      description: projectData.description,
    },
    lines,
    rotRut: null,
    quoteNumber: projectId.substring(0, 8).toUpperCase(),
    quoteDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // Setup adapters (use twins in dev)
  const adapters = {
    sms: new SmsAdapter({
      baseUrl: `${TWINS_URL}/sms`,
      apiUser: process.env.SMS_API_USER || "test",
      apiPassword: process.env.SMS_API_PASSWORD || "test",
    }),
    whatsapp: new WhatsAppAdapter({
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "test",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "test",
      baseUrl: `${TWINS_URL}/whatsapp`,
    }),
    email: new ResendEmailAdapter({
      apiKey: process.env.RESEND_API_KEY || "test",
      baseUrl: `${TWINS_URL}/email`,
    }),
    storage: new SupabaseStorageAdapter({
      baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || `${TWINS_URL}/storage`,
      accessToken: process.env.SUPABASE_SERVICE_ROLE_KEY || "test",
    }),
  };

  const result = await deliverQuote(db, {
    tenantId,
    projectId,
    channel,
    recipientPhone,
    recipientEmail,
    pdfBuffer,
    quoteViewUrl,
    tenantName: tenantData.name,
  }, adapters);

  revalidatePath(`/projects/${projectId}`);
  return result;
}
