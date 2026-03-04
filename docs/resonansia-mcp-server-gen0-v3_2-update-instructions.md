# UPDATE INSTRUCTIONS FOR RESONANSIA MCP SERVER GEN 0 SPEC (v3)

You are updating the spec file `resonansia-mcp-server-gen0-spec-v3_2.md`. Apply all changes below exactly. Do not add features, do not reorganize sections, do not change anything not listed here. Each change has a rationale — read it before editing so you understand context, but do not include the rationale in the spec itself.

---

## CHANGE 1: Fix the nodes table — composite primary key for bitemporality

**Problem:** The current `nodes` table has `node_id UUID PRIMARY KEY`. This means only one row per node can exist. But the spec promises bitemporal versioning (`valid_from`/`valid_to`), which requires multiple rows per `node_id` — one per version. A single-column PK makes this impossible without UPDATE (which violates event-sourcing philosophy).

**Location:** Section 2.1, Table 3: NODES (currently lines ~158–172)

**Replace the entire nodes table definition with:**

```sql
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
```

**Also update** the note after the `dicts` table (currently line ~234) — change:

> Type nodes are regular nodes whose `type_node_id` points to a bootstrap "metatype" node.

to:

> Type nodes are regular nodes whose `type_node_id` points to a bootstrap "metatype" node. Since `nodes` has a composite PK `(node_id, valid_from)`, FKs referencing nodes (in `edges`, `grants`, `blobs`) reference `node_id` only — they point to the entity identity, not a specific version. The EXCLUDE constraint guarantees at most one active version per `node_id` at any point in time.

---

## CHANGE 2: Add EXCLUDE constraint to edges table

**Problem:** Edges also have `valid_from`/`valid_to` but no constraint preventing overlapping time ranges for the same edge. This is the same problem as nodes.

**Location:** Section 2.1, Table 4: EDGES (currently lines ~174–191)

**Add these lines before the closing `)` of the edges table:**

```sql
  -- Prevent overlapping valid ranges for the same edge:
  EXCLUDE USING gist (
    edge_id WITH =,
    tstzrange(valid_from, valid_to) WITH &&
  )
```

---

## CHANGE 3: Formalize invariant rules with IDs and enforcement

**Problem:** The invariant rules (section 2.2) are a numbered list with short descriptions. They need unique IDs for referencing in code/tests, and enforcement methods so gen1 knows HOW to implement them, not just WHAT they say.

**Location:** Section 2.2 (currently lines ~236–249)

**Replace the entire content of section 2.2 with:**

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
```

---

## CHANGE 4: Add two tools — `propose_event` and `verify_lineage`

**Problem:** The spec has no way for power users or system integrations to submit raw events. All mutation is hidden behind high-level tools. This blocks system-to-system integration. Additionally, there is no tool to verify event lineage integrity — test T13 checks it at DB level but agents cannot.

**Location:** Section 3.2, after `get_stats` tool and before section 3.3

**Insert this new section between 3.2 and 3.3:**

```yaml
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
```

**Update the tool count line** (currently "**Total: 13 tools** (10 primary + 3 utility)") to:

```
**Total: 15 tools** (12 primary + 3 utility). Within the recommended 5-15 range.
```

**Update artifact_2_tools** in section 8.1 — change "All 13 tool implementations" to "All 15 tool implementations".

**Update section 8.2 gen1 success criteria** — in the `target` block, add after "All 13 tools working":
```
  - propose_event and verify_lineage functional for system integration
```
And change "All 13 tools working" to "All 15 tools working".

---

## CHANGE 5: Add acceptance test T14 for verify_lineage

**Location:** Section 7.6, after test T13_event_primacy

**Add:**

```yaml
T14_verify_lineage:
  agent: any
  precondition: Multiple entities created via store_entity and capture_thought
  call: verify_lineage(entity_id=LEAD_ID)
  expect: is_valid=true, orphaned_facts=[], event_count > 0
  validates: event lineage integrity check via tool (not just DB-level)
```

**Update** section 8.2 — change "All T01-T13 passing" to "All T01-T14 passing" (appears twice: in `target` and in the sentence about artifact_7_tests).

**Update** artifact_7_tests in section 8.1 — change "All T01-T13 tests" to "All T01-T14 tests" and "All 13 tests pass" to "All 14 tests pass".

---

## CHANGE 6: Add resource for event stream

**Location:** Section 3.4 Resources

**Add after `resonansia://stats/{tenant_id}`:**

```yaml
resonansia://stream/{entity_id}:
  description: "Full event stream for an entity (same as get_timeline tool)"
```

---

## CHANGE 7: Document the crypto deferral explicitly

**Problem:** The spec defers cryptographic event chains (hash-linking, signatures) to gen3 but doesn't explain why or what the future design looks like. This risks the deferral being forgotten or re-invented from scratch.

**Location:** Section 5.3, after the gen3 line in the federation scope table

**Add this paragraph after the `gen3` line in the yaml block (inside the gen3 list):**

```yaml
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

---

## CHANGE 8: Add auth trade-off documentation for scopes vs grants

**Problem:** The auth model puts granular scopes in JWT tokens (e.g. `tenant:T1:nodes:lead:write`) AND has a grants table. The interaction and trade-offs between these two layers are not clearly explained. An implementing agent needs to understand when to check which.

**Location:** Section 4.5 "Grants vs Scopes" (currently lines ~629–636)

**Replace the current content of section 4.5 with:**

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
```

---

## CHANGE 9: Add a MCP Resource for event stream and a prompt for trust verification

**Location:** Section 3.5 Prompts

**Add after `temporal_diff`:**

```yaml
verify_trust:
  description: "Assess data quality: check event lineage integrity, epistemic status distribution, and actor diversity for an entity"
  args: { entity_id: string }
```

## CHANGE 10: Make the graph-native ontology's agent-facing consequence explicit

**Problem:** The spec states that type nodes are regular nodes (principle 2, section 1.1), and the implementation reflects this (type_node_id references the nodes table, metatype is self-referential). But the spec never spells out *why this matters for agents* — the key consequence is that an agent can discover and learn the schema using the exact same tools it uses to explore data (`explore_graph`, `find_entities`). This property is fragile: if gen1 implements `get_schema` as a hardcoded SQL query against a separate view instead of querying the graph, the reflexive property is silently lost. It needs to be protected.

**Location:** Section 1.1, principle 2 (currently line ~61)

**Replace:**

```
2. **Graph-native Ontology** — The schema is part of the graph. Entity types, relationship types, and event types are first-class nodes (`type_nodes`), not a separate registry table. To understand what a "booking" is, you traverse its type node.
```

**With:**

```
2. **Graph-native Ontology** — The schema is part of the graph. Entity types, relationship types, and event types are first-class nodes (`type_nodes`), not a separate registry table. To understand what a "booking" is, you traverse its type node. Critical consequence: an agent can use the same tools to learn the schema as it uses to learn the data. `explore_graph(start_id=METATYPE_NODE)` returns all type nodes. `find_entities(entity_types=["type_node"])` searches type definitions by name or content. `get_schema` is a convenience wrapper — it MUST query the graph internally, not a separate registry. No generation may break this reflexive property.
```

**Location:** Section 3.2, `get_schema` tool (currently lines ~490–497)

**Replace:**

```yaml
get_schema:
  description: "Discover what entity types, relationship types, and event types exist in a tenant. Returns type nodes. Use this first to understand the data model before querying."
  params:
    tenant_id: string?
  returns:
    entity_types: [{ name, schema, node_count, example_fields, type_node_id }]
    edge_types: [{ name, schema, edge_count, type_node_id }]
    event_types: [{ name, event_count, last_occurred_at }]
```

**With:**

```yaml
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
```

**Location:** Section 3.1, design principle 7 (currently line ~321)

**After the existing principle 7:**

```yaml
7. **Epistemic defaults** — `capture_thought` creates `hypothesis` entities. `store_entity` creates `asserted` entities. Agents can promote status explicitly.
```

**Add a new principle 8:**

```yaml
8. **Reflexive ontology** — Type nodes are queryable through the same tools as data nodes. An agent that knows how to `explore_graph` already knows how to discover the schema. `get_schema` is a convenience shortcut, not a separate system. Gen1 must not introduce a parallel type registry that diverges from the graph.
```

## SUMMARY OF ALL CHANGES

| # | Section | What changed | Why |
|---|---------|-------------|-----|
| 1 | 2.1 nodes table | Composite PK `(node_id, valid_from)` + EXCLUDE constraint | Enable actual bitemporal versioning without UPDATEs |
| 2 | 2.1 edges table | EXCLUDE constraint on `(edge_id, tstzrange)` | Prevent overlapping edge versions |
| 3 | 2.2 invariants | Added INV-IDs, enforcement methods, violation examples | Make invariants testable and referenceable in code |
| 4 | 3.2 tools | Added `propose_event` and `verify_lineage` tools | System integration + lineage auditing |
| 5 | 7.6 tests | Added T14_verify_lineage | Test the new verify_lineage tool |
| 6 | 3.4 resources | Added `resonansia://stream/{entity_id}` | Expose event stream as MCP resource |
| 7 | 5.3 federation | Documented crypto chain deferral with design reference | Prevent design loss across generations |
| 8 | 4.5 auth | Expanded scopes vs grants trade-off documentation | Help gen1 understand when to check which layer |
| 9 | 3.5 prompts | Added `verify_trust` prompt | Complement verify_lineage tool with agent-facing prompt |

After applying all changes, verify that all cross-references are consistent: tool count (15), test count (T01-T14), and artifact descriptions match the updated content.
