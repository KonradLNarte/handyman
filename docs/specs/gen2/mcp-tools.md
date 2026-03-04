# RESONANSIA MCP SERVER — GEN 2 SPEC

> Part of [Gen2 Spec](index.md)

## 3. MCP TOOL INTERFACE

### 3.1 Design principles

These principles override implementation convenience:

1. **Outcome over operation** — Tools represent agent goals, not database operations. An agent should accomplish its intent in 1-2 tool calls, not 5.
2. **Flat arguments** — Top-level primitives and constrained types. No nested dicts as params.
3. **5-15 tools total** — Curate ruthlessly. Each tool has one clear purpose.
4. **Every mutation emits an event** — Automatic. The caller does not need to emit events separately. The event is created FIRST, then fact tables are projected.
5. **Every mutation returns the created/modified entity** — No need for a follow-up read.
6. **Errors enable self-correction** — Error messages tell the agent what went wrong and how to fix it.
7. **Epistemic defaults** — `capture_thought` creates `hypothesis` entities. `store_entity` creates `asserted` entities. Agents can promote status explicitly.
8. **Reflexive ontology** — Type nodes are queryable through the same tools as data nodes. An agent that knows how to `explore_graph` already knows how to discover the schema. `get_schema` is a convenience shortcut, not a separate system. Gen1 must not introduce a parallel type registry that diverges from the graph.

References:
- https://www.philschmid.de/mcp-best-practices
- https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/

### 3.2 Tools (12 primary)

```yaml
# ─── ENTITY MANAGEMENT ───

store_entity:
  description: "Create or update an entity in the knowledge graph. Returns the full entity with ID. Creates an event FIRST, then projects to nodes table."
  params:
    entity_type: string            # type node name, e.g. "lead", "booking"
    data: object                   # entity fields as flat JSON
    entity_id: string?             # if provided, updates existing (creates new version)
    expected_version: datetime?    # optimistic concurrency: valid_from of the version being updated. If provided and does not match current version, returns CONFLICT error. See INV-CONCURRENCY.
    valid_from: datetime?          # backdate business time (default: now)
    epistemic: string?             # 'asserted' (default) or 'confirmed'. Never 'hypothesis' — use capture_thought for that.
    tenant_id: string?             # required only if token spans multiple tenants
  returns:
    entity_id: string
    entity_type: string
    data: object
    version: int
    epistemic: string
    valid_from: datetime
    event_id: string               # the event that created this projection
    previous_version_id: string?
  auto_side_effects:
    - creates event (intent_type: "entity_created" or "entity_updated")
    - projects to nodes table with created_by_event reference
    - queues async embedding generation
    - validates data against type node schema if schema defined
    - if expected_version provided and does not match current version: returns CONFLICT error (no event created)
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

find_entities:
  description: "Search entities by semantic similarity, structured filters, or both. Use this to find entities matching a natural language query or specific field values."
  params:
    query: string?                 # semantic search (uses embeddings). omit for structured-only search.
    entity_types: string[]?        # filter by type node name(s)
    filters: object?               # field-level filters using operator syntax (see filter_operators below)
    epistemic: string[]?           # filter by epistemic status, e.g. ["asserted", "confirmed"]
    tenant_id: string?
    limit: int?                    # default 10, max 100
    cursor: string?                # opaque cursor from previous response for pagination
    sort_by: string?               # "relevance" (default for semantic) | "created_at"
  filter_operators: |
    Filters support the following operators applied to JSONB data fields:
      { "field": "value" }              — equality (shorthand, default)
      { "field": { "$eq": "value" } }   — explicit equality
      { "field": { "$contains": "sub" } } — text contains (case-insensitive)
      { "field": { "$gte": 100 } }      — greater than or equal
      { "field": { "$lte": 200 } }      — less than or equal
      { "field": { "$in": ["a","b"] } } — value in set
      { "field": { "$exists": true } }  — field exists in JSONB
    [RESOLVED:gen1 D-010] Gen1 supports equality + $in only.
    [DECIDE:gen2] Add $gte, $lte, $contains, $exists operators.
  returns:
    results: [{ entity_id, entity_type, data, similarity?, epistemic, valid_from }]
    total_count: int
    next_cursor: string?           # null if no more results
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

connect_entities:
  description: "Create a typed relationship between two entities. Works across tenant boundaries if token has access to both."
  params:
    edge_type: string              # type node name, e.g. "contacted_via", "includes"
    source_id: string
    target_id: string
    data: object?
  returns:
    edge_id: string
    edge_type: string
    source: { entity_id, entity_type, tenant_id }
    target: { entity_id, entity_type, tenant_id }
    is_cross_tenant: boolean
    event_id: string
  auto_side_effects:
    - creates event (intent_type: "edge_created") FIRST
    - projects to edges table with created_by_event
    - validates both endpoints exist and are accessible
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

explore_graph:
  description: "Starting from an entity, traverse relationships to discover connected entities. Returns a subgraph centered on the start node."
  params:
    start_id: string
    edge_types: string[]?          # filter by relationship types. omit for all.
    direction: "outgoing" | "incoming" | "both"?  # default "both"
    depth: int?                    # max traversal depth. default 1, max 5.
    max_results: int?              # max total connected entities returned. default 50, max 500.
    include_data: boolean?         # include full entity data. default true.
    filters: object?               # filter connected entities by field values
  returns:
    center: { entity_id, entity_type, data }
    connections: [{
      edge_id, edge_type, direction,
      entity: { entity_id, entity_type, data, tenant_id, epistemic },
      depth: int
    }]
    # Entities the caller cannot access are omitted silently (not errors).
    # Grants table is consulted for cross-tenant traversal.
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

remove_entity:
  description: "Soft-delete an entity. It remains in history and audit trail but is excluded from search and list results."
  params:
    entity_id: string
  returns:
    removed: true
    entity_type: string
    event_id: string
  auto_side_effects:
    - creates event (intent_type: "entity_removed") FIRST
    - sets is_deleted=true, valid_to=now() on node
    - connected edges become dangling (queryable for audit, excluded from explore_graph)
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

# ─── TEMPORAL ───

query_at_time:
  description: "Retrieve an entity's state at a specific point in time. Supports 'what was true then?' (business time) and 'what did we know then?' (system time)."
  params:
    entity_id: string
    valid_at: datetime             # business time
    recorded_at: datetime?         # system time (default: now)
  returns:
    entity_id: string
    entity_type: string
    data: object
    epistemic: string
    valid_from: datetime
    valid_to: datetime
    recorded_at: datetime
    # Returns null with explanation if no version matches.
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

get_timeline:
  description: "Get chronological history of an entity: all versions, related events, and changes over time."
  params:
    entity_id: string
    include_related_events: boolean?  # include events from connected entities. default false.
    time_range: { from: datetime?, to: datetime? }?
    limit: int?                    # default 50
    cursor: string?                # opaque cursor from previous response for pagination
  returns:
    entity: { entity_id, entity_type, current_data }
    timeline: [{
      timestamp: datetime,
      type: "version_change" | "event" | "edge_created" | "edge_removed" | "epistemic_change",
      data: object,
      created_by: string,
      event_id: string
    }]
    next_cursor: string?           # null if no more results
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

# ─── CAPTURE ───

capture_thought:
  description: "Submit free-text input. System extracts structured data, classifies entity type, identifies mentioned entities, and creates nodes + edges automatically. All created entities get epistemic status 'hypothesis'."
  params:
    content: string                # free-text: note, message, observation
    source: string?                # origin: "slack", "email", "manual", "agent"
    tenant_id: string?
  returns:
    created_node: { entity_id, entity_type, data, epistemic: "hypothesis" }
    extracted_entities: [{ entity_id, entity_type, relationship, is_new, match_confidence? }]
    action_items: string[]?
  implementation_notes: |
    1. Fetch tenant's type nodes (available entity types + schemas)
    2. Call LLM to extract: type classification, structured fields, mentioned entities, action items
    3. For each mentioned entity: DEDUPLICATE before creating
       - Search existing entities by name similarity (embedding + fuzzy text match)
       - If match confidence > threshold: link to existing entity
       - If match confidence < threshold: create new entity as 'hypothesis'
       - Return match_confidence in response for transparency
    4. Create primary node via store_entity (with epistemic override to 'hypothesis')
    5. Create edges between primary node and mentioned/found entities
    6. Emit event: "thought_captured"
    LLM must be type-node-aware: prompt includes tenant's available types and their schemas.
  prompt_skeleton: |
    Gen1-spec MUST refine this skeleton into a complete, tested prompt template.
    This is the structural starting point — not a final prompt.

    ---
    System: You are an entity extraction agent for the "{tenant_name}" knowledge graph.

    AVAILABLE ENTITY TYPES (from type nodes):
    {for each type_node: name, description, label_schema as JSON Schema}

    EXISTING ENTITIES (potential deduplication targets):
    {top N entities by recent activity or embedding similarity to input, format: id, type, name/summary}

    TASK:
    Given the free-text input below, extract:
    1. PRIMARY ENTITY: The main thing being described. Classify its type from the available types above.
    2. STRUCTURED FIELDS: Map free-text attributes to the type's label_schema fields.
    3. MENTIONED ENTITIES: Other entities referenced in the text. For each:
       - Check if it matches an existing entity (provide match_id and confidence 0-1)
       - If no match, provide enough data to create a new entity
    4. RELATIONSHIPS: Edges between the primary entity and mentioned entities (with edge type from available types).
    5. ACTION ITEMS: Any implied next steps or tasks.

    OUTPUT FORMAT (strict JSON, no markdown):
    {
      "primary_entity": { "type": "...", "data": { ... } },
      "mentioned_entities": [
        { "type": "...", "data": { ... }, "existing_match_id": "..." | null, "match_confidence": 0.0-1.0 }
      ],
      "relationships": [
        { "edge_type": "...", "source": "primary" | index, "target": "primary" | index | "existing:ID", "data": { ... } }
      ],
      "action_items": ["..."]
    }

    FREE-TEXT INPUT:
    {content}
    ---
  deduplication_strategy: |
    [RESOLVED:gen1 D-009] Entity deduplication: Hybrid embedding + LLM disambiguation.
    Inspired by Graphiti's three-tier approach but simplified for gen1 scale (<10K entities/tenant).

    DEDUPLICATION ALGORITHM (pseudocode):
    ```
    function deduplicate(extracted_entity, tenant_id):
      name = normalize(extracted_entity.name)  // lowercase, trim, collapse whitespace

      // TIER 1: Exact match (O(1))
      exact = query_nodes(tenant_id, type=extracted_entity.type, data->>'name' ILIKE name, active_only=true)
      if exact.length == 1:
        return { match: exact[0], confidence: 1.0, method: "exact" }

      // TIER 2: Embedding similarity
      query_embedding = generate_embedding(name + " " + JSON.stringify(extracted_entity.data))
      candidates = vector_search(tenant_id, query_embedding, types=[extracted_entity.type], limit=5)
      // Filter by similarity threshold
      strong_matches = candidates.filter(c => c.similarity > 0.95)
      if strong_matches.length == 1:
        return { match: strong_matches[0], confidence: strong_matches[0].similarity, method: "embedding" }

      // TIER 3: LLM disambiguation (only for ambiguous zone 0.85-0.95)
      uncertain_matches = candidates.filter(c => c.similarity > 0.85 && c.similarity <= 0.95)
      if uncertain_matches.length > 0:
        llm_result = ask_llm_to_disambiguate(extracted_entity, uncertain_matches)
        if llm_result.is_match:
          return { match: llm_result.matched_entity, confidence: llm_result.confidence, method: "llm" }

      // No match found — create new entity
      return { match: null, confidence: 0.0, method: "none" }
    ```

    THRESHOLDS:
      - > 0.95 cosine similarity: auto-link (high confidence)
      - 0.85 - 0.95: LLM disambiguation (uncertain zone)
      - < 0.85: create new entity
    question_this_if: "Duplicate entities exceed 5% of total OR false positives exceed 2%"
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

# ─── DISCOVERY ───

get_schema:
  description: "Discover what entity types, relationship types, and event types exist in a tenant. Returns type nodes with their schemas and usage counts. Use this first to understand the data model before querying. Note: this is a convenience tool — the same information is available via explore_graph(start_id=METATYPE_NODE) or find_entities(entity_types=['type_node'])."
  params:
    tenant_id: string?
  returns:
    entity_types: [{ name, schema, node_count, example_fields, type_node_id }]
    edge_types: [{ name, schema, edge_count, type_node_id }]
    event_types: [{ name, event_count, last_occurred_at }]
  implementation_constraint: |
    get_schema MUST query the nodes table (where type_node_id = metatype), not a separate
    registry or hardcoded view. This preserves the reflexive property: type nodes are nodes,
    and any tool that works on nodes also works on type nodes. If a type node is created via
    store_entity, it must immediately appear in get_schema results without additional sync.
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

get_stats:
  description: "Dashboard-level statistics for a tenant: totals, recent activity, data freshness."
  params:
    tenant_id: string?
  returns:
    totals: { nodes, edges, events, grants, blobs }
    by_type: { [entity_type]: count }
    by_epistemic: { hypothesis: count, asserted: count, confirmed: count }
    recent_activity: [{ event_type, count_last_7d, last_occurred_at }]
    data_freshness: { newest_node, newest_event, oldest_unembedded_node }
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

# ─── ADVANCED / SYSTEM ───

propose_event:
  description: "Submit a raw event directly. For system-to-system integration and advanced use cases. Handles validation, event creation, and projection to fact tables. Most agents should use store_entity/connect_entities/remove_entity instead."
  params:
    stream_id: string              # the entity this event belongs to
    intent_type: string            # must match a type node of kind 'event_type'
    payload: object                # event-specific data
    occurred_at: datetime?         # business time (default: now)
    tenant_id: string?
  returns:
    event_id: string
    stream_id: string
    projected_changes: object      # summary of what changed in fact tables
  auto_side_effects:
    - validates intent_type against type nodes
    - validates payload against intent_type schema if defined
    - creates event row
    - runs projection logic to update fact tables
    - returns projected changes
  error_codes:
    INVALID_INTENT: "intent_type does not match any type node of kind 'event_type' in tenant."
    SCHEMA_VIOLATION: "payload does not match schema for intent_type."
    UNAUTHORIZED: "Actor lacks required scope for this operation."
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

verify_lineage:
  description: "Verify event lineage integrity for an entity. Checks that all fact rows reference existing events and that the event stream is consistent. Returns integrity report."
  params:
    entity_id: string
  returns:
    entity_id: string
    event_count: int
    is_valid: boolean
    fact_rows_checked: int         # total nodes/edges/grants rows checked
    orphaned_facts: [{ table, row_id, missing_event_id }]?  # facts referencing non-existent events
    timeline_gaps: [{ expected_after_event_id, actual_next_event_id }]?
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)
```

### 3.3 Utility tools (3)

```yaml
store_blob:
  params: { data_base64: string, content_type: string, related_entity_id: string? }
  returns: { blob_id, content_type, size_bytes, storage_ref }
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

get_blob:
  params: { blob_id: string }
  returns: { blob_id, content_type, data_base64 }
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

lookup_dict:
  params: { dict_type: string, key: string?, valid_at: datetime? }
  returns: { entries: [{ key, value, valid_from, valid_to }] }
  gen1_spec_delivered:  # SATISFIED by sections 3.3a (Zod schemas), 3.4 (projection), 3.5 (errors)
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)
```

**Total: 15 tools** (12 primary + 3 utility). Within the recommended 5-15 range.

### 3.3a Tool schemas (gen1 — Zod notation)

Gen1-impl MUST implement these exact schemas. All types use Zod syntax.

```typescript
// ─── store_entity ───
const StoreEntityParams = z.object({
  entity_type: z.string().min(1).describe("Type node name, e.g. 'lead', 'booking'"),
  data: z.record(z.unknown()).describe("Entity fields as flat JSON"),
  entity_id: z.string().uuid().optional().describe("If provided, updates existing entity"),
  expected_version: z.string().datetime().optional().describe("Optimistic concurrency: valid_from of version being updated"),
  valid_from: z.string().datetime().optional().describe("Backdate business time (default: now)"),
  epistemic: z.enum(["asserted", "confirmed"]).optional().default("asserted"),
  tenant_id: z.string().uuid().optional().describe("Required if token spans multiple tenants"),
});

const StoreEntityResult = z.object({
  entity_id: z.string().uuid(),
  entity_type: z.string(),
  data: z.record(z.unknown()),
  version: z.number().int().min(1),  // monotonic version = COUNT(*) of node rows with this node_id
  epistemic: z.enum(["hypothesis", "asserted", "confirmed"]),
  valid_from: z.string().datetime(),
  event_id: z.string().uuid(),
  previous_version_id: z.string().uuid().nullable(),  // valid_from of previous version, null if version=1
});

// ─── find_entities ───
const FindEntitiesParams = z.object({
  query: z.string().optional().describe("Semantic search query (uses embeddings)"),
  entity_types: z.array(z.string()).optional().describe("Filter by type node name(s)"),
  filters: z.record(z.union([
    z.string(), z.number(), z.boolean(),                    // equality shorthand
    z.object({ "$eq": z.unknown() }),                        // explicit equality
    z.object({ "$in": z.array(z.unknown()) }),               // value in set
  ])).optional().describe("Structured filters on data fields"),
  epistemic: z.array(z.enum(["hypothesis", "asserted", "confirmed"])).optional(),
  tenant_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  cursor: z.string().optional().describe("Opaque cursor from previous response"),
  sort_by: z.enum(["relevance", "created_at"]).optional().default("relevance"),
});

const FindEntitiesResult = z.object({
  results: z.array(z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    data: z.record(z.unknown()),
    similarity: z.number().optional(),
    epistemic: z.string(),
    valid_from: z.string().datetime(),
  })),
  total_count: z.number().int(),
  next_cursor: z.string().nullable(),
});

// ─── connect_entities ───
const ConnectEntitiesParams = z.object({
  edge_type: z.string().min(1),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  data: z.record(z.unknown()).optional().default({}),
});

const ConnectEntitiesResult = z.object({
  edge_id: z.string().uuid(),
  edge_type: z.string(),
  source: z.object({ entity_id: z.string(), entity_type: z.string(), tenant_id: z.string() }),
  target: z.object({ entity_id: z.string(), entity_type: z.string(), tenant_id: z.string() }),
  is_cross_tenant: z.boolean(),
  event_id: z.string().uuid(),
});

// ─── explore_graph ───
const ExploreGraphParams = z.object({
  start_id: z.string().uuid(),
  edge_types: z.array(z.string()).optional(),
  direction: z.enum(["outgoing", "incoming", "both"]).optional().default("both"),
  depth: z.number().int().min(1).max(5).optional().default(1),
  max_results: z.number().int().min(1).max(500).optional().default(50),
  include_data: z.boolean().optional().default(true),
  filters: z.record(z.unknown()).optional(),
});

const ExploreGraphResult = z.object({
  center: z.object({ entity_id: z.string(), entity_type: z.string(), data: z.record(z.unknown()) }),
  connections: z.array(z.object({
    edge_id: z.string().uuid(),
    edge_type: z.string(),
    direction: z.enum(["outgoing", "incoming"]),
    entity: z.object({
      entity_id: z.string(), entity_type: z.string(),
      data: z.record(z.unknown()), tenant_id: z.string(), epistemic: z.string(),
    }),
    depth: z.number().int(),
  })),
});

// ─── capture_thought ───
const CaptureThoughtParams = z.object({
  content: z.string().min(1).max(10000).describe("Free-text input"),
  source: z.enum(["slack", "email", "manual", "agent", "sms", "whatsapp"]).optional().default("manual"),
  tenant_id: z.string().uuid().optional(),
});

const CaptureThoughtResult = z.object({
  created_node: z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    data: z.record(z.unknown()),
    epistemic: z.literal("hypothesis"),
  }),
  extracted_entities: z.array(z.object({
    entity_id: z.string().uuid(),
    entity_type: z.string(),
    relationship: z.string(),
    is_new: z.boolean(),
    match_confidence: z.number().optional(),
  })),
  action_items: z.array(z.string()).optional(),
});

// ─── query_at_time ───
const QueryAtTimeParams = z.object({
  entity_id: z.string().uuid(),
  valid_at: z.string().datetime(),
  recorded_at: z.string().datetime().optional(),
});

const QueryAtTimeResult = z.object({
  entity_id: z.string().uuid(),
  entity_type: z.string(),
  data: z.record(z.unknown()),
  epistemic: z.string(),
  valid_from: z.string().datetime(),
  valid_to: z.string().datetime(),
  recorded_at: z.string().datetime(),
}).nullable();

// ─── get_timeline ───
// Note: time_from/time_to are flat params (section 3.1 principle #2: flat arguments)
const GetTimelineParams = z.object({
  entity_id: z.string().uuid(),
  include_related_events: z.boolean().optional().default(false),
  time_from: z.string().datetime().optional().describe("Start of time range filter"),
  time_to: z.string().datetime().optional().describe("End of time range filter"),
  limit: z.number().int().min(1).max(500).optional().default(50),
  cursor: z.string().optional(),
});

// ─── remove_entity ───
const RemoveEntityParams = z.object({ entity_id: z.string().uuid() });
const RemoveEntityResult = z.object({ removed: z.literal(true), entity_type: z.string(), event_id: z.string().uuid() });

// ─── get_schema ───
const GetSchemaParams = z.object({ tenant_id: z.string().uuid().optional() });

// ─── get_stats ───
const GetStatsParams = z.object({ tenant_id: z.string().uuid().optional() });

// ─── propose_event ───
const ProposeEventParams = z.object({
  stream_id: z.string().uuid(),
  intent_type: z.string().min(1),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime().optional(),
  tenant_id: z.string().uuid().optional(),
});

// ─── verify_lineage ───
const VerifyLineageParams = z.object({ entity_id: z.string().uuid() });

// ─── store_blob ───
const StoreBlobParams = z.object({
  data_base64: z.string().min(1),
  content_type: z.string().min(1),
  related_entity_id: z.string().uuid().optional(),
});

// ─── get_blob ───
const GetBlobParams = z.object({ blob_id: z.string().uuid() });

// ─── lookup_dict ───
const LookupDictParams = z.object({
  dict_type: z.string().min(1),
  key: z.string().optional(),
  valid_at: z.string().datetime().optional(),
});
const LookupDictResult = z.object({
  entries: z.array(z.object({
    key: z.string(), value: z.record(z.unknown()),
    valid_from: z.string().datetime(), valid_to: z.string().datetime(),
  })),
});

// ─── get_schema result ───
const GetSchemaResult = z.object({
  entity_types: z.array(z.object({
    name: z.string(), schema: z.record(z.unknown()).nullable(),
    node_count: z.number().int(), example_fields: z.array(z.string()),
    type_node_id: z.string().uuid(),
  })),
  edge_types: z.array(z.object({
    name: z.string(), schema: z.record(z.unknown()).nullable(),
    edge_count: z.number().int(), type_node_id: z.string().uuid(),
  })),
  event_types: z.array(z.object({
    name: z.string(), event_count: z.number().int(),
    last_occurred_at: z.string().datetime().nullable(),
  })),
});

// ─── get_stats result ───
const GetStatsResult = z.object({
  totals: z.object({
    nodes: z.number().int(), edges: z.number().int(), events: z.number().int(),
    grants: z.number().int(), blobs: z.number().int(),
  }),
  by_type: z.record(z.number().int()),
  by_epistemic: z.object({
    hypothesis: z.number().int(), asserted: z.number().int(), confirmed: z.number().int(),
  }),
  recent_activity: z.array(z.object({
    event_type: z.string(), count_last_7d: z.number().int(),
    last_occurred_at: z.string().datetime().nullable(),
  })),
  data_freshness: z.object({
    newest_node: z.string().datetime().nullable(),
    newest_event: z.string().datetime().nullable(),
    oldest_unembedded_node: z.string().datetime().nullable(),
  }),
});

// ─── get_timeline result ───
const GetTimelineResult = z.object({
  entity: z.object({
    entity_id: z.string().uuid(), entity_type: z.string(),
    current_data: z.record(z.unknown()),
  }),
  timeline: z.array(z.object({
    timestamp: z.string().datetime(),
    type: z.enum(["version_change", "event", "edge_created", "edge_removed", "epistemic_change"]),
    data: z.record(z.unknown()), created_by: z.string().uuid(),
    event_id: z.string().uuid(),
  })),
  next_cursor: z.string().nullable(),
});

// ─── propose_event result ───
const ProposeEventResult = z.object({
  event_id: z.string().uuid(), stream_id: z.string().uuid(),
  projected_changes: z.record(z.unknown()),
});

// ─── verify_lineage result ───
const VerifyLineageResult = z.object({
  entity_id: z.string().uuid(), event_count: z.number().int(),
  is_valid: z.boolean(), fact_rows_checked: z.number().int(),
  orphaned_facts: z.array(z.object({
    table: z.string(), row_id: z.string(), missing_event_id: z.string(),
  })),
  timeline_gaps: z.array(z.object({
    expected_after_event_id: z.string(), actual_next_event_id: z.string(),
  })),
});

// ─── store_blob result ───
const StoreBlobResult = z.object({
  blob_id: z.string().uuid(), content_type: z.string(),
  size_bytes: z.number().int(), storage_ref: z.string(),
});

// ─── get_blob result ───
const GetBlobResult = z.object({
  blob_id: z.string().uuid(), content_type: z.string(),
  data_base64: z.string(),
});
```

### 3.4 Projection matrix (event → fact table mutations)

This matrix defines how each event `intent_type` maps to mutations on fact tables. It is the skeleton of the event-sourcing engine. Gen1-spec MUST expand each row into full pseudocode; gen1-impl translates pseudocode to executable code.

```yaml
# ── PROJECTION MATRIX ──
# Format: intent_type → [fact table mutation(s)]
# All mutations happen within a single database transaction (see INV-ATOMIC, section 3.5).

entity_created:
  trigger: store_entity (new entity, no entity_id provided)
  mutations:
    - INSERT events (intent_type="entity_created", payload={type, data, epistemic})
    - INSERT nodes (node_id=event.stream_id, type_node_id=resolved, data=payload.data, epistemic=payload.epistemic, valid_from=now, valid_to=infinity, created_by_event=event.event_id)
  post_tx:
    - queue async embedding for new node

entity_updated:
  trigger: store_entity (existing entity, entity_id provided)
  mutations:
    - INSERT events (intent_type="entity_updated", payload={entity_id, old_data_summary, new_data, epistemic})
    - UPDATE nodes SET valid_to=now() WHERE node_id=entity_id AND valid_to='infinity'   # close current version
    - INSERT nodes (node_id=entity_id, data=new_data, epistemic=new_or_same, valid_from=now, valid_to=infinity, created_by_event=event.event_id)   # open new version
  post_tx:
    - queue async embedding for new version

entity_removed:
  trigger: remove_entity
  mutations:
    - INSERT events (intent_type="entity_removed", payload={entity_id})
    - UPDATE nodes SET is_deleted=true, valid_to=now() WHERE node_id=entity_id AND valid_to='infinity'

edge_created:
  trigger: connect_entities
  mutations:
    - INSERT events (intent_type="edge_created", payload={edge_type, source_id, target_id, data})
    - INSERT edges (edge_id=gen_uuid, source_id, target_id, type_node_id=resolved, data, valid_from=now, valid_to=infinity, created_by_event=event.event_id)

edge_removed:
  trigger: (future tool or side effect of remove_entity on dangling edges)
  mutations:
    - INSERT events (intent_type="edge_removed", payload={edge_id})
    - UPDATE edges SET is_deleted=true, valid_to=now() WHERE edge_id=X AND valid_to='infinity'

epistemic_change:
  trigger: store_entity with changed epistemic status on existing entity
  mutations:
    - (same as entity_updated, but intent_type="epistemic_change" for audit clarity)
    - INSERT events (intent_type="epistemic_change", payload={entity_id, old_epistemic, new_epistemic})
    - UPDATE nodes SET valid_to=now() WHERE node_id=entity_id AND valid_to='infinity'
    - INSERT nodes (node_id=entity_id, data=current_data, epistemic=new_epistemic, valid_from=now, valid_to=infinity, created_by_event=event.event_id)

thought_captured:
  trigger: capture_thought
  mutations:
    - INSERT events (intent_type="thought_captured", payload={content, source, extraction_result})
    - For primary entity: INSERT nodes (epistemic='hypothesis', created_by_event=event.event_id)
    - For each new mentioned entity: INSERT nodes (epistemic='hypothesis', created_by_event=event.event_id)
    - For each relationship: INSERT edges (created_by_event=event.event_id)
    - For existing entity matches: INSERT edges only (no new nodes)
  pre_tx:
    - LLM extraction call happens BEFORE the transaction (external side effect)
    - Entity deduplication search happens BEFORE the transaction
  post_tx:
    - queue async embeddings for all new nodes

grant_created:
  trigger: (admin action, future tool)
  mutations:
    - INSERT events (intent_type="grant_created", payload={subject_tenant, object_node, capability})
    - INSERT grants (created_by_event=event.event_id)

grant_revoked:
  trigger: (admin action, future tool)
  mutations:
    - INSERT events (intent_type="grant_revoked", payload={grant_id})
    - UPDATE grants SET is_deleted=true, valid_to=now() WHERE grant_id=X
```

**Gen1-spec precision requirement:** Each row above must be expanded to include exact column values, exact SQL statements or pseudocode, and exact error conditions. The matrix must be complete — every possible `intent_type` must be listed.

### 3.5 Transaction boundaries and error model

This section defines how mutations maintain consistency between the event layer and the fact layer.

```yaml
# ── TRANSACTION MODEL ──

principle: |
  Every mutation follows the same pattern:
  1. VALIDATE — check permissions, resolve types, verify constraints (outside tx)
  2. EXTERNAL CALLS — LLM extraction, entity search for deduplication (outside tx, capture_thought only)
  3. BEGIN TRANSACTION
  4. WRITE EVENT — INSERT into events table
  5. PROJECT — INSERT/UPDATE fact tables (nodes, edges, grants)
  6. COMMIT TRANSACTION
  7. ASYNC SIDE EFFECTS — queue embedding generation, notifications (outside tx)

  If step 5 fails, step 4 is rolled back. No orphaned events exist. (See INV-ATOMIC.)
  If step 7 fails, the entity exists but may lack embeddings temporarily. This is acceptable.

failure_modes:
  validation_failure:
    description: "Input doesn't pass schema/auth checks"
    behavior: "Return error immediately, no event created, no DB writes"
    examples: ["invalid entity_type", "missing required field", "auth denied"]

  projection_failure:
    description: "Event is valid but fact table write fails (constraint violation, FK error)"
    behavior: "ROLLBACK entire transaction including event. Return error with details."
    examples: ["EXCLUDE constraint on overlapping valid ranges", "FK to nonexistent type_node"]

  concurrency_conflict:
    description: "expected_version does not match current version"
    behavior: "Return CONFLICT error with current version info. No event created."
    examples: ["Two agents updating same lead simultaneously"]

  external_call_failure:
    description: "LLM or embedding API call fails"
    behavior: |
      - capture_thought LLM failure: return error, no entities created
      - Embedding generation failure: entity is created without embedding, embedding is retried via async queue
      - Embedding failures MUST NOT prevent entity creation (embeddings are eventual)

  partial_capture_thought:
    description: "LLM extraction succeeds but one of multiple entity/edge inserts fails"
    behavior: "ROLLBACK entire transaction. All-or-nothing for the capture. Return error with extraction result so agent can retry or store manually."

# ── ERROR CODE REGISTRY (gen1 — exact codes) ──

error_codes:
  E001_VALIDATION_ERROR:
    code: "VALIDATION_ERROR"
    http_status: 400
    template: "Validation failed: {details}"
    details_examples:
      - "Missing required parameter: entity_type"
      - "Invalid entity_type: 'foo' is not a recognized type node in tenant"
      - "Parameter 'limit' must be between 1 and 100"

  E002_NOT_FOUND:
    code: "NOT_FOUND"
    http_status: 404
    template: "Not found: {resource_type} with id '{id}'"
    details_examples:
      - "Not found: entity with id '30000000-...'"
      - "Not found: type_node with name 'nonexistent'"

  E003_AUTH_DENIED:
    code: "AUTH_DENIED"
    http_status: 403
    template: "Access denied: {reason}"
    details_examples:
      - "Access denied: token lacks scope 'tenant:T1:nodes:lead:write'"
      - "Access denied: token does not cover tenant 'T2'"

  E004_CONFLICT:
    code: "CONFLICT"
    http_status: 409
    template: "Conflict: entity '{entity_id}' was modified. Expected version {expected}, current version {actual}."
    details: "Returned when expected_version is provided and doesn't match current node's valid_from."

  E005_CROSS_TENANT_DENIED:
    code: "CROSS_TENANT_DENIED"
    http_status: 403
    template: "Cross-tenant access denied: no grant for {capability} on node '{node_id}' in tenant '{tenant_id}'"
    details: "Returned when cross-tenant edge creation or traversal fails grants check."

  E006_SCHEMA_VIOLATION:
    code: "SCHEMA_VIOLATION"
    http_status: 400
    template: "Schema violation for type '{entity_type}': {validation_errors}"
    details: "Returned when entity data doesn't match type_node's label_schema. Includes JSON Schema validation errors."

  E007_EXTRACTION_FAILED:
    code: "EXTRACTION_FAILED"
    http_status: 422
    template: "Entity extraction failed: {reason}"
    details_examples:
      - "LLM returned invalid JSON"
      - "LLM extraction timed out after 30s"
      - "No entity type could be classified from input"

  E008_RATE_LIMITED:
    code: "RATE_LIMITED"
    http_status: 429
    template: "Rate limited. Retry after {retry_after_seconds} seconds."
    details: "Returned when too many requests from same token. Includes Retry-After header."

  E009_INTERNAL_ERROR:
    code: "INTERNAL_ERROR"
    http_status: 500
    template: "Internal error: {message}. Reference: {error_ref}"
    details: "Includes a unique error reference for debugging. Never exposes internal details to the caller."

# Error response shape (all tools):
# {
#   "error": {
#     "code": "E003_AUTH_DENIED",
#     "message": "Access denied: token lacks scope 'tenant:T1:nodes:lead:write'",
#     "details": { ... }  // optional additional context
#   }
# }
```

### 3.6 Resources (read-only context)

```yaml
resonansia://tenants:
  description: "Tenants accessible to current token"
  returns: [{ tenant_id, name, role }]

resonansia://schema/{tenant_id}:
  description: "Data model of a tenant (same as get_schema tool)"

resonansia://entity/{entity_id}:
  description: "Full entity with connections and recent events"

resonansia://stats/{tenant_id}:
  description: "Dashboard statistics (same as get_stats tool)"

resonansia://stream/{entity_id}:
  description: "Full event stream for an entity (same as get_timeline tool)"
```

### 3.7 Prompts (reusable agent instructions)

```yaml
analyze_entity:
  description: "Summarize entity state, identify patterns, suggest next actions"
  args: { entity_id: string }

find_path:
  description: "Find and explain the shortest path between two entities"
  args: { from_id: string, to_id: string }

temporal_diff:
  description: "Compare entity state at two points in time, explain what changed"
  args: { entity_id: string, time_a: datetime, time_b: datetime }

verify_trust:
  description: "Assess data quality: check event lineage integrity, epistemic status distribution, and actor diversity for an entity"
  args: { entity_id: string }
```

---
