# RESONANSIA MCP SERVER — GEN 0 SPEC (TRUSTLESS KNOWLEDGE BUS)

## 0. GENERATIONAL PROTOCOL

...
### 0.1 Generation contract

```yaml
gen0: Seed spec. Defines invariants, 3-layer data model, tool interface, validation scenario, open questions.
gen1: Resolve all DECIDE markers. Produce deployable code + tests. Question ≥3 assumptions.
gen2: Consent protocol, epistemisk förgrening, GDPR crypto-shred, rate limiting. Question ≥3 gen1 decisions.
gen3: Federated query forwarding, horizontal scaling, multi-region. Question ≥3 gen2 decisions.
genN: Pattern continues. Every generation questions, builds, hands off.
````

...

### 1.0 One-sentence summary

A federated MCP server exposing a trustless, hash-chained, bitemporal knowledge graph where events are the
single source of truth and all queryable state is a deterministic projection of the event stream.

### 1.1 Core paradigm: Event Primacy

```
This system is NOT a database with a log.
This system IS an event stream with materialized views.

Source of truth: the events table (append-only, hash-chained, signed).
Everything else: deterministic projections that can be rebuilt from events.
Same event stream + same logic version = identical state. Always.
```

### 1.2 Unique value proposition

No existing system combines all of these:

| Property                         | Graphiti/Zep           | Neo4j MCP | Open Brain | Mem0    | **This system** |
| -------------------------------- | ---------------------- | --------- | ---------- | ------- | --------------- |
| Generalized knowledge graph      | Partial (agent memory) | Yes       | No (flat)  | Partial | **Yes**         |
| Event-sourced (events = truth)   | No                     | No        | No         | No      | **Yes**         |
| Cryptographic event chain        | No                     | No        | No         | No      | **Yes**         |
| Bitemporal data model            | Yes                    | No        | No         | No      | **Yes**         |
| Multi-tenancy (RLS)              | group_id only          | No        | No         | No      | **Yes**         |
| Cross-tenant federation          | No                     | No        | No         | No      | **Yes**         |
| Capability-based access (grants) | No                     | No        | No         | No      | **Yes**         |
| Deterministic replay             | No                     | No        | No         | No      | **Yes**         |
| MCP server interface             | Yes                    | Yes       | Yes        | No      | **Yes**         |

### 1.3 Competitive landscape

| System                               | URL                                                                                                                                      | Relevance                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Graphiti (Zep)                       | [https://github.com/getzep/graphiti](https://github.com/getzep/graphiti)                                                                 | Temporal knowledge graph, MCP 1.0, Neo4j backend. |
| Closest competitor.                  |                                                                                                                                          |                                                   |
| Open Brain                           | [https://github.com/benclawbot/open-brain](https://github.com/benclawbot/open-brain)                                                     | Proves Supabase Edge + pgvector + MCP pattern.    |
| Single-user.                         |                                                                                                                                          |                                                   |
| AWS Multi-tenant MCP                 | [https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server](https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server) |                                                   |
| OAuth 2.1 + multi-tenancy reference. |                                                                                                                                          |                                                   |
| MCP Plexus                           | [https://github.com/super-i-tech/mcp_plexus](https://github.com/super-i-tech/mcp_plexus)                                                 | Multi-tenant MCP framework (FastMCP).             |
| StrongDM Attractor                   | [https://github.com/strongdm/attractor](https://github.com/strongdm/attractor)                                                           | Spec-driven coding agent methodology.             |
| @hono/mcp                            | [https://github.com/honojs/middleware/tree/main/packages/mcp](https://github.com/honojs/middleware/tree/main/packages/mcp)               | Official Hono MCP middleware.                     |

---

## 2. DATA MODEL — THREE LAYERS

The data model has three conceptual layers. Each layer has distinct rules and responsibilities.

```
┌─────────────────────────────────────┐
│  LAYER A: ONTOLOGY                  │  The graph's DNA. Types as nodes.
│  type_nodes                         │  Bitemporal schema versioning.
├─────────────────────────────────────┤
│  LAYER B: EVENTS                    │  The cryptographic chain.
│  events                             │  Append-only. Hash-linked. Signed.
│                                     │  THIS IS THE SINGLE SOURCE OF TRUTH.
├─────────────────────────────────────┤
│  LAYER C: FACTS (projections)       │  Materialized views of the event stream.
│  nodes, edges, grants               │  Deterministically derived. Rebuildable.
├─────────────────────────────────────┤
│  SUPPORTING                         │
│  tenants, blobs, dicts              │  Isolation boundary, binary storage, reference data.
└─────────────────────────────────────┘
```

### 2.1 Layer A: Ontology — type_nodes

Types are first-class nodes. The graph describes its own structure.

```sql
--- TENANTS — isolation boundary (unchanged)
tenants (
  tenant_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES tenants NULLABLE,
  name          TEXT NOT NULL,
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
)

--- TYPE_NODES — the graph's ontology (replaces labels)
--- Each type is a node. To understand what a "Faktura" is, traverse its type_node.
--- Schema changes create new versions; no retroactive changes allowed.
type_nodes (
  type_node_id  UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants,
  name          TEXT NOT NULL,                          -- e.g. 'lead', 'booking', 'contacted_via'
  kind          ENUM('entity', 'predicate', 'event_type', 'grant_type') NOT NULL,
  schema        JSONB DEFAULT '{}',                     -- JSON Schema for data field validation
  config        JSONB DEFAULT '{}',                     -- display, behavior, UI hints
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT now(),     -- bitemporal schema versioning
  valid_to      TIMESTAMPTZ DEFAULT 'infinity',         -- new schema version → close old, open new
  created_by_event BYTEA NULLABLE,                      -- FK to events.event_hash (NULL for seed types)
  UNIQUE(tenant_id, name, kind, valid_from),
  -- CONSTRAINT: no overlapping valid_range per (tenant_id, name, kind)
  EXCLUDE USING gist (
    tenant_id WITH =, name WITH =, kind WITH =,
    tstzrange(valid_from, valid_to) WITH &&
  )
)
```

**Key properties:**

* `kind = 'entity'` → defines a node type (lead, booking, invoice)
* `kind = 'predicate'` → defines an edge type (contacted_via, includes, sells)
* `kind = 'event_type'` → defines an event intent (entity_created, payment_received)
* `kind = 'grant_type'` → defines a capability type (read, write, traverse)
* Schema changes create new versions. Old versions remain valid for their time range.
* The EXCLUDE constraint prevents overlapping valid ranges — at most one active schema per type at any point in time.

### 2.2 Layer B: Events — the cryptographic chain

The single source of truth. Every mutation in the system originates as an event. Events are append-only,
hash-linked, and signed.

```sql
--- EVENTS — append-only, hash-chained, signed
events (
  event_hash    BYTEA PRIMARY KEY,                      -- SHA-256 of canonical payload (content-addressable)
  prev_hash     BYTEA NULLABLE,                         -- SHA-256 of previous event in same stream (NULL for genesis)
  stream_id     UUID NOT NULL,                          -- the entity this event stream belongs to
  tenant_id     UUID NOT NULL REFERENCES tenants,
  actor_id      UUID NOT NULL,                          -- who created this event
  signature     BYTEA NOT NULL,                         -- Ed25519 signature of event_hash by actor_id
  intent_type   TEXT NOT NULL,                          -- references type_nodes.name where kind='event_type'
  payload       JSONB NOT NULL,                         -- event data (JCS-canonicalized before hashing)
  effective_from TIMESTAMPTZ NOT NULL,                  -- bitemporal: when this happened in reality
  recorded_at   TIMESTAMPTZ DEFAULT now(),              -- when system recorded it (system time)
  transition_logic_version INT NOT NULL DEFAULT 1,      -- projection logic version for deterministic replay
  -- CONSTRAINT: prev_hash must match the latest event_hash for this stream_id
  -- Enforced in application layer (tip verification) + periodic audit (full chain)
  CONSTRAINT valid_chain CHECK (
    (prev_hash IS NULL) OR (prev_hash != event_hash)   -- cannot self-reference
  )
)

--- INDEX for stream traversal (critical for lineage verification)
CREATE INDEX idx_events_stream ON events (stream_id, recorded_at);
CREATE INDEX idx_events_prev ON events (prev_hash) WHERE prev_hash IS NOT NULL;
CREATE INDEX idx_events_tenant ON events (tenant_id, recorded_at);
```

**Hash computation (canonical, deterministic):**

```yaml
canonical_payload:
  # These fields, in this order, are JCS-canonicalized (RFC 8785) and hashed.
  stream_id: UUID
  tenant_id: UUID
  prev_hash: hex string or null
  actor_id: UUID
  intent_type: string
  payload: object          # the actual event data
  effective_from: ISO 8601 string
  transition_logic_version: int

procedure:
  1. Construct canonical_payload object with exact field names above
  2. Serialize with JCS (RFC 8785) → deterministic JSON bytes
  3. event_hash = SHA-256(jcs_bytes)
  4. signature = Ed25519.sign(event_hash, actor_private_key)
```

**Tip verification (on every write, O(1)):**

```
Before accepting a new event for stream_id S:
  1. Find the current tip: SELECT event_hash FROM events WHERE stream_id = S ORDER BY recorded_at DESC LIMIT 1
  2. Verify: new_event.prev_hash == tip.event_hash (or NULL if genesis)
  3. If mismatch: REJECT with error "stale prev_hash, stream has advanced"
```

**Full chain audit (on-demand via verify_lineage tool, O(n)):**

```
For stream_id S:
  1. Fetch all events ordered by recorded_at ASC
  2. Verify: event[0].prev_hash IS NULL (genesis)
  3. For each subsequent event[i]: re-compute hash from canonical_payload, verify event[i].prev_hash == event[i-1].event_hash
  4. Verify all signatures against actor_id public keys
  5. Return: { valid: bool, chain_length: int, breaks: [...] }
```

### 2.3 Layer C: Facts — deterministic projections

Fact tables are materialized views of the event stream. Every row traces back to the event that created it.

```sql
--- NODES — projected entity state
--- Rebuilt deterministically from events where intent_type ∈ {entity_created, entity_updated, entity_removed}
nodes (
  node_id           UUID NOT NULL,                      -- stable identity (= stream_id of creating event)
  tenant_id         UUID NOT NULL REFERENCES tenants,
  type_node_id      UUID NOT NULL REFERENCES type_nodes, -- what kind of entity
  data              JSONB DEFAULT '{}',                  -- metadata/ornamentik only (see Invariant 4)
  embedding         VECTOR NULLABLE,                     -- dimensions set by tech profile
  valid_from        TIMESTAMPTZ NOT NULL,                -- bitemporal: business time start
  valid_to          TIMESTAMPTZ DEFAULT 'infinity',      -- bitemporal: business time end
  epistemic_status  TEXT NOT NULL DEFAULT 'HYPOTHESIS'
                    CHECK (epistemic_status IN ('HYPOTHESIS', 'VERIFIED', 'CONFIRMED')),
  created_by_event  BYTEA NOT NULL,                      -- FK: the event that produced this fact row
  is_deleted        BOOLEAN DEFAULT false,
  PRIMARY KEY (node_id, valid_from)                      -- composite PK: identity + time
  -- CONSTRAINT: no overlapping valid_range per node_id
)

--- EDGES — projected relationships
--- Rebuilt from events where intent_type ∈ {edge_created, edge_removed}
edges (
  edge_id           UUID PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants,
  predicate_node_id UUID NOT NULL REFERENCES type_nodes, -- typed edge (see Invariant 3)
  source_id         UUID NOT NULL,                       -- FK to nodes.node_id
  target_id         UUID NOT NULL,                       -- FK to nodes.node_id
  data              JSONB DEFAULT '{}',
  valid_from        TIMESTAMPTZ NOT NULL,
  valid_to          TIMESTAMPTZ DEFAULT 'infinity',
  created_by_event  BYTEA NOT NULL,
  is_deleted        BOOLEAN DEFAULT false
)

--- GRANTS — capability-based access control
--- Rebuilt from events where intent_type ∈ {grant_issued, grant_revoked}
grants (
  grant_id          UUID PRIMARY KEY,
  subject_tenant_id UUID NOT NULL REFERENCES tenants,    -- who gets access
  object_node_id    UUID NOT NULL,                       -- what they get access to (node_id)
  capability        TEXT NOT NULL
                    CHECK (capability IN ('READ', 'WRITE', 'TRAVERSE')),
  valid_from        TIMESTAMPTZ NOT NULL,
  valid_to          TIMESTAMPTZ DEFAULT 'infinity',
  created_by_event  BYTEA NOT NULL,
  UNIQUE(subject_tenant_id, object_node_id, capability, valid_from)
)

--- BLOBS — binary storage (supporting, not event-projected)
blobs (
  blob_id           UUID PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants,
  content_type      TEXT NOT NULL,
  storage_ref       TEXT NOT NULL,                       -- path/key in object storage
  size_bytes        BIGINT NOT NULL,
  node_id           UUID NULLABLE,                       -- optional link to a node
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by_event  BYTEA NOT NULL
)

--- DICTS — reference data (supporting, bitemporal)
dicts (
  dict_id           UUID PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants,
  type              TEXT NOT NULL,
  key               TEXT NOT NULL,
  value             JSONB NOT NULL,
  valid_from        TIMESTAMPTZ DEFAULT now(),
  valid_to          TIMESTAMPTZ DEFAULT 'infinity',
  UNIQUE(tenant_id, type, key, valid_from)
)
```

**Table summary: 8 tables across 3 layers + supporting**

| Layer       | Table      | Role                             | Mutable?                 |
| ----------- | ---------- | -------------------------------- | ------------------------ |
| A: Ontology | tenants    | Isolation boundary               | Config only              |
| A: Ontology | type_nodes | Schema registry (types as nodes) | Append new versions only |
| B: Events   | events     | Single source of truth           | **Never. Append only.**  |
| C: Facts    | nodes      | Projected entity state           | Rebuilt from events      |
| C: Facts    | edges      | Projected relationships          | Rebuilt from events      |
| C: Facts    | grants     | Projected access control         | Rebuilt from events      |
| Supporting  | blobs      | Binary storage metadata          | Append only              |
| Supporting  | dicts      | Reference data                   | Append new versions only |

### 2.4 Embedding strategy

```yaml
trigger: on node projection (after event processing), queue async embedding job
input: concatenate(type_node.name, " ", JSON.stringify(node.data))
storage: nodes.embedding column
search: cosine similarity function (database-native)
decisions_for_gen1:
  - "[DECIDE:gen1] Embedding model and dimensions"
  - "[DECIDE:gen1] Embed edge data? Recommendation: no for gen1"
constraints:
  - Embedding generation MUST be async (not in the event processing path)
  - Search latency target: <100ms p95 at 100K nodes
```

### 2.5 Epistemic status

Nodes carry an `epistemic_status` indicating confidence level:

```yaml
HYPOTHESIS:
  meaning: "AI-proposed or unverified data"
  example: capture_thought creates a node → HYPOTHESIS
  transitions_to: VERIFIED (human reviews), CONFIRMED (external system confirms)

VERIFIED:
  meaning: "Human has reviewed and accepted"
  example: User approves a captured lead → VERIFIED
  transitions_to: CONFIRMED (system-of-record confirms)

CONFIRMED:
  meaning: "Confirmed by authoritative source"
  example: Invoice matched by accounting system → CONFIRMED
  transitions_to: (terminal state, corrections via new events)
```

Status changes are events (`status_changed` intent_type). The projection updates `epistemic_status` accordingly.

---

## 3. THE 8 GOLDEN INVARIANTS

These rules are non-negotiable. Every tool, every projection function, every RLS policy must enforce them.
Violations are bugs.

```yaml
INV-1 Identity Persistence:
  rule: "A node_id NEVER changes meaning or tenant."
  enforcement: node_id is assigned at genesis event and is immutable.
  violation_example: Reassigning a node_id to a different entity type.

INV-2 No Overlaps:
  rule: "At most one active truth per node_id at any point in time."
  enforcement: EXCLUDE constraint on (node_id, tstzrange(valid_from, valid_to)).
  violation_example: Two active versions of the same node with overlapping valid ranges.

INV-3 Typed Edges:
  rule: "Every edge MUST reference a predicate_node_id (a type_node of kind='predicate')."
  enforcement: FK constraint + application validation.
  violation_example: An edge with a free-text relationship type not backed by a type_node.

INV-4 Core vs Payload:
  rule: "Business logic, relationships, and structural data NEVER live in JSON payload. Only metadata and ornamentik."
  enforcement: Code review + schema validation. Relationships = edges. Types = type_nodes. Status = epistemic_status column.
  violation_example: Storing {"related_to": "node-xyz"} in node.data instead of creating an edge.
  clarification: |
    ALLOWED in data: display_name, description, phone_number, address, custom_fields
    NOT ALLOWED in data: status (use epistemic_status), links (use edges), type (use type_node_id)

INV-5 Drift Guard:
  rule: "propose_event rejects events where effective_from deviates more than [DECIDE:gen1 threshold] from submission time."
  enforcement: Server-side check at event ingestion.
  rationale: Prevents backdating attacks and clock-skew exploitation.
  exception: Events with explicit backdating permission in actor's grant scope.

INV-6 Logic Pinning:
  rule: "Every event records its transition_logic_version. Projections use the version recorded in the event, not the current version."
  enforcement: Projection functions accept logic_version as parameter.
  rationale: Guarantees deterministic replay. An event from v1 logic always projects the same way, even when v2 logic exists.

INV-7 Epistemisk Förgrening (gen2+):
  rule: "The system MAY support forks in the event chain to represent conflicting truths from different actors."
  enforcement: gen1 = linear chains only (single prev_hash per stream). gen2 = branching support.
  rationale: Two agents may record contradictory facts. The system stores both; resolution is a separate event.
  gen1_scope: "LINEAR CHAINS ONLY. This invariant is defined but not implemented until gen2."

INV-8 Hash Lineage:
  rule: "Every event's prev_hash must match the tip of its stream. Chain integrity is verified before acceptance."
  enforcement_write: Tip verification (O(1)) on every propose_event call.
  enforcement_audit: Full chain verification (O(n)) via verify_lineage tool, on-demand.
  rationale: Tamper detection. If any event in the chain is modified, all subsequent hashes break.
```

---

## 4. MCP TOOL INTERFACE

### 4.1 Design principles

```yaml
1. Event Primacy: Every mutation passes through propose_event internally. No direct writes to fact tables.
2. Outcome over operation: Agent-facing tools are goal-oriented. Agents call store_entity, not propose_event.
3. Flat arguments: Top-level primitives. No nested dicts as params.
4. 5-15 tools total: Curate ruthlessly.
5. Every mutation returns the projected result: No follow-up read needed.
6. Errors enable self-correction: Error messages tell the agent what went wrong and how to fix it.
7. Grant-filtered results: All query results are filtered through the grants table via RLS.
```

References:

* [https://www.philschmid.de/mcp-best-practices](https://www.philschmid.de/mcp-best-practices)
* [https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)

### 4.2 Tool architecture

```
Agent-facing tools (high-level, outcome-oriented):
  store_entity  ──┐
  connect_entities ├──→  propose_event (internal primitive)  ──→  event written
  remove_entity ──┤                                              ──→  fact tables projected
  grant_access  ──┘

Raw event tool (power-user / system-to-system):
  propose_event ──→  validates, hashes, signs, writes  ──→  projects to fact tables

Query tools (read from projected fact tables, filtered by grants):
  find_entities, explore_graph, query_at_time, get_timeline

Audit tools:
  verify_lineage

Discovery tools:
  get_ontology, get_stats

Capture tools:
  capture_thought
```

### 4.3 Mutation tools

```yaml
store_entity:
  description: "Create or update an entity. Internally constructs and proposes an event."
  params:
    entity_type: string            # type_node name, e.g. "lead", "booking"
    data: object                   # entity fields as flat JSON (ornamentik only, see INV-4)
    entity_id: string?             # if provided: update (new version). if omitted: create.
    effective_from: datetime?      # business time (default: now). subject to Drift Guard (INV-5).
    tenant_id: string?             # required only if token spans multiple tenants
    epistemic_status: string?      # "HYPOTHESIS" (default), "VERIFIED", or "CONFIRMED"
  returns:
    entity_id: string
    entity_type: string
    data: object
    epistemic_status: string
    valid_from: datetime
    event_hash: string             # the event that created this state
    previous_event_hash: string?   # null on create
  internal_flow:
    1. Resolve type_node for entity_type in tenant
    2. Validate data against type_node.schema (if schema defined)
    3. Construct event payload with intent_type "entity_created" or "entity_updated"
    4. Call propose_event internally
    5. Project event to nodes table
    6. Queue async embedding generation
    7. Return projected entity

connect_entities:
  description: "Create a typed relationship. Works across tenant boundaries if grants allow."
  params:
    predicate: string              # type_node name of kind='predicate', e.g. "contacted_via"
    source_id: string
    target_id: string
    data: object?                  # optional edge metadata (ornamentik only)
    effective_from: datetime?
  returns:
    edge_id: string
    predicate: string
    source: { entity_id, entity_type, tenant_id }
    target: { entity_id, entity_type, tenant_id }
    is_cross_tenant: boolean
    event_hash: string
  internal_flow:
    1. Resolve predicate type_node (INV-3: must exist, kind='predicate')
    2. Verify source and target nodes exist and are accessible (grants check)
    3. For cross-tenant: verify grants for both tenants
    4. Construct event with intent_type "edge_created"
    5. Call propose_event → project to edges table

remove_entity:
  description: "Soft-delete an entity. Creates a removal event. Entity remains in history."
  params:
    entity_id: string
    effective_from: datetime?
  returns:
    removed: true
    entity_type: string
    event_hash: string
  internal_flow:
    1. Construct event with intent_type "entity_removed"
    2. Call propose_event → project: set is_deleted=true, valid_to=effective_from on current version

grant_access:
  description: "Grant a tenant capability on a specific node. Creates a grant event."
  params:
    subject_tenant_id: string      # who gets access
    object_entity_id: string       # what they get access to
    capability: string             # "READ", "WRITE", or "TRAVERSE"
    valid_from: datetime?
    valid_to: datetime?            # optional expiry
  returns:
    grant_id: string
    event_hash: string
  internal_flow:
    1. Verify caller has admin/owner authority on object_entity_id's tenant
    2. Construct event with intent_type "grant_issued"
    3. Call propose_event → project to grants table
```

### 4.4 The raw event tool

```yaml
propose_event:
  description: "Submit a raw event to the system. Handles JCS canonicalization, SHA-256 hashing, Ed25519 signing, tip verification, and projection. For advanced use cases and system-to-system integration."
  params:
    stream_id: string              # the entity this event belongs to
    intent_type: string            # references a type_node of kind='event_type'
    payload: object                # event data
    effective_from: datetime       # business time
    tenant_id: string?
  returns:
    event_hash: string
    prev_hash: string?
    stream_id: string
    projected_changes: object      # what changed in fact tables as a result
  internal_flow:
    1. Look up current tip for stream_id (latest event_hash)
    2. Construct canonical_payload: { stream_id, tenant_id, prev_hash, actor_id, intent_type, payload, effective_from, transition_logic_version }
    3. JCS-canonicalize (RFC 8785) → deterministic bytes
    4. event_hash = SHA-256(jcs_bytes)
    5. signature = Ed25519.sign(event_hash, actor_key)
    6. Verify prev_hash matches tip (INV-8)
    7. Verify effective_from within drift threshold (INV-5)
    8. INSERT into events table
    9. Run projection: apply transition logic (pinned to transition_logic_version, INV-6) → update fact tables
    10. Return event_hash + projected changes
  error_codes:
    STALE_PREV_HASH: "Stream has advanced since you last read it. Re-fetch tip and retry."
    DRIFT_EXCEEDED: "effective_from too far from current time. Max allowed drift: [threshold]."
    INVALID_INTENT: "intent_type does not match any type_node of kind='event_type' in tenant."
    SCHEMA_VIOLATION: "payload does not match schema for intent_type."
    UNAUTHORIZED: "Actor lacks required capability for this operation."
```

### 4.5 Query tools

```yaml
find_entities:
  description: "Search entities by semantic similarity, structured filters, or both. Results filtered by grants."
  params:
    query: string?                 # semantic search via embeddings. omit for structured-only.
    entity_types: string[]?        # filter by type_node names
    filters: object?               # field-level filters on node.data
    tenant_id: string?
    epistemic_status: string?      # filter by status: "HYPOTHESIS", "VERIFIED", "CONFIRMED"
    limit: int?                    # default 10, max 100
    sort_by: string?               # "relevance" | "created_at" | field name
  returns:
    results: [{ entity_id, entity_type, data, epistemic_status, similarity?, valid_from }]
    total_count: int
  notes: RLS policies JOIN against grants table. Caller only sees entities they have READ grant for (or own-tenant entities).

explore_graph:
  description: "Traverse relationships from a starting entity. Results filtered by grants. Inaccessible nodes are silently omitted."
  params:
    start_id: string
    predicates: string[]?          # filter by predicate type_node names. omit for all.
    direction: "outgoing" | "incoming" | "both"?
    depth: int?                    # default 1, max 5
    include_data: boolean?         # default true
    filters: object?
  returns:
    center: { entity_id, entity_type, data, epistemic_status }
    connections: [{
      edge_id, predicate, direction,
      entity: { entity_id, entity_type, data, epistemic_status, tenant_id },
      depth: int
    }]

query_at_time:
  description: "Bitemporal point-in-time query. 'What was true then?' (business time) and 'What did we know then?' (system time)."
  params:
    entity_id: string
    valid_at: datetime             # business time
    recorded_at: datetime?         # system time (default: now)
  returns:
    entity_id: string
    entity_type: string
    data: object
    epistemic_status: string
    valid_from: datetime
    valid_to: datetime
    created_by_event: string       # event_hash that produced this version

get_timeline:
  description: "Chronological history: all events in a stream + all projected versions."
  params:
    entity_id: string
    include_related_events: boolean?
    time_range: { from: datetime?, to: datetime? }?
    limit: int?
  returns:
    entity: { entity_id, entity_type, current_data, epistemic_status }
    timeline: [{
      event_hash: string,
      intent_type: string,
      effective_from: datetime,
      payload: object,
      actor_id: string,
      projected_state: object?     # the node state after this event
    }]
```

### 4.6 Audit tools

```yaml
verify_lineage:
  description: "Verify the SHA-256 hash chain for a stream. Returns integrity report."
  params:
    stream_id: string
    full_audit: boolean?           # default false. true = re-compute every hash + verify signatures (slow).
  returns:
    stream_id: string
    chain_length: int
    is_valid: boolean
    genesis_hash: string
    tip_hash: string
    breaks: [{ position: int, expected_hash: string, actual_hash: string }]?
    signature_failures: [{ event_hash: string, actor_id: string }]?
```

### 4.7 Discovery tools

```yaml
get_ontology:
  description: "Discover all type_nodes (entity types, predicates, event types) in a tenant. Use this first to understand the graph's vocabulary."
  params:
    tenant_id: string?
  returns:
    entity_types: [{ name, schema, node_count, epistemic_breakdown: { hypothesis, verified, confirmed } }]
    predicates: [{ name, schema, edge_count }]
    event_types: [{ name, event_count, last_occurred_at }]

get_stats:
  description: "Dashboard-level statistics: totals, activity, data freshness, chain health."
  params:
    tenant_id: string?
  returns:
    totals: { nodes, edges, events, grants, blobs }
    by_type: { [type_name]: count }
    recent_activity: [{ intent_type, count_last_7d, last_occurred_at }]
    chain_health: { total_streams, last_verified_at, known_breaks: int }
    data_freshness: { newest_event, oldest_unembedded_node }
```

### 4.8 Capture tool

```yaml
capture_thought:
  description: "Free-text input → structured extraction → entities + edges created automatically. All created as HYPOTHESIS epistemic status."
  params:
    content: string
    source: string?                # "slack", "email", "manual", "agent"
    tenant_id: string?
  returns:
    created_node: { entity_id, entity_type, data, epistemic_status: "HYPOTHESIS" }
    extracted_entities: [{ entity_id, entity_type, relationship, is_new }]
    action_items: string[]?
    event_hashes: string[]         # all events created by this capture
  internal_flow:
    1. Fetch tenant's type_nodes (available entity and predicate types + schemas)
    2. Call LLM to extract: type classification, structured fields, mentioned entities, action items
    3. For primary entity: call store_entity (→ propose_event internally) with epistemic_status="HYPOTHESIS"
    4. For each mentioned entity: find existing (via find_entities) or create new (HYPOTHESIS)
    5. Create edges via connect_entities for each relationship
    6. Return all created entities and their event hashes
```

### 4.9 Utility tools

```yaml
store_blob:
  params: { data_base64: string, content_type: string, related_entity_id: string? }
  returns: { blob_id, content_type, size_bytes, event_hash }

get_blob:
  params: { blob_id: string }
  returns: { blob_id, content_type, data_base64 }

lookup_dict:
  params: { dict_type: string, key: string?, valid_at: datetime? }
  returns: { entries: [{ key, value, valid_from, valid_to }] }
```

### 4.10 Resources (read-only MCP resources)

```yaml
resonansia://tenants:
  description: "Tenants accessible to current token"

resonansia://ontology/{tenant_id}:
  description: "Full type graph of a tenant (same as get_ontology)"

resonansia://entity/{entity_id}:
  description: "Full entity with connections, events, and epistemic status"

resonansia://stats/{tenant_id}:
  description: "Dashboard statistics (same as get_stats)"

resonansia://stream/{stream_id}:
  description: "Full event stream for an entity (same as get_timeline)"
```

### 4.11 Prompts

```yaml
analyze_entity:
  description: "Summarize entity state, epistemic confidence, patterns, and suggested next actions"
  args: { entity_id: string }

find_path:
  description: "Find and explain the shortest path between two entities through the graph"
  args: { from_id: string, to_id: string }

temporal_diff:
  description: "Compare entity state at two points in time, explain what changed and why"
  args: { entity_id: string, time_a: datetime, time_b: datetime }

verify_trust:
  description: "Assess data quality: check lineage integrity, epistemic status distribution, actor diversity"
  args: { entity_id: string }
```

**Total: 14 tools** (4 mutation + 1 raw event + 4 query + 1 audit + 2 discovery + 1 capture + 3 utility). Within the 5-15 recommended range when utility tools are excluded from the count.

## 5. AUTH MODEL

Authentication (who you are) uses OAuth 2.1 tokens. Authorization (what you can access) uses grants in the database.

### 5.1 Two-layer auth

```yaml
Layer 1 — Authentication (token):
  mechanism: OAuth 2.1 JWT
  identifies: actor_id, tenant memberships, token type
  validates: "Is this actor who they claim to be?"

Layer 2 — Authorization (grants table):
  mechanism: RLS policies that JOIN grants table
  controls: "Can this actor READ/WRITE/TRAVERSE this specific node?"
  benefits:
    - Dynamic: grant changes take effect immediately (no token re-issue)
    - Auditable: every grant is an event with full history
    - Temporal: grants have valid_from/valid_to (time-limited access)
```

### 5.2 Token structure

```yaml
claims:
  sub: string          # actor_id (user or agent identity)
  iss: string          # token issuer
  aud: string          # "resonansia-mcp"
  tenant_ids: string[] # tenants this actor belongs to (fast filter)
  actor_type: string   # "user" | "agent" | "partner" | "system"
  exp: int             # expiration
  # NOTE: fine-grained permissions are NOT in the token.
  # They live in the grants table and are checked via RLS.
```

### 5.3 Permission resolution (every tool call)

```
1. Validate token (signature, expiration, audience)
2. Extract actor_id and tenant_ids from token
3. For mutations: verify actor has WRITE grant on target node(s)
4. For queries: RLS automatically filters results by READ grants
5. For traversals: RLS checks TRAVERSE grant at each hop
6. Cross-tenant: grants must exist for each tenant involved
7. Every tool call → audit event: { actor_id, tool, params_hash, result_status }
```

### 5.4 RLS policy pattern

```sql
--- Example: nodes table RLS
--- Actor can see a node if:
---   (a) node belongs to actor's tenant, OR
---   (b) a valid grant exists for actor's tenant on this node with READ capability
CREATE POLICY nodes_read ON nodes FOR SELECT USING (
  tenant_id = ANY(current_setting('app.tenant_ids')::uuid[])
  OR EXISTS (
    SELECT 1 FROM grants
    WHERE grants.object_node_id = nodes.node_id
      AND grants.subject_tenant_id = ANY(current_setting('app.tenant_ids')::uuid[])
      AND grants.capability IN ('READ', 'WRITE', 'TRAVERSE')
      AND grants.valid_from <= now()
      AND grants.valid_to > now()
  )
);
```

### 5.5 Token types

```yaml
user_token:
  actor_type: "user"
  issued_by: platform auth provider
  lifetime: short (1h), refreshable
  grants: determined by user's role in tenant (admin, member, viewer)

agent_token:
  actor_type: "agent"
  issued_by: platform admin or API
  lifetime: medium (24h), non-refreshable
  grants: specific to agent's purpose (e.g. sales_agent gets READ on 3 tenants + WRITE on leads)

partner_token:
  actor_type: "partner"
  issued_by: tenant admin
  lifetime: long (30d), auto-expires, non-refreshable
  grants: READ-only on specific entity types, TRAVERSE on specific predicates

system_token:
  actor_type: "system"
  issued_by: platform infrastructure
  lifetime: short (5m), auto-rotated
  grants: full access (for projection workers, embedding pipeline, etc.)
```

### 5.6 Auth decisions

```yaml
- "[DECIDE:gen1] Token format: stateless JWT vs opaque + introspection"
  recommendation: JWT for gen1, introspection for gen2+

- "[DECIDE:gen1] Ed25519 key management: how are actor keys stored and distributed?"
  options: ["derived from auth token seed", "key table in database", "external key management service"]
  recommendation: key table in database for gen1 (simplest). Each actor has a key pair.

- "[DECIDE:gen1] Auth provider integration: build custom vs integrate existing"
  recommendation: integrate with deployment platform's auth for user tokens. Custom JWT for agent/partner tokens.

- "[DECIDE:gen1] System token issuance: how does the projection worker authenticate?"
  recommendation: service account with pre-provisioned key pair and full grants.
```

...

```
```
