/**
 * propose_event tool — submit a raw event for projection.
 * Supports edge_removed and other intent types that lack dedicated tools.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { ProposeEventParams } from './schemas.js';
import { generateUUIDv7 } from '../db/uuid.js';
import { projectEdgeRemoved } from '../events/projections.js';

export async function proposeEvent(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = ProposeEventParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);
  auth.checkScope(`tenant:${tenantId}:write`);

  const actorId = await auth.getActorForTenant(tenantId);

  // Handle specific intent types with proper projections
  if (params.intent_type === 'edge_removed') {
    const edgeId = params.payload.edge_id as string;
    if (!edgeId) throw new Error('edge_removed requires payload.edge_id');

    const result = await projectEdgeRemoved(
      { db, tenantId, actorId },
      { edgeId },
    );
    return {
      event_id: result.eventId,
      intent_type: 'edge_removed',
      projected: true,
    };
  }

  // Generic event (no projection — raw append only)
  const eventId = generateUUIDv7();
  const now = new Date().toISOString();

  await db.query(
    `INSERT INTO events (event_id, tenant_id, intent_type, payload,
                        occurred_at, recorded_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $5, $6)`,
    [
      eventId,
      tenantId,
      params.intent_type,
      JSON.stringify(params.payload),
      now,
      actorId,
    ],
  );

  return {
    event_id: eventId,
    intent_type: params.intent_type,
    projected: false,
  };
}
