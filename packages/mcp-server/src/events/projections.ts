/**
 * Projection engine — spec §3.4.
 * Each projection: BEGIN → INSERT event → INSERT/UPDATE facts → COMMIT.
 * INV-ATOMIC: event + projection in same transaction.
 */
import type { PGlite } from '../db/connection.js';
import { generateUUIDv7 } from '../db/uuid.js';
import { McpError } from '../errors.js';
import {
  resolveEntityType,
  resolveEdgeType,
  getTypeName,
  validateSchema,
} from './type-resolution.js';
import {
  CURRENT_NODE_SQL,
  CURRENT_EDGE_SQL,
  VERSION_COUNT_SQL,
} from '../db/tenant-filter.js';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ProjectionContext {
  db: PGlite;
  tenantId: string;
  actorId: string;
}

export interface EntityCreatedResult {
  entityId: string;
  entityType: string;
  data: Record<string, unknown>;
  version: number;
  epistemic: string;
  validFrom: string;
  eventId: string;
  previousVersionId: string | null;
}

export interface EntityUpdatedResult extends EntityCreatedResult {}

export interface EntityRemovedResult {
  removed: true;
  entityType: string;
  eventId: string;
}

export interface EdgeCreatedResult {
  edgeId: string;
  edgeType: string;
  source: { entityId: string; entityType: string; tenantId: string };
  target: { entityId: string; entityType: string; tenantId: string };
  isCrossTenant: boolean;
  eventId: string;
}

export interface EdgeRemovedResult {
  removed: true;
  edgeType: string;
  eventId: string;
}

interface CurrentNode {
  node_id: string;
  tenant_id: string;
  type_node_id: string;
  data: Record<string, unknown>;
  epistemic: string;
  valid_from: string;
}

// ═══════════════════════════════════════════════════════════════
// Helper: fetch current node version
// ═══════════════════════════════════════════════════════════════

async function fetchCurrentNode(
  db: PGlite,
  entityId: string,
): Promise<CurrentNode> {
  const result = await db.query<CurrentNode>(CURRENT_NODE_SQL, [entityId]);
  if (result.rows.length === 0) {
    throw McpError.notFound('entity', entityId);
  }
  return result.rows[0]!;
}

async function getVersionCount(db: PGlite, nodeId: string): Promise<number> {
  const result = await db.query<{ version_count: number }>(
    VERSION_COUNT_SQL,
    [nodeId],
  );
  return result.rows[0]!.version_count;
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 1: entity_created
// ═══════════════════════════════════════════════════════════════

export async function projectEntityCreated(
  ctx: ProjectionContext,
  params: {
    entityType: string;
    data: Record<string, unknown>;
    validFrom?: string;
    epistemic?: string;
  },
): Promise<EntityCreatedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  // Pre-validate: resolve type
  const resolved = await resolveEntityType(db, tenantId, params.entityType);
  if (resolved.labelSchema) {
    validateSchema(params.data, resolved.labelSchema, params.entityType);
  }

  const nodeId = generateUUIDv7();
  const eventId = generateUUIDv7();
  const validFrom = params.validFrom ?? now;
  const epistemic = params.epistemic ?? 'asserted';

  // Atomic: event + node in one transaction
  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          node_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'entity_created', $3, $4, ARRAY[$4::uuid], $5, $6, $7)`,
      [
        eventId,
        tenantId,
        JSON.stringify({
          entity_type: params.entityType,
          type_node_id: resolved.typeNodeId,
          data: params.data,
          epistemic,
        }),
        nodeId,
        validFrom,
        now,
        actorId,
      ],
    );

    await db.query(
      `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, embedding,
                         epistemic, valid_from, valid_to,
                         recorded_at, created_by, created_by_event, is_deleted)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, 'infinity', $7, $8, $9, false)`,
      [
        nodeId,
        tenantId,
        resolved.typeNodeId,
        JSON.stringify(params.data),
        epistemic,
        validFrom,
        now,
        actorId,
        eventId,
      ],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  return {
    entityId: nodeId,
    entityType: params.entityType,
    data: params.data,
    version: 1,
    epistemic,
    validFrom,
    eventId,
    previousVersionId: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 2: entity_updated
// ═══════════════════════════════════════════════════════════════

export async function projectEntityUpdated(
  ctx: ProjectionContext,
  params: {
    entityId: string;
    entityType?: string;
    data: Record<string, unknown>;
    expectedVersion?: string;
    epistemic?: string;
  },
): Promise<EntityUpdatedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  // Pre-validate: fetch current
  const current = await fetchCurrentNode(db, params.entityId);

  // Optimistic concurrency
  if (params.expectedVersion && current.valid_from !== params.expectedVersion) {
    throw McpError.conflict(
      params.entityId,
      params.expectedVersion,
      current.valid_from,
    );
  }

  // If epistemic changed, delegate to epistemic_change
  const newEpistemic = params.epistemic ?? current.epistemic;
  if (newEpistemic !== current.epistemic) {
    return projectEpistemicChange(ctx, {
      entityId: params.entityId,
      data: params.data,
      newEpistemic,
      expectedVersion: params.expectedVersion,
    });
  }

  // Resolve type if changed
  let typeNodeId = current.type_node_id;
  const entityType =
    params.entityType ??
    (await getTypeName(db, current.type_node_id));

  if (params.entityType && params.entityType !== entityType) {
    const resolved = await resolveEntityType(db, tenantId, params.entityType);
    typeNodeId = resolved.typeNodeId;
    if (resolved.labelSchema) {
      validateSchema(params.data, resolved.labelSchema, params.entityType);
    }
  }

  const eventId = generateUUIDv7();
  const validFrom = now;
  const previousValidFrom = current.valid_from;

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          node_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'entity_updated', $3, $4, ARRAY[$4::uuid], $5, $6, $7)`,
      [
        eventId,
        tenantId,
        JSON.stringify({
          entity_id: params.entityId,
          old_data: current.data,
          new_data: params.data,
          old_epistemic: current.epistemic,
          new_epistemic: newEpistemic,
          expected_version: params.expectedVersion ?? null,
        }),
        params.entityId,
        validFrom,
        now,
        actorId,
      ],
    );

    // Close current version
    const closeResult = await db.query(
      `UPDATE nodes
       SET valid_to = $2
       WHERE node_id = $1 AND valid_to = 'infinity' AND is_deleted = false`,
      [params.entityId, validFrom],
    );

    if ((closeResult.affectedRows ?? 0) === 0) {
      throw McpError.conflict(
        params.entityId,
        'current',
        'concurrent modification',
      );
    }

    // New version
    await db.query(
      `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, embedding,
                         epistemic, valid_from, valid_to,
                         recorded_at, created_by, created_by_event, is_deleted)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, 'infinity', $7, $8, $9, false)`,
      [
        params.entityId,
        tenantId,
        typeNodeId,
        JSON.stringify(params.data),
        newEpistemic,
        validFrom,
        now,
        actorId,
        eventId,
      ],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  const versionCount = await getVersionCount(db, params.entityId);

  return {
    entityId: params.entityId,
    entityType,
    data: params.data,
    version: versionCount,
    epistemic: newEpistemic,
    validFrom,
    eventId,
    previousVersionId: previousValidFrom,
  };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 3: entity_removed
// ═══════════════════════════════════════════════════════════════

export async function projectEntityRemoved(
  ctx: ProjectionContext,
  params: { entityId: string },
): Promise<EntityRemovedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  const current = await fetchCurrentNode(db, params.entityId);
  const entityType = await getTypeName(db, current.type_node_id);

  const eventId = generateUUIDv7();

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          node_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'entity_removed', $3, $4, ARRAY[$4::uuid], $5, $5, $6)`,
      [
        eventId,
        tenantId,
        JSON.stringify({
          entity_id: params.entityId,
          entity_type: entityType,
          final_data: current.data,
        }),
        params.entityId,
        now,
        actorId,
      ],
    );

    await db.query(
      `UPDATE nodes
       SET is_deleted = true, valid_to = $2
       WHERE node_id = $1 AND valid_to = 'infinity' AND is_deleted = false`,
      [params.entityId, now],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  return { removed: true, entityType, eventId };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 4: edge_created
// ═══════════════════════════════════════════════════════════════

export async function projectEdgeCreated(
  ctx: ProjectionContext,
  params: {
    edgeType: string;
    sourceId: string;
    targetId: string;
    data?: Record<string, unknown>;
  },
): Promise<EdgeCreatedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  // Resolve source and target nodes
  const sourceResult = await db.query<CurrentNode>(CURRENT_NODE_SQL, [
    params.sourceId,
  ]);
  if (sourceResult.rows.length === 0) {
    throw McpError.notFound('entity (source)', params.sourceId);
  }
  const source = sourceResult.rows[0]!;

  const targetResult = await db.query<CurrentNode>(CURRENT_NODE_SQL, [
    params.targetId,
  ]);
  if (targetResult.rows.length === 0) {
    throw McpError.notFound('entity (target)', params.targetId);
  }
  const target = targetResult.rows[0]!;

  // Resolve edge type
  const edgeTypeNodeId = await resolveEdgeType(db, tenantId, params.edgeType);

  const isCrossTenant = source.tenant_id !== target.tenant_id;

  // Cross-tenant grant check
  if (isCrossTenant) {
    const grantResult = await db.query(
      `SELECT 1 FROM grants
       WHERE subject_tenant_id = $1
         AND object_node_id = $2
         AND capability IN ('TRAVERSE', 'WRITE')
         AND is_deleted = false
         AND valid_to > now()
       LIMIT 1`,
      [tenantId, params.targetId],
    );
    if (grantResult.rows.length === 0) {
      throw McpError.crossTenantDenied(
        'TRAVERSE',
        params.targetId,
        tenantId,
      );
    }
  }

  const edgeId = generateUUIDv7();
  const eventId = generateUUIDv7();
  const edgeTenant = source.tenant_id;
  const edgeData = params.data ?? {};

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          node_ids, edge_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'edge_created', $3, $4, ARRAY[$4::uuid, $5::uuid], ARRAY[$6::uuid], $7, $7, $8)`,
      [
        eventId,
        edgeTenant,
        JSON.stringify({
          edge_type: params.edgeType,
          edge_type_node_id: edgeTypeNodeId,
          source_id: params.sourceId,
          target_id: params.targetId,
          source_tenant_id: source.tenant_id,
          target_tenant_id: target.tenant_id,
          data: edgeData,
          is_cross_tenant: isCrossTenant,
        }),
        params.sourceId,
        params.targetId,
        edgeId,
        now,
        actorId,
      ],
    );

    await db.query(
      `INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id,
                         data, valid_from, valid_to, recorded_at,
                         created_by, created_by_event, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'infinity', $7, $8, $9, false)`,
      [
        edgeId,
        edgeTenant,
        edgeTypeNodeId,
        params.sourceId,
        params.targetId,
        JSON.stringify(edgeData),
        now,
        actorId,
        eventId,
      ],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  const sourceTypeName = await getTypeName(db, source.type_node_id);
  const targetTypeName = await getTypeName(db, target.type_node_id);

  return {
    edgeId,
    edgeType: params.edgeType,
    source: {
      entityId: params.sourceId,
      entityType: sourceTypeName,
      tenantId: source.tenant_id,
    },
    target: {
      entityId: params.targetId,
      entityType: targetTypeName,
      tenantId: target.tenant_id,
    },
    isCrossTenant,
    eventId,
  };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 5: edge_removed
// ═══════════════════════════════════════════════════════════════

export async function projectEdgeRemoved(
  ctx: ProjectionContext,
  params: { edgeId: string },
): Promise<EdgeRemovedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  const edgeResult = await db.query<{
    edge_id: string;
    tenant_id: string;
    type_node_id: string;
    source_id: string;
    target_id: string;
  }>(CURRENT_EDGE_SQL, [params.edgeId]);

  if (edgeResult.rows.length === 0) {
    throw McpError.notFound('edge', params.edgeId);
  }
  const edge = edgeResult.rows[0]!;
  const edgeTypeName = await getTypeName(db, edge.type_node_id);

  const eventId = generateUUIDv7();

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          edge_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'edge_removed', $3, $4, ARRAY[$5::uuid], $6, $6, $7)`,
      [
        eventId,
        edge.tenant_id,
        JSON.stringify({
          edge_id: params.edgeId,
          source_id: edge.source_id,
          target_id: edge.target_id,
        }),
        edge.source_id,
        params.edgeId,
        now,
        actorId,
      ],
    );

    await db.query(
      `UPDATE edges
       SET is_deleted = true, valid_to = $2
       WHERE edge_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [params.edgeId, now],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  return { removed: true, edgeType: edgeTypeName, eventId };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTION 6: epistemic_change
// ═══════════════════════════════════════════════════════════════

const VALID_TRANSITIONS: Record<string, string[]> = {
  hypothesis: ['asserted', 'confirmed'],
  asserted: ['confirmed'],
  confirmed: [], // no transitions from confirmed
};

export async function projectEpistemicChange(
  ctx: ProjectionContext,
  params: {
    entityId: string;
    data: Record<string, unknown>;
    newEpistemic: string;
    expectedVersion?: string;
  },
): Promise<EntityUpdatedResult> {
  const { db, tenantId, actorId } = ctx;
  const now = new Date().toISOString();

  const current = await fetchCurrentNode(db, params.entityId);

  // Validate transition
  const allowed = VALID_TRANSITIONS[current.epistemic];
  if (!allowed || !allowed.includes(params.newEpistemic)) {
    throw McpError.validationError(
      `Invalid epistemic transition: ${current.epistemic} → ${params.newEpistemic}`,
    );
  }

  if (params.expectedVersion && current.valid_from !== params.expectedVersion) {
    throw McpError.conflict(
      params.entityId,
      params.expectedVersion,
      current.valid_from,
    );
  }

  const entityType = await getTypeName(db, current.type_node_id);
  const eventId = generateUUIDv7();
  const validFrom = now;
  const previousValidFrom = current.valid_from;

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                          node_ids, occurred_at, recorded_at, created_by)
       VALUES ($1, $2, 'epistemic_change', $3, $4, ARRAY[$4::uuid], $5, $6, $7)`,
      [
        eventId,
        tenantId,
        JSON.stringify({
          entity_id: params.entityId,
          old_epistemic: current.epistemic,
          new_epistemic: params.newEpistemic,
          old_data: current.data,
          new_data: params.data,
        }),
        params.entityId,
        validFrom,
        now,
        actorId,
      ],
    );

    // Close current version
    const closeResult = await db.query(
      `UPDATE nodes
       SET valid_to = $2
       WHERE node_id = $1 AND valid_to = 'infinity' AND is_deleted = false`,
      [params.entityId, validFrom],
    );

    if ((closeResult.affectedRows ?? 0) === 0) {
      throw McpError.conflict(
        params.entityId,
        'current',
        'concurrent modification',
      );
    }

    // New version with new epistemic
    await db.query(
      `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, embedding,
                         epistemic, valid_from, valid_to,
                         recorded_at, created_by, created_by_event, is_deleted)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, 'infinity', $7, $8, $9, false)`,
      [
        params.entityId,
        tenantId,
        current.type_node_id,
        JSON.stringify(params.data),
        params.newEpistemic,
        validFrom,
        now,
        actorId,
        eventId,
      ],
    );

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  const versionCount = await getVersionCount(db, params.entityId);

  return {
    entityId: params.entityId,
    entityType,
    data: params.data,
    version: versionCount,
    epistemic: params.newEpistemic,
    validFrom,
    eventId,
    previousVersionId: previousValidFrom,
  };
}
