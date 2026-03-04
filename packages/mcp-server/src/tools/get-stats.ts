/**
 * get_stats tool — returns entity/edge/event counts for a tenant.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { GetStatsParams } from './schemas.js';
import { METATYPE_ID } from '../db/migrate.js';

export async function getStats(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = GetStatsParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);

  auth.checkScope(`tenant:${tenantId}:read`);

  // Entity count (exclude type-layer nodes)
  const entityCount = await db.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM nodes
     WHERE tenant_id = $1
       AND type_node_id != $2
       AND is_deleted = false
       AND valid_to = 'infinity'`,
    [tenantId, METATYPE_ID],
  );

  const edgeCount = await db.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM edges
     WHERE tenant_id = $1
       AND is_deleted = false
       AND valid_to = 'infinity'`,
    [tenantId],
  );

  const eventCount = await db.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM events
     WHERE tenant_id = $1`,
    [tenantId],
  );

  // Type counts
  const typeCounts = await db.query<{ type_name: string; c: number }>(
    `SELECT t.data->>'name' AS type_name, COUNT(*)::int AS c
     FROM nodes n
     JOIN nodes t ON t.node_id = n.type_node_id AND t.is_deleted = false AND t.valid_to = 'infinity'
     WHERE n.tenant_id = $1
       AND n.type_node_id != $2
       AND n.is_deleted = false
       AND n.valid_to = 'infinity'
     GROUP BY t.data->>'name'`,
    [tenantId, METATYPE_ID],
  );

  const typeCountMap: Record<string, number> = {};
  for (const row of typeCounts.rows) {
    typeCountMap[row.type_name] = row.c;
  }

  return {
    tenant_id: tenantId,
    entity_count: entityCount.rows[0]?.c ?? 0,
    edge_count: edgeCount.rows[0]?.c ?? 0,
    event_count: eventCount.rows[0]?.c ?? 0,
    type_counts: typeCountMap,
  };
}
