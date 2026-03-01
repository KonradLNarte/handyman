import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

export interface ActiveEvent {
  root_id: string;
  id: string;
  qty: string | null;
  unit_price: string | null;
  total: string | null;
  type_id: number;
  node_id: string;
  actor_id: string | null;
  occurred_at: Date;
  data: unknown;
}

/**
 * Resolves correction chains entirely in SQL using window functions.
 * Returns only the "active" (latest by transaction time) version of each event.
 *
 * COALESCE(ref_id, id) groups root events with their adjustments.
 * ROW_NUMBER with ORDER BY id DESC picks the latest by transaction time (UUIDv7).
 * rn = 1 is the active (current) value.
 */
export async function getActiveEvents(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  typeIds: number[]
): Promise<ActiveEvent[]> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        COALESCE(e.ref_id, e.id) AS root_id,
        e.id,
        e.qty,
        e.unit_price,
        e.qty * e.unit_price AS total,
        e.type_id,
        e.node_id,
        e.actor_id,
        e.occurred_at,
        e.data,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(e.ref_id, e.id)
          ORDER BY e.id DESC
        ) AS rn
      FROM events e
      WHERE e.tenant_id = ${tenantId}
        AND e.node_id = ${nodeId}
        AND e.type_id = ANY(${typeIds})
    )
    SELECT root_id, id, qty, unit_price, total, type_id, node_id, actor_id, occurred_at, data
    FROM ranked
    WHERE rn = 1
  `);

  return result.rows as ActiveEvent[];
}
