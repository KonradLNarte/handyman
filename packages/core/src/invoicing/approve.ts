import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { approveInvoiceProposal } from "../proposals/approve";
import { getProposal } from "../proposals/store";
import { generateInvoicePdf } from "@resonansia/pdf";
import { createEvent } from "../events/create";
import type { AccountingAdapter } from "@resonansia/integrations";

interface InvoiceApprovalResult {
  events: any[];
  fortnoxInvoiceId?: string;
  pdfBuffer: Buffer;
}

/**
 * Approves an invoice proposal:
 * 1. Creates invoice_line events
 * 2. Generates invoice PDF
 * 3. Syncs to Fortnox
 * 4. Logs the Fortnox sync event
 *
 * INVARIANT fortnox_sync_logged:
 * Every Fortnox sync is logged as an event (origin=external_api).
 * If sync fails, invoice is still created locally.
 */
export async function approveInvoice(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string,
  approvedBy: string,
  fortnoxAdapter?: AccountingAdapter
): Promise<InvoiceApprovalResult> {
  // 1. Create invoice_line events
  const events = await approveInvoiceProposal(db, tenantId, proposalId, approvedBy);

  // Reload proposal for PDF data
  const proposal = await getProposal(db, tenantId, proposalId);
  if (!proposal) throw new Error("Proposal not found after approval");

  // 2. Load tenant/customer/project info for PDF
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
    WHERE e.to_id = ${proposal.projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
  const customerData = customerRows[0]?.data || { name: "Kund" };

  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${proposal.projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : projectResult.rows) as any[];
  const projectData = projectRows[0]?.data || { name: "Projekt" };

  // 3. Generate invoice PDF
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (tenantData.payment_terms_days || 30));

  const pdfBuffer = await generateInvoicePdf({
    tenant: {
      name: tenantData.name,
      orgNumber: tenantData.org_number,
      address: tenantData.address ? {
        street: tenantData.address.street,
        postalCode: tenantData.address.postal_code,
        city: tenantData.address.city,
      } : null,
      contact: tenantData.contact,
      logoUrl: tenantData.logo_url,
      bankgiro: tenantData.bankgiro,
      plusgiro: tenantData.plusgiro,
      paymentTermsDays: tenantData.payment_terms_days,
    },
    customer: {
      name: customerData.name,
      address: customerData.address ? {
        street: customerData.address.street,
        postalCode: customerData.address.postal_code,
        city: customerData.address.city,
      } : null,
      personNumber: customerData.rot_rut_person_number,
    },
    project: {
      name: projectData.name,
      address: projectData.address ? {
        street: projectData.address.street,
        postalCode: projectData.address.postal_code,
        city: projectData.address.city,
      } : null,
      description: projectData.description,
    },
    lines: proposal.lines,
    rotRut: proposal.rotRut ?? null,
    invoiceNumber: proposalId.substring(0, 8).toUpperCase(),
    invoiceDate: new Date(),
    dueDate,
    ocrReference: proposalId.replace(/-/g, "").substring(0, 12),
  });

  // 4. Sync to Fortnox if adapter available
  let fortnoxInvoiceId: string | undefined;
  if (fortnoxAdapter) {
    try {
      const fortnoxResult = await fortnoxAdapter.createInvoice({
        customerNumber: customerData.org_number || "1001",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        rows: proposal.lines.map((line) => ({
          description: line.description,
          quantity: line.qty,
          price: line.unitPrice,
          vatPercent: line.vatRate * 100,
        })),
        ourReference: tenantData.name,
      });

      fortnoxInvoiceId = fortnoxResult.id;

      // Log Fortnox sync event
      await createEvent(db, tenantId, {
        nodeId: proposal.projectId,
        typeCode: "note",
        data: {
          text: `Faktura synkad till Fortnox (ID: ${fortnoxResult.id}, Nr: ${fortnoxResult.number})`,
        },
        origin: "external_api",
        occurredAt: new Date(),
      });
    } catch (err) {
      // Fortnox sync failed — log but don't block
      console.error("Fortnox sync failed:", err);
      await createEvent(db, tenantId, {
        nodeId: proposal.projectId,
        typeCode: "note",
        data: {
          text: `Fortnox-synk misslyckades: ${err instanceof Error ? err.message : "Okänt fel"}. Försök igen manuellt.`,
        },
        origin: "system",
        occurredAt: new Date(),
      });
    }
  }

  return { events, fortnoxInvoiceId, pdfBuffer };
}
