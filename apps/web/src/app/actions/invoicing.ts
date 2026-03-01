"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { getDb } from "@resonansia/db";
import {
  generateInvoiceProposal,
  createProposal,
  approveInvoice,
  getLabelId,
  getActiveEventsForProject,
  calculateRotRut,
  type RotRutLineInput,
  type RotRutType,
} from "@resonansia/core";
import { submitRotRutClaim } from "@resonansia/core/src/invoicing/skatteverket";
import { getTenantId, getSession } from "@/lib/supabase-server";
import { FortnoxAdapter, SkatteverketAdapter } from "@resonansia/integrations";

const TWINS_URL = process.env.TWINS_URL || "http://localhost:9999";

/**
 * Generates an invoice proposal from quote lines and actuals.
 */
export async function generateInvoiceAction(projectId: string) {
  const tenantId = await getTenantId();
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  const db = getDb();
  const proposal = await generateInvoiceProposal(db, tenantId, projectId, user.id);

  await createProposal(db, proposal);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/invoices`);

  return proposal;
}

/**
 * Approves an invoice proposal, creating events and syncing to Fortnox.
 */
export async function approveInvoiceAction(proposalId: string, projectId: string) {
  const tenantId = await getTenantId();
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  const db = getDb();
  const fortnoxAdapter = new FortnoxAdapter({
    baseUrl: `${TWINS_URL}/fortnox`,
    accessToken: process.env.FORTNOX_ACCESS_TOKEN || "test",
  });

  const result = await approveInvoice(db, tenantId, proposalId, user.id, fortnoxAdapter);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/invoices`);

  return {
    eventCount: result.events.length,
    fortnoxInvoiceId: result.fortnoxInvoiceId,
  };
}

/**
 * Submits ROT/RUT claim to Skatteverket after invoice approval.
 */
export async function submitRotRutAction(projectId: string) {
  const tenantId = await getTenantId();
  const db = getDb();

  // Get customer personnummer
  const customerResult = await db.execute(sql`
    SELECT n.data FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : (customerResult as any).rows) as any[];
  const customer = customerRows[0]?.data;
  if (!customer?.rot_rut_person_number) {
    throw new Error("Customer has no personnummer for ROT/RUT");
  }

  // Get project for ROT/RUT type
  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : (projectResult as any).rows) as any[];
  const project = projectRows[0]?.data;

  const rotRutType: RotRutType = project?.rot_applicable ? "rot" : project?.rut_applicable ? "rut" : "none";

  // Get invoice line events
  const invoiceLineTypeId = await getLabelId(db, "event_type", "invoice_line", tenantId);
  const invoiceEvents = await getActiveEventsForProject(db, tenantId, projectId, [invoiceLineTypeId]);

  if (invoiceEvents.length === 0) {
    throw new Error("No invoice lines found for this project");
  }

  // Calculate deduction
  const rotRutLines: RotRutLineInput[] = invoiceEvents.map((ev: any) => ({
    total: parseFloat(ev.total) || 0,
    isLabor: ev.data?.is_labor || false,
    rotRutType,
  }));

  const rotRut = calculateRotRut(rotRutLines, 0, customer.rot_rut_person_number);

  if (rotRut.deductionAmount <= 0) {
    throw new Error("No deduction to claim (no labor costs)");
  }

  // Submit to Skatteverket
  const skatteverketAdapter = new SkatteverketAdapter({
    baseUrl: `${TWINS_URL}/skatteverket`,
  });

  const result = await submitRotRutClaim(db, {
    tenantId,
    projectId,
    invoiceEventIds: invoiceEvents.map((ev: any) => ev.id),
    customerPersonNumber: customer.rot_rut_person_number,
    deductionAmount: rotRut.deductionAmount,
    deductionType: rotRutType,
  }, skatteverketAdapter);

  revalidatePath(`/projects/${projectId}`);

  return result;
}
