import type { PgDatabase } from "drizzle-orm/pg-core";
import { getLabelId } from "../labels";
import { getActiveEventsForProject } from "../events/resolve";

export interface ProjectEconomics {
  quotedTotal: number;
  timeCost: number;
  materialCost: number;
  invoicedTotal: number;
  margin: number;
  marginPercent: number;
}

/**
 * Calculates project economics from active events only (after correction resolution).
 * ALL arithmetic in TypeScript — never delegated to AI.
 */
export async function calculateProjectEconomics(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string
): Promise<ProjectEconomics> {
  const timeTypeId = await getLabelId(db, "event_type", "time", tenantId);
  const materialTypeId = await getLabelId(db, "event_type", "material", tenantId);
  const quoteLineTypeId = await getLabelId(db, "event_type", "quote_line", tenantId);
  const invoiceLineTypeId = await getLabelId(db, "event_type", "invoice_line", tenantId);

  const allTypeIds = [timeTypeId, materialTypeId, quoteLineTypeId, invoiceLineTypeId];

  const activeEvents = await getActiveEventsForProject(
    db,
    tenantId,
    projectId,
    allTypeIds
  );

  let quotedTotal = 0;
  let timeCost = 0;
  let materialCost = 0;
  let invoicedTotal = 0;

  for (const event of activeEvents) {
    const total = event.total ? parseFloat(event.total) : 0;

    if (event.type_id === quoteLineTypeId) {
      quotedTotal += total;
    } else if (event.type_id === timeTypeId) {
      timeCost += total;
    } else if (event.type_id === materialTypeId) {
      materialCost += total;
    } else if (event.type_id === invoiceLineTypeId) {
      invoicedTotal += total;
    }
  }

  const margin = quotedTotal - (timeCost + materialCost);
  const marginPercent = quotedTotal > 0 ? (margin / quotedTotal) * 100 : 0;

  return {
    quotedTotal,
    timeCost,
    materialCost,
    invoicedTotal,
    margin,
    marginPercent,
  };
}
