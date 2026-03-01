import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@resonansia/shared";
import type { TransientProposal, ProposalLine } from "@resonansia/shared";
import { computeTotal } from "@resonansia/db";
import { getLabelId } from "../labels";
import { getActiveEventsForProject } from "../events/resolve";
import { calculateRotRut } from "../economics/rot-rut";
import type { RotRutLineInput, RotRutType } from "../economics/rot-rut";
import { getAccumulatedRotRut } from "../economics/rot-rut-tracking";
import { detectDeviations } from "./deviations";

/**
 * Generates an invoice proposal from quote lines and actual events.
 *
 * Compares actual time/material events against quoted values
 * and flags deviations for user review.
 */
export async function generateInvoiceProposal(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  createdBy: string
): Promise<TransientProposal> {
  // 1. Fetch active quote_line events
  const quoteLineTypeId = await getLabelId(db, "event_type", "quote_line", tenantId);
  const timeTypeId = await getLabelId(db, "event_type", "time", tenantId);
  const materialTypeId = await getLabelId(db, "event_type", "material", tenantId);

  const allEvents = await getActiveEventsForProject(db, tenantId, projectId, [
    quoteLineTypeId,
    timeTypeId,
    materialTypeId,
  ]);

  const quoteEvents = allEvents.filter((e: any) => e.type_id === quoteLineTypeId);
  const timeEvents = allEvents.filter((e: any) => e.type_id === timeTypeId);
  const materialEvents = allEvents.filter((e: any) => e.type_id === materialTypeId);

  // 2. Sum actuals
  const actualTimeCost = timeEvents.reduce(
    (sum: number, e: any) => sum + (parseFloat(e.total) || 0),
    0
  );
  const actualMaterialCost = materialEvents.reduce(
    (sum: number, e: any) => sum + (parseFloat(e.total) || 0),
    0
  );

  // 3. Sum quoted amounts (separated by labor/material)
  let quotedLabor = 0;
  let quotedMaterial = 0;
  for (const ev of quoteEvents) {
    const total = parseFloat((ev as any).total) || 0;
    if ((ev as any).data?.is_labor) {
      quotedLabor += total;
    } else {
      quotedMaterial += total;
    }
  }

  // 4. Build invoice lines from quote lines, using actuals where available
  const lines: ProposalLine[] = quoteEvents.map((ev: any, index: number) => {
    const isLabor = ev.data?.is_labor || false;
    const quotedQty = parseFloat(ev.qty) || 0;
    const quotedUnitPrice = parseFloat(ev.unit_price) || 0;

    // For labor lines, use actual totals if we have time events
    // For material lines, use actual totals if we have material events
    let qty = quotedQty;
    let unitPrice = quotedUnitPrice;

    if (isLabor && actualTimeCost > 0 && quotedLabor > 0) {
      // Scale proportionally
      const proportion =
        (parseFloat(ev.total) || 0) / quotedLabor;
      const actualForLine = actualTimeCost * proportion;
      if (quotedUnitPrice > 0) {
        qty = actualForLine / quotedUnitPrice;
      }
    } else if (!isLabor && actualMaterialCost > 0 && quotedMaterial > 0) {
      const proportion =
        (parseFloat(ev.total) || 0) / quotedMaterial;
      const actualForLine = actualMaterialCost * proportion;
      if (quotedUnitPrice > 0) {
        qty = actualForLine / quotedUnitPrice;
      }
    }

    return {
      tempId: generateId(),
      description: ev.data?.description || "",
      qty: Math.round(qty * 100) / 100,
      unitId: ev.unit_id || 5,
      unitPrice,
      total: computeTotal(Math.round(qty * 100) / 100, unitPrice) ?? 0,
      isLabor,
      vatRate: ev.data?.vat_rate || 0.25,
      sortOrder: ev.data?.sort_order || index,
      quoteLineRef: ev.root_id || ev.id,
    };
  });

  // 5. Detect deviations
  const deviations = detectDeviations(
    {
      quotedTotal: quotedLabor + quotedMaterial,
      timeCost: quotedLabor,
      materialCost: quotedMaterial,
      invoicedTotal: 0,
      margin: 0,
      marginPercent: 0,
    },
    { timeCost: actualTimeCost, materialCost: actualMaterialCost }
  );

  // 6. Calculate ROT/RUT
  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : projectResult.rows) as any[];
  const project = projectRows[0]?.data;

  const rotRutType: RotRutType = project?.rot_applicable
    ? "rot"
    : project?.rut_applicable
      ? "rut"
      : "none";

  let rotRut = undefined;
  if (rotRutType !== "none") {
    // Get customer personnummer
    const customerResult = await db.execute(sql`
      SELECT n.data->>'rot_rut_person_number' AS pn
      FROM edges e
      JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
      JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
      WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
    `);
    const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
    const personNumber = customerRows[0]?.pn || "";

    if (personNumber) {
      const year = new Date().getFullYear();
      const accumulated = await getAccumulatedRotRut(db, tenantId, personNumber, year);

      const rotRutLines: RotRutLineInput[] = lines.map((line) => ({
        total: line.total,
        isLabor: line.isLabor,
        rotRutType,
      }));

      rotRut = calculateRotRut(
        rotRutLines,
        accumulated.totalClaimed,
        personNumber
      );
    }
  }

  // 7. Build proposal
  return {
    id: generateId(),
    tenantId,
    projectId,
    type: "invoice",
    status: "draft",
    createdAt: new Date(),
    createdBy,
    lines,
    rotRut,
    deviations: deviations.length > 0 ? deviations : undefined,
    aiModel: "system",
    aiContextSummary: "Generated from quote lines and actual events",
  };
}
