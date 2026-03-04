# RESONANSIA MCP SERVER — GEN 1 SPEC (v1)

> **Lineage:** gen0-v5 → gen1-v1
> **Generated:** 2026-03-03 by gen1-spec agent (Claude Opus 4.6)
> **Protocol version target:** MCP 2025-11-25, A2A v0.3
> **Tech profile:** Supabase (see section 10.2)

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
-- [RESOLVED:gen1 D-001] UUIDv7 for event_id: YES. recorded_at retained for query ergonomics.
events (
  event_id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),  -- UUIDv7: embeds millisecond timestamp for natural ordering
  tenant_id       UUID NOT NULL REFERENCES tenants,
  intent_type     TEXT NOT NULL CHECK (intent_type IN (
    'entity_created', 'entity_updated', 'entity_removed',
    'edge_created', 'edge_removed',
    'epistemic_change', 'thought_captured',
    'grant_created', 'grant_revoked',
    'blob_stored'
  )),
  payload         JSONB NOT NULL,                         -- event-specific data (schema per intent_type, see section 3.4)
  stream_id       UUID,                                   -- groups events about the same entity (= node_id)
  node_ids        UUID[] DEFAULT '{}',                    -- related nodes
  edge_ids        UUID[] DEFAULT '{}',                    -- related edges
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),     -- when it happened in reality (business time / valid time)
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),     -- when system learned about it (system time / transaction time)
                                                          -- Redundant with UUIDv7 timestamp but retained for:
                                                          -- 1. Direct WHERE recorded_at > X filtering without UUID parsing
                                                          -- 2. Index-friendly range scans on system time
                                                          -- 3. Query readability
  created_by      UUID NOT NULL                           -- actor node_id (see section 4.6 actor identity)
)
-- INDEXES on events:
-- CREATE INDEX idx_events_tenant ON events (tenant_id);
-- CREATE INDEX idx_events_stream ON events (stream_id) WHERE stream_id IS NOT NULL;
-- CREATE INDEX idx_events_intent ON events (tenant_id, intent_type);
-- CREATE INDEX idx_events_occurred ON events (tenant_id, occurred_at DESC);
-- CREATE INDEX idx_events_recorded ON events (recorded_at DESC);

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
-- [RESOLVED:gen1 D-002] Edge versioning: Option B — immutable edges, simple PK.
-- Rationale: Edges represent relationships. "Updating" an edge = soft-delete + create new.
-- Temporal queries on edges use valid_from/valid_to but don't need versioning.
-- No validation test requires edge versioning. Simplifies schema and cross-tenant RLS.
edges (
  edge_id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),  -- stable identity, UUIDv7
  tenant_id       UUID NOT NULL REFERENCES tenants,       -- owner tenant of the edge
  type_node_id    UUID NOT NULL,                           -- FK to type node (predicate, e.g. "contacted_via")
  source_id       UUID NOT NULL,                           -- FK to nodes (by node_id only, not version)
  target_id       UUID NOT NULL,                           -- FK to nodes (by node_id only, not version)
  data            JSONB DEFAULT '{}',
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),      -- when relationship began (business time)
  valid_to        TIMESTAMPTZ DEFAULT 'infinity',          -- when relationship ended (business time)
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),      -- system time
  created_by      UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events,
  is_deleted      BOOLEAN DEFAULT false
)
-- INDEXES on edges:
-- CREATE INDEX idx_edges_tenant ON edges (tenant_id);
-- CREATE INDEX idx_edges_source ON edges (source_id) WHERE is_deleted = false;
-- CREATE INDEX idx_edges_target ON edges (target_id) WHERE is_deleted = false;
-- CREATE INDEX idx_edges_type ON edges (type_node_id);
-- CREATE INDEX idx_edges_active ON edges (tenant_id) WHERE is_deleted = false AND valid_to = 'infinity';
-- [DECIDE:gen2] If edge update frequency exceeds 5% of edge operations, reconsider composite PK.

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
  is_deleted      BOOLEAN DEFAULT false,                   -- [RESOLVED:gen1 D-003] Include is_deleted for pattern consistency with nodes/edges.
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

**Note on type_nodes:** Type nodes are regular nodes whose `type_node_id` points to a bootstrap "metatype" node. Since `nodes` has a composite PK `(node_id, valid_from)`, SQL FK constraints referencing `node_id` alone cannot be used (PostgreSQL FKs must reference the PK or a unique constraint). Therefore:

- `REFERENCES nodes` in the DDL above is **LOGICAL, not enforced as SQL FK constraints**.
- These references are enforced at the **application level** in tool implementation code.
- `type_node_id` on nodes and edges is validated by querying `SELECT 1 FROM nodes WHERE node_id = $type_node_id AND is_deleted = false AND valid_to = 'infinity'` before insert.
- The metatype FK constraint uses `DEFERRABLE INITIALLY DEFERRED` for self-referential bootstrap.
- The EXCLUDE constraint guarantees at most one active version per `node_id` at any point in time.
- The metatype is self-referential (its `type_node_id` = its own `node_id`). This bootstrap node is created during schema migration.
- Type nodes carry a `label_schema` field in their `data` JSONB. [RESOLVED:gen1 C-002] When a type node has a `label_schema`, validation against it is MANDATORY for `store_entity` (returns SCHEMA_VIOLATION on failure). Exception: `capture_thought` creates hypothesis entities with relaxed validation.
- Type node resolution searches BOTH the caller's tenant AND the system tenant (`00000000-0000-7000-0000-000000000000`), since edge type nodes and the actor type node live in the system tenant.

### 2.6 Gen1 schema precision (Supabase PostgreSQL profile)

All tables use `uuid_generate_v7()` for UUIDv7 PKs where specified. Requires: `CREATE EXTENSION IF NOT EXISTS pgvector; CREATE EXTENSION IF NOT EXISTS btree_gist;`

#### 2.6.1 Exact index definitions

```sql
-- TENANTS
CREATE INDEX idx_tenants_parent ON tenants (parent_id) WHERE parent_id IS NOT NULL;

-- EVENTS (see table definition above for full list)

-- NODES
CREATE INDEX idx_nodes_tenant ON nodes (tenant_id);
CREATE INDEX idx_nodes_type ON nodes (type_node_id);
CREATE INDEX idx_nodes_active ON nodes (tenant_id, type_node_id) WHERE is_deleted = false AND valid_to = 'infinity';
CREATE INDEX idx_nodes_stream ON nodes (node_id, valid_from DESC);  -- version history lookup
CREATE INDEX idx_nodes_embedding ON nodes USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- EDGES (see table definition above for full list)

-- GRANTS
CREATE INDEX idx_grants_tenant ON grants (tenant_id);
CREATE INDEX idx_grants_subject ON grants (subject_tenant_id);
CREATE INDEX idx_grants_object ON grants (object_node_id);
CREATE INDEX idx_grants_active ON grants (subject_tenant_id, object_node_id, capability) WHERE is_deleted = false AND valid_to = 'infinity';

-- BLOBS
CREATE INDEX idx_blobs_tenant ON blobs (tenant_id);
CREATE INDEX idx_blobs_node ON blobs (node_id) WHERE node_id IS NOT NULL;

-- DICTS
CREATE INDEX idx_dicts_lookup ON dicts (tenant_id, type, key);
```

#### 2.6.2 RLS policies

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dicts ENABLE ROW LEVEL SECURITY;

-- TENANTS: read own tenant(s) only
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));

-- EVENTS: append-only, read own tenant(s)
CREATE POLICY events_select ON events FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
-- NO UPDATE OR DELETE POLICIES ON EVENTS (INV-APPEND)

-- NODES: read own tenant(s), insert own tenant(s), no hard delete
CREATE POLICY nodes_select ON nodes FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY nodes_insert ON nodes FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY nodes_update ON nodes FOR UPDATE
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
-- NO DELETE POLICY ON NODES (INV-SOFT)

-- EDGES: read if source or target tenant is accessible
-- [RESOLVED:gen1 D-013] Cross-tenant edge reads use application-level enforcement
-- RLS permits reading edges owned by accessible tenants; cross-tenant traversal
-- verified in application code via grants table lookup.
CREATE POLICY edges_select ON edges FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY edges_insert ON edges FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY edges_update ON edges FOR UPDATE
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));

-- GRANTS: read own tenant(s) or where subject_tenant is accessible
CREATE POLICY grants_select ON grants FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[])
    OR subject_tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY grants_insert ON grants FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));

-- BLOBS
CREATE POLICY blobs_select ON blobs FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY blobs_insert ON blobs FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));

-- DICTS
CREATE POLICY dicts_select ON dicts FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
CREATE POLICY dicts_insert ON dicts FOR INSERT
  WITH CHECK (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));

-- Note: The Edge Function connects with service_role (bypasses RLS) and sets
-- app.tenant_ids via SET LOCAL before queries. This is the D-013 pattern:
-- application-level enforcement with RLS as safety net.
-- SET LOCAL 'app.tenant_ids' = '{uuid1,uuid2}';
```

#### 2.6.3 Metatype bootstrap sequence

The metatype is a self-referential node: its `type_node_id` points to itself. This requires a specific migration order:

```sql
-- Step 1: Create tables WITHOUT the nodes self-referencing FK
-- (type_node_id FK is deferred or not enforced at table creation)

-- Step 2: Insert metatype node (self-referential)
-- This is the ONLY node created outside the normal event→projection flow.
-- It bootstraps the ontology layer.
DO $$
DECLARE
  v_metatype_id UUID := '00000000-0000-7000-0000-000000000001'; -- well-known fixed UUID
  v_bootstrap_event_id UUID := uuid_generate_v7();
  v_bootstrap_tenant_id UUID; -- the platform/system tenant
BEGIN
  -- Create system tenant
  INSERT INTO tenants (tenant_id, name, config)
  VALUES ('00000000-0000-7000-0000-000000000000', '__system__', '{"is_system": true}')
  ON CONFLICT DO NOTHING
  RETURNING tenant_id INTO v_bootstrap_tenant_id;

  v_bootstrap_tenant_id := '00000000-0000-7000-0000-000000000000';

  -- Create bootstrap event
  INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, created_by)
  VALUES (v_bootstrap_event_id, v_bootstrap_tenant_id, 'entity_created',
    '{"type": "metatype", "data": {"name": "metatype", "description": "The type of all type nodes. Self-referential bootstrap node."}}',
    v_metatype_id, now(), v_metatype_id);  -- created_by = metatype itself (bootstrap)

  -- Create metatype node (self-referential: type_node_id = node_id)
  INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
  VALUES (v_metatype_id, v_bootstrap_tenant_id, v_metatype_id,
    '{"name": "metatype", "description": "The type of all type nodes. Self-referential bootstrap node.", "kind": "entity_type"}',
    'confirmed', now(), 'infinity', v_metatype_id, v_bootstrap_event_id, false);

  -- Create actor type node (needed for actor identity, see D-015)
  -- (Created via normal event→projection in seed data, not here)
END $$;

-- Step 3: Add FK constraints now that metatype exists
-- ALTER TABLE nodes ADD CONSTRAINT fk_nodes_type FOREIGN KEY (type_node_id) REFERENCES nodes(node_id) DEFERRABLE INITIALLY DEFERRED;
-- Note: FK references node_id only (not composite PK), validated against any version.
-- The DEFERRABLE constraint allows self-referential inserts within a transaction.
```

#### 2.6.4 UUIDv7 generation function

```sql
-- If uuid_generate_v7() is not available natively, use this PL/pgSQL implementation:
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS UUID AS $$
DECLARE
  v_time BIGINT;
  v_bytes BYTEA;
BEGIN
  v_time := (extract(epoch from clock_timestamp()) * 1000)::BIGINT;
  v_bytes := decode(lpad(to_hex(v_time), 12, '0'), 'hex') || gen_random_bytes(10);
  -- Set version (7) and variant (10xx)
  v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & x'0f'::int) | x'70'::int);
  v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & x'3f'::int) | x'80'::int);
  RETURN encode(v_bytes, 'hex')::UUID;
END $$ LANGUAGE plpgsql VOLATILE;
```

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

12. **INV-CONCURRENCY: Optimistic concurrency on updates** — When updating an existing entity via `store_entity(entity_id=X)`, the caller SHOULD provide `expected_version` (the `valid_from` timestamp of the version they read). If the current version's `valid_from` does not match, the operation MUST fail with a `CONFLICT` error. This prevents silent overwrites when two agents update the same entity concurrently. Enforcement: application-level check in `store_entity` projection logic. [RESOLVED:gen1 D-004] `expected_version` is OPTIONAL for gen1 (last-write-wins if omitted). [DECIDE:gen2] Make `expected_version` REQUIRED on `store_entity` updates. Violation example: two concurrent `store_entity` calls both succeed, with the second silently overwriting the first without the caller's awareness.

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
# [RESOLVED:gen1 D-005] Embedding model: text-embedding-3-small, 1536 dimensions
# [RESOLVED:gen1 D-006] Embed edges: NO for gen1
# [RESOLVED:gen1 D-007] Embed events: NO for gen1
# [RESOLVED:gen1 D-008] Bulk embedding: sequential with batching

model: "text-embedding-3-small"
dimensions: 1536
provider: "OpenAI (via OpenRouter or direct)"
cost: "$0.02 per 1M tokens (~$0.002 per 1K entity embeddings)"

trigger: on node create or update, queue async embedding job
input: |
  Concatenation formula:
    text = type_node_name + ": " + JSON.stringify(node.data, null, 0)
  Example:
    "lead: {\"name\":\"Johan Eriksson\",\"interest\":\"cabin+tickets\",\"source\":\"cabin fair\"}"
  Max input length: 8191 tokens (model limit). Truncate data fields if exceeded.

storage: nodes.embedding column (VECTOR(1536) via pgvector)
search: |
  SELECT node_id, data, 1 - (embedding <=> query_embedding) AS similarity
  FROM nodes
  WHERE tenant_id = $tenant_id
    AND is_deleted = false
    AND valid_to = 'infinity'
    AND type_node_id = ANY($type_node_ids)  -- optional type filter
  ORDER BY embedding <=> query_embedding
  LIMIT $limit;
  -- Uses pgvector HNSW index for approximate nearest neighbor
  -- Performance at 1536d: 240 QPS, 126ms p95 at 100K vectors (4GB RAM)

index_definition: |
  CREATE INDEX idx_nodes_embedding ON nodes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  -- HNSW parameters: m=16 (connections per layer), ef_construction=64 (build quality)
  -- Suitable for <100K vectors. Increase ef_construction for larger datasets.

constraints:
  - Embedding generation MUST be async (not in the request path)
  - Embedding pipeline MUST implement exponential backoff with jitter
  - Respect OpenAI rate limits: 3500 RPM, 1M TPM for text-embedding-3-small
  - Search latency target: <200ms p95 including RLS filtering at 100K nodes
  - Nodes without embeddings ARE queryable (excluded from semantic search, included in structured search)

bulk_strategy:
  batch_size: 100          # texts per API call (OpenAI batch endpoint)
  concurrency: 5           # concurrent API calls
  rate_limit: 3000         # requests per minute (leave headroom below 3500 RPM)
  retry_policy: "exponential backoff, base=1s, max=60s, max_retries=5"
  seed_data_estimate: "~50 nodes = 1 batch = <2 seconds"
  import_10k_estimate: "100 batches × 5 concurrent = ~30 seconds"

edges_and_events: |
  Edges are NOT embedded in gen1. Edge discovery is via graph traversal from entity search.
  Events are NOT embedded in gen1. Event search is via get_timeline with temporal filters.
  [DECIDE:gen2] Re-evaluate edge embedding if users need semantic search over relationships.
```

### 2.5 Research findings (resolved in gen1)

```yaml
# [RESOLVED:RESEARCH:gen1] PostgreSQL SQL:2011 temporal table support
finding: |
  PostgreSQL 18 (current stable, Sep 2025) adds temporal PRIMARY KEY and UNIQUE
  constraints with WITHOUT OVERLAPS syntax for application-time periods, and temporal
  FOREIGN KEY constraints with PERIOD clause. However, PostgreSQL STILL LACKS:
  - System-versioned tables (automatic row versioning by the database)
  - Temporal DML (UPDATE FOR PORTION OF, DELETE FOR PORTION OF)
  - Temporal queries (AS OF, BETWEEN...AND, FROM...TO)
  The temporal_tables extension (arkhipov) provides trigger-based system-time versioning
  but is a C extension NOT available on Supabase managed PostgreSQL.
decision: |
  DO NOT use PostgreSQL native temporal features. Retain manual bitemporality
  (valid_from/valid_to + recorded_at/UUIDv7). The event-sourced append-only architecture
  with explicit version management is more powerful and portable than SQL:2011 system-time.
  PostgreSQL 18's WITHOUT OVERLAPS could theoretically replace the EXCLUDE USING gist
  constraint on nodes, but the syntax difference is cosmetic and the EXCLUDE constraint
  is well-tested. No schema change.
references:
  - https://wiki.postgresql.org/wiki/SQL2011Temporal (updated Dec 2025)
  - https://neon.com/postgresql/postgresql-18/temporal-constraints
  - https://hashrocket.com/blog/posts/postgresql-18-temporal-constraints
  [RESEARCH:gen2] Re-evaluate when PostgreSQL adds system-time versioning.

# [RESOLVED:RESEARCH:gen1] UUIDv7 implications
finding: |
  UUIDv7 embeds millisecond-precision timestamp. recorded_at is technically redundant
  but extracting timestamp from UUID requires uuid_extract_timestamp() function which
  is not yet a standard PostgreSQL built-in (requires extension or custom function).
decision: |
  Retain recorded_at column. Cost: 8 bytes per row. Benefit: direct indexing, readable
  queries, no function dependency. See D-001 in decision log.
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

**Gen1 implements against the MCP Authorization Specification (2025-11-25 revision)**, where:
- The MCP server acts ONLY as an OAuth 2.0 **Resource Server** (not Authorization Server).
- The MCP server MUST implement **RFC 9728** (Protected Resource Metadata).
- The MCP server MUST validate **Resource Indicators** (RFC 8707) — tokens are scoped to specific MCP servers.
- Token issuance is delegated to an external Authorization Server (Supabase Auth for users, custom JWT signing for agents).
- Dynamic Client Registration (RFC 7591) is OPTIONAL (relaxed in Nov 2025 revision).
- The MCP server MUST NOT pass through received tokens to upstream APIs (confused deputy prevention).
- PKCE (SHA-256) is REQUIRED for all public clients.

[RESOLVED:RESEARCH:gen1] MCP auth spec verified at 2025-11-25 revision. Key changes since June 2025:
- Protected Resource Metadata (RFC 9728) added for AuthZ server discovery
- Dynamic Client Registration made optional
- Enterprise-Managed Authorization extension added (not needed for gen1)
- Client ID Metadata Documents as alternative to DCR

References:
- https://modelcontextprotocol.io/specification/draft/basic/authorization
- https://auth0.com/blog/mcp-specs-update-all-about-auth/
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
- [RESOLVED:gen1 D-014] Scope syntax is sufficient for gen1 (≤10 scopes/token, ~1KB JWT). [DECIDE:gen2] Move to opaque tokens + introspection if scope count exceeds 20 or JWT size exceeds 4KB.

### 4.6 Actor identity model

The `created_by` UUID on every row needs a defined source. This section specifies how actor identities are represented.

```yaml
# ── ACTOR IDENTITY ──
# [RESOLVED:gen1 D-015] Option B: Actors as graph nodes.
# Rationale: consistent with graph-native ontology, makes actors queryable,
# edges between actors and their creations are implicit via created_by.

actor_type_node:
  name: "actor"
  kind: "entity_type"
  label_schema:
    type: object
    required: [name, actor_type, external_id]
    properties:
      name: { type: string, description: "Display name of the actor" }
      actor_type: { type: string, enum: [user, agent, system], description: "Type of actor" }
      external_id: { type: string, description: "JWT sub claim value" }
      purpose: { type: string, description: "What this actor does (for agents)" }
      scopes: { type: array, items: { type: string }, description: "Scopes assigned to this actor" }

mapping_rules:
  jwt_sub_to_actor: |
    1. Extract sub claim from validated JWT
    2. For each tenant_id in token.tenant_ids:
       a. Query: SELECT node_id FROM nodes WHERE tenant_id = $tenant_id
          AND type_node_id = $actor_type_node_id
          AND data->>'external_id' = $sub
          AND is_deleted = false AND valid_to = 'infinity'
       b. If found: use node_id as created_by for this tenant
       c. If NOT found: auto-create actor node via store_entity:
          store_entity(entity_type="actor", data={
            name: sub,  // default name, can be updated later
            actor_type: token.actor_type || "agent",
            external_id: sub
          }, tenant_id=tenant_id)
          Use the returned entity_id as created_by
    3. Cache actor_node_id per (sub, tenant_id) for request lifetime

  created_by_semantics: |
    created_by on ALL rows = actor node's node_id (NOT the JWT sub claim directly).
    This means every row in nodes, edges, grants, events, blobs is traceable to a
    graph-queryable actor entity.

  actor_scope: |
    Actors are PER-TENANT. An agent with multi-tenant access has one actor node per tenant.
    Rationale: actor activity is tenant-scoped, and RLS naturally isolates per tenant.

  bootstrap_actors: |
    The metatype bootstrap (section 2.6.3) creates the system tenant but does NOT create
    actor nodes. Actor nodes for the Pettson scenario are created as part of seed data
    (section 7.8). The bootstrap event uses metatype_id as created_by (self-referential
    bootstrap exception).
```

### 4.7 Auth decisions (resolved in gen1)

```yaml
# [RESOLVED:gen1 D-011] Token format: Stateless JWT
decision: "Stateless JWT for gen1. No DB lookup for auth. Short-lived (1h) mitigates revocation lag."
question_this_if: "Token revocation latency (up to 1h) is unacceptable"
[DECIDE:gen2] "Consider opaque tokens + introspection endpoint"

# [RESOLVED:gen1 D-012] Auth provider: Supabase Auth + custom JWT
decision: |
  - User tokens: issued by Supabase Auth (OAuth 2.0 flows, social login, magic link)
  - Agent tokens: issued by a custom admin-only signing endpoint
    - Admin provides: sub, tenant_ids, scopes, expiry
    - Endpoint signs JWT with shared secret (Supabase JWT secret)
    - Returns signed JWT that the MCP server validates identically to user tokens
  - Partner tokens: same as agent tokens but with read-only scopes and 30-day expiry
question_this_if: "Supabase Auth cannot add custom claims (tenant_ids, scopes) to JWTs"

# [RESOLVED:gen1 D-013] RLS pattern: Application-level + RLS safety net (Option C)
decision: |
  Edge Function connects to PostgreSQL with service_role key (bypasses RLS).
  Before every query, sets: SET LOCAL 'app.tenant_ids' = '{uuid1,uuid2}';
  RLS policies use current_setting('app.tenant_ids') as the tenant filter.
  Cross-tenant edge traversal is verified in application code by querying grants table.
  RLS serves as defense-in-depth — even if application code has a bug, RLS prevents
  accessing data outside the token's tenant_ids.
question_this_if: "Security audit requires pure RLS without service_role bypass"
[DECIDE:gen2] "Migrate to JOIN-based RLS policies (Option A) for cross-tenant edges"
```

### 4.8 Auth precision: scope requirements per tool

```yaml
# Every tool call checks scopes in this order:
# 1. Extract tenant_id from params or token (single-tenant token)
# 2. Check token.scopes includes required scope
# 3. For cross-tenant: check scopes for ALL involved tenants
# 4. For cross-tenant edge traversal: also check grants table

store_entity:
  required_scope: "tenant:{tenant_id}:write" OR "tenant:{tenant_id}:nodes:{entity_type}:write"
  cross_tenant: N/A (entities are single-tenant)

find_entities:
  required_scope: "tenant:{tenant_id}:read" OR "tenant:{tenant_id}:nodes:{entity_type}:read"
  cross_tenant: N/A (searches within one tenant)

connect_entities:
  required_scope: "tenant:{source_tenant_id}:write" AND (if cross-tenant) "tenant:{target_tenant_id}:read"
  cross_tenant: YES — also requires grants table entry for target node

explore_graph:
  required_scope: "tenant:{start_tenant_id}:read"
  cross_tenant: YES — each traversal step checks grants for cross-tenant nodes

remove_entity:
  required_scope: "tenant:{tenant_id}:write"
  cross_tenant: N/A

query_at_time:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

get_timeline:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

capture_thought:
  required_scope: "tenant:{tenant_id}:write"
  cross_tenant: N/A (all created entities belong to one tenant)

get_schema:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

get_stats:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

propose_event:
  required_scope: "tenant:{tenant_id}:write"
  cross_tenant: N/A

verify_lineage:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

store_blob:
  required_scope: "tenant:{tenant_id}:write"
  cross_tenant: N/A

get_blob:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

lookup_dict:
  required_scope: "tenant:{tenant_id}:read"
  cross_tenant: N/A

# Scope matching pseudocode:
# function has_scope(token, required):
#   return token.scopes.some(s =>
#     s === "admin" ||
#     s === required ||
#     required.startsWith(s.replace(':read',':').replace(':write',':'))  // broader scope covers narrower
#   )
# Example: "tenant:T1:write" covers "tenant:T1:nodes:lead:write"
# Example: "tenant:T1:nodes:campaign:read" does NOT cover "tenant:T1:nodes:lead:read"
#
# Type-scoped read behavior:
# When find_entities is called without entity_types filter under a type-scoped token
# (e.g., "tenant:T1:nodes:campaign:read"), results are SILENTLY FILTERED to only
# return entities of types the token has read access to. No error is returned.
# This allows agents with narrow scopes to use find_entities safely.
```

### 4.9 Audit event schema

```yaml
# Every tool call emits an audit trail entry (stored as part of the tool's event
# if it's a mutation, or as a lightweight log entry for read operations).
# Read audit entries are NOT stored in the events table (to avoid write amplification).
# They are logged to the Edge Function's stdout for external log aggregation.

audit_log_entry:
  timestamp: datetime           # ISO 8601
  actor_id: string              # actor node_id
  tool: string                  # tool name
  tenant_id: string             # primary tenant
  params_summary: object        # key params (entity_type, entity_id) — NOT full payload
  result_status: string         # "success" | "denied" | "error" | "not_found"
  duration_ms: int              # request processing time
  cross_tenant: boolean         # whether operation crossed tenant boundaries
  error_code: string?           # if result_status != "success"

# For mutations: the event itself serves as the audit record (event_id, created_by, timestamp).
# For reads: audit_log_entry is logged to stdout in JSON format.
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
  # No A2A implementation. Research completed, awareness documented.

  # [RESOLVED:RESEARCH:gen1] A2A Protocol v0.3 specification
  # Findings (verified Feb 2026):
  # - A2A v0.3 released July 2025. Draft v1.0 in development.
  # - 150+ backing organizations (Google, Salesforce, SAP, LangChain)
  # - AgentCard format: JSON at /.well-known/agent-card.json
  #   Required fields: name, url, version, capabilities, skills
  #   Auth via securitySchemes (OAuth2, OIDC, ApiKey, mTLS)
  # - Task lifecycle: submitted → working → completed/failed/canceled/rejected
  #   Also: input-required, auth-required states
  # - Three transport options: JSON-RPC, HTTP+JSON/REST, gRPC (all equal status)
  # - Relationship to MCP: COMPLEMENTARY. MCP = agent-to-tools. A2A = agent-to-agent.
  # - Signed AgentCards supported (not enforced) for integrity verification
  # References:
  #   https://a2a-protocol.org/latest/specification/
  #   https://a2a-protocol.org/v0.3.0/specification/

  # [RESOLVED:RESEARCH:gen1] A2A AgentCard auto-generation from MCP tools
  # Findings:
  # - Multiple bridge implementations exist (A2ABridge, A2A-MCP-Server, MCPAdapt proposal)
  # - Mapping MCP tools → A2A skills is feasible but lossy:
  #   - MCP Tool.name → AgentSkill.id
  #   - MCP Tool.description → AgentSkill.description
  #   - MCP Tool.inputSchema → AgentSkill.inputModes (with transformation)
  # - A single A2A skill may map to multiple MCP tools (semantic grouping)
  # - Auto-generated AgentCards are valid but "impoverished" — need manual augmentation
  #   for tags, examples, human-readable descriptions
  # Recommendation for gen2: auto-generate base AgentCard from MCP tool metadata,
  # augment with hand-authored tenant-specific metadata, group related tools into skills.
  # References:
  #   https://github.com/a2aproject/A2A/issues/134
  #   https://lobehub.com/mcp/darrelmiller-a2abridge

  - Design constraint: gen1 architecture VERIFIED as A2A-ready:
    - Tool descriptions are machine-readable (MCP tool schemas with Zod) ✓
    - Tenant capabilities are introspectable (get_schema returns type nodes) ✓
    - Auth model is compatible (OAuth 2.1 aligns with A2A's securitySchemes) ✓
    - Streaming support via Streamable HTTP transport aligns with A2A SSE ✓

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

### 6.1 Platform constraints (VERIFIED March 2026)

```yaml
# [RESOLVED:RESEARCH:gen1] Supabase Edge Functions — verified limits
# Source: https://supabase.com/docs/guides/functions/limits
serverless_cpu_per_request: "2 seconds"          # HARD LIMIT, all plans. Async I/O excluded.
serverless_wall_clock: "150 seconds"              # Request idle timeout (was 400s in gen0 estimate)
serverless_memory_heap: "150 MB"                  # JavaScript heap memory
serverless_memory_external: "150 MB"              # Array buffers, WASM (separate from heap)
serverless_memory_total: "~300 MB"                # Combined
function_bundle_size: "20 MB"                     # After bundling with Supabase CLI
function_source_size: "10 MB"                     # Pre-bundle

# IMPORTANT: capture_thought does LLM call + entity search + node creation + edge creation.
# [RESOLVED:gen1 D-016] capture_thought: SYNCHRONOUS (Option A).
# Analysis: LLM call (~1-3s wall, <50ms CPU) + dedup search (~100ms wall, ~20ms CPU)
# + DB transaction (~100ms wall, ~30ms CPU) = ~2-5s wall, <200ms CPU.
# Supabase limits: 2s CPU, 150s wall-clock. Fits comfortably because LLM/DB calls
# are async I/O (don't count against CPU). Async adds complexity not justified at gen1 scale.
# question_this_if: "capture_thought p95 latency exceeds 10s or CPU exceeds 1.5s"
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
# [RESOLVED:RESEARCH:gen1] Verified against MCP spec 2025-11-25
protocol_version: "2025-11-25"                    # Latest stable
transport: "Streamable HTTP (JSON-RPC 2.0)"       # Required by spec
auth: "OAuth 2.1 — Resource Server only"           # June 2025 + Nov 2025 revisions
sdk_version: "@modelcontextprotocol/sdk@^1.27.1"  # Latest stable; v2 not yet stable
hono_mcp_version: "@hono/mcp@^0.2.3"              # Hono MCP middleware
multi_tenant: "NOT standardized — solved at application level via JWT claims"
# Key spec features available:
#   - Streamable HTTP transport (replaces deprecated SSE transport)
#   - Tool Annotations (metadata on tools)
#   - Protected Resource Metadata (RFC 9728)
#   - Resource Indicators (RFC 8707)
#   - OpenID Connect Discovery
# Source: https://modelcontextprotocol.io/specification/2025-11-25
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
  scopes: [tenant:taylor_events:read, tenant:nordic_tickets:read, tenant:mountain_cabins:read, tenant:taylor_events:write]

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
  expect: Returns leads from taylor_events matching semantic query on interest field
  validates: semantic search + RLS (cross-tenant edge discovery is via subsequent explore_graph)

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

### 7.8 Exact seed data (gen1 — Pettson scenario)

All UUIDs below are deterministic for reproducibility. Format: well-known prefixed UUIDs.

**IMPORTANT: Event generation for seed data.** Per INV-LINEAGE, every fact row requires a `created_by_event`. The seed script MUST:
1. Create one `entity_created` event per type node and entity node
2. Create one `edge_created` event per edge
3. Create one `grant_created` event per grant
4. All seed events use `created_by = METATYPE_ID` (bootstrap actor)
5. All seed events and fact rows are inserted within a single transaction

```yaml
# ═══ WELL-KNOWN UUIDs ═══
METATYPE_ID:      "00000000-0000-7000-0000-000000000001"
SYSTEM_TENANT_ID: "00000000-0000-7000-0000-000000000000"
ACTOR_TYPE_ID:    "00000000-0000-7000-0000-000000000002"

# ═══ TENANTS ═══
tenants:
  - tenant_id: "10000000-0000-7000-0000-000000000001"
    name: "Pettson Holding AB"
    parent_id: null
    config: { "plan": "enterprise", "is_holding": true }

  - tenant_id: "10000000-0000-7000-0000-000000000002"
    name: "Taylor Events AB"
    parent_id: "10000000-0000-7000-0000-000000000001"
    config: { "plan": "pro" }

  - tenant_id: "10000000-0000-7000-0000-000000000003"
    name: "Mountain Cabins AB"
    parent_id: "10000000-0000-7000-0000-000000000001"
    config: { "plan": "pro" }

  - tenant_id: "10000000-0000-7000-0000-000000000004"
    name: "Nordic Tickets AB"
    parent_id: "10000000-0000-7000-0000-000000000001"
    config: { "plan": "pro" }

# ═══ TYPE NODES (per tenant, all type_node_id = METATYPE_ID) ═══

# Taylor Events types
type_nodes_taylor:
  - node_id: "20000000-0000-7000-0001-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor_events
    data:
      name: "lead"
      kind: "entity_type"
      description: "A potential customer or sales opportunity"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          email: { type: string, format: email }
          phone: { type: string }
          interest: { type: string }
          source: { type: string }
          status: { type: string, enum: [new, contacted, qualified, converted, lost] }

  - node_id: "20000000-0000-7000-0001-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    data:
      name: "campaign"
      kind: "entity_type"
      description: "A marketing or sales campaign"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          type: { type: string, enum: [digital, event, print, partnership] }
          budget: { type: number }
          start_date: { type: string, format: date }
          end_date: { type: string, format: date }

  - node_id: "20000000-0000-7000-0001-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    data:
      name: "event"
      kind: "entity_type"
      description: "A scheduled event (concert, show, match)"
      label_schema:
        type: object
        required: [name, date]
        properties:
          name: { type: string }
          date: { type: string, format: date }
          venue: { type: string }
          capacity: { type: integer }

  - node_id: "20000000-0000-7000-0001-000000000004"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    data:
      name: "venue"
      kind: "entity_type"
      description: "A physical location for events"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          city: { type: string }
          capacity: { type: integer }

  - node_id: "20000000-0000-7000-0001-000000000005"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    data:
      name: "contact"
      kind: "entity_type"
      description: "A person or organization contact"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          email: { type: string }
          phone: { type: string }
          role: { type: string }

# Mountain Cabins types
type_nodes_mountain:
  - node_id: "20000000-0000-7000-0002-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    data:
      name: "property"
      kind: "entity_type"
      description: "A rental cabin or property"
      label_schema:
        type: object
        required: [name, location]
        properties:
          name: { type: string }
          location: { type: string }
          beds: { type: integer }
          price_per_night: { type: number }
          amenities: { type: array, items: { type: string } }

  - node_id: "20000000-0000-7000-0002-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    data:
      name: "booking"
      kind: "entity_type"
      description: "A cabin reservation"
      label_schema:
        type: object
        required: [check_in, check_out]
        properties:
          check_in: { type: string, format: date }
          check_out: { type: string, format: date }
          guests: { type: integer }
          status: { type: string, enum: [pending, confirmed, cancelled] }
          total_price: { type: number }

  - node_id: "20000000-0000-7000-0002-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    data:
      name: "guest"
      kind: "entity_type"
      description: "A cabin guest"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          email: { type: string }
          phone: { type: string }

  - node_id: "20000000-0000-7000-0002-000000000004"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    data:
      name: "season"
      kind: "entity_type"
      description: "A pricing season"
      label_schema:
        type: object
        required: [name, start_date, end_date]
        properties:
          name: { type: string }
          start_date: { type: string, format: date }
          end_date: { type: string, format: date }
          price_multiplier: { type: number }

# Nordic Tickets types
type_nodes_nordic:
  - node_id: "20000000-0000-7000-0003-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    data:
      name: "match"
      kind: "entity_type"
      description: "A sports match or event"
      label_schema:
        type: object
        required: [name, date]
        properties:
          name: { type: string }
          date: { type: string, format: date }
          sport: { type: string }
          venue: { type: string }
          teams: { type: array, items: { type: string } }

  - node_id: "20000000-0000-7000-0003-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    data:
      name: "ticket_batch"
      kind: "entity_type"
      description: "A batch of tickets for sale"
      label_schema:
        type: object
        required: [quantity, price_per_ticket]
        properties:
          quantity: { type: integer }
          price_per_ticket: { type: number }
          category: { type: string, enum: [standard, vip, corporate] }
          sold: { type: integer, default: 0 }

  - node_id: "20000000-0000-7000-0003-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    data:
      name: "package"
      kind: "entity_type"
      description: "A combined package (tickets + accommodation)"
      label_schema:
        type: object
        required: [name, price]
        properties:
          name: { type: string }
          price: { type: number }
          description: { type: string }
          includes_accommodation: { type: boolean }

  - node_id: "20000000-0000-7000-0003-000000000004"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    data:
      name: "partner"
      kind: "entity_type"
      description: "An external distribution partner"
      label_schema:
        type: object
        required: [name]
        properties:
          name: { type: string }
          type: { type: string, enum: [travel_agency, corporate, reseller] }
          commission_pct: { type: number }

# Edge type nodes (shared across tenants via system tenant)
edge_type_nodes:
  - node_id: "20000000-0000-7000-0000-000000000E01"
    tenant_id: "00000000-0000-7000-0000-000000000000"  # system tenant
    data:
      name: "includes"
      kind: "edge_type"
      description: "Package includes property/ticket"

  - node_id: "20000000-0000-7000-0000-000000000E02"
    tenant_id: "00000000-0000-7000-0000-000000000000"
    data:
      name: "sells"
      kind: "edge_type"
      description: "Campaign sells ticket batch"

  - node_id: "20000000-0000-7000-0000-000000000E03"
    tenant_id: "00000000-0000-7000-0000-000000000000"
    data:
      name: "also_booked"
      kind: "edge_type"
      description: "Lead also booked a cabin"

  - node_id: "20000000-0000-7000-0000-000000000E04"
    tenant_id: "00000000-0000-7000-0000-000000000000"
    data:
      name: "booked_at"
      kind: "edge_type"
      description: "Booking is at a property"

  - node_id: "20000000-0000-7000-0000-000000000E05"
    tenant_id: "00000000-0000-7000-0000-000000000000"
    data:
      name: "for_match"
      kind: "edge_type"
      description: "Ticket batch is for a match"

  - node_id: "20000000-0000-7000-0000-000000000E06"
    tenant_id: "00000000-0000-7000-0000-000000000000"
    data:
      name: "contacted_via"
      kind: "edge_type"
      description: "Lead was contacted via campaign"

# ═══ SAMPLE ENTITIES (≥3 per tenant) ═══

entities_taylor:
  - node_id: "30000000-0000-7000-0001-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    type_node_id: "20000000-0000-7000-0001-000000000001"  # lead
    valid_from: "2026-01-01T00:00:00Z"  # backdated for T07 bitemporal test
    data:
      name: "Erik Lindström"
      email: "erik@example.com"
      phone: "070-111-2222"
      interest: "football and cabin packages"
      source: "website"
      status: "qualified"
    epistemic: "asserted"

  - node_id: "30000000-0000-7000-0001-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    type_node_id: "20000000-0000-7000-0001-000000000002"  # campaign
    data:
      name: "Summer Festival 2026"
      type: "event"
      budget: 50000
      start_date: "2026-06-01"
      end_date: "2026-08-31"
    epistemic: "asserted"

  - node_id: "30000000-0000-7000-0001-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000002"
    type_node_id: "20000000-0000-7000-0001-000000000003"  # event
    data:
      name: "Allsvenskan Semifinal"
      date: "2026-07-15"
      venue: "Gamla Ullevi"
      capacity: 18000
    epistemic: "confirmed"

entities_mountain:
  - node_id: "30000000-0000-7000-0002-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    type_node_id: "20000000-0000-7000-0002-000000000001"  # property
    data:
      name: "Fjällstugan Björnen"
      location: "Åre"
      beds: 8
      price_per_night: 2500
      amenities: ["sauna", "fireplace", "ski-in/ski-out"]
    epistemic: "confirmed"

  - node_id: "30000000-0000-7000-0002-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    type_node_id: "20000000-0000-7000-0002-000000000002"  # booking
    data:
      check_in: "2026-06-19"
      check_out: "2026-06-22"
      guests: 4
      status: "confirmed"
      total_price: 7500
    epistemic: "confirmed"

  - node_id: "30000000-0000-7000-0002-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000003"
    type_node_id: "20000000-0000-7000-0002-000000000003"  # guest
    data:
      name: "Erik Lindström"
      email: "erik@example.com"
      phone: "070-111-2222"
    epistemic: "asserted"

entities_nordic:
  - node_id: "30000000-0000-7000-0003-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    type_node_id: "20000000-0000-7000-0003-000000000001"  # match
    data:
      name: "Allsvenskan: IFK vs AIK"
      date: "2026-07-15"
      sport: "football"
      venue: "Gamla Ullevi"
      teams: ["IFK Göteborg", "AIK"]
    epistemic: "confirmed"

  - node_id: "30000000-0000-7000-0003-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    type_node_id: "20000000-0000-7000-0003-000000000002"  # ticket_batch
    data:
      quantity: 500
      price_per_ticket: 350
      category: "standard"
      sold: 127
    epistemic: "confirmed"

  - node_id: "30000000-0000-7000-0003-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000004"
    type_node_id: "20000000-0000-7000-0003-000000000003"  # package
    data:
      name: "Midsommar Football & Cabin"
      price: 8900
      description: "2 match tickets + 3 nights cabin near Åre"
      includes_accommodation: true
    epistemic: "asserted"

# ═══ CROSS-TENANT EDGES ═══

cross_tenant_edges:
  - edge_id: "40000000-0000-7000-0000-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic_tickets owns
    type_node_id: "20000000-0000-7000-0000-000000000E01"  # includes
    source_id: "30000000-0000-7000-0003-000000000003"   # package (nordic)
    target_id: "30000000-0000-7000-0002-000000000001"   # property (mountain)

  - edge_id: "40000000-0000-7000-0000-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor owns
    type_node_id: "20000000-0000-7000-0000-000000000E02"  # sells
    source_id: "30000000-0000-7000-0001-000000000002"   # campaign (taylor)
    target_id: "30000000-0000-7000-0003-000000000002"   # ticket_batch (nordic)

  - edge_id: "40000000-0000-7000-0000-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor owns
    type_node_id: "20000000-0000-7000-0000-000000000E03"  # also_booked
    source_id: "30000000-0000-7000-0001-000000000001"   # lead (taylor)
    target_id: "30000000-0000-7000-0002-000000000002"   # booking (mountain)

# ═══ INTRA-TENANT EDGES ═══

intra_tenant_edges:
  - edge_id: "40000000-0000-7000-0000-000000000010"
    tenant_id: "10000000-0000-7000-0000-000000000003"  # mountain
    type_node_id: "20000000-0000-7000-0000-000000000E04"  # booked_at
    source_id: "30000000-0000-7000-0002-000000000002"   # booking
    target_id: "30000000-0000-7000-0002-000000000001"   # property

  - edge_id: "40000000-0000-7000-0000-000000000011"
    tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic
    type_node_id: "20000000-0000-7000-0000-000000000E05"  # for_match
    source_id: "30000000-0000-7000-0003-000000000002"   # ticket_batch
    target_id: "30000000-0000-7000-0003-000000000001"   # match

  - edge_id: "40000000-0000-7000-0000-000000000012"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor
    type_node_id: "20000000-0000-7000-0000-000000000E06"  # contacted_via
    source_id: "30000000-0000-7000-0001-000000000001"   # lead
    target_id: "30000000-0000-7000-0001-000000000002"   # campaign

# ═══ GRANTS ═══

grants:
  - grant_id: "50000000-0000-7000-0000-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic issues
    subject_tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor receives
    object_node_id: "30000000-0000-7000-0003-000000000003"  # package node
    capability: "READ"

  - grant_id: "50000000-0000-7000-0000-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000003"  # mountain issues
    subject_tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor receives
    object_node_id: "30000000-0000-7000-0002-000000000001"  # property node
    capability: "READ"

  - grant_id: "50000000-0000-7000-0000-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic issues
    subject_tenant_id: "10000000-0000-7000-0000-000000000003"  # mountain receives
    object_node_id: "30000000-0000-7000-0003-000000000003"  # package node
    capability: "READ"

  - grant_id: "50000000-0000-7000-0000-000000000004"
    tenant_id: "10000000-0000-7000-0000-000000000003"  # mountain issues
    subject_tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic receives
    object_node_id: "30000000-0000-7000-0002-000000000001"  # property node
    capability: "TRAVERSE"

# ═══ ACTOR NODES ═══

actor_nodes:
  - node_id: "60000000-0000-7000-0000-000000000001"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor
    type_node_id: "00000000-0000-7000-0000-000000000002"  # actor type
    data:
      name: "Sales Agent"
      actor_type: "agent"
      external_id: "sales-agent-001"
      purpose: "Manages leads and cross-tenant searches"
      scopes: ["tenant:10000000-0000-7000-0000-000000000002:read", "tenant:10000000-0000-7000-0000-000000000003:read", "tenant:10000000-0000-7000-0000-000000000004:read", "tenant:10000000-0000-7000-0000-000000000002:write"]

  - node_id: "60000000-0000-7000-0000-000000000002"
    tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor
    type_node_id: "00000000-0000-7000-0000-000000000002"
    data:
      name: "Content Agent"
      actor_type: "agent"
      external_id: "content-agent-001"
      purpose: "Manages campaigns"
      scopes: ["tenant:10000000-0000-7000-0000-000000000002:nodes:campaign:write", "tenant:10000000-0000-7000-0000-000000000002:nodes:campaign:read"]

  - node_id: "60000000-0000-7000-0000-000000000003"
    tenant_id: "10000000-0000-7000-0000-000000000003"  # mountain
    type_node_id: "00000000-0000-7000-0000-000000000002"
    data:
      name: "Booking Agent"
      actor_type: "agent"
      external_id: "booking-agent-001"
      purpose: "Manages bookings and properties"
      scopes: ["tenant:10000000-0000-7000-0000-000000000003:write", "tenant:10000000-0000-7000-0000-000000000004:read"]

  - node_id: "60000000-0000-7000-0000-000000000004"
    tenant_id: "10000000-0000-7000-0000-000000000004"  # nordic
    type_node_id: "00000000-0000-7000-0000-000000000002"
    data:
      name: "Partner Travel Agency"
      actor_type: "agent"
      external_id: "partner-travel-001"
      purpose: "External partner with read-only access"
      scopes: ["tenant:10000000-0000-7000-0000-000000000004:nodes:package:read", "tenant:10000000-0000-7000-0000-000000000003:nodes:property:read"]

# ═══ AGENT JWT TOKENS ═══
# These are the JWT claims for each agent. Implementation generates signed JWTs from these.

agent_tokens:
  sales_agent:
    sub: "sales-agent-001"
    iss: "resonansia-admin"
    aud: "resonansia-mcp"
    tenant_ids: ["10000000-0000-7000-0000-000000000002", "10000000-0000-7000-0000-000000000003", "10000000-0000-7000-0000-000000000004"]
    scopes: ["tenant:10000000-0000-7000-0000-000000000002:read", "tenant:10000000-0000-7000-0000-000000000003:read", "tenant:10000000-0000-7000-0000-000000000004:read", "tenant:10000000-0000-7000-0000-000000000002:write"]
    exp: "+1h"

  content_agent:
    sub: "content-agent-001"
    iss: "resonansia-admin"
    aud: "resonansia-mcp"
    tenant_ids: ["10000000-0000-7000-0000-000000000002"]
    scopes: ["tenant:10000000-0000-7000-0000-000000000002:nodes:campaign:write", "tenant:10000000-0000-7000-0000-000000000002:nodes:campaign:read"]
    exp: "+1h"

  booking_agent:
    sub: "booking-agent-001"
    iss: "resonansia-admin"
    aud: "resonansia-mcp"
    tenant_ids: ["10000000-0000-7000-0000-000000000003", "10000000-0000-7000-0000-000000000004"]
    scopes: ["tenant:10000000-0000-7000-0000-000000000003:write", "tenant:10000000-0000-7000-0000-000000000004:read"]
    exp: "+1h"

  partner_travel_agency:
    sub: "partner-travel-001"
    iss: "resonansia-admin"
    aud: "resonansia-mcp"
    tenant_ids: ["10000000-0000-7000-0000-000000000004", "10000000-0000-7000-0000-000000000003"]
    scopes: ["tenant:10000000-0000-7000-0000-000000000004:nodes:package:read", "tenant:10000000-0000-7000-0000-000000000003:nodes:property:read"]
    exp: "+30d"
```

### 7.9 Exact test assertions (gen1)

```yaml
T01_semantic_cross_tenant_search:
  agent: sales_agent
  request:
    tool: find_entities
    params:
      query: "football fans interested in cabin packages"
      tenant_id: "10000000-0000-7000-0000-000000000002"  # taylor_events
      limit: 10
  expected_response:
    results:
      - entity_id: "30000000-0000-7000-0001-000000000001"  # Erik Lindström
        entity_type: "lead"
        data: { name: "Erik Lindström", interest: "football and cabin packages" }
        similarity: ">0.7"  # semantic match threshold
        epistemic: "asserted"
    total_count: ">=1"
  notes: "Erik's interest field contains 'football' and 'cabin packages'. Cross-tenant edges to booking and tickets should be discoverable via subsequent explore_graph."

T02_create_entity:
  agent: content_agent
  request:
    tool: store_entity
    params:
      entity_type: "campaign"
      data: { name: "Summer Festival 2026" }
      tenant_id: "10000000-0000-7000-0000-000000000002"
  expected_response:
    entity_id: "non-null UUID"
    entity_type: "campaign"
    data: { name: "Summer Festival 2026" }
    epistemic: "asserted"
    valid_from: "~now()"
    event_id: "non-null UUID"
    previous_version_id: null
  post_conditions:
    - "Event exists in events table with intent_type='entity_created'"
    - "Node exists in nodes table with is_deleted=false, valid_to='infinity'"
    - "Event.created_by = content_agent actor node_id"

T03_permission_denial:
  agent: content_agent
  request:
    tool: find_entities
    params:
      entity_types: ["lead"]
      tenant_id: "10000000-0000-7000-0000-000000000002"
  expected_response:
    error_code: "AUTH_DENIED"
    message: "contains 'lead' and 'read'"
  notes: "content_agent has campaign read/write only, no lead scope"

T04_cross_tenant_traverse:
  agent: booking_agent
  request:
    tool: explore_graph
    params:
      start_id: "30000000-0000-7000-0003-000000000003"  # package (nordic)
      edge_types: ["includes"]
      direction: "outgoing"
  expected_response:
    center:
      entity_id: "30000000-0000-7000-0003-000000000003"
      entity_type: "package"
    connections:
      - edge_type: "includes"
        direction: "outgoing"
        entity:
          entity_id: "30000000-0000-7000-0002-000000000001"  # cabin property
          entity_type: "property"
          tenant_id: "10000000-0000-7000-0000-000000000003"
        depth: 1
  notes: "Requires grant: nordic→mountain TRAVERSE on property node"

T05_partner_read_only:
  agent: partner_travel_agency
  request:
    tool: store_entity
    params:
      entity_type: "package"
      data: { name: "Unauthorized Package" }
      tenant_id: "10000000-0000-7000-0000-000000000004"
  expected_response:
    error_code: "AUTH_DENIED"
    message: "contains 'write'"
  notes: "partner has read-only scope"

T06_audit_trail:
  agent: sales_agent
  precondition: "Run store_entity first to create a mutation"
  step_1:
    tool: store_entity
    params:
      entity_type: "lead"
      data: { name: "Test Lead Audit", source: "test" }
      tenant_id: "10000000-0000-7000-0000-000000000002"
    capture: MUTATED_ENTITY_ID
  step_2:
    tool: get_timeline
    params:
      entity_id: "$MUTATED_ENTITY_ID"
  expected_response:
    entity:
      entity_id: "$MUTATED_ENTITY_ID"
    timeline:
      - type: "version_change"
        event_id: "non-null UUID"
        created_by: "60000000-0000-7000-0000-000000000001"  # sales_agent actor

T07_bitemporal_query:
  agent: sales_agent
  precondition: |
    Lead 30000000-0000-7000-0001-000000000001 (Erik) was created in seed data.
    Then updated on 2026-02-01 with new interest.
    Query at 2026-01-15 should return original data.
  setup:
    tool: store_entity
    params:
      entity_id: "30000000-0000-7000-0001-000000000001"
      entity_type: "lead"
      data: { name: "Erik Lindström", interest: "football, cabin, VIP packages", status: "qualified" }
      valid_from: "2026-02-01T00:00:00Z"
  request:
    tool: query_at_time
    params:
      entity_id: "30000000-0000-7000-0001-000000000001"
      valid_at: "2026-01-15T00:00:00Z"
  expected_response:
    entity_id: "30000000-0000-7000-0001-000000000001"
    entity_type: "lead"
    data: { name: "Erik Lindström", interest: "football and cabin packages" }  # original
    valid_from: "<=2026-01-15"
    valid_to: "2026-02-01T00:00:00Z"

T08_timeline:
  agent: sales_agent
  request:
    tool: get_timeline
    params:
      entity_id: "30000000-0000-7000-0001-000000000001"  # Erik (after T07 update)
  expected_response:
    timeline:
      - type: "version_change"
        data: { contains: "entity_created" }
        event_id: "non-null"
      - type: "version_change"
        data: { contains: "entity_updated" }
        event_id: "non-null"

T09_capture_thought:
  agent: sales_agent
  request:
    tool: capture_thought
    params:
      content: "Met Johan at the cabin fair, he wants 20 tickets for Allsvenskan and a cabin for midsommar"
      source: "manual"
      tenant_id: "10000000-0000-7000-0000-000000000002"
  expected_response:
    created_node:
      entity_type: "lead" OR "contact"
      data: { name: "contains 'Johan'" }
      epistemic: "hypothesis"
    extracted_entities: "length >= 1"
    action_items: "length >= 0"
  post_conditions:
    - "Event with intent_type='thought_captured' exists"
    - "Node with epistemic='hypothesis' created"
    - "At least one edge created linking Johan to relevant entities"

T10_schema_discovery:
  agent: sales_agent
  request:
    tool: get_schema
    params:
      tenant_id: "10000000-0000-7000-0000-000000000002"
  expected_response:
    entity_types:
      - name: "lead"
        node_count: ">=1"
        type_node_id: "20000000-0000-7000-0001-000000000001"
      - name: "campaign"
        node_count: ">=1"
        type_node_id: "20000000-0000-7000-0001-000000000002"
      - name: "event"
        type_node_id: "20000000-0000-7000-0001-000000000003"
      - name: "venue"
        type_node_id: "20000000-0000-7000-0001-000000000004"
      - name: "contact"
        type_node_id: "20000000-0000-7000-0001-000000000005"

T11_deduplication:
  agent: sales_agent
  precondition: "T09 has been run (Johan exists as hypothesis)"
  request:
    tool: capture_thought
    params:
      content: "Johan Eriksson called again about the midsommar cabin"
      source: "manual"
      tenant_id: "10000000-0000-7000-0000-000000000002"
  expected_response:
    extracted_entities:
      - entity_type: "contact" OR "lead"
        is_new: false
        match_confidence: ">0.85"
  notes: "MUST link to existing Johan entity, NOT create duplicate"

T12_epistemic_status:
  agent: sales_agent
  precondition: "T09 created Johan as hypothesis"
  setup: "Capture JOHAN_ID from T09 response"
  request:
    tool: store_entity
    params:
      entity_id: "$JOHAN_ID"
      entity_type: "contact"
      data: { name: "Johan Eriksson", phone: "070-123456" }
      epistemic: "confirmed"
  expected_response:
    entity_id: "$JOHAN_ID"
    epistemic: "confirmed"
    event_id: "non-null"
  post_conditions:
    - "Event with intent_type='epistemic_change' exists"
    - "Node version with epistemic='confirmed' is current"

T13_event_primacy:
  type: "database assertion (not MCP tool call)"
  query: |
    SELECT n.node_id, n.created_by_event
    FROM nodes n
    LEFT JOIN events e ON n.created_by_event = e.event_id
    WHERE e.event_id IS NULL
  expected: "Zero rows (no orphaned facts)"

T14_verify_lineage:
  agent: sales_agent
  request:
    tool: verify_lineage
    params:
      entity_id: "30000000-0000-7000-0001-000000000001"  # Erik lead
  expected_response:
    entity_id: "30000000-0000-7000-0001-000000000001"
    is_valid: true
    event_count: ">=1"
    orphaned_facts: []
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

### 8.3 Gen1 DECIDE markers — ALL RESOLVED

```yaml
# All markers resolved. See DECISION LOG (section 9) for full entries.
# Summary:
- "D-001: UUIDv7 for event_id" → YES, retain recorded_at
- "D-002: Edge versioning" → Option B (immutable, simple PK) — REVISED from gen0 recommendation
- "D-003: Grants soft-delete" → Include is_deleted
- "D-004: Optimistic concurrency" → Optional for gen1
- "D-005: Embedding model" → text-embedding-3-small, 1536 dimensions
- "D-006: Embed edges" → No for gen1
- "D-007: Embed events" → No for gen1
- "D-008: Bulk embedding" → Sequential with batching
- "D-009: Entity deduplication" → Hybrid (exact + embedding + LLM disambiguation)
- "D-010: Filter operators" → Equality + $in only
- "D-011: Token format" → Stateless JWT
- "D-012: Auth provider" → Supabase Auth + custom JWT signing
- "D-013: RLS pattern" → Application-level + RLS safety net (Option C)
- "D-014: Scope granularity" → Current syntax sufficient
- "D-015: Actor identity" → Actors as graph nodes (Option B)
- "D-016: capture_thought strategy" → Synchronous (Option A)
- "D-017: License" → Apache 2.0
- "D-018: Blob storage" → External (was gen0 invariant, confirmed)
- "D-019: Event emission" → Synchronous (atomic with projection per INV-ATOMIC)
```

### 8.4 Gen1 RESEARCH markers — ALL RESOLVED

```yaml
# All markers researched and findings integrated into spec. Summary:
- "PostgreSQL SQL:2011" → PG 18 lacks system-time versioning. Retain manual bitemporality. (section 2.5)
- "MCP SDK versions" → @modelcontextprotocol/sdk@1.27.1, @hono/mcp@0.2.3. Target spec 2025-11-25. (section 6.3)
- "Serverless limits" → Supabase: 2s CPU, 150s wall-clock, 300MB RAM, 20MB bundle. (section 6.1)
- "Graphiti dedup" → Three-tier: exact → entropy-gated MinHash/LSH → LLM fallback. Adapted for gen1. (section 3.2 capture_thought)
- "OAuth 2.1 in MCP" → 2025-11-25 spec: Resource Server only, RFC 9728, RFC 8707. DCR optional. (section 4.2)
- "A2A Protocol v0.3" → Complementary to MCP. AgentCard at .well-known/agent-card.json. (section 5.4)
- "A2A AgentCard auto-gen" → Feasible, multiple bridges exist. Auto-gen + manual augmentation. (section 5.4)
```

### 8.5 Implementation brief (section 8b — for gen1-impl)

This section specifies what a coding agent (gen1-impl) must produce. Gen1-impl receives this spec + the Supabase tech profile (section 10.2).

```yaml
# ═══ IMPLEMENTATION ARTIFACTS ═══

artifact_1_database_migration:
  what: "PostgreSQL migration script for Supabase"
  draws_from: [section 2.1, section 2.6]
  includes:
    - CREATE EXTENSION pgvector, btree_gist
    - UUIDv7 generation function (section 2.6.4)
    - All 7 tables with exact column types from section 2.1
    - All indexes from section 2.6.1
    - All RLS policies from section 2.6.2
    - Metatype bootstrap (section 2.6.3)
    - EXCLUDE constraint on nodes table
  done_when: "Migration runs idempotently on fresh Supabase project"
  verified_by: [T13]

artifact_2_seed_data:
  what: "Pettson scenario seed data"
  draws_from: [section 7.1-7.5, section 7.8]
  includes:
    - 4 tenants (holding + 3 subsidiaries)
    - Type nodes per tenant (section 7.2)
    - Actor nodes for 4 agents (section 7.5)
    - Sample entities (≥3 per tenant)
    - Cross-tenant edges (section 7.3)
    - Grants (section 7.4)
    - Agent tokens (JWT) for each role
  done_when: "All T01-T14 tests can run against seed data"
  verified_by: [T01-T14]

artifact_3_mcp_server:
  what: "Hono + @hono/mcp server on Supabase Edge Functions"
  draws_from: [section 3, section 6.3]
  includes:
    - HTTP Streaming transport endpoint at /mcp
    - All 15 tools registered with MCP SDK
    - MCP resources (section 3.6)
    - MCP prompts (section 3.7)
    - Protected Resource Metadata endpoint (RFC 9728)
  done_when: "MCP Inspector can connect and list all tools"
  verified_by: [T01-T14]

artifact_4_tool_implementations:
  what: "Implementation of all 15 tools"
  draws_from: [section 3.2, section 3.3, section 3.4, section 3.5]
  includes:
    - store_entity, find_entities, connect_entities, explore_graph, remove_entity
    - query_at_time, get_timeline
    - capture_thought (with LLM extraction and deduplication)
    - get_schema, get_stats
    - propose_event, verify_lineage
    - store_blob, get_blob, lookup_dict
    - All projection logic per section 3.4
    - All error handling per section 3.5
  done_when: "Each tool returns correct results for its validation test"
  verified_by: [T01-T14]

artifact_5_auth_middleware:
  what: "JWT validation + scope checking + grants lookup"
  draws_from: [section 4]
  includes:
    - JWT validation (signature, expiry, audience)
    - Scope extraction and matching per section 4.8
    - SET LOCAL app.tenant_ids for RLS (section 4.7 D-013)
    - Actor auto-creation (section 4.6)
    - Grants table consultation for cross-tenant operations
    - Audit logging (section 4.9)
  done_when: "T03 (permission denial) and T05 (partner read-only) pass"
  verified_by: [T03, T05, T04]

artifact_6_embedding_pipeline:
  what: "Async embedding generation via OpenAI API"
  draws_from: [section 2.4]
  includes:
    - text-embedding-3-small, 1536 dimensions
    - Async queue (in-memory for gen1, database-backed if needed)
    - Batch API calls (100 texts per call)
    - Exponential backoff with jitter
    - Bulk embedding for seed data
  done_when: "Seed data nodes have embeddings, T01 semantic search returns results"
  verified_by: [T01, T09, T11]

artifact_7_capture_thought:
  what: "LLM extraction pipeline for capture_thought"
  draws_from: [section 3.2 capture_thought, section 3.2 deduplication_strategy]
  includes:
    - Complete LLM prompt (section 3.2 prompt_skeleton)
    - Entity extraction and classification
    - Deduplication algorithm (3-tier: exact → embedding → LLM)
    - Entity and edge creation within atomic transaction
  done_when: "T09 and T11 pass (extraction + deduplication)"
  verified_by: [T09, T11]

artifact_8_test_suite:
  what: "Acceptance tests T01-T14"
  draws_from: [section 7.6, section 7.8]
  includes:
    - Test runner: Deno test (or Bun test per tech profile)
    - Each test as an independent function
    - Seed data setup/teardown
    - MCP client calls via SDK
    - Exact assertions from section 7.8
  done_when: "All 14 tests pass on a fresh Supabase project with seed data"
  verified_by: [self-verifying]

artifact_9_deployment:
  what: "Supabase Edge Function deployment config"
  draws_from: [section 10.2]
  includes:
    - supabase/functions/ directory structure
    - Environment variables for API keys
    - CORS configuration
    - Deployment script (supabase functions deploy)
  done_when: "Server accessible via deployed URL"
  verified_by: [manual smoke test]

artifact_10_cost_estimate:
  what: "Monthly cost estimate for Pettson-scale usage"
  draws_from: [section 6.4]
  includes:
    - Database hosting (Supabase Pro plan)
    - Embedding API cost per 1K/10K/100K nodes
    - LLM extraction cost per 1K capture_thought calls
    - Expected monthly cost for Pettson (4 tenants, ~1000 nodes, ~100 capture_thought/month)
  done_when: "Cost table with monthly estimates produced"
  verified_by: [N/A — informational]

# ═══ TECH PROFILE BINDING ═══

tech_profile: "Supabase (section 10.2)"
runtime: "Deno (Supabase Edge Functions native)"
framework: "Hono"
mcp_adapter: "@hono/mcp@^0.2.3"
mcp_sdk: "@modelcontextprotocol/sdk@^1.27.1"
database: "Supabase PostgreSQL + pgvector"
auth_provider: "Supabase Auth + custom JWT"
embedding_api: "text-embedding-3-small via OpenAI (or OpenRouter)"
extraction_llm: "gpt-4o-mini via OpenAI (or OpenRouter)"
object_storage: "Supabase Storage"
test_runner: "Deno test"
schema_validation: "Zod"

# ═══ IMPLEMENTATION ORDER ═══

recommended_order:
  1: "artifact_1 (migration) — tables + indexes + RLS"
  2: "artifact_2 (seed data) — Pettson scenario"
  3: "artifact_5 (auth middleware) — JWT + scopes + actor auto-creation"
  4: "artifact_3 (MCP server skeleton) — Hono + @hono/mcp + transport"
  5: "artifact_4 (tools) — implement in order: get_schema, store_entity, find_entities, connect_entities, explore_graph, remove_entity, query_at_time, get_timeline, get_stats, verify_lineage, propose_event, store_blob, get_blob, lookup_dict, capture_thought (last — most complex)"
  6: "artifact_6 (embedding pipeline) — async queue + bulk seeding"
  7: "artifact_7 (capture_thought LLM) — prompt + dedup"
  8: "artifact_8 (tests) — T01-T14 in numeric order"
  9: "artifact_9 (deployment) + artifact_10 (cost)"

# ═══ START CHECKLIST ═══

before_starting:
  - "Read this spec cover to cover (all 12+ sections)"
  - "Create Supabase project"
  - "Enable pgvector extension"
  - "Set up OpenAI API key (or OpenRouter)"
  - "Run migration (artifact_1)"
  - "Run seed data (artifact_2)"
  - "Verify metatype node exists: SELECT * FROM nodes WHERE node_id = '00000000-0000-7000-0000-000000000001'"
```

### 8.6 Gen2+ roadmap (for context only — gen1 does not build these)

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

```yaml
decisions:

# ═══ RESOLVED DECISIONS ═══

- id: D-001
  generation: gen1
  marker: "[DECIDE:gen1] UUIDv7 for event_id — retain recorded_at?"
  decision: "Use UUIDv7 for event_id. Retain recorded_at column."
  alternatives: ["Derive system time from UUIDv7 only (drop recorded_at)", "Use random UUID + recorded_at only"]
  rationale: "UUIDv7 provides natural ordering and implicit timestamp. recorded_at retained because: (1) extracting timestamp from UUID requires custom function, (2) recorded_at enables direct indexed range scans, (3) query readability. Storage cost: 8 bytes/row, negligible."
  confidence: high
  question_this_if: "uuid_extract_timestamp() becomes a standard PostgreSQL built-in"
  references: ["https://wiki.postgresql.org/wiki/SQL2011Temporal"]
  spec_section_updated: "2.1 — events table: event_id type changed to UUID DEFAULT uuid_generate_v7(), recorded_at marked NOT NULL"

- id: D-002
  generation: gen1
  marker: "[DECIDE:gen1] Edge versioning strategy"
  decision: "Option B — Simple PK (edge_id), immutable edges with soft-delete"
  alternatives: ["Option A: Composite PK (edge_id, valid_from) — full bitemporality like nodes"]
  rationale: "Edges represent relationships, not entities. Edge 'updates' are rare — soft-delete + recreate covers all gen1 use cases. Removes EXCLUDE constraint complexity from edges. No validation test (T01-T14) requires edge versioning. Simplifies cross-tenant RLS. Gen0 recommended Option A for consistency, but consistency doesn't justify the complexity when the use case doesn't demand it."
  confidence: high
  question_this_if: "Edge update frequency exceeds 5% of edge operations OR temporal edge state queries are needed"
  references: []
  spec_section_updated: "2.1 — edges table: changed to simple PK, removed EXCLUDE constraint"

- id: D-003
  generation: gen1
  marker: "[DECIDE:gen1] Grants soft-delete"
  decision: "Include is_deleted flag for pattern consistency"
  alternatives: ["Rely solely on valid_to for revocation"]
  rationale: "Pattern consistency with nodes and edges. Queries use same WHERE is_deleted = false AND valid_to > now() pattern across all fact tables."
  confidence: high
  question_this_if: "Grants are never revoked mid-validity, making is_deleted truly redundant"
  references: []
  spec_section_updated: "2.1 — grants table: is_deleted retained with resolved comment"

- id: D-004
  generation: gen1
  marker: "[DECIDE:gen1] Optimistic concurrency — expected_version"
  decision: "Optional for gen1 (last-write-wins if omitted)"
  alternatives: ["Required from gen1"]
  rationale: "Gen1 is primarily single-agent-per-entity. Concurrent conflicts unlikely. Optional reduces adoption friction while making the mechanism available for agents that want it."
  confidence: high
  question_this_if: "Multiple agents concurrently edit the same entity before gen2"
  references: []
  spec_section_updated: "2.2 — INV-CONCURRENCY updated. 3.2 — store_entity expected_version marked optional"

- id: D-005
  generation: gen1
  marker: "[DECIDE:gen1] Embedding model and dimensions"
  decision: "text-embedding-3-small, 1536 dimensions"
  alternatives: ["text-embedding-3-small at 768d (~4.7% accuracy loss)", "text-embedding-3-large at 3072d (higher cost)"]
  rationale: "1536d is the default for text-embedding-3-small. Best accuracy for this model. At gen1 scale (<100K nodes): 240 QPS, 126ms p95 on 4GB RAM (pgvector HNSW). Storage ~600KB per 1K nodes. Cost: $0.02/1M tokens. Graphiti uses 1024d, Open Brain uses 768d — we choose higher for richer entity data."
  confidence: high
  question_this_if: "Storage cost exceeds $10/month OR search latency exceeds 200ms p95"
  references: ["https://supabase.com/docs/guides/ai/choosing-compute-addon", "https://platform.openai.com/docs/models/text-embedding-3-small"]
  spec_section_updated: "2.4 — embedding strategy fully specified"

- id: D-006
  generation: gen1
  marker: "[DECIDE:gen1] Embed edge data?"
  decision: "No for gen1"
  alternatives: ["Embed edge data field"]
  rationale: "Edges represent relationships with typically sparse data. Discovery is via graph traversal from entity search. Embedding edges doubles volume/cost without clear search benefit."
  confidence: high
  question_this_if: "Users frequently need to search for relationships by descriptive content"
  references: []
  spec_section_updated: "2.4 — edges_and_events section"

- id: D-007
  generation: gen1
  marker: "[DECIDE:gen1] Embed events?"
  decision: "No for gen1"
  alternatives: ["Embed event payloads"]
  rationale: "Events are internal audit records. Searched via get_timeline with temporal/entity filters. No semantic search use case."
  confidence: high
  question_this_if: "A use case emerges for semantic search over event payloads"
  references: []
  spec_section_updated: "2.4 — edges_and_events section"

- id: D-008
  generation: gen1
  marker: "[DECIDE:gen1] Bulk embedding strategy"
  decision: "Sequential with batching: 100 texts/batch, 5 concurrent, 3000 RPM"
  alternatives: ["Queue-based async (Redis/BullMQ)", "Database trigger-based"]
  rationale: "At gen1 scale (seed: ~50 nodes, import: <10K), sequential batching completes in seconds/minutes. No need for queue infrastructure. OpenAI batch API supports 100 texts per call."
  confidence: mid
  question_this_if: "Import volume exceeds 10K nodes or embedding queue exceeds 1000 pending"
  references: ["https://platform.openai.com/docs/guides/embeddings"]
  spec_section_updated: "2.4 — bulk_strategy section"

- id: D-009
  generation: gen1
  marker: "[DECIDE:gen1] Entity deduplication approach"
  decision: "Hybrid: exact match → embedding similarity → LLM disambiguation"
  alternatives: ["Option A: Embedding only", "Option B: Fuzzy text only", "Option D: LLM-only (Graphiti v1 approach)"]
  rationale: "Inspired by Graphiti's three-tier approach but simplified for gen1 scale (<10K entities/tenant). Exact match handles identical strings. Embedding similarity catches semantic equivalence. LLM disambiguation resolves the uncertain zone (0.85-0.95 cosine similarity). Full MinHash+LSH (Graphiti v2) deferred — not needed at gen1 entity volumes."
  confidence: mid
  question_this_if: "Duplicate entities exceed 5% of total OR false positive matches exceed 2%"
  references: ["https://arxiv.org/abs/2501.13956", "https://github.com/getzep/graphiti"]
  spec_section_updated: "3.2 — capture_thought deduplication_strategy with full algorithm"

- id: D-010
  generation: gen1
  marker: "[DECIDE:gen1] Filter operators in find_entities"
  decision: "Equality + $in for gen1"
  alternatives: ["Full set ($gte, $lte, $contains, $exists)"]
  rationale: "Covers most common search patterns. Range and text operators require careful JSONB indexing strategy deferred to gen2."
  confidence: high
  question_this_if: "Agents frequently need range or text-contains queries before gen2"
  references: []
  spec_section_updated: "3.2 — find_entities filter_operators section"

- id: D-011
  generation: gen1
  marker: "[DECIDE:gen1] Token format"
  decision: "Stateless JWT"
  alternatives: ["Opaque token + introspection endpoint"]
  rationale: "JWT validation is in-memory (no DB roundtrip). Critical for Edge Functions where latency matters. Short-lived (1h) mitigates revocation lag. Scope count ≤10, JWT size ~1KB."
  confidence: high
  question_this_if: "Token revocation latency (up to 1h) is unacceptable"
  references: ["https://modelcontextprotocol.io/specification/draft/basic/authorization"]
  spec_section_updated: "4.7 — auth decisions resolved"

- id: D-012
  generation: gen1
  marker: "[DECIDE:gen1] Auth provider integration"
  decision: "Supabase Auth for users + custom JWT signing for agents"
  alternatives: ["Fully custom auth server", "Auth0 integration"]
  rationale: "Leverages deployment platform's built-in auth. Agent tokens signed with Supabase JWT secret via admin-only endpoint."
  confidence: high
  question_this_if: "Supabase Auth cannot add custom claims (tenant_ids, scopes)"
  references: []
  spec_section_updated: "4.7 — auth decisions resolved"

- id: D-013
  generation: gen1
  marker: "[DECIDE:gen1] RLS policy pattern for cross-tenant edges"
  decision: "Option C — Application-level enforcement with RLS safety net"
  alternatives: ["Option A: JOIN-based RLS", "Option B: Security-definer function"]
  rationale: "Edge Function connects with service_role, sets app.tenant_ids via SET LOCAL. Application code checks grants table for cross-tenant operations. RLS serves as defense-in-depth. Pure RLS for cross-tenant edges requires complex JOINs in policies."
  confidence: mid
  question_this_if: "Security audit requires pure RLS without service_role bypass"
  references: ["https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server"]
  spec_section_updated: "2.6.2 — RLS policies, 4.7 — auth decisions"

- id: D-014
  generation: gen1
  marker: "[DECIDE:gen1] Scope granularity"
  decision: "Current tenant:{id}:{resource}:{action} syntax sufficient for gen1"
  alternatives: ["Node-level scopes", "Opaque tokens with DB-stored permissions"]
  rationale: "At ≤10 scopes per token, JWT size ~1KB. Scope syntax provides adequate granularity."
  confidence: high
  question_this_if: "Scope count exceeds 20 per token OR JWT size exceeds 4KB"
  references: []
  spec_section_updated: "4.5 — scope granularity note"

- id: D-015
  generation: gen1
  marker: "[DECIDE:gen1] Actor identity"
  decision: "Option B — Actors as graph nodes"
  alternatives: ["Option A: Separate actors table", "Option C: Raw JWT sub"]
  rationale: "Consistent with graph-native ontology. Actors queryable as entities. Actor-entity relationships implicit via created_by. Overhead: one node creation per agent lifecycle per tenant (not per request)."
  confidence: high
  question_this_if: "Actor node creation overhead measurable at >100 concurrent new agents"
  references: []
  spec_section_updated: "4.6 — actor identity fully specified with type node schema and mapping rules"

- id: D-016
  generation: gen1
  marker: "[DECIDE:gen1] capture_thought execution strategy"
  decision: "Option A — Synchronous"
  alternatives: ["Option B: Async (job_id)", "Option C: Split (sync LLM, async linking)"]
  rationale: "Analysis: LLM call ~1-3s wall (<50ms CPU) + dedup ~100ms wall (~20ms CPU) + DB ~100ms wall (~30ms CPU). Total: ~2-5s wall, <200ms CPU. Fits Supabase limits (2s CPU, 150s wall-clock) because LLM/DB are async I/O."
  confidence: mid
  question_this_if: "capture_thought p95 latency exceeds 10s or CPU exceeds 1.5s"
  references: ["https://supabase.com/docs/guides/functions/limits"]
  spec_section_updated: "6.1 — constraints section"

- id: D-017
  generation: gen1
  marker: "[DECIDE:gen1] License"
  decision: "Apache 2.0"
  alternatives: ["BSL 1.1 (restricts commercial use)"]
  rationale: "Maximizes adoption. No usage restrictions. Compatible with enterprise environments."
  confidence: high
  question_this_if: "Commercial exploitation by competitors becomes a concern"
  references: []
  spec_section_updated: "N/A — license is a project-level decision, not a spec section"

- id: D-018
  generation: gen1
  marker: "[DECIDE:gen1] Blob storage"
  decision: "External (Supabase Storage)"
  alternatives: ["Inline BYTEA"]
  rationale: "Already decided in gen0 as invariant INV-BLOB. Confirmed."
  confidence: high
  question_this_if: "N/A — invariant"
  references: []
  spec_section_updated: "2.1 — blobs table unchanged"

- id: D-019
  generation: gen1
  marker: "[DECIDE:gen1] Event emission"
  decision: "Synchronous (atomic with projection)"
  alternatives: ["Async event emission"]
  rationale: "INV-ATOMIC requires event + projection in same transaction. Async would violate this invariant."
  confidence: high
  question_this_if: "N/A — required by invariant"
  references: []
  spec_section_updated: "3.5 — transaction model unchanged"

# ═══ CHALLENGED ASSUMPTIONS ═══

- id: C-001
  generation: gen1
  type: challenged_assumption
  assumption: "Gen0 recommends composite PK (edge_id, valid_from) for edges for consistency with nodes (section 2.1, line 201-204)"
  challenge: "Edges represent relationships, not entities. Edge 'updates' are nearly always soft-delete + recreate. Full bitemporality adds EXCLUDE constraints and composite PK complexity with near-zero benefit. No validation test requires edge versioning."
  outcome: revised
  action: "Changed edges to simple PK (edge_id). Removed EXCLUDE constraint. Temporal fields (valid_from, valid_to) retained for relationship lifecycle but without versioning."
  spec_section_updated: "2.1 — edges table"

- id: C-002
  generation: gen1
  type: challenged_assumption
  assumption: "JSONB data field has optional schema enforcement — entities can be stored without matching type_node's label_schema (section 2.1 type_nodes note)"
  challenge: "Without mandatory validation, data quality depends entirely on agent discipline. This undermines the Epistemic Honesty principle — confirmed entities should have validated data."
  outcome: revised
  action: "When a type node has a label_schema, store_entity MUST validate data against it. Validation failure returns SCHEMA_VIOLATION error. Exception: capture_thought creates hypothesis entities with relaxed validation (LLM output may not match schema perfectly). Type nodes without label_schema remain schema-free."
  spec_section_updated: "3.2 — store_entity auto_side_effects, 3.5 — error model"

- id: C-003
  generation: gen1
  type: challenged_assumption
  assumption: "capture_thought is a single atomic tool — all-or-nothing for LLM extraction + entity creation + edge creation (section 3.2)"
  challenge: "Single tool means agent cannot review/correct LLM extraction before it's committed. A failure at any entity/edge creation step aborts everything, including valid extractions."
  outcome: deferred
  action: "Kept as single tool for gen1 (splitting would push tool count to 16, exceeding 5-15 range). But added extraction_result to the response so agents can inspect what was extracted. [DECIDE:gen2] Consider splitting into extract_thought (returns plan) + apply_extraction (commits)."
  spec_section_updated: "3.2 — capture_thought response includes full extraction details"

- id: C-004
  generation: gen1
  type: challenged_assumption
  assumption: "15 tools total (12 primary + 3 utility) at the upper limit of the 5-15 recommended range (section 3)"
  challenge: "query_at_time could be a parameter on find_entities. get_timeline overlaps with explore_graph over time. Merging could reduce tool count."
  outcome: upheld
  action: "Each tool has a distinct mental model: query_at_time answers 'what did THIS entity look like THEN?' (point-in-time state), find_entities answers 'which entities match THESE criteria?' (discovery). Merging would increase parameter complexity and reduce discoverability. 15 tools is at the limit but justified by distinct purposes."
  spec_section_updated: "N/A — no change, assumption upheld"
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

### 10.2 Bound profile: Supabase (gen1 target)

```yaml
# This is the BOUND tech profile for gen1. Not an example — this is what gen1-impl builds against.
runtime: "deno"
framework: "hono"
mcp_adapter: "@hono/mcp@^0.2.3"
mcp_sdk: "@modelcontextprotocol/sdk@^1.27.1"
mcp_protocol: "2025-11-25"
database: "supabase postgres (PG 15+) + pgvector"
vector_extension: "pgvector (HNSW, 1536d)"
embedding_dimensions: 1536
auth_provider: "supabase auth + custom JWT signing for agents"
embedding_api: "text-embedding-3-small via OpenAI (or OpenRouter)"
extraction_llm: "gpt-4o-mini via OpenAI (or OpenRouter)"
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
| MCP Specification | https://modelcontextprotocol.io/specification/2025-11-25 | Protocol reference (gen1 target: 2025-11-25) |
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

## 12. GENERATION SUMMARY (gen1)

```yaml
generation: gen1-v1
author: gen1-spec agent (Claude Opus 4.6)
date: 2026-03-03
lineage: gen0-v5 → gen1-v1

what_was_built: >
  Fully resolved, implementation-ready specification. All 19 DECIDE:gen1 markers
  resolved with full decision log entries. All 7 RESEARCH:gen1 markers researched
  with findings integrated. 4 gen0 assumptions challenged (C-001 through C-004):
  edge versioning revised (composite→simple PK), schema validation made mandatory
  when label_schema exists, capture_thought kept atomic but with extraction transparency,
  15-tool count upheld. Added: exact schema precision (indexes, RLS policies, metatype
  bootstrap, UUIDv7 function), exact seed data for Pettson scenario (4 tenants,
  16 type nodes, 9+ entities, 6 edges, 4 grants, 4 actors, 4 JWT token definitions),
  exact test assertions for T01-T14, auth precision (scope requirements per tool,
  audit event schema), deduplication algorithm (3-tier inspired by Graphiti),
  implementation brief with 10 artifacts and recommended build order.

what_was_learned:
  - PostgreSQL 18 adds WITHOUT OVERLAPS but still lacks system-time versioning — manual bitemporality remains correct
  - MCP SDK is at v1.27.1 (stable), v2 anticipated Q1 2026 but not yet released
  - @hono/mcp at v0.2.3 is viable for Supabase Edge Functions
  - Supabase Edge Functions: 2s CPU (hard limit all plans), 150s wall-clock, 300MB RAM
  - capture_thought fits within Supabase limits when implemented synchronously (LLM/DB are async I/O)
  - Graphiti's three-tier deduplication (exact → MinHash/LSH → LLM) is production-proven; simplified for gen1 scale
  - MCP auth spec (2025-11-25) now requires RFC 9728 (Protected Resource Metadata) and RFC 8707 (Resource Indicators)
  - A2A Protocol v0.3 is complementary to MCP; AgentCard auto-generation from MCP tools is feasible
  - Edge bitemporality (composite PK) is unnecessary at gen1 scale — immutable edges with soft-delete suffice
  - Schema enforcement on store_entity prevents garbage data without sacrificing flexibility for capture_thought hypotheses

what_next_gen_should_watch_for:
  - MCP SDK v2 may have breaking changes — check migration path before gen2
  - A2A Protocol may reach v1.0 before gen2 — verify AgentCard format stability
  - Edge immutability (D-002) may need revision if edge update patterns emerge
  - capture_thought synchronous execution (D-016) should be profiled — if CPU exceeds 1.5s, switch to async
  - Deduplication thresholds (0.85/0.95) are theoretical — tune based on gen1-impl experience
  - Supabase CPU limits may increase — monitor community discussions
  - gen1-impl should report [FEEDBACK:gen1-impl] on any spec ambiguity encountered
```

### 12.1 Previous generation summary (gen0)

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