/**
 * capture_thought tool — orchestrates extraction + dedup + atomic projection.
 * Spec §3.2 + §3.4 thought_captured projection.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { CaptureThoughtParams } from './schemas.js';
import { generateUUIDv7 } from '../db/uuid.js';
import { METATYPE_ID, SYSTEM_TENANT_ID } from '../db/migrate.js';
import { resolveEntityType, resolveEdgeType } from '../events/type-resolution.js';
import { deduplicateEntity } from '../ai/deduplication.js';
import type { ExtractionService, ExtractionResult } from '../ai/extraction.js';
import { McpError } from '../errors.js';

export function createCaptureThought(extractionService: ExtractionService) {
  return async function captureThought(
    db: PGlite,
    auth: AuthContext,
    rawParams: unknown,
  ) {
    const params = CaptureThoughtParams.parse(rawParams);
    const tenantId = auth.resolveTenantId(params.tenant_id);
    auth.checkScope(`tenant:${tenantId}:write`);

    const actorId = await auth.getActorForTenant(tenantId);
    const now = new Date().toISOString();

    // 1. Fetch available types for this tenant
    const typeNodes = await db.query<{
      node_id: string;
      data: Record<string, unknown>;
    }>(
      `SELECT node_id, data FROM nodes
       WHERE (tenant_id = $1 OR tenant_id = $2)
         AND type_node_id = $3
         AND is_deleted = false AND valid_to = 'infinity'`,
      [tenantId, SYSTEM_TENANT_ID, METATYPE_ID],
    );

    const entityTypes = typeNodes.rows
      .filter((r) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return d.kind === 'entity_type';
      })
      .map((r) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          name: d.name as string,
          description: d.description as string | undefined,
          label_schema: d.label_schema as Record<string, unknown> | undefined,
        };
      });

    const edgeTypes = typeNodes.rows
      .filter((r) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return d.kind === 'edge_type';
      })
      .map((r) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          name: d.name as string,
          description: d.description as string | undefined,
        };
      });

    // 2. Call LLM extraction
    let extraction: ExtractionResult;
    try {
      extraction = await extractionService.extract(
        params.content,
        params.source ?? 'manual',
        entityTypes,
        edgeTypes,
        [], // existing entities for dedup — simplified in gen1
      );
    } catch (e) {
      throw McpError.extractionFailed(
        `LLM extraction failed: ${(e as Error).message}`,
      );
    }

    // 3. Resolve types and run dedup
    const primaryTypeName = extraction.primary_entity.type;
    let primaryTypeNodeId: string;
    try {
      const resolved = await resolveEntityType(db, tenantId, primaryTypeName);
      primaryTypeNodeId = resolved.typeNodeId;
    } catch {
      // Unknown type from LLM — fall back to "note" or first available
      const noteType = entityTypes.find((t) => t.name === 'note');
      if (noteType) {
        const resolved = await resolveEntityType(db, tenantId, 'note');
        primaryTypeNodeId = resolved.typeNodeId;
      } else {
        // Use first available type
        const firstType = entityTypes[0];
        if (!firstType) throw McpError.extractionFailed('No entity types available');
        const resolved = await resolveEntityType(db, tenantId, firstType.name);
        primaryTypeNodeId = resolved.typeNodeId;
      }
    }

    // 4. Build execution plan
    const primaryId = generateUUIDv7();
    const eventId = generateUUIDv7();
    const allNodeIds: string[] = [primaryId];
    const allEdgeIds: string[] = [];
    const mentionedResults: Array<{
      entityId: string;
      entityType: string;
      isNew: boolean;
    }> = [];

    // Process mentioned entities
    for (const mentioned of extraction.mentioned_entities) {
      let mentionedTypeNodeId: string;
      try {
        const resolved = await resolveEntityType(db, tenantId, mentioned.type);
        mentionedTypeNodeId = resolved.typeNodeId;
      } catch {
        continue; // Skip unknown types
      }

      // Run dedup
      const dedup = await deduplicateEntity(
        db,
        tenantId,
        mentionedTypeNodeId,
        mentioned.data,
      );

      if (dedup.match) {
        mentionedResults.push({
          entityId: dedup.match.nodeId,
          entityType: mentioned.type,
          isNew: false,
        });
      } else {
        const mentionedId = generateUUIDv7();
        allNodeIds.push(mentionedId);
        mentionedResults.push({
          entityId: mentionedId,
          entityType: mentioned.type,
          isNew: true,
        });
      }
    }

    // 5. Atomic projection
    await db.query('BEGIN');
    try {
      // Create event
      await db.query(
        `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id,
                            node_ids, occurred_at, recorded_at, created_by)
         VALUES ($1, $2, 'thought_captured', $3, $4, $5, $6, $6, $7)`,
        [
          eventId,
          tenantId,
          JSON.stringify({
            content: params.content,
            source: params.source ?? 'manual',
            extraction_result: extraction,
          }),
          primaryId,
          allNodeIds,
          now,
          actorId,
        ],
      );

      // Create primary entity
      await db.query(
        `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, embedding,
                           epistemic, valid_from, valid_to,
                           recorded_at, created_by, created_by_event, is_deleted)
         VALUES ($1, $2, $3, $4, NULL, 'hypothesis', $5, 'infinity', $5, $6, $7, false)`,
        [
          primaryId,
          tenantId,
          primaryTypeNodeId,
          JSON.stringify(extraction.primary_entity.data),
          now,
          actorId,
          eventId,
        ],
      );

      // Create new mentioned entities
      for (let i = 0; i < mentionedResults.length; i++) {
        const m = mentionedResults[i]!;
        if (!m.isNew) continue;

        const mentionedData = extraction.mentioned_entities[i]?.data ?? {};
        let typeNodeId: string;
        try {
          const resolved = await resolveEntityType(db, tenantId, m.entityType);
          typeNodeId = resolved.typeNodeId;
        } catch {
          continue;
        }

        await db.query(
          `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, embedding,
                             epistemic, valid_from, valid_to,
                             recorded_at, created_by, created_by_event, is_deleted)
           VALUES ($1, $2, $3, $4, NULL, 'hypothesis', $5, 'infinity', $5, $6, $7, false)`,
          [m.entityId, tenantId, typeNodeId, JSON.stringify(mentionedData), now, actorId, eventId],
        );
      }

      // Create edges from relationships
      for (const rel of extraction.relationships) {
        let edgeTypeNodeId: string;
        try {
          edgeTypeNodeId = await resolveEdgeType(db, tenantId, rel.edge_type);
        } catch {
          continue; // Skip unknown edge types
        }

        const resolveRef = (ref: string | number): string | null => {
          if (ref === 'primary') return primaryId;
          if (typeof ref === 'number') return mentionedResults[ref]?.entityId ?? null;
          if (typeof ref === 'string' && ref.startsWith('existing:'))
            return ref.slice('existing:'.length);
          return null;
        };

        const sourceId = resolveRef(rel.source);
        const targetId = resolveRef(rel.target);
        if (!sourceId || !targetId) continue;

        const edgeId = generateUUIDv7();
        allEdgeIds.push(edgeId);

        await db.query(
          `INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id,
                             data, valid_from, valid_to, recorded_at,
                             created_by, created_by_event, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'infinity', $7, $8, $9, false)`,
          [
            edgeId,
            tenantId,
            edgeTypeNodeId,
            sourceId,
            targetId,
            JSON.stringify(rel.data ?? {}),
            now,
            actorId,
            eventId,
          ],
        );
      }

      // Update event with final edge_ids
      if (allEdgeIds.length > 0) {
        await db.query(
          `UPDATE events SET edge_ids = $2 WHERE event_id = $1`,
          [eventId, allEdgeIds],
        );
      }

      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }

    return {
      primary_entity: {
        entity_id: primaryId,
        entity_type: primaryTypeName,
        data: extraction.primary_entity.data,
      },
      mentioned_entities: mentionedResults.map((m) => ({
        entity_id: m.entityId,
        entity_type: m.entityType,
        is_new: m.isNew,
      })),
      edges_created: allEdgeIds.length,
      event_id: eventId,
    };
  };
}
