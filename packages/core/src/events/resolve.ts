import type { PgDatabase } from "drizzle-orm/pg-core";
import { getActiveEvents, type ActiveEvent } from "@resonansia/db";
import { sql } from "drizzle-orm";

/**
 * Returns active events for a single node.
 */
export async function getActiveEventsForNode(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  typeIds?: number[]
): Promise<ActiveEvent[]> {
  const ids = typeIds ?? [];
  if (ids.length === 0) {
    // Get all event types — pass a broad array
    // We use a raw query to avoid the type constraint
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
      )
      SELECT root_id, id, qty, unit_price, total, type_id, node_id, actor_id, occurred_at, data
      FROM ranked
      WHERE rn = 1
    `);
    return result.rows as ActiveEvent[];
  }

  return getActiveEvents(db, tenantId, nodeId, ids);
}

/**
 * Returns active events for a project and all child nodes.
 * In Phase 1, project events are directly on the project node.
 */
export async function getActiveEventsForProject(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  typeIds?: number[]
): Promise<ActiveEvent[]> {
  // For Phase 1, events are on the project node directly
  return getActiveEventsForNode(db, tenantId, projectId, typeIds);
}
