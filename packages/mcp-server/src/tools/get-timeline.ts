/**
 * get_timeline tool — chronological event/version history.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { GetTimelineParams } from './schemas.js';

export async function getTimeline(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = GetTimelineParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:read`);

  const conditions: string[] = ['e.tenant_id = $1'];
  const queryParams: unknown[] = [tenantId];
  let paramIdx = 2;

  if (params.entity_id) {
    conditions.push(`$${paramIdx}::uuid = ANY(e.node_ids)`);
    queryParams.push(params.entity_id);
    paramIdx++;
  }

  if (params.event_types && params.event_types.length > 0) {
    const placeholders = params.event_types.map((_, i) => `$${paramIdx + i}`).join(', ');
    conditions.push(`e.intent_type IN (${placeholders})`);
    queryParams.push(...params.event_types);
    paramIdx += params.event_types.length;
  }

  if (params.cursor) {
    conditions.push(`e.occurred_at < $${paramIdx}::timestamptz`);
    queryParams.push(params.cursor);
    paramIdx++;
  }

  const limit = params.limit ?? 20;
  queryParams.push(limit);

  const result = await db.query<{
    event_id: string;
    intent_type: string;
    payload: Record<string, unknown>;
    occurred_at: string;
    created_by: string;
  }>(
    `SELECT e.event_id, e.intent_type, e.payload,
            e.occurred_at::text AS occurred_at, e.created_by::text AS created_by
     FROM events e
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.occurred_at DESC
     LIMIT $${paramIdx}`,
    queryParams,
  );

  const events = result.rows.map((row) => ({
    event_id: row.event_id,
    intent_type: row.intent_type,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    occurred_at: row.occurred_at,
    created_by: row.created_by,
  }));

  const nextCursor =
    events.length === limit
      ? events[events.length - 1]!.occurred_at
      : null;

  return { events, next_cursor: nextCursor };
}
