/**
 * get_schema tool — returns type node definitions for a tenant.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { GetSchemaParams } from './schemas.js';
import { SYSTEM_TENANT_ID, METATYPE_ID } from '../db/migrate.js';

export async function getSchema(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = GetSchemaParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);

  auth.checkScope(`tenant:${tenantId}:read`);

  const conditions = [
    `(n.tenant_id = $1 OR n.tenant_id = $2)`,
    `n.type_node_id = $3`,
    `n.is_deleted = false`,
    `n.valid_to = 'infinity'`,
  ];
  const queryParams: unknown[] = [tenantId, SYSTEM_TENANT_ID, METATYPE_ID];

  if (params.entity_type) {
    conditions.push(`n.data->>'name' = $4`);
    queryParams.push(params.entity_type);
  }

  const result = await db.query<{
    node_id: string;
    data: Record<string, unknown>;
  }>(
    `SELECT n.node_id, n.data FROM nodes n
     WHERE ${conditions.join(' AND ')}
     ORDER BY n.data->>'kind', n.data->>'name'`,
    queryParams,
  );

  const types = result.rows.map((row) => {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return {
      name: data.name as string,
      kind: data.kind as string,
      description: data.description as string | undefined,
      label_schema: data.label_schema as Record<string, unknown> | undefined,
      node_id: row.node_id,
    };
  });

  return { types };
}
