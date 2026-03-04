/**
 * remove_entity tool — soft-deletes an entity.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { RemoveEntityParams } from './schemas.js';
import { projectEntityRemoved } from '../events/projections.js';

export async function removeEntity(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = RemoveEntityParams.parse(rawParams);

  // Fetch entity to get tenant
  const node = await db.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM nodes
     WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity' LIMIT 1`,
    [params.entity_id],
  );

  if (node.rows.length === 0) {
    throw new Error(`Entity ${params.entity_id} not found`);
  }
  const tenantId = node.rows[0]!.tenant_id;

  auth.checkScope(`tenant:${tenantId}:write`);

  const actorId = await auth.getActorForTenant(tenantId);
  const ctx = { db, tenantId, actorId };

  const result = await projectEntityRemoved(ctx, {
    entityId: params.entity_id,
  });

  return {
    removed: result.removed,
    entity_type: result.entityType,
    event_id: result.eventId,
  };
}
