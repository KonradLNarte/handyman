/**
 * lookup_dict tool — dictionary lookups (postal codes, labels, etc.).
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { LookupDictParams } from './schemas.js';

export async function lookupDict(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = LookupDictParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:read`);

  const conditions = ['d.tenant_id = $1', 'd.type = $2'];
  const queryParams: unknown[] = [tenantId, params.dict_type];

  if (params.key) {
    conditions.push('d.key = $3');
    queryParams.push(params.key);
  }

  const result = await db.query<{ key: string; value: Record<string, unknown> }>(
    `SELECT d.key, d.value FROM dicts d
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.key`,
    queryParams,
  );

  return {
    entries: result.rows.map((row) => ({
      key: row.key,
      value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value,
    })),
  };
}
