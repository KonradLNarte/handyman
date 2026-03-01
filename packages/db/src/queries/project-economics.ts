import type { PgDatabase } from "drizzle-orm/pg-core";
import { getActiveEvents } from "./active-events.js";

export interface ProjectEconomics {
  quote_total: number;
  time_cost: number;
  material_cost: number;
  invoiced: number;
  margin: number;
}

/**
 * Computes project economics from active events (after resolving correction chains).
 *
 * quote_total   = SUM(active quote_line events .total)
 * time_cost     = SUM(active time events .total)
 * material_cost = SUM(active material events .total)
 * invoiced      = SUM(active invoice_line events .total)
 * margin        = quote_total - (time_cost + material_cost)
 *
 * Requires label IDs for the relevant event types to be passed in.
 */
export async function getProjectEconomics(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  eventTypeLabelIds: {
    time: number;
    material: number;
    quote_line: number;
    invoice_line: number;
  }
): Promise<ProjectEconomics> {
  const allTypeIds = [
    eventTypeLabelIds.time,
    eventTypeLabelIds.material,
    eventTypeLabelIds.quote_line,
    eventTypeLabelIds.invoice_line,
  ];

  const activeEvents = await getActiveEvents(db, tenantId, projectId, allTypeIds);

  let quote_total = 0;
  let time_cost = 0;
  let material_cost = 0;
  let invoiced = 0;

  for (const event of activeEvents) {
    const total = event.total ? parseFloat(event.total) : 0;

    if (event.type_id === eventTypeLabelIds.quote_line) {
      quote_total += total;
    } else if (event.type_id === eventTypeLabelIds.time) {
      time_cost += total;
    } else if (event.type_id === eventTypeLabelIds.material) {
      material_cost += total;
    } else if (event.type_id === eventTypeLabelIds.invoice_line) {
      invoiced += total;
    }
  }

  return {
    quote_total,
    time_cost,
    material_cost,
    invoiced,
    margin: quote_total - (time_cost + material_cost),
  };
}
