/**
 * verify_lineage tool — INV-LINEAGE integrity check.
 * Every fact row (node, edge, grant) must have a valid created_by_event.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { VerifyLineageParams } from './schemas.js';

export async function verifyLineage(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = VerifyLineageParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:read`);

  const violations: Array<{ entity_id: string; issue: string }> = [];
  let checked = 0;

  // Check nodes
  if (params.entity_id) {
    const result = await db.query<{
      node_id: string;
      created_by_event: string;
      has_event: boolean;
    }>(
      `SELECT n.node_id, n.created_by_event::text,
              EXISTS(SELECT 1 FROM events e WHERE e.event_id = n.created_by_event) AS has_event
       FROM nodes n
       WHERE n.node_id = $1 AND n.tenant_id = $2`,
      [params.entity_id, tenantId],
    );

    for (const row of result.rows) {
      checked++;
      if (!row.has_event) {
        violations.push({
          entity_id: row.node_id,
          issue: `Node version missing event: ${row.created_by_event}`,
        });
      }
    }
  } else {
    // Check all nodes for tenant
    const nodeOrphans = await db.query<{ node_id: string; created_by_event: string }>(
      `SELECT n.node_id, n.created_by_event::text
       FROM nodes n
       LEFT JOIN events e ON e.event_id = n.created_by_event
       WHERE n.tenant_id = $1 AND e.event_id IS NULL`,
      [tenantId],
    );

    const nodeCount = await db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM nodes WHERE tenant_id = $1`,
      [tenantId],
    );
    checked += nodeCount.rows[0]?.c ?? 0;

    for (const row of nodeOrphans.rows) {
      violations.push({
        entity_id: row.node_id,
        issue: `Node version missing event: ${row.created_by_event}`,
      });
    }

    // Check edges
    const edgeOrphans = await db.query<{ edge_id: string; created_by_event: string }>(
      `SELECT ed.edge_id, ed.created_by_event::text
       FROM edges ed
       LEFT JOIN events e ON e.event_id = ed.created_by_event
       WHERE ed.tenant_id = $1 AND e.event_id IS NULL`,
      [tenantId],
    );

    const edgeCount = await db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM edges WHERE tenant_id = $1`,
      [tenantId],
    );
    checked += edgeCount.rows[0]?.c ?? 0;

    for (const row of edgeOrphans.rows) {
      violations.push({
        entity_id: row.edge_id,
        issue: `Edge missing event: ${row.created_by_event}`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    checked,
    violations,
  };
}
