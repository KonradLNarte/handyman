/**
 * connect_entities tool — creates an edge between two entities.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { ConnectEntitiesParams } from './schemas.js';
import { projectEdgeCreated } from '../events/projections.js';

export async function connectEntities(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = ConnectEntitiesParams.parse(rawParams);

  // We need to figure out the source tenant to check write scope
  const sourceNode = await db.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM nodes
     WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity' LIMIT 1`,
    [params.source_id],
  );
  if (sourceNode.rows.length === 0) {
    throw new Error(`Source entity ${params.source_id} not found`);
  }
  const sourceTenantId = sourceNode.rows[0]!.tenant_id;

  auth.checkScope(`tenant:${sourceTenantId}:write`);

  const actorId = await auth.getActorForTenant(sourceTenantId);
  const ctx = { db, tenantId: sourceTenantId, actorId };

  const result = await projectEdgeCreated(ctx, {
    edgeType: params.edge_type,
    sourceId: params.source_id,
    targetId: params.target_id,
    data: params.data as Record<string, unknown>,
  });

  return {
    edge_id: result.edgeId,
    edge_type: result.edgeType,
    source: {
      entity_id: result.source.entityId,
      entity_type: result.source.entityType,
      tenant_id: result.source.tenantId,
    },
    target: {
      entity_id: result.target.entityId,
      entity_type: result.target.entityType,
      tenant_id: result.target.tenantId,
    },
    is_cross_tenant: result.isCrossTenant,
    event_id: result.eventId,
  };
}
