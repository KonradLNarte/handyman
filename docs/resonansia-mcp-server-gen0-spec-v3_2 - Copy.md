# RESONANSIA MCP SERVER — GEN 0 SPEC (v3)

## 0. GENERATIONAL PROTOCOL

This spec evolves through AI generations. Each generation MUST follow this protocol.

### 0.1 Generation contract

```yaml
gen0: Seed spec. Defines invariants, tool interface, validation scenario, open questions.
gen1: Resolve all [DECIDE:gen1] markers. Produce deployable code + tests. Question ≥3 assumptions.
gen2: Harden auth, add consent protocol, optimize performance. Question ≥3 gen1 decisions.
gen3: Federated query forwarding, cryptographic event hardening, horizontal scaling. Question ≥3 gen2 decisions.
genN: Pattern continues. Every generation questions, builds, hands off.
```

### 0.2 What every generation MUST do

1. **INHERIT** — Read the full spec. Read the DECISION LOG. Understand prior rationale.
2. **QUESTION** — Challenge ≥3 assumptions or decisions from prior generations. Document challenges in DECISION LOG with outcome: `upheld`, `revised`, or `deferred`.
3. **RESOLVE** — Every `[DECIDE]` assigned to your generation must be resolved with: decision, alternatives considered, rationale, confidence (high/mid/low), and a `question_this_if` trigger condition for future generations.
4. **RESEARCH** — Every `[RESEARCH]` assigned to your generation requires web research before deciding. Document findings.
5. **BUILD** — Produce the artifacts listed in your generation's TASK section.
6. **VALIDATE** — Run the validation scenario. Report pass/fail per test case.
7. **HAND OFF** — Update the DECISION LOG. Write a GENERATION SUMMARY (≤500 words): what you built, what you learned, what the next generation should watch for.

### 0.3 Decision log entry format

```yaml
- id: D-001
  generation: gen1
  marker: "[DECIDE:gen1] embedding dimensions"
  decision: "1536 dimensions with text-embedding-3-small"
  alternatives: ["768 with text-embedding-3-small", "1024 with custom model"]
  rationale: "Best recall for knowledge graph entities. Storage cost acceptable at <100K nodes."
  confidence: mid
  question_this_if: "Node count exceeds 500K or embedding latency exceeds 100ms p95"
  references: ["https://supabase.com/docs/guides/ai/choosing-compute-addon"]
```

### 0.4 Anti-drift rules

- **No scope creep**: If a feature is not in the SYSTEM DEFINITION or your GENERATION TASKS, do not build it. Propose it for a future generation instead.
- **No phantom requirements**: Do not invent requirements. If the spec does not mention it, ask whether it is needed before building it.
- **Spec stays in sync**: After resolving a DECIDE marker, update the spec text. Never leave resolved decisions only in the log.
- **Minimal viable first**: When a DECIDE has a simple option and a complex option, prefer the simple option unless the complex option is required by a validation test.

---

## 1. SYSTEM DEFINITION

### 1.0 One-sentence summary

A federated MCP server that exposes a bitemporal, event-sourced knowledge graph as AI-agent-accessible infrastructure with tenant isolation, semantic search, and temporal queries.

### 1.1 Architectural principles

These principles are **invariants** that no generation may violate:

1. **Event Primacy** — The `events` table is the single immutable source of truth. Fact tables (`nodes`, `edges`, `grants`) are projections of the event stream. Every row in a fact table MUST reference the `event_id` that created it. The same event stream + same projection logic = identical state.
2. **Graph-native Ontology** — The schema is part of the graph. Entity types, relationship types, and event types are first-class nodes (`type_nodes`), not a separate registry table. To understand what a "booking" is, you traverse its type node.
3. **Epistemic Honesty** — Not all facts are equally certain. Every node carries an epistemic status (`hypothesis`, `asserted`, `confirmed`) reflecting the provenance of the information.
4. **Tenant Isolation** — `tenant_id` on every row. Row-Level Security enforces isolation. No data leaks between tenants, ever.
5. **Federation via Edges** — Cross-tenant data sharing happens through edges and capability grants, never through data copying.
6. **Bitemporality** — Every mutable entity tracks business time (`valid_from`/`valid_to`) and system time (`recorded_at`). Queries can ask "what was true then?" and "what did we know then?"
7. **Tech Agnosticism** — This spec defines WHAT, not HOW. Technology choices are bound via a separate Tech Profile (section 10) injected at generation start.

### 1.2 Unique value proposition

No existing system combines all of these:

| Property | Graphiti/Zep | Neo4j MCP | Open Brain | Mem0 | **This system** |
|---|---|---|---|---|---|
| Generalized knowledge graph | Partial (agent memory focus) | Yes | No (flat table) | Partial | **Yes** |
| Bitemporal data model | Yes (event_time + ingestion_time) | No | No | No | **Yes** |
| Event sourcing / immutable audit | No | No | No | No | **Yes** |
| Multi-tenancy (RLS) | group_id only | No | No | No | **Yes** |
| Cross-tenant federation | No | No | No | No | **Yes** |
| Schema-flexible + typed | Fixed schema | Cypher schema | Fixed | Fixed | **Yes (JSONB + type nodes)** |
| Graph-native ontology | No | Partial | No | No | **Yes** |
| Epistemic status tracking | No | No | No | No | **Yes** |
| Capability-based access (grants) | No | No | No | No | **Yes** |
| MCP server interface | Yes | Yes | Yes | No | **Yes** |

### 1.3 Competitive landscape (for research context)

| System | Repository / URL | Relevance |
|---|---|---|
| Graphiti (Zep) | https://github.com/getzep/graphiti | Temporal knowledge graph, MCP 1.0, multiple backends. Closest competitor. Study: entity deduplication, embedding strategy, tool design. |
| Graphiti MCP Docs | https://help.getzep.com/graphiti/getting-started/mcp-server | MCP tool design patterns, episode management. |
| Graphiti Paper | https://arxiv.org/abs/2501.13956 | Bitemporal knowledge graph architecture decisions. |
| Open Brain | https://github.com/benclawbot/open-brain | Proves Supabase Edge + pgvector + MCP pattern. Single-user, flat table. |
| Open Brain Guide | https://promptkit.natebjones.com/20260224_uq1_guide_main | Step-by-step deployment guide. Model for zero-coding-experience deployment docs. |
| AWS Multi-tenant MCP | https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server | Reference architecture for OAuth 2.1 + multi-tenancy in MCP. |
| MCP Plexus | https://github.com/super-i-tech/mcp_plexus | Multi-tenant MCP framework (FastMCP). Auth + tenant routing, but no data model. |
| StrongDM Attractor | https://github.com/strongdm/attractor | Spec-driven coding agent methodology. NLSpec format, pipeline-as-graph, generational handoff. |
| @hono/mcp | https://github.com/honojs/middleware/tree/main/packages/mcp | Hono MCP middleware with auth router support. |
| Mem0 | https://github.com/mem0ai/mem0 | Graph-enhanced memory, managed service. No self-hosting, no federation. |
| MindBase | https://github.com/agiletec-inc/mindbase | PostgreSQL + pgvector + Ollama, local-first conversation knowledge management. |
| Anthropic KG Memory | https://github.com/modelcontextprotocol/servers | Reference MCP implementation. JSON file, no production use. |

---

## 2. DATA MODEL

### 2.0 Conceptual layers

The data model has three layers. Understanding the layers is essential before reading the tables.

```
┌─────────────────────────────────────────────┐
│  ONTOLOGY LAYER (graph describes itself)     │
│  type_nodes: what types of things exist      │
│  type_nodes are nodes — reflexive, temporal  │
├─────────────────────────────────────────────┤
│  EVENT LAYER (immutable truth)               │
│  events: append-only, never updated/deleted  │
│  every mutation originates here              │
├─────────────────────────────────────────────┤
│  FACT LAYER (materialized projections)       │
│  nodes, edges, grants: derived from events   │
│  every row references its creating event     │
│  blobs, dicts: utility storage               │
└─────────────────────────────────────────────┘
```

### 2.1 Schema

These table definitions are tech-agnostic SQL. Column types use standard SQL; the Tech Profile maps them to implementation-specific types (e.g., `VECTOR` → pgvector dimension).

```sql
-- Table 1: TENANTS — isolation boundary
tenants (
  tenant_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES tenants NULLABLE,     -- hierarchy for holding companies
  name            TEXT NOT NULL,
  config          JSONB DEFAULT '{}',                    -- feature flags, limits, plan
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Table 2: EVENTS — append-only immutable truth
-- This is THE source of truth. Fact tables are projections.
-- NEVER updated. NEVER deleted. Corrections are new events referencing the original.
events (
  event_id        UUID PRIMARY KEY,                      -- [DECIDE:gen1] UUIDv7 for implicit system time?
  tenant_id       UUID NOT NULL REFERENCES tenants,
  intent_type     TEXT NOT NULL,                          -- e.g. 'entity_created', 'edge_created', 'entity_updated'
  payload         JSONB NOT NULL,                         -- event-specific data
  stream_id       UUID,                                   -- groups events about the same entity (= node_id)
  node_ids        UUID[] DEFAULT '{}',                    -- related nodes
  edge_ids        UUID[] DEFAULT '{}',                    -- related edges
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),     -- when it happened in reality (business time)
  recorded_at     TIMESTAMPTZ DEFAULT now(),              -- when system learned about it
  created_by      UUID NOT NULL                           -- user or agent identity
  -- [DECIDE:gen1] If using UUIDv7 for event_id, is recorded_at redundant? Retain for query ergonomics.
)

-- Table 3: NODES — entities in the knowledge graph (FACT LAYER — projection of events)
nodes (
  node_id         UUID PRIMARY KEY,                       -- stable identity, never changes meaning or tenant
  tenant_id       UUID NOT NULL REFERENCES tenants,
  type_node_id    UUID NOT NULL REFERENCES nodes,         -- FK to type node (ontology layer)
  data            JSONB NOT NULL DEFAULT '{}',             -- entity fields
  embedding       VECTOR NULLABLE,                        -- dimension set by tech profile
  epistemic       TEXT NOT NULL DEFAULT 'hypothesis',     -- 'hypothesis' | 'asserted' | 'confirmed'
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),     -- bitemporal: business time start
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',         -- bitemporal: business time end
  recorded_at     TIMESTAMPTZ DEFAULT now(),              -- bitemporal: system time
  created_by      UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events,       -- which event created this row
  is_deleted      BOOLEAN DEFAULT false
)

-- Table 4: EDGES — relationships between nodes (FACT LAYER)
-- Cross-tenant edges are the federation mechanism.
-- source_id and target_id may belong to different tenants.
-- Auth must verify access to BOTH endpoints.
edges (
  edge_id         UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants,       -- owner tenant of the edge
  type_node_id    UUID NOT NULL REFERENCES nodes,         -- FK to type node (predicate, e.g. "contacted_via")
  source_id       UUID NOT NULL REFERENCES nodes,
  target_id       UUID NOT NULL REFERENCES nodes,
  data            JSONB DEFAULT '{}',
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',
  recorded_at     TIMESTAMPTZ DEFAULT now(),
  created_by      UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events,
  is_deleted      BOOLEAN DEFAULT false
)

-- Table 5: GRANTS — capability-based access control (FACT LAYER)
-- Grants are graph-native: they are nodes in the access control graph.
-- A grant says: "subject_tenant may perform capability on object_node during valid_range."
grants (
  grant_id        UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants,       -- tenant that owns (issued) this grant
  subject_tenant_id UUID NOT NULL REFERENCES tenants,     -- who receives the capability
  object_node_id  UUID NOT NULL REFERENCES nodes,         -- what the capability applies to
  capability      TEXT NOT NULL,                           -- 'READ' | 'WRITE' | 'TRAVERSE'
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',
  created_by      UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events
)

-- Table 6: BLOBS — binary storage (files, images, documents)
-- Blob content is NOT stored in the database. storage_ref points to object storage.
blobs (
  blob_id         UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants,
  content_type    TEXT NOT NULL,
  storage_ref     TEXT NOT NULL,                           -- path/key in object storage
  size_bytes      BIGINT NOT NULL,
  node_id         UUID REFERENCES nodes NULLABLE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID NOT NULL
)

-- Table 7: DICTS — reference data (currencies, countries, account codes)
dicts (
  dict_id         UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants,
  type            TEXT NOT NULL,
  key             TEXT NOT NULL,
  value           JSONB NOT NULL,
  valid_from      TIMESTAMPTZ DEFAULT now(),
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',
  UNIQUE(tenant_id, type, key, valid_from)
)
```

**Note on type_nodes:** Type nodes are regular nodes whose `type_node_id` points to a bootstrap "metatype" node. The metatype is self-referential (its `type_node_id` = its own `node_id`). This bootstrap node is created during schema migration. Type nodes carry a `label_schema` field in their `data` JSONB that provides optional JSON Schema validation for entities of that type.

### 2.2 Invariant rules

These rules are absolute. No generation may weaken them.

1. **tenant_id on every row** — No exceptions. RLS enforces isolation.
2. **Events are append-only** — Never update, never delete. Corrections are new events referencing the original via payload.
3. **Bitemporality** — `valid_from`/`valid_to` = business time. `recorded_at` (or UUIDv7 timestamp of PK) = system time.
4. **Soft deletes only** — `is_deleted = true` + `valid_to = now()`. Hard deletes only for GDPR erasure (gen2+).
5. **Cross-tenant edges** — `source_id` and `target_id` may belong to different tenants. Auth must verify both.
6. **Type nodes are the schema** — System works with only the bootstrap metatype (fully dynamic). Type nodes add validation and discovery.
7. **Blobs use external storage** — Only metadata in the database. `storage_ref` points to object storage.
8. **Identity persistence** — A `node_id` never changes meaning or tenant. Once assigned, it is permanent.
9. **Event lineage** — Every fact row (`nodes`, `edges`, `grants`) MUST have a non-null `created_by_event` FK.
10. **No business logic in JSONB** — Relationships between entities MUST be modeled as edges, not as foreign keys buried in `data` payloads. The `data` field is for descriptive attributes only.

### 2.3 Epistemic status model

Nodes carry an `epistemic` field that reflects the provenance and certainty of the information:

```yaml
hypothesis:
  meaning: "System inferred this, not yet verified by a human."
  set_by: capture_thought tool (LLM extraction), automated imports
  transitions_to: [asserted, confirmed]

asserted:
  meaning: "A human or trusted agent explicitly stated this."
  set_by: Direct store_entity calls, manual data entry
  transitions_to: [confirmed]

confirmed:
  meaning: "Verified against an authoritative source."
  set_by: Explicit confirmation action, integration with source systems
  transitions_to: [] # terminal state; corrections are new entities
```

Epistemic status changes emit events. Search results MAY be filtered or ranked by epistemic status.

### 2.4 Embedding strategy

```yaml
trigger: on node create or update, queue async embedding job
input: concatenate(type_node.name, " ", JSON.stringify(node.data))
storage: nodes.embedding column
search: cosine similarity function (database-native)
constraints:
  - Embedding generation MUST be async (not in the request path)
  - Embedding pipeline MUST implement backoff/retry and respect provider rate limits
  - Search latency target: <100ms p95 at 100K nodes
decisions_for_gen1:
  - "[DECIDE:gen1] Embedding model and dimensions (1536 vs 768)"
    research: What do Graphiti and Open Brain use? Open Brain uses 768. Benchmark at expected scale.
  - "[DECIDE:gen1] Embed edge data? Recommendation: no for gen1"
  - "[DECIDE:gen1] Embed events? Recommendation: no for gen1"
  - "[DECIDE:gen1] Bulk embedding strategy for seed data / imports — queue depth, rate limits"
```

### 2.5 Open research for gen1

```yaml
- "[RESEARCH:gen1] PostgreSQL SQL:2011 temporal table support"
  question: "Can native temporal primary keys and FOR PORTION OF syntax replace manual valid_from/valid_to management? If so, revise schema."
  references:
    - https://wiki.postgresql.org/wiki/SQL2011Temporal
    - https://pgxn.org/dist/temporal_tables/

- "[RESEARCH:gen1] UUIDv7 implications"
  question: "If PKs use UUIDv7, system time can be derived from the UUID. Is recorded_at column redundant? Recommendation: retain for query ergonomics but document the redundancy."
```

---

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

References:
- https://www.philschmid.de/mcp-best-practices
- https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/

### 3.2 Tools (10 primary)

```yaml
# ─── ENTITY MANAGEMENT ───

store_entity:
  description: "Create or update an entity in the knowledge graph. Returns the full entity with ID. Creates an event FIRST, then projects to nodes table."
  params:
    entity_type: string            # type node name, e.g. "lead", "booking"
    data: object                   # entity fields as flat JSON
    entity_id: string?             # if provided, updates existing (creates new version)
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

find_entities:
  description: "Search entities by semantic similarity, structured filters, or both. Use this to find entities matching a natural language query or specific field values."
  params:
    query: string?                 # semantic search (uses embeddings). omit for structured-only search.
    entity_types: string[]?        # filter by type node name(s)
    filters: object?               # field-level filters: { "status": "active", "city": "Stockholm" }
    epistemic: string[]?           # filter by epistemic status, e.g. ["asserted", "confirmed"]
    tenant_id: string?
    limit: int?                    # default 10, max 100
    sort_by: string?               # "relevance" (default for semantic) | "created_at" | field name
  returns:
    results: [{ entity_id, entity_type, data, similarity?, epistemic, valid_from }]
    total_count: int

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

explore_graph:
  description: "Starting from an entity, traverse relationships to discover connected entities. Returns a subgraph centered on the start node."
  params:
    start_id: string
    edge_types: string[]?          # filter by relationship types. omit for all.
    direction: "outgoing" | "incoming" | "both"?  # default "both"
    depth: int?                    # max traversal depth. default 1, max 5.
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

get_timeline:
  description: "Get chronological history of an entity: all versions, related events, and changes over time."
  params:
    entity_id: string
    include_related_events: boolean?  # include events from connected entities. default false.
    time_range: { from: datetime?, to: datetime? }?
    limit: int?                    # default 50
  returns:
    entity: { entity_id, entity_type, current_data }
    timeline: [{
      timestamp: datetime,
      type: "version_change" | "event" | "edge_created" | "edge_removed" | "epistemic_change",
      data: object,
      created_by: string,
      event_id: string
    }]

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
  deduplication_strategy: |
    [DECIDE:gen1] Entity deduplication approach for capture_thought:
    Option A: Embedding similarity above threshold (fast, may miss spelling variants)
    Option B: Fuzzy text matching on name fields (handles typos, misses semantic equivalence)
    Option C: Hybrid — fuzzy match first, then embedding similarity as tiebreaker
    Option D: LLM-assisted disambiguation (most accurate, highest cost and latency)
    Recommendation: Option C for gen1. Research what Graphiti uses (they have entropy-gated fuzzy matching).
    question_this_if: "Duplicate entities exceed 5% of total entities in production use"

# ─── DISCOVERY ───

get_schema:
  description: "Discover what entity types, relationship types, and event types exist in a tenant. Returns type nodes. Use this first to understand the data model before querying."
  params:
    tenant_id: string?
  returns:
    entity_types: [{ name, schema, node_count, example_fields, type_node_id }]
    edge_types: [{ name, schema, edge_count, type_node_id }]
    event_types: [{ name, event_count, last_occurred_at }]

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
```

### 3.3 Utility tools (3)

```yaml
store_blob:
  params: { data_base64: string, content_type: string, related_entity_id: string? }
  returns: { blob_id, content_type, size_bytes, storage_ref }

get_blob:
  params: { blob_id: string }
  returns: { blob_id, content_type, data_base64 }

lookup_dict:
  params: { dict_type: string, key: string?, valid_at: datetime? }
  returns: { entries: [{ key, value, valid_from, valid_to }] }
```

**Total: 13 tools** (10 primary + 3 utility). Within the recommended 5-15 range.

### 3.4 Resources (read-only context)

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
```

### 3.5 Prompts (reusable agent instructions)

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
```

---

## 4. AUTH MODEL

### 4.1 Token structure (OAuth 2.1)

```yaml
claims:
  sub: string          # user or agent identity
  iss: string          # token issuer
  aud: string          # "resonansia-mcp"
  tenant_ids: string[] # quick lookup: which tenants this token can access
  scopes: string[]     # fine-grained permissions (see below)
  exp: int             # expiration timestamp

scope_syntax: "tenant:{tenant_id}:{resource}:{action}"
scope_examples:
  - "tenant:T1:read"                  # read everything in T1
  - "tenant:T1:write"                 # write everything in T1
  - "tenant:T1:nodes:lead:read"       # read only leads in T1
  - "tenant:T1:nodes:lead:write"      # write only leads in T1
  - "tenant:*:read"                   # cross-tenant read (owner)
  - "admin"                           # full access
```

### 4.2 Auth spec version

**Gen1 implements against the MCP Authorization Specification as of the June 2025 revision or later**, where:
- The MCP server acts ONLY as an OAuth 2.0 **Resource Server** (not Authorization Server).
- The MCP server MUST implement **RFC 9728** (Protected Resource Metadata).
- Token issuance is delegated to an external Authorization Server (bound via Tech Profile).
- `[RESEARCH:gen1]` Verify latest MCP auth spec status before implementing. The spec has changed multiple times.

References:
- https://modelcontextprotocol.io/specification/draft/basic/authorization
- https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol

### 4.3 Permission resolution (every tool call)

```
1. Extract tenant_id from params OR from token (if single-tenant scoped)
2. Verify token.scopes includes required scope for the operation
3. Cross-tenant operations: verify scopes for ALL involved tenants
4. For cross-tenant edge traversal: also check grants table
5. Database-level RLS enforces isolation even if server code has bugs
6. Every tool call → audit event: { caller, tool, params_hash, result_status }
```

### 4.4 Token types

```yaml
user_token:
  issued_by: platform auth provider
  scopes: based on user role within tenant(s)
  lifetime: short (1h), refreshable

agent_token:
  issued_by: platform admin or API
  scopes: specific to agent's purpose
  lifetime: medium (24h), non-refreshable

partner_token:
  issued_by: tenant admin
  scopes: read-only, specific entity types
  lifetime: long (30d), auto-expires, non-refreshable
```

### 4.5 Grants vs Scopes

The system has two layers of access control:

- **Scopes** (in JWT tokens): coarse-grained, tenant-level. "This agent can read tenant T1."
- **Grants** (in grants table): fine-grained, node-level. "Tenant T2 can TRAVERSE node N1 in tenant T1."

Scopes are checked first (fast, in-memory). Grants are checked for cross-tenant operations (requires DB lookup). Both must pass.

### 4.6 Auth decisions for gen1

```yaml
- "[DECIDE:gen1] Token format: stateless JWT vs opaque + introspection"
  recommendation: JWT for gen1, introspection for gen2+
- "[DECIDE:gen1] Auth provider integration: build custom vs integrate with platform auth"
  recommendation: integrate with deployment platform's auth provider
- "[DECIDE:gen1] RLS policy pattern for cross-tenant edges"
  options:
    A: "JOIN-based RLS policy (standard but complex SQL)"
    B: "Security-definer function (cleaner but bypasses RLS internally)"
    C: "Application-level enforcement with service-role bypass for cross-tenant queries"
  recommendation: Option C for gen1, migrate to A in gen2
  question_this_if: "Security audit requires pure RLS enforcement without application-level trust"
```

---

## 5. FEDERATION

### 5.1 Core concept

Federation = controlled data sharing across tenant boundaries.

- **NOT** copying data between databases
- **IS** cross-tenant edges + capability grants + scoped tokens that allow queries to traverse boundaries

### 5.2 Primitives

```yaml
cross_tenant_edge:
  what: Edge where source and target belong to different tenants
  requires: Write scope on both tenants
  consent: Platform admin creates grants manually (gen1). Consent protocol (gen2+).

grants:
  what: Explicit capability grants stored in the grants table
  how: Grant(subject_tenant=T2, object_node=N1, capability=TRAVERSE, valid_range)
  constraint: Grants are temporal — they expire. Grants emit events when created.

virtual_endpoint:
  what: Single MCP URL that combines multiple tenants into one logical view
  how: Token with multiple tenant_ids → queries span all
  constraint: RLS + grants still enforce per-entity permissions

partner_endpoint:
  what: Time-limited MCP access for external partners
  scopes: Read-only, specific entity types
  logging: All access logged in events table
  expiry: Token exp claim, non-renewable
```

### 5.3 Federation scope per generation

```yaml
gen1: [cross_tenant_edge: YES, grants_table: YES, virtual_endpoint: YES, partner_token: YES, consent_protocol: NO]
gen2: [consent_protocol: YES, federated_search: YES, grant_delegation: YES]
gen3: [remote_query_forwarding: YES, cryptographic_event_chain: YES, federated_graph_merge: YES]
```

---

## 6. CONSTRAINTS

Real-world constraints that bound all design decisions. **Research these values before implementation — they may have changed.**

### 6.1 Platform constraints (verify at implementation time)

```yaml
# These are EXAMPLE values. Actual values depend on Tech Profile.
# Supabase Edge Functions (March 2026):
serverless_cpu_per_request: "~2 seconds"
serverless_wall_clock: "~400 seconds"
serverless_memory: "~256 MB"
function_bundle_size: "~20 MB"

# IMPORTANT: capture_thought does LLM call + entity search + node creation + edge creation.
# This MAY exceed CPU limits in serverless environments.
# [DECIDE:gen1] capture_thought execution strategy:
#   Option A: Synchronous — all steps in one request (simpler, may timeout)
#   Option B: Async — return job_id, process in background (more complex, always fits)
#   Option C: Split — synchronous LLM extraction, async entity linking (compromise)
#   Recommendation: Measure first. If total latency < 1.5s, use A. Otherwise, B.
```

### 6.2 Vector search constraints

```yaml
# pgvector HNSW performance benchmarks (1536 dimensions, March 2026):
# 15K vectors:  480 QPS, 16ms p95  (1 GB RAM)
# 100K vectors: 240 QPS, 126ms p95 (4 GB RAM)
# 1M vectors:   560 QPS, 58ms p95  (32 GB RAM)
# Source: https://supabase.com/docs/guides/ai/choosing-compute-addon
#
# Implication: At gen1 scale (<100K nodes), vector search is fine on minimal infra.
embedding_latency_target: "<100ms p95"
search_latency_target: "<200ms p95 including RLS filtering"
```

### 6.3 MCP protocol constraints

```yaml
# Transport: Streamable HTTP (JSON-RPC 2.0)
# Auth: OAuth 2.1 — MCP server as Resource Server only (June 2025 revision)
# Multi-tenant MCP is NOT standardized in the protocol.
# Source: https://modelcontextprotocol.io/specification/draft/basic/authorization
# Source: https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/193
```

### 6.4 Cost constraints

```yaml
# Gen1 MUST produce cost estimates covering:
# - Database hosting plan requirements for Pettson scenario
# - Embedding API cost per 1K / 10K / 100K nodes
# - LLM extraction cost per 1K capture_thought calls
# - Expected monthly cost for Pettson-scale usage (4 tenants, ~1000 nodes, ~100 capture_thought/month)
```

---

## 7. VALIDATION SCENARIO: PETTSON

Concrete acceptance test. A holding company with three subsidiaries. All tests MUST pass for a generation to be considered complete.

### 7.1 Tenant structure

```yaml
pettson_holding:                  # parent tenant
  children:
    - taylor_events               # event production
    - mountain_cabins             # cabin rentals
    - nordic_tickets              # ticket sales
```

### 7.2 Entity types per tenant (as type nodes)

```yaml
taylor_events:   [lead, campaign, event, venue, contact]
mountain_cabins: [property, booking, guest, season]
nordic_tickets:  [match, ticket_batch, package, partner]
```

### 7.3 Cross-tenant edges

```yaml
- package(nordic_tickets)  --[includes]-->    property(mountain_cabins)
- campaign(taylor_events)  --[sells]-->       ticket_batch(nordic_tickets)
- lead(taylor_events)      --[also_booked]--> booking(mountain_cabins)
```

### 7.4 Grants for cross-tenant access

```yaml
# These grants are created as seed data, stored in grants table
- Grant(subject=taylor_events, object=nordic_tickets.packages, capability=READ)
- Grant(subject=taylor_events, object=mountain_cabins.properties, capability=READ)
- Grant(subject=mountain_cabins, object=nordic_tickets.packages, capability=READ)
- Grant(subject=nordic_tickets, object=mountain_cabins.properties, capability=TRAVERSE)
```

### 7.5 Agent roles and scopes

```yaml
sales_agent:
  scopes: [tenant:taylor_events:read, tenant:nordic_tickets:read, tenant:mountain_cabins:read, tenant:taylor_events:nodes:lead:write]

content_agent:
  scopes: [tenant:taylor_events:nodes:campaign:write, tenant:taylor_events:nodes:campaign:read]

booking_agent:
  scopes: [tenant:mountain_cabins:write, tenant:nordic_tickets:read]

partner_travel_agency:
  scopes: [tenant:nordic_tickets:nodes:package:read, tenant:mountain_cabins:nodes:property:read]
  token_expiry: 30 days
```

### 7.6 Acceptance tests

Every test is a tool call with expected outcome. **All must pass.**

```yaml
T01_semantic_cross_tenant_search:
  agent: sales_agent
  call: find_entities(query="football fans interested in cabin packages")
  expect: Returns leads from taylor_events that have edges to mountain_cabins bookings
  validates: semantic search + cross-tenant edge traversal + RLS + grants

T02_create_entity:
  agent: content_agent
  call: store_entity(entity_type="campaign", data={name: "Summer Festival 2026"})
  expect: Success. Returns entity_id, entity_type, version=1, epistemic="asserted", event_id.
  validates: entity creation + event emission + event lineage

T03_permission_denial:
  agent: content_agent
  call: find_entities(entity_types=["lead"])
  expect: DENIED or empty results (no lead read scope)
  validates: scope enforcement

T04_cross_tenant_traverse:
  agent: booking_agent
  call: explore_graph(start_id=PACKAGE_NODE, edge_types=["includes"], direction="outgoing")
  expect: Returns cabin properties from mountain_cabins tenant
  validates: cross-tenant edge traversal + grants table consultation + RLS

T05_partner_read_only:
  agent: partner_travel_agency
  call: store_entity(entity_type="package", data={...})
  expect: DENIED (read-only scope)
  validates: write protection on partner tokens

T06_audit_trail:
  agent: any
  precondition: Perform any mutation
  call: get_timeline(entity_id=MUTATED_ENTITY)
  expect: Timeline includes event with created_by = agent identity AND event_id matches entity's created_by_event
  validates: automatic event emission + event lineage + audit

T07_bitemporal_query:
  agent: sales_agent
  precondition: Lead exists, was updated on Feb 1, queried on Mar 1
  call: query_at_time(entity_id=LEAD_ID, valid_at="2026-01-15")
  expect: Returns lead data as it was on Jan 15 (before Feb 1 update)
  validates: bitemporal point-in-time query

T08_timeline:
  agent: sales_agent
  call: get_timeline(entity_id=LEAD_ID)
  expect: Chronological list: created → contacted → responded → booked. Each entry has event_id.
  validates: event aggregation + version history merge

T09_capture_thought:
  agent: sales_agent
  call: capture_thought(content="Met Johan at the cabin fair, he wants 20 tickets for Allsvenskan and a cabin for midsommar", source="manual")
  expect: Creates a lead node (epistemic="hypothesis"), finds-or-creates "Johan" contact, creates edges to ticket and cabin concepts
  validates: LLM extraction + entity linking + epistemic status + multi-step automation

T10_schema_discovery:
  agent: sales_agent
  call: get_schema(tenant_id=TAYLOR_EVENTS_ID)
  expect: Returns all entity types (as type nodes) with counts, example fields, and type_node_ids
  validates: schema introspection via type nodes

T11_deduplication:
  agent: sales_agent
  precondition: T09 has been run (Johan exists)
  call: capture_thought(content="Johan Eriksson called again about the midsommar cabin", source="manual")
  expect: Links to EXISTING Johan entity (not creating a duplicate). match_confidence returned.
  validates: entity deduplication in capture_thought

T12_epistemic_status:
  agent: sales_agent
  precondition: T09 has created Johan as hypothesis
  call: store_entity(entity_id=JOHAN_ID, data={name: "Johan Eriksson", phone: "070-123456"}, epistemic="confirmed")
  expect: Johan's epistemic status changes to "confirmed". Event emitted with intent_type "epistemic_change".
  validates: epistemic status transitions + event emission

T13_event_primacy:
  agent: any
  precondition: Multiple entities have been created
  call: Direct database query (not via MCP — test infrastructure only)
  expect: Every row in nodes table has a non-null created_by_event. Every referenced event exists in events table.
  validates: event lineage invariant
```

---

## 8. GENERATION TASKS

### 8.1 Gen1 deliverables

Gen1 receives this spec + a TECH PROFILE (see section 10). Gen1 produces:

```yaml
artifact_1_schema:
  what: Complete database migration
  includes:
    - All 7 tables with exact types, constraints, indexes
    - RLS policies for every table
    - Bootstrap metatype node creation
    - Vector extension setup
    - Semantic search function
    - Seed data for Pettson scenario (tenants, type nodes, sample entities, grants)
  done_when: Migration runs clean. Pettson tenants + type nodes + grants exist.

artifact_2_tools:
  what: All 13 tool implementations
  includes:
    - Input validation with schema library
    - Parameterized queries (no string interpolation)
    - Event-first pattern: every mutation creates event, then projects to fact table
    - MCP-compatible error codes with self-correction hints
    - Tests per tool
  done_when: Each tool passes its unit tests.

artifact_3_auth:
  what: Auth middleware + token handling
  includes:
    - Token validation middleware
    - Scope checking per tool call
    - Grants table consultation for cross-tenant operations
    - RLS policy alignment with token scopes
    - Audit event on every tool call
  done_when: T03, T04, and T05 acceptance tests pass.

artifact_4_server:
  what: MCP server assembly
  includes:
    - MCP transport + tool registration + resource registration
    - Health check endpoint
    - Connection test for MCP clients
  done_when: Server starts, responds to tools/list, and can be connected from an MCP client.

artifact_5_embedding:
  what: Async embedding pipeline
  includes:
    - Embedding generation worker with backoff/retry
    - API integration for chosen embedding model
    - Rate limit handling
    - Semantic search function
  done_when: T01 acceptance test passes.

artifact_6_capture:
  what: capture_thought implementation
  includes:
    - LLM prompt for extraction (type-node-aware)
    - Entity deduplication logic (per DECIDE resolution)
    - Entity find-or-create logic
    - Edge creation for mentioned entities
    - Epistemic status set to 'hypothesis' for all created entities
  done_when: T09 and T11 acceptance tests pass.

artifact_7_tests:
  what: Full acceptance test suite
  includes:
    - All T01-T13 tests as executable tests
    - Setup: create Pettson tenants, type nodes, seed data, grants, agent tokens
    - Teardown: clean test data
  done_when: All 13 tests pass.

artifact_8_deployment:
  what: Deployment script / instructions
  includes:
    - Step-by-step setup from zero
    - Secrets management
    - Connection to MCP clients
  done_when: A developer can deploy from scratch using only the instructions.

artifact_9_cost_estimate:
  what: Cost analysis document
  includes:
    - Database hosting plan requirements for Pettson scenario
    - Embedding API cost per 1K / 10K / 100K nodes
    - LLM extraction cost per 1K capture_thought calls
    - Expected monthly cost for Pettson-scale usage
  done_when: Document exists with concrete numbers based on chosen Tech Profile.
```

### 8.2 Gen1 success criteria

```yaml
minimum_viable:
  - All 7 tables deployed with RLS
  - store_entity, find_entities, explore_graph, get_schema tools working
  - Event-first pattern: every mutation creates event before projecting
  - Single-tenant auth working
  - T01, T02, T03, T10, T13 passing
  grade: "C — functional but incomplete"

target:
  - All 13 tools working
  - Cross-tenant federation working via grants
  - Epistemic status model working
  - All T01-T13 passing
  - Deployment instructions complete
  - Cost estimate produced
  grade: "A — ready for gen2"

stretch:
  - Slack capture function
  - Performance benchmarks documented
  - Entity deduplication accuracy measured and documented
  grade: "A+ — exceeds expectations"
```

### 8.3 Gen1 DECIDE markers

These MUST be resolved by gen1 with full decision log entries:

```yaml
- "[DECIDE:gen1] Embedding model and dimensions (1536 vs 768)"
  research: What do Graphiti and Open Brain use? Benchmark at expected scale.
- "[DECIDE:gen1] Token format: stateless JWT vs opaque + introspection"
  recommendation: JWT for gen1
- "[DECIDE:gen1] Event emission: synchronous vs async"
  recommendation: synchronous for gen1
- "[DECIDE:gen1] capture_thought execution strategy: sync vs async vs split"
  recommendation: measure first, then decide
- "[DECIDE:gen1] Entity deduplication approach for capture_thought"
  recommendation: hybrid fuzzy + embedding (Option C)
- "[DECIDE:gen1] RLS policy pattern for cross-tenant edges"
  recommendation: application-level for gen1 (Option C)
- "[DECIDE:gen1] UUIDv7 for event_id — retain recorded_at or derive?"
  recommendation: retain for query ergonomics
- "[DECIDE:gen1] Blob storage: inline vs external"
  decision: external (invariant rule 7 — already decided in gen0)
- "[DECIDE:gen1] License: Apache 2.0 vs BSL 1.1"
```

### 8.4 Gen1 RESEARCH markers

```yaml
- "[RESEARCH:gen1] PostgreSQL SQL:2011 temporal table support — can it replace manual bitemporality?"
- "[RESEARCH:gen1] Current MCP SDK versions and @hono/mcp (or equivalent) API"
- "[RESEARCH:gen1] Serverless platform limits (execution time, memory, payload) for chosen Tech Profile"
- "[RESEARCH:gen1] Graphiti entity deduplication approach — entropy-gated fuzzy matching details"
- "[RESEARCH:gen1] OAuth 2.1 in MCP — verify spec version and any changes since June 2025"
```

### 8.5 Gen2+ roadmap (for context only — gen1 does not build these)

```yaml
gen2:
  - Consent protocol for cross-tenant edges (automated grant negotiation)
  - Token introspection endpoint
  - Rate limiting per agent
  - GDPR erasure (crypto-shred pattern)
  - Grant delegation (tenant A can allow tenant B to grant access to tenant C)
  - Performance optimization based on gen1 benchmarks
  - Migrate cross-tenant RLS to pure database-level enforcement

gen3:
  - Federated query forwarding to remote Resonansia instances
  - Cryptographic event hardening (hash chains, signatures) for trustless federation
  - Horizontal scaling (read replicas)
  - Multi-region deployment
  - Real-time subscriptions (MCP sampling)
  - Epistemic branching (representing conflicting assertions from different sources)
    question_this_if: "Multiple federated instances need to reconcile conflicting facts"
```

---

## 9. DECISION LOG

Empty at gen0. Gen1 fills this in. Subsequent generations append.

```yaml
decisions: []
# Use format from section 0.3
```

---

## 10. TECH PROFILE

This section is injected by the human when starting a generation. The spec above is tech-agnostic. The tech profile binds it to a specific stack.

### 10.1 Profile format

```yaml
# === TECH PROFILE — copy and customize for your generation ===
runtime: ""              # e.g. "deno" | "bun" | "node"
framework: ""            # e.g. "hono" | "express" | "fastify"
mcp_adapter: ""          # e.g. "@hono/mcp" | "@modelcontextprotocol/sdk direct"
database: ""             # e.g. "supabase postgres" | "neon" | "self-hosted postgres"
vector_extension: ""     # e.g. "pgvector" | "pgembedding" | "external (pinecone)"
embedding_dimensions: "" # e.g. "1536" | "768" — overrides DECIDE if set
auth_provider: ""        # e.g. "supabase auth" | "cognito" | "auth0" | "custom jwt"
embedding_api: ""        # e.g. "openai via openrouter" | "openai direct" | "voyage"
extraction_llm: ""       # e.g. "gpt-4o-mini via openrouter" | "claude-haiku"
object_storage: ""       # e.g. "supabase storage" | "s3" | "r2"
deployment: ""           # e.g. "supabase edge functions" | "fly.io" | "railway" | "docker"
test_runner: ""          # e.g. "deno test" | "bun test" | "vitest"
schema_validation: ""    # e.g. "zod" | "typebox" | "arktype"
```

### 10.2 Example: Supabase profile

```yaml
runtime: "deno"
framework: "hono"
mcp_adapter: "@hono/mcp"
database: "supabase postgres + pgvector"
vector_extension: "pgvector"
auth_provider: "supabase auth + custom JWT for agents"
embedding_api: "text-embedding-3-small via openrouter"
extraction_llm: "gpt-4o-mini via openrouter"
object_storage: "supabase storage"
deployment: "supabase edge functions"
test_runner: "deno test"
schema_validation: "zod"
```

### 10.3 Example: Bun standalone profile

```yaml
runtime: "bun"
framework: "hono"
mcp_adapter: "@hono/mcp"
database: "postgres (any) + pgvector"
vector_extension: "pgvector"
auth_provider: "custom JWT"
embedding_api: "text-embedding-3-small via openai"
extraction_llm: "gpt-4o-mini via openai"
object_storage: "s3-compatible"
deployment: "docker on fly.io"
test_runner: "bun test"
schema_validation: "zod"
```

---

## 11. REFERENCES

Verified March 2026. **Research for latest versions before implementing.**

### 11.1 Core dependencies

| Dependency | URL | Why |
|---|---|---|
| MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | MCP server implementation |
| MCP Specification | https://modelcontextprotocol.io/specification/2025-03-26 | Protocol reference (verify latest) |
| MCP Auth (June 2025+) | https://modelcontextprotocol.io/specification/draft/basic/authorization | OAuth 2.1 for MCP — Resource Server model |
| Hono MCP Middleware | https://github.com/honojs/middleware/tree/main/packages/mcp | Hono + MCP integration (if using Hono) |
| pgvector | https://github.com/pgvector/pgvector | Vector similarity search in Postgres |

### 11.2 Reference implementations

| Project | URL | Learn from |
|---|---|---|
| Open Brain | https://github.com/benclawbot/open-brain | Supabase Edge + MCP + pgvector pattern |
| Open Brain Guide | https://promptkit.natebjones.com/20260224_uq1_guide_main | Step-by-step deployment guide |
| Graphiti (Zep) | https://github.com/getzep/graphiti | Temporal knowledge graph, MCP tools, entity deduplication |
| Graphiti MCP Docs | https://help.getzep.com/graphiti/getting-started/mcp-server | MCP tool design patterns |
| AWS Multi-tenant MCP | https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server | OAuth 2.1 + multi-tenancy reference |
| MCP Plexus | https://github.com/super-i-tech/mcp_plexus | Multi-tenant MCP framework |
| StrongDM Attractor | https://github.com/strongdm/attractor | Spec-driven coding agent methodology |
| MindBase | https://github.com/agiletec-inc/mindbase | PostgreSQL + pgvector + Ollama, local-first |
| Mem0 | https://github.com/mem0ai/mem0 | Graph-enhanced memory (study API design) |

### 11.3 Best practices

| Topic | URL |
|---|---|
| MCP Tool Design | https://www.philschmid.de/mcp-best-practices |
| MCP Server Production | https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/ |
| MCP Security | https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/ |
| Multi-tenant Auth in MCP | https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol |
| MCP Auth Deep Dive | https://www.descope.com/blog/post/mcp-auth-spec |
| pgvector Benchmarks | https://supabase.com/docs/guides/ai/choosing-compute-addon |
| Bitemporal Postgres | https://wiki.postgresql.org/wiki/SQL2011Temporal |
| pg_bitemporal | https://github.com/scalegenius/pg_bitemporal |

### 11.4 Research papers

| Paper | URL | Relevance |
|---|---|---|
| Graphiti Architecture | https://arxiv.org/abs/2501.13956 | Bitemporal knowledge graph design, entity deduplication |

---

## 12. GENERATION SUMMARY (gen0)

```yaml
generation: gen0-v3
author: human + AI
date: 2026-03-03
what_was_built: >
  Seed spec defining invariant data model, tool interface, auth model,
  federation architecture, and validation scenario. v3 introduces four
  architectural advances over v2: event primacy (events are truth, facts
  are projections), graph-native ontology (type nodes replace labels table),
  epistemic status model (hypothesis/asserted/confirmed), and capability-based
  grants as a first-class table.

what_was_learned:
  - MCP best practices recommend 5-15 outcome-oriented tools, not CRUD wrappers
  - Multi-tenant MCP is not standardized; must be solved at application level
  - MCP auth spec has evolved significantly — June 2025 revision separates resource server from auth server
  - Serverless CPU limits (~2s) may constrain capture_thought; must measure before deciding sync vs async
  - pgvector HNSW performs well at <100K nodes on minimal infra
  - Entity deduplication is critical for capture_thought quality — Graphiti's approach is worth studying
  - Cryptographic event chains (hash linking, signatures) provide trustless audit but add significant
    complexity; deferred to gen3 when federation requires it
  - PostgreSQL has evolving SQL:2011 temporal support that may simplify bitemporal implementation

what_next_gen_should_watch_for:
  - MCP auth spec may change — check latest before implementing
  - MCP adapter library API may have breaking changes — verify current version
  - Platform limits may have changed — verify before designing
  - capture_thought LLM extraction quality depends heavily on prompt engineering — invest time here
  - Entity deduplication accuracy will determine whether capture_thought is useful or frustrating
  - Cross-tenant RLS is the hardest auth problem — test thoroughly before building other features
  - Type node bootstrap (self-referential metatype) needs careful migration script — test idempotency
  - The grants table adds a DB lookup to every cross-tenant operation — measure performance impact early
```