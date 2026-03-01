import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export interface AccumulatedRotRut {
  rotClaimed: number;
  rutClaimed: number;
  totalClaimed: number;
}

/**
 * Queries accumulated ROT/RUT claims for a person in a given year.
 * Uses active event resolution (corrections handled via window function).
 *
 * This is needed for the yearly cap check before generating quotes/invoices.
 */
export async function getAccumulatedRotRut(
  db: PgDatabase<any>,
  tenantId: string,
  personNumber: string,
  year: number
): Promise<AccumulatedRotRut> {
  // Query invoice_line events for this customer's personnummer in the given year.
  // We join through edges (customer_of → project) and nodes (customer with personnummer).
  // Uses active event resolution to handle corrections.
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const result = await db.execute(sql`
    WITH customer_projects AS (
      SELECT e.from_id AS customer_id, e.to_id AS project_id
      FROM edges e
      JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
      JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'customer'
      WHERE e.tenant_id = ${tenantId}
        AND n.data->>'rot_rut_person_number' = ${personNumber}
    ),
    invoice_events AS (
      SELECT
        COALESCE(ev.ref_id, ev.id) AS root_id,
        ev.id,
        ev.qty,
        ev.unit_price,
        ev.data,
        ev.occurred_at,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(ev.ref_id, ev.id)
          ORDER BY ev.id DESC
        ) AS rn
      FROM events ev
      JOIN labels lt ON lt.id = ev.type_id AND lt.domain = 'event_type' AND lt.code = 'invoice_line'
      JOIN customer_projects cp ON cp.project_id = ev.node_id
      WHERE ev.tenant_id = ${tenantId}
        AND ev.occurred_at >= ${yearStart}::date
        AND ev.occurred_at <= ${yearEnd}::date
    )
    SELECT
      COALESCE(SUM(
        CASE WHEN data->>'is_labor' = 'true' AND data->>'vat_rate' IS NOT NULL
        THEN (qty::numeric * unit_price::numeric * 0.30)
        ELSE 0 END
      ), 0) AS rot_claimed,
      COALESCE(SUM(
        CASE WHEN data->>'is_labor' = 'true' AND data->>'vat_rate' IS NOT NULL
        THEN (qty::numeric * unit_price::numeric * 0.50)
        ELSE 0 END
      ), 0) AS rut_claimed,
      COALESCE(SUM(
        CASE WHEN data->>'is_labor' = 'true'
        THEN qty::numeric * unit_price::numeric
        ELSE 0 END
      ), 0) AS labor_total
    FROM invoice_events
    WHERE rn = 1
  `);

  const rows = (Array.isArray(result) ? result : result.rows) as any[];
  if (rows.length === 0) {
    return { rotClaimed: 0, rutClaimed: 0, totalClaimed: 0 };
  }

  const row = rows[0];
  return {
    rotClaimed: parseFloat(row.rot_claimed) || 0,
    rutClaimed: parseFloat(row.rut_claimed) || 0,
    totalClaimed: parseFloat(row.labor_total) || 0,
  };
}
