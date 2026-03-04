# RESONANSIA MCP SERVER — GEN 0 SPEC

## 0. GENERATIONAL PROTOCOL

This spec evolves through AI generations. Each generation MUST follow this protocol.

### 0.1 Generation contract

```yaml
gen0: Seed spec. Defines invariants, tool interface, validation scenario, open questions.
gen1: Resolve all DECIDE markers. Produce deployable code + tests. Question ≥3 assumptions.
gen2: Harden auth, add consent protocol, optimize performance. Question ≥3 gen1 decisions.
gen3: Federated query forwarding, horizontal scaling. Question ≥3 gen2 decisions.
genN: Pattern continues. Every generation questions, builds, hands off.
```

### 0.2 What every generation MUST do

1. **INHERIT** — Read the full spec. Read the DECISION LOG. Understand prior rationale.
2. **QUESTION** — Challenge ≥3 assumptions or decisions from prior generations. Document challenges in DECISION LOG with outcome: `upheld`, `revised`, or `deferred`.
3. **RESOLVE** — Every `[DECIDE]` assigned to your generation must be resolved with: decision, alternatives considered, rationale, confidence (high/mid/low), and a `question_this_if` trigger condition for future generations.
4. **BUILD** — Produce the artifacts listed in your generation's TASK section.
5. **VALIDATE** — Run the validation scenario. Report pass/fail per test case.
6. **HAND OFF** — Update the DECISION LOG. Write a GENERATION SUMMARY (≤500 words): what you built, what you learned, what the next generation should watch for.

### 0.3 Decision log entry format

```yaml
- id: D-001
  generation: gen1
  marker: "[DECIDE] embedding dimensions"
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

---

## 1. SYSTEM DEFINITION

### 1.0 One-sentence summary

A federated MCP server that exposes a 7-table bitemporal knowledge graph as AI-agent-accessible infrastructure with tenant isolation, semantic search, and temporal queries.

### 1.1 Unique value proposition

No existing system combines all of these:

| Property | Graphiti/Zep | Neo4j MCP | Open Brain | Mem0 | **This system** |
|---|---|---|---|---|---|
| Generalized knowledge graph | Partial (agent memory focus) | Yes | No (flat table) | Partial | **Yes** |
| Bitemporal data model | Yes (event_time + ingestion_time) | No | No | No | **Yes** |
| Event sourcing / audit trail | No | No | No | No | **Yes** |
| Multi-tenancy (RLS) | group_id only | No | No | No | **Yes** |
| Cross-tenant federation | No | No | No | No | **Yes** |
| Schema-flexible + typed | Fixed schema | Cypher schema | Fixed | Fixed | **Yes (JSONB + labels)** |
| MCP server interface | Yes | Yes | Yes | No | **Yes** |

### 1.2 Competitive landscape (for research context)

| System | Repository / URL | Relevance |
|---|---|---|
| Graphiti (Zep) | https://github.com/getzep/graphiti | Temporal knowledge graph, MCP 1.0, Neo4j backend. Closest competitor. |
| Open Brain | https://github.com/benclawbot/open-brain | Proves Supabase Edge + pgvector + MCP pattern. Single-user. |
| AWS Multi-tenant MCP | https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server | Reference architecture for OAuth 2.1 + multi-tenancy. |
| MCP Plexus | https://github.com/super-i-tech/mcp_plexus | Multi-tenant MCP framework (FastMCP). |
| StrongDM Attractor | https://github.com/strongdm/attractor | Spec-driven coding agent methodology. |
| @hono/mcp | https://github.com/honojs/middleware/tree/main/packages/mcp | Official Hono MCP middleware. |

---

## 2. DATA MODEL — THE 7 TABLES

This is the invariant kernel. Everything else is surface over this. These table definitions are tech-agnostic SQL.

### 2.1 Schema

```sql
-- Table 1: TENANTS — isolation boundary
tenants (
  tenant_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES tenants NULLABLE,     -- hierarchy for holding companies
  name          TEXT NOT NULL,
  config        JSONB DEFAULT '{}',                    -- feature flags, limits, plan
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Table 2: LABELS — dynamic schema registry
-- Labels define what types of nodes, edges, and events exist in a tenant.
-- A tenant with zero labels is fully dynamic. Labels add optional validation.
labels (
  label_id      UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,
  name          TEXT NOT NULL,                          -- e.g. 'lead', 'booking', 'invoice'
  kind          ENUM('node', 'edge', 'event') NOT NULL,
  schema        JSONB DEFAULT '{}',                     -- JSON Schema for data field validation
  config        JSONB DEFAULT '{}',                     -- display, behavior, permissions
  UNIQUE(tenant_id, name, kind)
)

-- Table 3: NODES — entities in the knowledge graph
nodes (
  node_id       UUID PRIMARY KEY,                       -- UUIDv7 = transaction time
  tenant_id     UUID NOT NULL REFERENCES tenants,
  label_id      UUID NOT NULL REFERENCES labels,
  data          JSONB NOT NULL DEFAULT '{}',
  embedding     VECTOR NULLABLE,                        -- dimension set by tech profile
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT now(),     -- bitemporal: business time start
  valid_to      TIMESTAMPTZ DEFAULT 'infinity',         -- bitemporal: business time end
  recorded_at   TIMESTAMPTZ DEFAULT now(),              -- bitemporal: system time
  created_by    UUID NOT NULL,                          -- user or agent identity
  is_deleted    BOOLEAN DEFAULT false
)

-- Table 4: EDGES — relationships between nodes
-- Cross-tenant edges are the federation mechanism.
-- When source and target belong to different tenants,
-- auth must verify access to BOTH endpoints.
edges (
  edge_id       UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,       -- owner tenant of the edge
  label_id      UUID NOT NULL REFERENCES labels,
  source_id     UUID NOT NULL REFERENCES nodes,
  target_id     UUID NOT NULL REFERENCES nodes,
  data          JSONB DEFAULT '{}',
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to      TIMESTAMPTZ DEFAULT 'infinity',
  recorded_at   TIMESTAMPTZ DEFAULT now(),
  created_by    UUID NOT NULL,
  is_deleted    BOOLEAN DEFAULT false
)

-- Table 5: EVENTS — append-only immutable audit trail
-- NEVER updated. NEVER deleted. This IS the audit log.
-- Corrections are new events that reference the original via data payload.
events (
  event_id      UUID PRIMARY KEY,                       -- UUIDv7 = transaction time
  tenant_id     UUID NOT NULL REFERENCES tenants,
  label_id      UUID NOT NULL REFERENCES labels,
  data          JSONB NOT NULL,
  node_ids      UUID[] DEFAULT '{}',                    -- related nodes
  edge_ids      UUID[] DEFAULT '{}',                    -- related edges
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),     -- when it happened in reality
  recorded_at   TIMESTAMPTZ DEFAULT now(),              -- when system learned about it
  created_by    UUID NOT NULL
)

-- Table 6: BLOBS — binary storage (files, images, documents)
blobs (
  blob_id       UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,
  content_type  TEXT NOT NULL,
  storage_ref   TEXT NOT NULL,                          -- path/key in object storage
  size_bytes    BIGINT NOT NULL,
  node_id       UUID REFERENCES nodes NULLABLE,         -- optional link to a node
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID NOT NULL
)

-- Table 7: DICTS — reference data (currencies, countries, account codes)
dicts (
  dict_id       UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,
  type          TEXT NOT NULL,                           -- e.g. 'currency', 'country'
  key           TEXT NOT NULL,
  value         JSONB NOT NULL,
  valid_from    TIMESTAMPTZ DEFAULT now(),
  valid_to      TIMESTAMPTZ DEFAULT 'infinity',
  UNIQUE(tenant_id, type, key, valid_from)
)
```

### 2.2 Invariant rules

1. **tenant_id on every row** — No exceptions. RLS enforces isolation.
2. **Events are append-only** — Never update, never delete. Corrections are new events.
3. **Bitemporality** — `valid_from`/`valid_to` = business time. `recorded_at` (or UUIDv7 of PK) = system time.
4. **Soft deletes only** — `is_deleted = true` + `valid_to = now()`. Hard deletes only for GDPR erasure.
5. **Cross-tenant edges** — `source_id` and `target_id` may belong to different tenants. Auth must verify both.
6. **Labels are optional schema** — System works with zero labels (fully dynamic). Labels add validation and discovery.
7. **Blobs use external storage** — `blob_data` is NOT stored in the database. `storage_ref` points to object storage. Only metadata lives in the table.

### 2.3 Embedding strategy

```yaml
trigger: on node create or update, queue async embedding job
input: concatenate(label.name, " ", JSON.stringify(node.data))
storage: nodes.embedding column
search: cosine similarity function (database-native)
decisions_for_gen1:
  - "[DECIDE:gen1] Embedding model and dimensions"
  - "[DECIDE:gen1] Embed edge data? Recommendation: no for gen1"
  - "[DECIDE:gen1] Embed events? Recommendation: no for gen1"
constraints:
  - Embedding generation MUST be async (not in the request path)
  - Search latency target: <100ms p95 at 100K nodes
```

---

## 3. MCP TOOL INTERFACE

### 3.1 Design principles

These principles override implementation convenience:

1. **Outcome over operation** — Tools represent agent goals, not database operations. An agent should accomplish its intent in 1-2 tool calls, not 5.
2. **Flat arguments** — Top-level primitives and constrained types. No nested dicts as params.
3. **5-15 tools total** — Curate ruthlessly. Each tool has one clear purpose.
4. **Every mutation emits an event** — Automatic. The caller does not need to emit events separately.
5. **Every mutation returns the created/modified entity** — No need for a follow-up read.
6. **Errors enable self-correction** — Error messages tell the agent what went wrong and how to fix it.

References:
- https://www.philschmid.de/mcp-best-practices
- https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/

### 3.2 Tools (10 tools)

```yaml
# ─── ENTITY MANAGEMENT ───

store_entity:
  description: "Create or update a node in the knowledge graph. Returns the full entity with ID."
  params:
    entity_type: string            # label name, e.g. "lead", "booking"
    data: object                   # entity fields as flat JSON
    entity_id: string?             # if provided, updates existing (creates new version)
    valid_from: datetime?          # backdate business time (default: now)
    tenant_id: string?             # required only if token spans multiple tenants
  returns:
    entity_id: string
    entity_type: string
    data: object
    version: int                   # monotonically increasing version number
    valid_from: datetime
    previous_version_id: string?   # null on create, previous UUID on update
  auto_side_effects:
    - emits event: "entity_created" or "entity_updated"
    - queues async embedding generation
    - validates data against label schema if label has schema defined

find_entities:
  description: "Search entities by semantic similarity, structured filters, or both. Use this to find entities matching a natural language query or specific field values."
  params:
    query: string?                 # semantic search (uses embeddings). omit for structured-only search.
    entity_types: string[]?        # filter by label name(s)
    filters: object?               # field-level filters: { "status": "active", "city": "Stockholm" }
    tenant_id: string?
    limit: int?                    # default 10, max 100
    sort_by: string?               # field name or "relevance" (default for semantic) or "created_at"
  returns:
    results: [{ entity_id, entity_type, data, similarity?, valid_from }]
    total_count: int

connect_entities:
  description: "Create a typed relationship between two entities. Works across tenant boundaries if token has access to both."
  params:
    edge_type: string              # label name, e.g. "contacted_via", "includes"
    source_id: string
    target_id: string
    data: object?                  # optional relationship metadata
  returns:
    edge_id: string
    edge_type: string
    source: { entity_id, entity_type, tenant_id }
    target: { entity_id, entity_type, tenant_id }
    is_cross_tenant: boolean
  auto_side_effects:
    - emits event: "edge_created" with both node IDs
    - validates both endpoints exist and are accessible

explore_graph:
  description: "Starting from an entity, traverse relationships to discover connected entities. Returns a subgraph centered on the start node."
  params:
    start_id: string
    edge_types: string[]?          # filter by relationship types. omit for all types.
    direction: "outgoing" | "incoming" | "both"?  # default "both"
    depth: int?                    # max traversal depth. default 1, max 5.
    include_data: boolean?         # include full entity data. default true.
    filters: object?               # filter connected entities by field values
  returns:
    center: { entity_id, entity_type, data }
    connections: [{
      edge_id, edge_type, direction,
      entity: { entity_id, entity_type, data, tenant_id },
      depth: int
    }]
    # Entities the caller cannot access are omitted silently (not errors).

remove_entity:
  description: "Soft-delete an entity. It remains in history and audit trail but is excluded from search and list results."
  params:
    entity_id: string
  returns:
    removed: true
    entity_type: string
  auto_side_effects:
    - sets is_deleted=true, valid_to=now()
    - emits event: "entity_removed"
    - connected edges become dangling (queryable for audit, excluded from explore_graph)

# ─── TEMPORAL ───

query_at_time:
  description: "Retrieve an entity's state at a specific point in time. Supports both 'what was true then?' (business time) and 'what did we know then?' (system time)."
  params:
    entity_id: string
    valid_at: datetime             # business time: what was true at this moment?
    recorded_at: datetime?         # system time: what did we know at this moment? (default: now)
  returns:
    entity_id: string
    entity_type: string
    data: object
    valid_from: datetime
    valid_to: datetime
    recorded_at: datetime
    # Returns null with explanation if no version matches the time window.

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
      type: "version_change" | "event" | "edge_created" | "edge_removed",
      data: object,
      created_by: string
    }]

# ─── CAPTURE ───

capture_thought:
  description: "Submit free-text input. System extracts structured data, classifies entity type, identifies mentioned entities, and creates nodes + edges automatically."
  params:
    content: string                # free-text: note, message, observation
    source: string?                # origin: "slack", "email", "manual", "agent"
    tenant_id: string?
  returns:
    created_node: { entity_id, entity_type, data }
    extracted_entities: [{ entity_id, entity_type, relationship, is_new }]
    action_items: string[]?
  implementation_notes: |
    1. Fetch tenant's labels (available entity types + schemas)
    2. Call LLM to extract: type classification, structured fields, mentioned entities, action items
    3. Create primary node via store_entity
    4. For each mentioned entity: find existing (via find_entities) or create new
    5. Create edges between primary node and mentioned entities
    6. Emit event: "thought_captured"
    LLM must be label-aware: prompt includes tenant's available types and their schemas.

# ─── DISCOVERY ───

get_schema:
  description: "Discover what entity types, relationship types, and event types exist in a tenant. Use this first to understand the data model before querying."
  params:
    tenant_id: string?
  returns:
    entity_types: [{ name, schema, node_count, example_fields }]
    edge_types: [{ name, schema, edge_count }]
    event_types: [{ name, event_count, last_occurred_at }]

get_stats:
  description: "Dashboard-level statistics for a tenant: totals, recent activity, data freshness."
  params:
    tenant_id: string?
  returns:
    totals: { nodes, edges, events, blobs }
    by_type: { [entity_type]: count }
    recent_activity: [{ event_type, count_last_7d, last_occurred_at }]
    data_freshness: { newest_node, newest_event, oldest_unembedded_node }
```

### 3.3 Resources (read-only context)

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

### 3.4 Prompts (reusable agent instructions)

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

### 3.5 Blob and dict access

Blobs and dicts are accessible but not primary agent tools. They are exposed as utility operations:

```yaml
store_blob:
  params: { data_base64: string, content_type: string, related_entity_id: string? }
  returns: { blob_id, content_type, size_bytes }

get_blob:
  params: { blob_id: string }
  returns: { blob_id, content_type, data_base64 }

lookup_dict:
  params: { dict_type: string, key: string?, valid_at: datetime? }
  returns: { entries: [{ key, value, valid_from, valid_to }] }
```

**Total: 13 tools** (10 primary + 3 utility). Within the recommended 5-15 range.

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

### 4.2 Permission resolution (every tool call)

```
1. Extract tenant_id from params OR from token (if single-tenant scoped)
2. Verify token.scopes includes required scope for the operation
3. Cross-tenant operations: verify scopes for ALL involved tenants
4. Database-level RLS enforces isolation even if server code has bugs
5. Every tool call → audit event: { caller, tool, params_hash, result_status }
```

### 4.3 Token types

```yaml
user_token:
  issued_by: platform auth provider
  scopes: based on user role within tenant(s)
  lifetime: short (1h), refreshable

agent_token:
  issued_by: platform admin or API
  scopes: specific to agent's purpose (e.g. sales_agent gets read + lead:write)
  lifetime: medium (24h), non-refreshable

partner_token:
  issued_by: tenant admin
  scopes: read-only, specific entity types
  lifetime: long (30d), auto-expires, non-refreshable
  constraint: cannot create edges, cannot access financials
```

### 4.4 Auth decisions

```yaml
- "[DECIDE:gen1] Token format: stateless JWT vs opaque + introspection"
  recommendation: JWT for gen1, introspection for gen2+
- "[DECIDE:gen1] Auth provider integration: build custom vs integrate existing"
  recommendation: integrate with deployment platform's auth
```

---

## 5. FEDERATION

### 5.1 Core concept

Federation = controlled data sharing across tenant boundaries.

- **NOT** copying data between databases
- **IS** cross-tenant edges + scoped tokens that allow queries to traverse boundaries

### 5.2 Primitives

```yaml
cross_tenant_edge:
  what: Edge where source and target belong to different tenants
  requires: Write scope on both tenants
  consent: Platform admin creates manually (gen1). Consent protocol (gen2+).

virtual_endpoint:
  what: Single MCP URL that combines multiple tenants into one logical view
  how: Token with multiple tenant_ids → queries span all
  constraint: RLS still enforces per-entity permissions

partner_endpoint:
  what: Time-limited MCP access for external partners
  scopes: Read-only, specific entity types
  logging: All access logged in events table
  expiry: Token exp claim, non-renewable
```

### 5.3 Federation scope per generation

```yaml
gen1: [cross_tenant_edge: YES, virtual_endpoint: YES, partner_token: YES, consent_protocol: NO]
gen2: [consent_protocol: YES, federated_search: YES, projection_scopes: YES]
gen3: [remote_query_forwarding: YES, federated_graph_merge: YES]
```

---

## 6. CONSTRAINTS

Real-world constraints that bound all design decisions. Research these values before implementation — they may have changed.

### 6.1 Platform constraints (verify at implementation time)

```yaml
# These are example values from Supabase Edge Functions (March 2026).
# If using a different platform, research equivalent limits.
serverless_cpu_per_request: "~2 seconds"      # binding constraint for complex queries
serverless_wall_clock: "~400 seconds"          # for streaming connections
serverless_memory: "~256 MB"
function_bundle_size: "~20 MB"
```

### 6.2 Vector search constraints

```yaml
# pgvector HNSW performance benchmarks (1536 dimensions, March 2026):
# 15K vectors:  480 QPS, 16ms p95  (1 GB RAM)
# 100K vectors: 240 QPS, 126ms p95 (4 GB RAM)
# 1M vectors:   560 QPS, 58ms p95  (32 GB RAM)
# Source: https://supabase.com/docs/guides/ai/choosing-compute-addon
#
# Implication: At gen1 scale (<100K nodes), pgvector is fine on minimal infra.
# At 1M+ nodes, dedicated vector infrastructure may be needed.
embedding_latency_target: "<100ms p95"
search_latency_target: "<200ms p95 including RLS filtering"
```

### 6.3 MCP protocol constraints

```yaml
# MCP SDK: @modelcontextprotocol/sdk (verify latest version)
# Transport: Streamable HTTP (JSON-RPC 2.0)
# Auth: OAuth 2.1 (draft spec, functional)
# Source: https://modelcontextprotocol.io/specification/draft/basic/authorization
# Key: OAuth 2.1 auth spec is labeled "draft" as of March 2026.
# Multi-tenant MCP is NOT standardized in the protocol.
# Approaches: scoped tokens, path-based isolation, or gateway pattern.
# Source: https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/193
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

### 7.2 Entity types per tenant

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

### 7.4 Agent roles and scopes

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

### 7.5 Acceptance tests

Every test is a tool call with expected outcome. **All must pass.**

```yaml
T01_semantic_cross_tenant_search:
  agent: sales_agent
  call: find_entities(query="football fans interested in cabin packages")
  expect: Returns leads from taylor_events that have edges to mountain_cabins bookings
  validates: semantic search + cross-tenant edge traversal + RLS

T02_create_entity:
  agent: content_agent
  call: store_entity(entity_type="campaign", data={name: "Summer Festival 2026"})
  expect: Success. Returns entity_id, entity_type, version=1.
  validates: entity creation + event emission

T03_permission_denial:
  agent: content_agent
  call: find_entities(entity_types=["lead"])
  expect: DENIED or empty results (no lead read scope)
  validates: scope enforcement

T04_cross_tenant_traverse:
  agent: booking_agent
  call: explore_graph(start_id=PACKAGE_NODE, edge_types=["includes"], direction="outgoing")
  expect: Returns cabin properties from mountain_cabins tenant
  validates: cross-tenant edge traversal + RLS

T05_partner_read_only:
  agent: partner_travel_agency
  call: store_entity(entity_type="package", data={...})
  expect: DENIED (read-only scope)
  validates: write protection on partner tokens

T06_audit_trail:
  agent: any
  precondition: Perform any mutation
  call: get_timeline(entity_id=MUTATED_ENTITY)
  expect: Timeline includes event with created_by = agent identity
  validates: automatic event emission + audit

T07_bitemporal_query:
  agent: sales_agent
  precondition: Lead exists, was updated on Feb 1, queried on Mar 1
  call: query_at_time(entity_id=LEAD_ID, valid_at="2026-01-15")
  expect: Returns lead data as it was on Jan 15 (before Feb 1 update)
  validates: bitemporal point-in-time query

T08_timeline:
  agent: sales_agent
  call: get_timeline(entity_id=LEAD_ID)
  expect: Chronological list: created → contacted → responded → booked
  validates: event aggregation + version history merge

T09_capture_thought:
  agent: sales_agent
  call: capture_thought(content="Met Johan at the cabin fair, he wants 20 tickets for Allsvenskan and a cabin for midsommar", source="manual")
  expect: Creates a lead node, finds-or-creates "Johan" contact, creates edges to ticket and cabin concepts
  validates: LLM extraction + entity linking + multi-step automation

T10_schema_discovery:
  agent: sales_agent
  call: get_schema(tenant_id=TAYLOR_EVENTS_ID)
  expect: Returns all entity types with counts and example fields
  validates: schema introspection for agent orientation
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
    - Vector extension setup
    - Semantic search function
    - Seed data for Pettson scenario
  done_when: Migration runs clean. Pettson tenants + labels exist.

artifact_2_tools:
  what: All 13 tool implementations
  includes:
    - Input validation with schema library
    - Parameterized queries (no string interpolation)
    - MCP-compatible error codes
    - Tests per tool
  done_when: Each tool passes its unit tests.

artifact_3_auth:
  what: Auth middleware + token handling
  includes:
    - Token validation middleware
    - Scope checking per tool call
    - RLS policy alignment with token scopes
    - Audit event on every tool call
  done_when: T03 and T05 acceptance tests pass.

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
    - Embedding generation worker
    - API integration for chosen embedding model
    - Retry logic
    - Semantic search function
  done_when: T01 acceptance test passes.

artifact_6_capture:
  what: capture_thought implementation
  includes:
    - LLM prompt for extraction (label-aware)
    - Entity find-or-create logic
    - Edge creation for mentioned entities
  done_when: T09 acceptance test passes.

artifact_7_tests:
  what: Full acceptance test suite
  includes:
    - All T01-T10 tests as executable tests
    - Setup: create Pettson tenants, labels, seed data, agent tokens
    - Teardown: clean test data
  done_when: All 10 tests pass.

artifact_8_deployment:
  what: Deployment script / instructions
  includes:
    - Step-by-step setup from zero
    - Secrets management
    - Connection to MCP clients
  done_when: A developer can deploy from scratch using only the instructions.
```

### 8.2 Gen1 success criteria

```yaml
minimum_viable:
  - All 7 tables deployed with RLS
  - store_entity, find_entities, explore_graph, get_schema tools working
  - Single-tenant auth working
  - T01, T02, T03, T10 passing
  grade: "C — functional but incomplete"

target:
  - All 13 tools working
  - Cross-tenant federation working
  - All T01-T10 passing
  - Deployment instructions complete
  grade: "A — ready for gen2"

stretch:
  - Slack capture function
  - Performance benchmarks documented
  - Cost estimation per 1K tool calls
  grade: "A+ — exceeds expectations"
```

### 8.3 Gen1 DECIDE markers

These MUST be resolved by gen1 with full decision log entries:

```yaml
- "[DECIDE:gen1] Embedding model and dimensions (1536 vs 768)"
  research: What do Graphiti and Open Brain use? Benchmark at expected scale.
- "[DECIDE:gen1] Token format: stateless JWT vs opaque + introspection"
  recommendation: JWT for gen1 simplicity
- "[DECIDE:gen1] Event emission: synchronous vs async"
  recommendation: synchronous for gen1 (guaranteed delivery)
- "[DECIDE:gen1] Label creation: who can create new labels?"
  recommendation: tenant admin only. capture_thought suggests but does not create.
- "[DECIDE:gen1] Blob storage: inline BYTEA vs external object storage"
  recommendation: external. BYTEA does not scale.
- "[DECIDE:gen1] License: Apache 2.0 vs BSL 1.1"
```

### 8.4 Gen2+ roadmap (for context only — gen1 does not build these)

```yaml
gen2:
  - Consent protocol for cross-tenant edges
  - Token introspection endpoint
  - Rate limiting per agent
  - GDPR erasure (crypto-shred pattern)
  - Performance optimization based on gen1 benchmarks

gen3:
  - Federated query forwarding to remote instances
  - Horizontal scaling (read replicas)
  - Multi-region deployment
  - Real-time subscriptions (MCP sampling)
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

Verified March 2026. Research for latest versions before implementing.

### 11.1 Core dependencies

| Dependency | URL | Why |
|---|---|---|
| MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | MCP server implementation |
| MCP Specification | https://modelcontextprotocol.io/specification/2025-03-26 | Protocol reference |
| MCP Auth (draft) | https://modelcontextprotocol.io/specification/draft/basic/authorization | OAuth 2.1 for MCP |
| Hono MCP Middleware | https://github.com/honojs/middleware/tree/main/packages/mcp | Hono + MCP integration |
| pgvector | https://github.com/pgvector/pgvector | Vector similarity search in Postgres |

### 11.2 Reference implementations

| Project | URL | Learn from |
|---|---|---|
| Open Brain | https://github.com/benclawbot/open-brain | Supabase Edge + MCP + pgvector pattern |
| Open Brain Guide | https://promptkit.natebjones.com/20260224_uq1_guide_main | Step-by-step deployment guide |
| Graphiti (Zep) | https://github.com/getzep/graphiti | Temporal knowledge graph, MCP tools, embedding strategy |
| Graphiti MCP Docs | https://help.getzep.com/graphiti/getting-started/mcp-server | MCP tool design patterns |
| AWS Multi-tenant MCP | https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server | OAuth 2.1 + multi-tenancy reference |
| MCP Plexus | https://github.com/super-i-tech/mcp_plexus | Multi-tenant MCP framework |
| StrongDM Attractor | https://github.com/strongdm/attractor | Spec-driven coding agent methodology |

### 11.3 Best practices

| Topic | URL |
|---|---|
| MCP Tool Design | https://www.philschmid.de/mcp-best-practices |
| MCP Server Production | https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/ |
| MCP Security | https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/ |
| Multi-tenant Auth in MCP | https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol |
| pgvector Benchmarks | https://supabase.com/docs/guides/ai/choosing-compute-addon |
| Supabase Edge Limits | https://supabase.com/docs/guides/functions/limits |

### 11.4 Research papers

| Paper | URL | Relevance |
|---|---|---|
| Graphiti Architecture | https://arxiv.org/abs/2501.13956 | Bitemporal knowledge graph design decisions |

---

## 12. GENERATION SUMMARY (gen0)

```yaml
generation: gen0
author: human + AI
date: 2026-03-03
what_was_built: Seed spec defining invariant data model, tool interface, auth model, federation architecture, and validation scenario.
what_was_learned:
  - MCP best practices recommend 5-15 outcome-oriented tools, not CRUD wrappers
  - Multi-tenant MCP is not standardized; must be solved at application level
  - Supabase Edge Functions have 2s CPU limit per request — must design within this
  - pgvector HNSW performs well at <100K nodes on minimal infra
  - OAuth 2.1 in MCP is functional but still "draft" spec status
what_next_gen_should_watch_for:
  - MCP auth spec may change — check latest before implementing
  - @hono/mcp API may have breaking changes — verify current version
  - Supabase Edge Function limits may have changed — verify before designing
  - capture_thought LLM extraction quality depends heavily on prompt engineering — invest time here
  - Cross-tenant RLS is the hardest part — test thoroughly before building other features
```
