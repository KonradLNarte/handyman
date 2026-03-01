import type { PgDatabase } from "drizzle-orm/pg-core";
import { createEvent } from "../events/create";
import { getProposal, markProposalApproved } from "./store";
import { computeTotal } from "@resonansia/db";

/**
 * Approves a quote proposal, creating quote_line events for each line.
 *
 * INVARIANT proposals_not_events:
 * - While status = 'draft', ZERO events exist for this proposal.
 * - Only on approval do events get created.
 */
export async function approveQuoteProposal(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string,
  approvedBy: string
) {
  const proposal = await getProposal(db, tenantId, proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
  if (proposal.status !== "draft")
    throw new Error(`Proposal is not a draft: ${proposal.status}`);
  if (proposal.type !== "quote")
    throw new Error(`Proposal is not a quote: ${proposal.type}`);

  const createdEvents = [];

  for (const line of proposal.lines) {
    const event = await createEvent(db, tenantId, {
      nodeId: proposal.projectId,
      typeCode: "quote_line",
      data: {
        description: line.description,
        is_labor: line.isLabor,
        vat_rate: line.vatRate,
        sort_order: line.sortOrder,
      },
      qty: line.qty,
      unitCode: getUnitCodeFromId(line.unitId),
      unitPrice: line.unitPrice,
      origin: "ai_generated",
      occurredAt: new Date(),
      actorId: approvedBy,
    });
    createdEvents.push(event);
  }

  await markProposalApproved(db, tenantId, proposalId);
  return createdEvents;
}

/**
 * Approves an invoice proposal, creating invoice_line events for each line.
 * Each line has quote_line_ref pointing to the corresponding quote_line event.
 */
export async function approveInvoiceProposal(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string,
  approvedBy: string
) {
  const proposal = await getProposal(db, tenantId, proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
  if (proposal.status !== "draft")
    throw new Error(`Proposal is not a draft: ${proposal.status}`);
  if (proposal.type !== "invoice")
    throw new Error(`Proposal is not an invoice: ${proposal.type}`);

  const createdEvents = [];

  for (const line of proposal.lines) {
    const event = await createEvent(db, tenantId, {
      nodeId: proposal.projectId,
      typeCode: "invoice_line",
      data: {
        description: line.description,
        is_labor: line.isLabor,
        vat_rate: line.vatRate,
        sort_order: line.sortOrder,
        quote_line_ref: line.quoteLineRef ?? null,
      },
      qty: line.qty,
      unitCode: getUnitCodeFromId(line.unitId),
      unitPrice: line.unitPrice,
      origin: "ai_generated",
      occurredAt: new Date(),
      actorId: approvedBy,
    });
    createdEvents.push(event);
  }

  await markProposalApproved(db, tenantId, proposalId);
  return createdEvents;
}

/**
 * Maps common unit label IDs to unit codes.
 * In production, this should lookup from the labels table,
 * but for now we use a static mapping for the platform defaults.
 */
function getUnitCodeFromId(unitId: number): string {
  // Platform default unit label IDs are assigned during seeding.
  // We fall back to 'piece' if unknown.
  const unitMap: Record<number, string> = {
    1: "hour",
    2: "minute",
    3: "sqm",
    4: "lm",
    5: "piece",
    6: "kg",
    7: "liter",
  };
  return unitMap[unitId] || "piece";
}
