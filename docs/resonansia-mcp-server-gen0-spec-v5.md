# RESONANSIA MCP SERVER — GEN 0 SPEC (v5)

## 0. GENERATIONAL PROTOCOL

This spec evolves through AI generations. Each generation MUST follow this protocol.

### 0.1 Generation contract

```yaml
gen0: Seed spec. Defines invariants, tool interface, validation scenario, open questions.
gen1-spec: Resolve all [DECIDE:gen1] and [RESEARCH:gen1] markers. Question ≥3 gen0 assumptions. Produce gen1 spec: a fully resolved, implementation-ready specification with no remaining ambiguity. No code.
gen1-impl: A SEPARATE coding agent receives the gen1 spec + tech profile. Produces deployable code + tests. Reports pass/fail against validation scenario. Feeds implementation learnings back as [FEEDBACK:gen1-impl] markers for gen2-spec.
gen2-spec: Inherit gen1 spec + gen1-impl feedback. Resolve [DECIDE:gen2] markers. Question ≥3 gen1-spec decisions. Produce gen2 spec.
gen2-impl: Separate coding agent implements gen2 spec.
genN: Pattern continues. Spec and implementation are always separate sessions with separate agents.
```

### 0.2 What every generation MUST do

1. **INHERIT** — Read the full spec. Read the DECISION LOG. Understand prior rationale.
2. **QUESTION** — Challenge ≥3 assumptions or decisions from prior generations. Document challenges in DECISION LOG with outcome: `upheld`, `revised`, or `deferred`.
3. **RESOLVE** — Every `[DECIDE]` assigned to your generation must be resolved with: decision, alternatives considered, rationale, confidence (high/mid/low), and a `question_this_if` trigger condition for future generations.
4. **RESEARCH** — Every `[RESEARCH]` assigned to your generation requires web research before deciding. Document findings.
5. **BUILD** — Produce the artifacts listed in your generation's DELIVERABLES section.
6. **VALIDATE** — Run the validation scenario. Report pass/fail per test case.
7. **SEPARATE** — Spec generations produce ONLY an updated spec file. Implementation cycles produce ONLY code artifacts. A spec generation must NEVER produce implementation code. An implementation cycle must NEVER modify the spec (it may propose changes as [FEEDBACK] markers for the next spec generation).
8. **FEEDBACK LOOP** — Implementation cycles MUST report back to the next spec generation:
   - Which spec sections were ambiguous (required interpretation during implementation)
   - Which spec sections were wrong (could not be implemented as specified)
   - Which spec sections were missing (implementation required decisions not covered by spec)
   - Performance measurements that inform future DECIDE markers
   - Format: [FEEDBACK:genN-impl] markers appended to the spec by the implementation agent.
9. **HAND OFF** — Update the DECISION LOG. Write a GENERATION SUMMARY (≤500 words): what you built, what you learned, what the next generation should watch for.

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
  spec_section_updated: "2.1 — column type for event_id changed from UUID to UUIDv7"
```

### 0.4 Anti-drift rules

- **No scope creep**: If a feature is not in the SYSTEM DEFINITION or your GENERATION DELIVERABLES, do not build it. Propose it for a future generation instead.
- **No phantom requirements**: Do not invent requirements. If the spec does not mention it, ask whether it is needed before building it.
- **Spec stays in sync**: After resolving a DECIDE marker, update the spec text. Never leave resolved decisions only in the log.
- **Minimal viable first**: When a DECIDE has a simple option and a complex option, prefer the simple option unless the complex option is required by a validation test.
- **Spec and code never share a session**: A spec-refining agent must not have access to a code execution environment. A code-producing agent must not modify the spec. This separation prevents the spec from becoming a post-hoc description of what was built rather than a prescriptive definition of what should be built.

---

## 1. SYSTEM DEFINITION

### 1.0 One-sentence summary

A federated MCP server that exposes a bitemporal, event-sourced knowledge graph as AI-agent-accessible infrastructure with tenant isolation, semantic search, and temporal queries.

### 1.1 Architectural principles

These principles are **invariants** that no generation may violate:

1. **Event Primacy** — The `events` table is the single immutable source of truth. Fact tables (`nodes`, `edges`, `grants`) are projections of the event stream. Every row in a fact table MUST reference the `event_id` that created it. The same event stream + same projection logic = identical state.
2. **Graph-native Ontology** — The schema is part of the graph. Entity types, relationship types, and event types are first-class nodes (`type_nodes`), not a separate registry table. To understand what a "booking" is, you traverse its type node. Critical consequence: an agent can use the same tools to learn the schema as it uses to learn the data. `explore_graph(start_id=METATYPE_NODE)` returns all type nodes. `find_entities(entity_types=["type_node"])` searches type definitions by name or content. `get_schema` is a convenience wrapper — it MUST query the graph internally, not a separate registry. No generation may break this reflexive property.
3. **Epistemic Honesty** — Not all facts are equally certain. Every node carries an epistemic status (`hypothesis`, `asserted`, `confirmed`) reflecting the provenance of the information.
4. **Tenant Isolation** — `tenant_id` on every row. Row-Level Security enforces isolation. No data leaks between tenants, ever.
5. **Federation via Edges** — Cross-tenant data sharing happens through edges and capability grants, never through data copying.
6. **Bitemporality** — Every mutable entity tracks business time (`valid_from`/`valid_to`) and system time (`recorded_at`). Queries can ask "what was true then?" and "what did we know then?"
7. **Tech Agnosticism** — This spec defines WHAT, not HOW. Technology choices are bound via a separate Tech Profile (section 10) injected at generation start.
8. **Spec Primacy** — The specification is the source of truth for system design. Code is a derived artifact. If the spec and the code disagree, the spec is authoritative and the code must be corrected. No implementation cycle may introduce design decisions not present in the spec; if implementation reveals a gap, it must be reported as a [FEEDBACK] marker for the next spec generation, not silently resolved in code.
9. **A2A Readiness** — MCP defines how agents access tools and data. A2A (Agent2Agent Protocol) defines how agents discover and collaborate with each other. Resonansia sits at this intersection: it is an MCP server (agents use its tools) AND its tenants should be discoverable as A2A-compatible agents (agents find each other through Resonansia). No generation may design features that preclude future A2A compliance. See section 5.4 for details.

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
| A2A agent discoverability | No | No | No | No | **Yes (gen2+)** |

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
| A2A Protocol | https://a2a-protocol.org/latest/specification/ | Agent-to-agent interoperability standard (v0.3). AgentCard discovery, task delegation, SSE streaming. Complements MCP — MCP for tools, A2A for agent collaboration. |
| A2A Security Guide | https://semgrep.dev/blog/2025/a-security-engineers-guide-to-the-a2a-protocol/ | Security analysis of A2A: AgentCard spoofing risks, token lifetime issues, OAuth considerations. |

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
-- Multiple rows per node_id: one per bitemporal version.
-- Current version: valid_to = 'infinity' AND is_deleted = false.
nodes (
  node_id         UUID NOT NULL,                           -- stable identity, never changes meaning or tenant
  tenant_id       UUID NOT NULL REFERENCES tenants,
  type_node_id    UUID NOT NULL REFERENCES nodes,          -- FK to type node (ontology layer)
  data            JSONB NOT NULL DEFAULT '{}',              -- entity fields
  embedding       VECTOR NULLABLE,                         -- dimension set by tech profile
  epistemic       TEXT NOT NULL DEFAULT 'hypothesis',      -- 'hypothesis' | 'asserted' | 'confirmed'
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),      -- bitemporal: business time start
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',          -- bitemporal: business time end
  recorded_at     TIMESTAMPTZ DEFAULT now(),               -- bitemporal: system time
  created_by      UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events,        -- which event created this row
  is_deleted      BOOLEAN DEFAULT false,
  PRIMARY KEY (node_id, valid_from),                       -- composite PK: identity + time
  -- Prevent overlapping valid ranges for the same node:
  EXCLUDE USING gist (
    node_id WITH =,
    tstzrange(valid_from, valid_to) WITH &&
  )
)

-- Table 4: EDGES — relationships between nodes (FACT LAYER)
-- Cross-tenant edges are the federation mechanism.
-- source_id and target_id may belong to different tenants.
-- Auth must verify access to BOTH endpoints.
-- [DECIDE:gen1] Edge versioning strategy:
--   Option A: Composite PK (edge_id, valid_from) — same pattern as nodes, full bitemporality
--   Option B: Simple PK (edge_id) — edges are immutable, never versioned, only soft-deleted + recreated
--   Recommendation: Option A for consistency with nodes. Question this if edge update frequency is near-zero.
edges (
  edge_id         UUID NOT NULL,                           -- stable identity
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
  is_deleted      BOOLEAN DEFAULT false,
  PRIMARY KEY (edge_id, valid_from),                      -- composite PK: identity + time (mirrors nodes pattern)
  -- Prevent overlapping valid ranges for the same edge:
  EXCLUDE USING gist (
    edge_id WITH =,
    tstzrange(valid_from, valid_to) WITH &&
  )
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
  is_deleted      BOOLEAN DEFAULT false,                   -- [DECIDE:gen1] Grants soft-delete: use is_deleted (consistent with nodes/edges) or rely solely on valid_to for revocation? Recommendation: include is_deleted for pattern consistency. Question this if grants are never revoked mid-validity.
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

**Note on type_nodes:** Type nodes are regular nodes whose `type_node_id` points to a bootstrap "metatype" node. Since `nodes` has a composite PK `(node_id, valid_from)`, FKs referencing nodes (in `edges`, `grants`, `blobs`) reference `node_id` only — they point to the entity identity, not a specific version. The EXCLUDE constraint guarantees at most one active version per `node_id` at any point in time. The metatype is self-referential (its `type_node_id` = its own `node_id`). This bootstrap node is created during schema migration. Type nodes carry a `label_schema` field in their `data` JSONB that provides optional JSON Schema validation for entities of that type.

**Gen1-spec precision requirements:**
The SQL above is tech-agnostic. Gen1-spec must produce:
- Exact column types for the chosen tech profile (e.g., pgvector dimension, JSONB operators, UUIDv7 generation)
- Exact index definitions (which columns, which index type, which parameters)
- Exact RLS policy SQL for every table
- Exact EXCLUDE constraint syntax verified against target PostgreSQL version
- Exact bootstrap sequence for metatype self-reference (migration step order)
- Exact seed data SQL for Pettson scenario

### 2.2 Invariant rules

These rules are absolute. No generation may weaken them. Each invariant has an ID for referencing in code comments and tests.

1. **INV-TENANT: Tenant isolation** — `tenant_id` on every row. No exceptions. Enforcement: RLS policies on every table. Violation example: a query returning nodes from a tenant not in the token's `tenant_ids`.

2. **INV-APPEND: Events are append-only** — Never update, never delete. Corrections are new events referencing the original via payload. Enforcement: RLS policy denying UPDATE and DELETE on `events` table; no application code path for event mutation. Violation example: an UPDATE statement on the `events` table.

3. **INV-BITEMP: Bitemporality** — `valid_from`/`valid_to` = business time. `recorded_at` (or UUIDv7 timestamp of PK) = system time. Enforcement: EXCLUDE constraint on `(node_id, tstzrange(valid_from, valid_to))` prevents overlapping versions. Violation example: two active node versions with overlapping time ranges.

4. **INV-SOFT: Soft deletes only** — `is_deleted = true` + `valid_to = now()`. Hard deletes only for GDPR erasure (gen2+). Enforcement: application-layer check; no DELETE permission via RLS on fact tables. Violation example: a DELETE statement on the `nodes` table.

5. **INV-XTEN: Cross-tenant edges** — `source_id` and `target_id` may belong to different tenants. Auth must verify both. Enforcement: tool-level check before creating edge; grants table consulted for cross-tenant access. Violation example: creating a cross-tenant edge without grants for both endpoints.

6. **INV-TYPE: Type nodes are the schema** — System works with only the bootstrap metatype (fully dynamic). Type nodes add validation and discovery. Enforcement: metatype bootstrap in migration script; `type_node_id` FK on every node and edge. Violation example: a node without a `type_node_id`.

7. **INV-BLOB: Blobs use external storage** — Only metadata in the database. `storage_ref` points to object storage. Enforcement: no BYTEA columns for file content. Violation example: storing file bytes directly in a JSONB field.

8. **INV-IDENT: Identity persistence** — A `node_id` never changes meaning or tenant. Once assigned, it is permanent. Enforcement: `node_id` is set at creation (= `stream_id` of first event) and never reassigned. Violation example: reusing a `node_id` for a different entity type.

9. **INV-LINEAGE: Event lineage** — Every fact row (`nodes`, `edges`, `grants`) MUST have a non-null `created_by_event` FK. Enforcement: NOT NULL constraint on `created_by_event` column; verified by acceptance test T13. Violation example: a row in `nodes` with `created_by_event = NULL`.

10. **INV-NOJSON: No business logic in JSONB** — Relationships between entities MUST be modeled as edges, not as foreign keys buried in `data` payloads. The `data` field is for descriptive attributes only. Enforcement: code review + schema validation in type nodes. Violation example: storing `{"related_to": "node-xyz"}` in `node.data` instead of creating an edge.

11. **INV-ATOMIC: Atomic event+projection** — An event and its projection to fact tables (`nodes`, `edges`, `grants`) MUST be written within the same database transaction. If projection fails, the event MUST be rolled back. There are no "orphaned events" and no "eventual consistency" between the event layer and the fact layer. Enforcement: all tool mutations wrap event creation + projection in a single `BEGIN...COMMIT` block. Violation example: an event row exists in `events` but its corresponding node row is missing from `nodes`. **Exception**: external side effects (embedding generation, LLM calls) happen OUTSIDE the transaction boundary — they run before (LLM extraction in `capture_thought`) or after (async embedding queue) the atomic write. See section 3.5 for details.

12. **INV-CONCURRENCY: Optimistic concurrency on updates** — When updating an existing entity via `store_entity(entity_id=X)`, the caller SHOULD provide `expected_version` (the `valid_from` timestamp of the version they read). If the current version's `valid_from` does not match, the operation MUST fail with a `CONFLICT` error. This prevents silent overwrites when two agents update the same entity concurrently. Enforcement: application-level check in `store_entity` projection logic. `[DECIDE:gen1]` Whether `expected_version` is required or optional. Recommendation: optional for gen1 (last-write-wins if omitted), required in gen2. Violation example: two concurrent `store_entity` calls both succeed, with the second silently overwriting the first without the caller's awareness.

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
8. **Reflexive ontology** — Type nodes are queryable through the same tools as data nodes. An agent that knows how to `explore_graph` already knows how to discover the schema. `get_schema` is a convenience shortcut, not a separate system. Gen1 must not introduce a parallel type registry that diverges from the graph.

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
  gen1_spec_must_add:
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
    sort_by: string?               # "relevance" (default for semantic) | "created_at" | field name
  filter_operators: |
    Filters support the following operators applied to JSONB data fields:
      { "field": "value" }              — equality (shorthand, default)
      { "field": { "$eq": "value" } }   — explicit equality
      { "field": { "$contains": "sub" } } — text contains (case-insensitive)
      { "field": { "$gte": 100 } }      — greater than or equal
      { "field": { "$lte": 200 } }      — less than or equal
      { "field": { "$in": ["a","b"] } } — value in set
      { "field": { "$exists": true } }  — field exists in JSONB
    [DECIDE:gen1] Whether to support all operators in gen1 or start with only equality + $in.
    Recommendation: equality + $in for gen1. Add range and contains in gen2.
  returns:
    results: [{ entity_id, entity_type, data, similarity?, epistemic, valid_from }]
    total_count: int
    next_cursor: string?           # null if no more results
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
    [DECIDE:gen1] Entity deduplication approach for capture_thought:
    Option A: Embedding similarity above threshold (fast, may miss spelling variants)
    Option B: Fuzzy text matching on name fields (handles typos, misses semantic equivalence)
    Option C: Hybrid — fuzzy match first, then embedding similarity as tiebreaker
    Option D: LLM-assisted disambiguation (most accurate, highest cost and latency)
    Recommendation: Option C for gen1. Research what Graphiti uses (they have entropy-gated fuzzy matching).
    question_this_if: "Duplicate entities exceed 5% of total entities in production use"
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
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
  gen1_spec_must_add:
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

get_blob:
  params: { blob_id: string }
  returns: { blob_id, content_type, data_base64 }
  gen1_spec_must_add:
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)

lookup_dict:
  params: { dict_type: string, key: string?, valid_at: datetime? }
  returns: { entries: [{ key, value, valid_from, valid_to }] }
  gen1_spec_must_add:
    - exact JSON Schema for params (in Zod notation matching tech profile)
    - exact JSON Schema for return value
    - exact error codes with message templates
    - exact event payload schema for each emitted event
    - pseudocode for the projection logic (event → fact table mutations)
```

**Total: 15 tools** (12 primary + 3 utility). Within the recommended 5-15 range.

### 3.4 Projection matrix (event → fact table mutations)

This matrix defines how each event `intent_type` maps to mutations on fact tables. It is the skeleton of the event-sourcing engine. Gen1-spec MUST expand each row into full pseudocode; gen1-impl translates pseudocode to executable code.

```yaml
# ── PROJECTION MATRIX ──
# Format: intent_type → [fact table mutation(s)]
# All mutations happen within a single database transaction (see INV-ATOMIC, section 3.7).

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

# ── ERROR CODE REGISTRY ──
# Gen1-spec MUST assign numeric codes. These are semantic categories.

error_categories:
  VALIDATION_ERROR: "Input does not match expected schema or constraints"
  NOT_FOUND: "Referenced entity, type, or resource does not exist"
  AUTH_DENIED: "Token lacks required scope for this operation"
  CONFLICT: "Optimistic concurrency violation — entity was modified since last read"
  CROSS_TENANT_DENIED: "Cross-tenant operation failed — missing grant or scope"
  SCHEMA_VIOLATION: "Entity data does not match type node's label_schema"
  EXTRACTION_FAILED: "LLM extraction in capture_thought failed or returned invalid output"
  RATE_LIMITED: "Too many requests — retry after backoff"
  INTERNAL_ERROR: "Unexpected server error — includes event_id if event was created before failure"
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

### 4.5 Grants vs Scopes — two-layer access control

The system has two complementary layers of access control:

- **Scopes** (in JWT tokens): coarse-grained, tenant-level. Fast (in-memory check, no DB). Example: "This agent can read tenant T1." Checked on every tool call.
- **Grants** (in grants table): fine-grained, node-level. Requires DB lookup. Example: "Tenant T2 can TRAVERSE node N1 in tenant T1." Checked for cross-tenant operations.

Both must pass for an operation to succeed. Scopes are the fast outer gate; grants are the fine-grained inner gate.

**Trade-offs of this design:**
- Scopes in JWT mean permission changes require token re-issue (not instant). For gen1 with short-lived tokens (1h) this is acceptable.
- Grant changes take effect immediately (no token re-issue needed) because they are checked at query time.
- Token size grows with scope count. At gen1 scale (< 10 scopes per token) this is not a problem.
- `[DECIDE:gen1]` If scope granularity proves too coarse or token size becomes problematic, consider moving to opaque tokens + introspection in gen2 where all permissions live in the database.

### 4.6 Actor identity model

The `created_by` UUID on every row needs a defined source. This section specifies how actor identities are represented.

```yaml
# ── ACTOR IDENTITY ──
# [DECIDE:gen1] Actor identity representation:
#   Option A: Actors table — separate table (actor_id, name, type, tenant_id, external_id)
#   Option B: Actors as graph nodes — actors are nodes with type_node "actor" (graph-native, queryable)
#   Option C: Raw JWT sub — created_by stores the JWT sub claim directly, no actor registry
#
#   Recommendation: Option B (actors as graph nodes). Rationale:
#     - Consistent with graph-native ontology principle (1.1.2)
#     - Actors become queryable: "which agent created the most entities this week?"
#     - Edges between actors and entities they created are implicit (via created_by) but
#       can also be explicit (e.g. "assigned_to" edge)
#     - Actor type nodes carry metadata: agent purpose, scopes, creation date
#     - JWT sub claim maps to actor node_id (set during agent/user provisioning)
#
#   Question this if: Actor node creation overhead is measurable (each new JWT sub = node creation)
#
#   Regardless of choice, gen1 must specify:
#     - How a JWT sub claim maps to a created_by UUID
#     - What happens when a token presents a sub that has no corresponding actor
#     - Whether actors are per-tenant or global
#     - Seed data for Pettson scenario: actor nodes for sales_agent, content_agent, booking_agent, partner_travel_agency

mapping_rules:
  - JWT sub claim is a stable identifier (UUID or URI)
  - On first tool call: if no actor node exists for sub, create one automatically (type_node: "actor")
  - created_by on all rows = actor node's node_id
  - Actor nodes are tenant-scoped (an agent with multi-tenant access has one actor node per tenant)
```

### 4.7 Auth decisions for gen1

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
gen2: [consent_protocol: YES, federated_search: YES, grant_delegation: YES, a2a_agent_card: YES, a2a_server_endpoint: YES]
gen3: [remote_query_forwarding: YES, cryptographic_event_chain: YES, federated_graph_merge: YES, a2a_client: YES, a2a_federated_mesh: YES]
    # NOTE ON CRYPTOGRAPHIC EVENT CHAINS:
    # Gen3 introduces hash-linked events (SHA-256 chain where each event references
    # the hash of the previous event in its stream) and Ed25519 signatures per actor.
    # This enables trustless federation — a remote Resonansia instance can verify that
    # an event stream has not been tampered with without trusting the source database.
    # Gen1-2 use UUID event_id with no hash linking. The verify_lineage tool checks
    # FK integrity only. Gen3 upgrades verify_lineage to check cryptographic chain integrity.
    # Design reference: content-addressable event_hash as PK, JCS canonicalization (RFC 8785)
    # for deterministic hashing, prev_hash column linking to previous event in stream.
```

### 5.4 A2A agent interoperability

Resonansia is an MCP server — agents access its tools via MCP. But in a multi-agent world, agents also need to discover and collaborate with *each other*. The A2A (Agent2Agent) Protocol addresses this layer.

**Relationship between MCP and A2A:**
- **MCP** = how an agent connects to tools and data (Resonansia's primary interface)
- **A2A** = how agents discover each other's capabilities, delegate tasks, and exchange results
- A Resonansia tenant could be *both*: an MCP tool server that agents connect to, AND an A2A-discoverable agent that other agents can delegate tasks to

**Why this matters for Resonansia:**
The federation model (section 5.1-5.3) currently assumes all agents connect directly to Resonansia via MCP. But in practice, an agent running in one organization may want to *discover* that a Resonansia tenant exists and what it can do — without having a preconfigured MCP connection. A2A's AgentCard provides this discovery mechanism.

```yaml
# ── A2A INTEGRATION ROADMAP ──

gen1:
  # No A2A implementation. Awareness only.
  - "[RESEARCH:gen1] A2A Protocol v0.3 specification — AgentCard format, task lifecycle, auth model"
  - "[RESEARCH:gen1] How do A2A AgentCard skills map to MCP tools? Can Resonansia auto-generate an AgentCard from its MCP tool list?"
  - Design constraint: gen1 architecture must not preclude A2A. Specifically:
    - Tool descriptions must be machine-readable (already satisfied by MCP tool schemas)
    - Tenant capabilities must be introspectable (already satisfied by get_schema)
    - Auth model must be compatible with A2A's OAuth/OIDC requirement (already satisfied by OAuth 2.1)

gen2:
  - "[DECIDE:gen2] A2A AgentCard generation"
    description: "Each Resonansia tenant publishes an AgentCard at /.well-known/agent-card.json"
    content: |
      The AgentCard would advertise:
        - name: tenant name
        - description: from tenant config
        - skills: derived from tenant's type nodes and available MCP tools
        - authentication: OAuth 2.1 (same as MCP auth)
        - supportedModes: ["text"] (gen2), ["text", "data"] (gen3)
    question_this_if: "A2A protocol changes significantly before gen2 implementation"

  - "[DECIDE:gen2] A2A server endpoint"
    description: "Resonansia exposes A2A message/send endpoint alongside MCP"
    options:
      A: "Separate A2A endpoint that translates A2A tasks to MCP tool calls internally"
      B: "Unified endpoint that speaks both MCP and A2A based on content negotiation"
      C: "A2A handled by a thin proxy layer in front of the MCP server"
    recommendation: "Option A — cleanest separation, A2A adapter wraps MCP tools"

gen3:
  - A2A client capability: Resonansia agents can discover and delegate tasks to external A2A agents
  - Federated agent mesh: Resonansia tenants across different instances discover each other via A2A
  - AgentCard signing for trust verification between federated instances
```

**References:**
- A2A Protocol Specification: https://a2a-protocol.org/latest/specification/
- A2A GitHub: https://github.com/a2aproject/A2A
- A2A Security Analysis: https://semgrep.dev/blog/2025/a-security-engineers-guide-to-the-a2a-protocol/
- MCP + A2A relationship: https://codelabs.developers.google.com/intro-a2a-purchasing-concierge

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
# Gen1-impl MUST produce cost estimates covering:
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

T14_verify_lineage:
  agent: any
  precondition: Multiple entities created via store_entity and capture_thought
  call: verify_lineage(entity_id=LEAD_ID)
  expect: is_valid=true, orphaned_facts=[], event_count > 0
  validates: event lineage integrity check via tool (not just DB-level)
```

### 7.7 Spec-level validation (for spec generations)

A spec generation is validated not by running code but by checking:

1. **Completeness**: Zero unresolved [DECIDE:genN] or [RESEARCH:genN] markers for the current generation.
2. **Precision**: Every schema definition, tool signature, auth rule, and test assertion is concrete enough that a coding agent needs zero design decisions to implement it. Test: can you extract a single unambiguous implementation from the spec text?
3. **Consistency**: No contradictions between sections. Every entity type referenced in validation tests exists in the schema. Every tool referenced in tests exists in the tool interface. Every scope referenced in agent roles exists in the auth model.
4. **Traceability**: Every resolved decision in the DECISION LOG has a corresponding spec text update (spec_section_updated field is non-empty).
5. **Handoff readiness**: The implementation brief (deliverable_6) contains enough information for a coding agent to start work without asking clarifying questions.

---

## 8. GENERATION DELIVERABLES

### 8.1 Gen1-spec deliverables

Gen1-spec receives this spec + a TECH PROFILE (see section 10). Gen1-spec produces exclusively spec refinements — no code.

```yaml
deliverable_1_resolved_decisions:
  what: Every [DECIDE:gen1] marker resolved with full decision log entry
  includes:
    - Decision, alternatives considered, rationale, confidence, question_this_if
    - Web research findings for each [RESEARCH:gen1] marker
    - Updated spec text reflecting each resolved decision (not just log entries)
  done_when: Zero [DECIDE:gen1] or [RESEARCH:gen1] markers remain in spec.

deliverable_2_schema_precision:
  what: Section 2 (DATA MODEL) refined to implementation-ready precision
  includes:
    - Exact column types, index definitions, and constraint expressions for the chosen tech profile
    - Exact RLS policy SQL for every table (written in spec, not in a migration file)
    - Exact bootstrap migration sequence for metatype self-reference
    - Embedding dimension and model specified (from resolved DECIDE)
    - Any schema changes resulting from RESEARCH (e.g., SQL:2011 temporal support findings)
  done_when: A coding agent can produce a working migration by translating the spec SQL to the target platform without making any design decisions.

deliverable_3_tool_precision:
  what: Section 3 (MCP TOOL INTERFACE) refined to implementation-ready precision
  includes:
    - Exact input/output JSON schemas for every tool (using chosen schema_validation library syntax, e.g., Zod)
    - Exact error codes and error message templates for every failure mode per tool
    - Exact event payload schemas for every intent_type
    - Exact projection logic described in pseudocode: for each event intent_type, what rows are inserted/updated in which fact tables
    - capture_thought LLM prompt template (complete, not sketched)
    - Entity deduplication algorithm described step-by-step (from resolved DECIDE)
  done_when: A coding agent can implement each tool by translating pseudocode to the target language without making any design decisions.

deliverable_4_auth_precision:
  what: Section 4 (AUTH MODEL) refined to implementation-ready precision
  includes:
    - Exact JWT claim structure and validation rules
    - Exact scope-checking logic per tool (which scopes are required for each tool + operation)
    - Exact grants table consultation logic for cross-tenant operations (pseudocode)
    - Exact RLS policy interaction with application-level auth (from resolved DECIDE)
    - Exact audit event schema
  done_when: A coding agent can implement auth middleware by translating the spec to code without making any security decisions.

deliverable_5_validation_precision:
  what: Section 7 (VALIDATION SCENARIO) refined to executable precision
  includes:
    - Exact seed data: every tenant, type node, entity, edge, grant, and agent token as concrete JSON/SQL
    - Exact test assertions: for each T01-T14, the exact request payload and exact expected response shape (not prose descriptions)
    - Test execution order and dependencies made explicit
  done_when: A coding agent can produce executable test code by translating test definitions to the target test framework without inventing any test data.

deliverable_6_implementation_brief:
  what: A new section (section 8b) that specifies what gen1-impl must produce
  includes:
    - List of implementation artifacts (migration, server, tools, auth, embedding, capture, tests, deployment, cost estimate)
    - For each artifact: which spec sections it draws from, what "done" means, which validation tests verify it
    - Tech profile binding: which spec abstractions map to which concrete technology choices
  done_when: A coding agent receiving the gen1 spec + this brief can start work without asking clarifying questions.

deliverable_7_questioned_assumptions:
  what: ≥3 gen0 assumptions challenged, with outcomes documented in DECISION LOG
  includes:
    - Each challenge documented as: assumption, challenge rationale, outcome (upheld/revised/deferred)
  done_when: DECISION LOG contains ≥3 entries from gen1-spec.

deliverable_8_gen1_spec_file:
  what: The complete updated spec file (resonansia-mcp-server-gen1-spec.md)
  includes:
    - All resolved decisions integrated into spec text
    - All research findings integrated
    - New [DECIDE:gen2] and [RESEARCH:gen2] markers where appropriate
    - Updated GENERATION SUMMARY
  done_when: The file is self-contained, internally consistent, and has zero unresolved gen1 markers.
```

### 8.2 Gen1-spec success criteria

```yaml
minimum_viable:
  - All [DECIDE:gen1] markers resolved with decision log entries
  - All [RESEARCH:gen1] markers researched and findings documented
  - Schema section updated with resolved types and constraints
  - Tool section updated with exact input/output schemas
  - ≥3 assumptions questioned
  grade: "C — spec is more precise but still has ambiguity"

target:
  - All deliverables 1-8 complete
  - Zero ambiguity in schema, tool, and auth sections (a coding agent needs zero design decisions)
  - Validation scenario has exact seed data and exact assertions
  - Implementation brief is complete
  - DECISION LOG is populated
  grade: "A — spec is implementation-ready"

stretch:
  - Spec reviewed by a second AI agent (critique/revise loop) with findings documented
  - Alternative architectural options explored and documented for key decisions
  - Cost model researched and estimated (in spec, not as a separate document)
  grade: "A+ — spec has been adversarially tested"
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
- "[DECIDE:gen1] Edge versioning: composite PK (edge_id, valid_from) vs immutable edges"
  recommendation: composite PK for consistency with nodes
- "[DECIDE:gen1] Grants soft-delete: is_deleted flag vs temporal-only revocation (valid_to)"
  recommendation: include is_deleted for pattern consistency
- "[DECIDE:gen1] Actor identity: actors as graph nodes vs actors table vs raw JWT sub"
  recommendation: actors as graph nodes (Option B)
- "[DECIDE:gen1] Optimistic concurrency: expected_version required or optional"
  recommendation: optional for gen1, required in gen2
- "[DECIDE:gen1] Filter operators in find_entities: full set vs equality-only for gen1"
  recommendation: equality + $in for gen1
```

### 8.4 Gen1 RESEARCH markers

```yaml
- "[RESEARCH:gen1] PostgreSQL SQL:2011 temporal table support — can it replace manual bitemporality?"
- "[RESEARCH:gen1] Current MCP SDK versions and @hono/mcp (or equivalent) API"
- "[RESEARCH:gen1] Serverless platform limits (execution time, memory, payload) for chosen Tech Profile"
- "[RESEARCH:gen1] Graphiti entity deduplication approach — entropy-gated fuzzy matching details"
- "[RESEARCH:gen1] OAuth 2.1 in MCP — verify spec version and any changes since June 2025"
- "[RESEARCH:gen1] A2A Protocol v0.3 specification — AgentCard format, task lifecycle, auth model, and how it relates to MCP"
- "[RESEARCH:gen1] A2A AgentCard auto-generation — can Resonansia derive an AgentCard from its MCP tool list and tenant type nodes?"
```

### 8.5 Gen2+ roadmap (for context only — gen1 does not build these)

Note: Each future generation follows the same spec/impl separation. gen2-spec resolves gen2 markers and produces gen2 spec. gen2-impl implements gen2 spec. And so on.

```yaml
gen2:
  - Consent protocol for cross-tenant edges (automated grant negotiation)
  - Token introspection endpoint
  - Rate limiting per agent
  - GDPR erasure (crypto-shred pattern)
  - Grant delegation (tenant A can allow tenant B to grant access to tenant C)
  - Performance optimization based on gen1 benchmarks
  - Migrate cross-tenant RLS to pure database-level enforcement
  - A2A AgentCard generation per tenant (/.well-known/agent-card.json)
  - A2A server endpoint — translate A2A tasks to MCP tool calls
  - Optimistic concurrency: make expected_version required on store_entity updates
  - Extended filter operators ($gte, $lte, $contains, $exists) on find_entities

gen3:
  - Federated query forwarding to remote Resonansia instances
  - Cryptographic event hardening (hash chains, signatures) for trustless federation
  - Horizontal scaling (read replicas)
  - Multi-region deployment
  - Real-time subscriptions (MCP sampling)
  - Epistemic branching (representing conflicting assertions from different sources)
    question_this_if: "Multiple federated instances need to reconcile conflicting facts"
  - A2A client capability: Resonansia agents discover and delegate tasks to external A2A agents
  - A2A federated mesh: Resonansia tenants across instances discover each other
  - AgentCard signing for trust between federated instances
  - Event replay: rebuild fact tables from event stream (disaster recovery, schema migration)
```

---

## 9. DECISION LOG

Empty at gen0. Gen1-spec fills this in. Subsequent generations append.

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
| A2A Protocol Spec | https://a2a-protocol.org/latest/specification/ | Agent-to-agent interoperability (v0.3). Required reading for gen1 RESEARCH. |
| A2A GitHub | https://github.com/a2aproject/A2A | Reference implementations, SDKs, AgentCard examples |

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
| A2A Security Guide | https://semgrep.dev/blog/2025/a-security-engineers-guide-to-the-a2a-protocol/ |
| A2A + MCP Relationship | https://codelabs.developers.google.com/intro-a2a-purchasing-concierge |
| A2A Spring AI Integration | https://spring.io/blog/2026/01/29/spring-ai-agentic-patterns-a2a-integration/ |

### 11.4 Research papers

| Paper | URL | Relevance |
|---|---|---|
| Graphiti Architecture | https://arxiv.org/abs/2501.13956 | Bitemporal knowledge graph design, entity deduplication |

---

## 12. GENERATION SUMMARY (gen0)

```yaml
generation: gen0-v5
author: human + AI
date: 2026-03-03
what_was_built: >
  Seed spec defining invariant data model, tool interface, auth model,
  federation architecture, and validation scenario. v3 introduced four
  architectural advances over v2: event primacy (events are truth, facts
  are projections), graph-native ontology (type nodes replace labels table),
  epistemic status model (hypothesis/asserted/confirmed), and capability-based
  grants as a first-class table. v4 introduces spec/implementation separation:
  spec generations refine the spec, implementation cycles produce code from the
  refined spec. v5 addresses structural gaps identified in spec review:
  projection matrix (event→fact table mapping), transaction boundaries and
  error model, edge bitemporality fix (composite PK), optimistic concurrency,
  actor identity model, capture_thought prompt skeleton, filter operators,
  cursor pagination, grants soft-delete consistency, and A2A protocol awareness
  as a new architectural principle with gen2+ roadmap.

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
  - Spec-driven development requires strict separation between spec-refining and code-producing sessions. Mixing them causes the spec to become a post-hoc description rather than a prescriptive definition.
  - A2A Protocol (v0.3, Linux Foundation) has emerged as the dominant standard for agent-to-agent
    communication. It complements MCP (agent-to-tool) with agent-to-agent discovery and collaboration.
    Resonansia sits at the MCP/A2A intersection and must be A2A-aware from gen1 onward.
  - Edges table had broken bitemporality (simple PK prevented versioning) — fixed with composite PK
  - Event-sourcing requires explicit projection logic and transaction boundaries to prevent
    orphaned events and inconsistent state between event and fact layers
  - Optimistic concurrency is needed when multiple agents may update the same entity
  - Actor identity (created_by) needs a defined source — graph-native actors fit the architecture best

what_next_gen_should_watch_for:
  - Gen1-spec must resist the temptation to produce code. Its output is exclusively an updated spec file.
  - MCP auth spec may change — check latest before implementing
  - MCP adapter library API may have breaking changes — verify current version
  - Platform limits may have changed — verify before designing
  - capture_thought LLM extraction quality depends heavily on prompt engineering — invest time here
  - Entity deduplication accuracy will determine whether capture_thought is useful or frustrating
  - Cross-tenant RLS is the hardest auth problem — test thoroughly before building other features
  - Type node bootstrap (self-referential metatype) needs careful migration script — test idempotency
  - The grants table adds a DB lookup to every cross-tenant operation — measure performance impact early
  - A2A Protocol is evolving rapidly — verify v0.3 is still current before gen2 implementation
  - A2A AgentCard signing is supported but not enforced (v0.3) — security implications for federation
  - The projection matrix (section 3.6) is a skeleton — gen1-spec must expand every row to full pseudocode
  - Transaction boundary design (section 3.7) is critical — test rollback scenarios thoroughly
  - Actor-as-node pattern means every new JWT sub creates a node — measure overhead at scale
```