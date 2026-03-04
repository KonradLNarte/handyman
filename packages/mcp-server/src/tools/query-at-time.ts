/**
 * query_at_time tool — bitemporal point-in-time query.
 * Returns the version of an entity that was active at a given business time.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { QueryAtTimeParams } from './schemas.js';
import { getTypeName } from '../events/type-resolution.js';
import { McpError } from '../errors.js';

export async function queryAtTime(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = QueryAtTimeParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:read`);

  const result = await db.query<{
    node_id: string;
    type_node_id: string;
    data: Record<string, unknown>;
    epistemic: string;
    valid_from: string;
    valid_to: string;
    is_deleted: boolean;
  }>(
    `SELECT node_id, type_node_id, data, epistemic,
            valid_from::text AS valid_from,
            valid_to::text AS valid_to,
            is_deleted
     FROM nodes
     WHERE node_id = $1
       AND tenant_id = $2
       AND valid_from <= $3::timestamptz
       AND valid_to > $3::timestamptz
     ORDER BY valid_from DESC
     LIMIT 1`,
    [params.entity_id, tenantId, params.at_time],
  );

  if (result.rows.length === 0) {
    throw McpError.notFound('entity at time', `${params.entity_id}@${params.at_time}`);
  }

  const row = result.rows[0]!;
  const entityType = await getTypeName(db, row.type_node_id);

  return {
    entity_id: row.node_id,
    entity_type: entityType,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    epistemic: row.epistemic,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
    was_deleted: row.is_deleted,
  };
}
