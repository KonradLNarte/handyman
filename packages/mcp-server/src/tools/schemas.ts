/**
 * Zod input/output schemas for all 15 MCP tools — spec §3.3a.
 */
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// store_entity
// ═══════════════════════════════════════════════════════════════
export const StoreEntityParams = z.object({
  entity_type: z.string().min(1).describe("Type node name, e.g. 'lead', 'booking'"),
  data: z.record(z.unknown()).describe('Entity fields as flat JSON'),
  entity_id: z.string().uuid().optional().describe('If provided, updates existing entity'),
  expected_version: z.string().optional().describe('Optimistic concurrency: valid_from of version being updated'),
  valid_from: z.string().optional().describe('Backdate business time (default: now)'),
  epistemic: z.enum(['hypothesis', 'asserted', 'confirmed']).optional().default('asserted'),
  tenant_id: z.string().uuid().optional().describe('Required if token spans multiple tenants'),
});

export const StoreEntityResult = z.object({
  entity_id: z.string().uuid(),
  entity_type: z.string(),
  data: z.record(z.unknown()),
  version: z.number().int().min(1),
  epistemic: z.enum(['hypothesis', 'asserted', 'confirmed']),
  valid_from: z.string(),
  event_id: z.string().uuid(),
  previous_version_id: z.string().nullable(),
});

// ═══════════════════════════════════════════════════════════════
// find_entities
// ═══════════════════════════════════════════════════════════════
export const FindEntitiesParams = z.object({
  query: z.string().optional().describe('Semantic search query (uses embeddings)'),
  entity_types: z.array(z.string()).optional().describe('Filter by type node name(s)'),
  filters: z.record(z.union([
    z.string(), z.number(), z.boolean(),
    z.object({ $eq: z.unknown() }),
    z.object({ $in: z.array(z.unknown()) }),
  ])).optional().describe('Structured filters on data fields'),
  epistemic: z.array(z.enum(['hypothesis', 'asserted', 'confirmed'])).optional(),
  tenant_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  cursor: z.string().optional().describe('Opaque cursor from previous response'),
  sort_by: z.enum(['relevance', 'created_at']).optional().default('relevance'),
});

export const FindEntitiesResult = z.object({
  results: z.array(z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    data: z.record(z.unknown()),
    similarity: z.number().optional(),
    epistemic: z.string(),
    valid_from: z.string(),
  })),
  total_count: z.number().int(),
  next_cursor: z.string().nullable(),
});

// ═══════════════════════════════════════════════════════════════
// connect_entities
// ═══════════════════════════════════════════════════════════════
export const ConnectEntitiesParams = z.object({
  edge_type: z.string().min(1),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  data: z.record(z.unknown()).optional().default({}),
});

export const ConnectEntitiesResult = z.object({
  edge_id: z.string().uuid(),
  edge_type: z.string(),
  source: z.object({ entity_id: z.string(), entity_type: z.string(), tenant_id: z.string() }),
  target: z.object({ entity_id: z.string(), entity_type: z.string(), tenant_id: z.string() }),
  is_cross_tenant: z.boolean(),
  event_id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════
// explore_graph
// ═══════════════════════════════════════════════════════════════
export const ExploreGraphParams = z.object({
  start_id: z.string().uuid(),
  edge_types: z.array(z.string()).optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both'),
  depth: z.number().int().min(1).max(5).optional().default(1),
  max_results: z.number().int().min(1).max(500).optional().default(50),
  include_data: z.boolean().optional().default(true),
});

export const ExploreGraphResult = z.object({
  center: z.object({ entity_id: z.string(), entity_type: z.string(), data: z.record(z.unknown()) }),
  connections: z.array(z.object({
    edge_id: z.string().uuid(),
    edge_type: z.string(),
    direction: z.enum(['outgoing', 'incoming']),
    entity: z.object({
      entity_id: z.string(), entity_type: z.string(),
      data: z.record(z.unknown()), tenant_id: z.string(), epistemic: z.string(),
    }),
    depth: z.number().int(),
  })),
});

// ═══════════════════════════════════════════════════════════════
// remove_entity
// ═══════════════════════════════════════════════════════════════
export const RemoveEntityParams = z.object({
  entity_id: z.string().uuid(),
});

export const RemoveEntityResult = z.object({
  removed: z.literal(true),
  entity_type: z.string(),
  event_id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════
// query_at_time
// ═══════════════════════════════════════════════════════════════
export const QueryAtTimeParams = z.object({
  entity_id: z.string().uuid(),
  at_time: z.string().describe('ISO timestamp for point-in-time query'),
  tenant_id: z.string().uuid().optional(),
});

export const QueryAtTimeResult = z.object({
  entity_id: z.string().uuid(),
  entity_type: z.string(),
  data: z.record(z.unknown()),
  epistemic: z.string(),
  valid_from: z.string(),
  valid_to: z.string(),
  was_deleted: z.boolean(),
});

// ═══════════════════════════════════════════════════════════════
// get_timeline
// ═══════════════════════════════════════════════════════════════
export const GetTimelineParams = z.object({
  entity_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  event_types: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const GetTimelineResult = z.object({
  events: z.array(z.object({
    event_id: z.string().uuid(),
    intent_type: z.string(),
    payload: z.record(z.unknown()),
    occurred_at: z.string(),
    created_by: z.string(),
  })),
  next_cursor: z.string().nullable(),
});

// ═══════════════════════════════════════════════════════════════
// capture_thought
// ═══════════════════════════════════════════════════════════════
export const CaptureThoughtParams = z.object({
  content: z.string().min(1).describe('Free-text input to extract entities from'),
  source: z.string().optional().default('manual').describe('Origin of the thought (e.g., "whatsapp", "voice_note")'),
  tenant_id: z.string().uuid().optional(),
});

export const CaptureThoughtResult = z.object({
  primary_entity: z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    data: z.record(z.unknown()),
  }),
  mentioned_entities: z.array(z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    is_new: z.boolean(),
  })),
  edges_created: z.number().int(),
  event_id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════
// get_schema
// ═══════════════════════════════════════════════════════════════
export const GetSchemaParams = z.object({
  entity_type: z.string().optional().describe('Specific type name, or omit for all types'),
  tenant_id: z.string().uuid().optional(),
});

export const GetSchemaResult = z.object({
  types: z.array(z.object({
    name: z.string(),
    kind: z.string(),
    description: z.string().optional(),
    label_schema: z.record(z.unknown()).optional(),
    node_id: z.string().uuid(),
  })),
});

// ═══════════════════════════════════════════════════════════════
// get_stats
// ═══════════════════════════════════════════════════════════════
export const GetStatsParams = z.object({
  tenant_id: z.string().uuid().optional(),
});

export const GetStatsResult = z.object({
  tenant_id: z.string(),
  entity_count: z.number().int(),
  edge_count: z.number().int(),
  event_count: z.number().int(),
  type_counts: z.record(z.number()),
});

// ═══════════════════════════════════════════════════════════════
// propose_event
// ═══════════════════════════════════════════════════════════════
export const ProposeEventParams = z.object({
  intent_type: z.string(),
  payload: z.record(z.unknown()),
  tenant_id: z.string().uuid().optional(),
});

export const ProposeEventResult = z.object({
  event_id: z.string().uuid(),
  intent_type: z.string(),
  projected: z.boolean(),
});

// ═══════════════════════════════════════════════════════════════
// verify_lineage
// ═══════════════════════════════════════════════════════════════
export const VerifyLineageParams = z.object({
  entity_id: z.string().uuid().optional().describe('Verify specific entity, or all if omitted'),
  tenant_id: z.string().uuid().optional(),
});

export const VerifyLineageResult = z.object({
  valid: z.boolean(),
  checked: z.number().int(),
  violations: z.array(z.object({
    entity_id: z.string(),
    issue: z.string(),
  })),
});

// ═══════════════════════════════════════════════════════════════
// store_blob / get_blob
// ═══════════════════════════════════════════════════════════════
export const StoreBlobParams = z.object({
  content_type: z.string(),
  data_base64: z.string(),
  related_entity_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
});

export const StoreBlobResult = z.object({
  blob_id: z.string().uuid(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  event_id: z.string().uuid(),
});

export const GetBlobParams = z.object({
  blob_id: z.string().uuid(),
});

export const GetBlobResult = z.object({
  blob_id: z.string().uuid(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  data_base64: z.string(),
});

// ═══════════════════════════════════════════════════════════════
// lookup_dict
// ═══════════════════════════════════════════════════════════════
export const LookupDictParams = z.object({
  dict_type: z.string(),
  key: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
});

export const LookupDictResult = z.object({
  entries: z.array(z.object({
    key: z.string(),
    value: z.record(z.unknown()),
  })),
});
