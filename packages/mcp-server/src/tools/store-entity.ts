/**
 * store_entity tool — creates or updates an entity node.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { StoreEntityParams } from './schemas.js';
import {
  projectEntityCreated,
  projectEntityUpdated,
} from '../events/projections.js';

export async function storeEntity(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = StoreEntityParams.parse(rawParams);
  const tenantId = auth.resolveTenantId(params.tenant_id);

  // Check write scope
  auth.checkScope(`tenant:${tenantId}:nodes:${params.entity_type}:write`);

  const actorId = await auth.getActorForTenant(tenantId);
  const ctx = { db, tenantId, actorId };

  if (params.entity_id) {
    // Update existing
    const result = await projectEntityUpdated(ctx, {
      entityId: params.entity_id,
      entityType: params.entity_type,
      data: params.data as Record<string, unknown>,
      expectedVersion: params.expected_version,
      epistemic: params.epistemic,
    });
    return {
      entity_id: result.entityId,
      entity_type: result.entityType,
      data: result.data,
      version: result.version,
      epistemic: result.epistemic,
      valid_from: result.validFrom,
      event_id: result.eventId,
      previous_version_id: result.previousVersionId,
    };
  } else {
    // Create new
    const result = await projectEntityCreated(ctx, {
      entityType: params.entity_type,
      data: params.data as Record<string, unknown>,
      validFrom: params.valid_from,
      epistemic: params.epistemic,
    });
    return {
      entity_id: result.entityId,
      entity_type: result.entityType,
      data: result.data,
      version: result.version,
      epistemic: result.epistemic,
      valid_from: result.validFrom,
      event_id: result.eventId,
      previous_version_id: result.previousVersionId,
    };
  }
}
