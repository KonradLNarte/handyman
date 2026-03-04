/**
 * find_entities tool — search entities by type, filters, and optionally embeddings.
 * [FEEDBACK:gen1-impl] Semantic search (embedding similarity) requires OPENAI_API_KEY.
 * Without it, only structured filters work.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { FindEntitiesParams } from './schemas.js';
import { METATYPE_ID } from '../db/migrate.js';

export async function findEntities(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = FindEntitiesParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);

  // Check read scope — type-scoped tokens pass if they have any type read access
  if (!auth.hasScopeFor(`tenant:${tenantId}:read`)) {
    // Check if they have any type-scoped read access
    const accessible = auth.getAccessibleTypes(tenantId, 'read');
    if (accessible !== null && accessible.length === 0) {
      auth.checkScope(`tenant:${tenantId}:read`); // will throw
    }
  }

  // Type-scoped access filtering
  const accessibleTypes = auth.getAccessibleTypes(tenantId, 'read');

  // Build query
  const conditions: string[] = [
    'n.tenant_id = $1',
    'n.is_deleted = false',
    "n.valid_to = 'infinity'",
  ];
  const queryParams: unknown[] = [tenantId];
  let paramIdx = 2;

  // Filter by entity_types
  let typeFilter = params.entity_types;
  if (accessibleTypes !== null) {
    // Intersect requested types with accessible types
    if (typeFilter) {
      typeFilter = typeFilter.filter((t) => accessibleTypes.includes(t));
    } else {
      typeFilter = accessibleTypes;
    }
  }

  if (typeFilter && typeFilter.length > 0) {
    // Resolve type names to type_node_ids
    const typePlaceholders = typeFilter
      .map((_, i) => `$${paramIdx + i}`)
      .join(', ');
    conditions.push(
      `n.type_node_id IN (
        SELECT node_id FROM nodes
        WHERE type_node_id = '${METATYPE_ID}'
          AND data->>'name' IN (${typePlaceholders})
          AND is_deleted = false AND valid_to = 'infinity'
      )`,
    );
    queryParams.push(...typeFilter);
    paramIdx += typeFilter.length;
  } else if (accessibleTypes !== null && accessibleTypes.length === 0) {
    // No accessible types — return empty
    return { results: [], total_count: 0, next_cursor: null };
  }

  // Epistemic filter
  if (params.epistemic && params.epistemic.length > 0) {
    const epPlaceholders = params.epistemic
      .map((_, i) => `$${paramIdx + i}`)
      .join(', ');
    conditions.push(`n.epistemic IN (${epPlaceholders})`);
    queryParams.push(...params.epistemic);
    paramIdx += params.epistemic.length;
  }

  // Structured filters on data fields
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const filterObj = value as Record<string, unknown>;
        if ('$eq' in filterObj) {
          conditions.push(`n.data->>$${paramIdx} = $${paramIdx + 1}`);
          queryParams.push(key, String(filterObj.$eq));
          paramIdx += 2;
        } else if ('$in' in filterObj) {
          const arr = filterObj.$in as unknown[];
          const inPlaceholders = arr
            .map((_, i) => `$${paramIdx + 1 + i}`)
            .join(', ');
          conditions.push(
            `n.data->>$${paramIdx} IN (${inPlaceholders})`,
          );
          queryParams.push(key, ...arr.map(String));
          paramIdx += 1 + arr.length;
        }
      } else {
        // Equality shorthand
        conditions.push(`n.data->>$${paramIdx} = $${paramIdx + 1}`);
        queryParams.push(key, String(value));
        paramIdx += 2;
      }
    }
  }

  // Exclude type nodes from results (only return entity-layer nodes)
  conditions.push(`n.type_node_id != '${METATYPE_ID}'`);

  const whereClause = conditions.join(' AND ');

  // Cursor-based pagination
  if (params.cursor) {
    conditions.push(`n.valid_from < $${paramIdx}`);
    queryParams.push(params.cursor);
    paramIdx += 1;
  }

  // Count total
  const countResult = await db.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM nodes n WHERE ${whereClause}`,
    queryParams.slice(0, paramIdx - (params.cursor ? 1 : 0)), // don't include cursor in count
  );
  const totalCount = countResult.rows[0]?.c ?? 0;

  // Fetch results
  const orderBy =
    params.sort_by === 'created_at' ? 'n.valid_from DESC' : 'n.valid_from DESC';

  const limit = params.limit ?? 10;
  queryParams.push(limit);

  const result = await db.query<{
    node_id: string;
    type_name: string;
    data: Record<string, unknown>;
    epistemic: string;
    valid_from: string;
  }>(
    `SELECT n.node_id, t.data->>'name' AS type_name, n.data, n.epistemic,
            n.valid_from::text AS valid_from
     FROM nodes n
     LEFT JOIN nodes t ON t.node_id = n.type_node_id AND t.is_deleted = false AND t.valid_to = 'infinity'
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${paramIdx}`,
    queryParams,
  );

  const results = result.rows.map((row) => ({
    entity_id: row.node_id,
    entity_type: row.type_name ?? 'unknown',
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    epistemic: row.epistemic,
    valid_from: row.valid_from,
  }));

  const nextCursor =
    results.length === limit
      ? results[results.length - 1]!.valid_from
      : null;

  return { results, total_count: totalCount, next_cursor: nextCursor };
}
