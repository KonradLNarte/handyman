# The Missing Infrastructure Layer: Federated Knowledge Graphs for AI Agents

**A White Paper on Building Shared, Temporal, Trustworthy Memory for Multi-Agent Systems**

March 2026 | Resonansia Project | Apache 2.0

---

## Abstract

AI agents are rapidly moving from single-task assistants to autonomous collaborators that operate across organizational boundaries, maintain persistent knowledge, and make decisions based on accumulated context. Yet the infrastructure beneath them remains primitive: agents store memories in flat JSON files, share data through copy-paste, lose all temporal context, and have no mechanism to distinguish between facts they inferred and facts that were verified.

This paper identifies five fundamental infrastructure gaps that prevent AI agents from operating as reliable knowledge workers: (1) there is no standard way for agents to maintain a structured, queryable knowledge graph; (2) multi-tenant isolation and cross-tenant federation are unsolved in the MCP ecosystem; (3) existing agent memory systems discard temporal context; (4) AI-generated data is stored with the same authority as human-verified data; and (5) agents cannot discover what data exists in a system without hardcoded knowledge of the schema.

We present Resonansia, an open-source federated MCP server that addresses all five gaps simultaneously through a novel combination of event-sourced bitemporal data, graph-native reflexive ontology, epistemic status tracking, capability-based federation, and AI-native data ingestion. We argue that these are not independent features but an interlocking set of architectural primitives that must be solved together.

---

## 1. The Problem Space: What's Missing Under AI Agents

### 1.1 The Memory Crisis

When an AI agent finishes a conversation, what does it remember? In most systems: nothing. The agent's knowledge evaporates with the session. The few systems that do persist agent memory — Mem0, Graphiti, the reference MCP memory server — store it as flat records, key-value pairs, or unstructured text blobs.

This creates a fundamental gap between what agents can *do* (reason, plan, collaborate) and what they can *remember* (almost nothing, structured poorly). A sales agent that spoke with 200 leads cannot query "which leads mentioned both football and cabin rentals?" without semantic search over a structured knowledge graph. A booking agent cannot answer "what did this customer's reservation look like before it was modified?" without bitemporal versioning.

The existing landscape illustrates the gap:

| Capability | Graphiti/Zep | Neo4j MCP | Open Brain | Mem0 | What's Needed |
|---|---|---|---|---|---|
| Generalized knowledge graph | Partial | Yes | No | Partial | **Yes** |
| Bitemporal data model | Partial | No | No | No | **Yes** |
| Event sourcing / immutable audit | No | No | No | No | **Yes** |
| Multi-tenancy (RLS) | group_id only | No | No | No | **Yes** |
| Cross-tenant federation | No | No | No | No | **Yes** |
| Graph-native ontology | No | Partial | No | No | **Yes** |
| Epistemic status tracking | No | No | No | No | **Yes** |
| Capability-based access | No | No | No | No | **Yes** |

No existing system combines all of these. Each addresses a slice of the problem — Graphiti handles temporal knowledge well, Neo4j provides graph queries, Mem0 offers convenient memory storage — but none provides the complete infrastructure layer that production multi-agent systems require.

### 1.2 Five Specific Gaps

**Gap 1: No structured, queryable knowledge graph accessible via MCP.**
Agents need to store entities (people, companies, bookings, products) with typed relationships between them, queryable by both structured filters and semantic similarity. Current MCP memory servers store flat records — documents, not graphs. When an agent needs to find "all customers who booked a cabin AND attended a football match," there is no way to express this as a graph traversal.

**Gap 2: Multi-tenancy and cross-tenant federation are unsolved.**
Real businesses have organizational boundaries. A holding company's three subsidiaries each need isolated data, but also need controlled sharing — the event company's marketing campaign sells the ticket company's packages, which include the cabin company's properties. No existing MCP server supports tenant isolation with Row-Level Security, let alone controlled federation between tenants.

**Gap 3: Agent memory systems discard temporal context.**
When an entity changes, current systems overwrite the old value. The history — what was true when, what the system knew when — is lost. But agents regularly need temporal queries: "What did this customer's profile say before the February update?" or "Show me everything that changed in the last week." Without bitemporality (tracking both business time and system time), these questions are unanswerable.

**Gap 4: AI-generated data has no provenance tracking.**
When an LLM extracts "Johan wants 20 football tickets" from a free-text note, that data has fundamentally different reliability than "Johan" entered manually by a salesperson, which in turn differs from "Johan Eriksson, personnummer 850101-1234" verified against a government ID. Yet all three are stored as equally authoritative records. Agents making decisions downstream — should we send Johan an invoice? — have no way to assess the trustworthiness of the data they're acting on.

**Gap 5: Agents cannot discover the schema at runtime.**
When an agent connects to a knowledge graph, how does it learn what entity types exist? What relationships are possible? What fields does a "booking" have? In most systems, this knowledge must be hardcoded into the agent's prompt. If a new entity type is created (a seasonal pricing model, a partner commission structure), existing agents don't discover it — someone must update their prompts.

### 1.3 Why These Must Be Solved Together

These gaps are not independent feature requests. They form a coherent problem that only has a coherent solution:

- You cannot have meaningful **federation** without **tenant isolation**. Cross-tenant edges require a trust model (grants) that itself requires an audit trail (events), which requires a temporal data model (bitemporality).

- You cannot have trustworthy **AI-generated data** without **epistemic tracking**, which requires an **event-sourced** architecture where every fact is traceable to its origin event.

- You cannot have **runtime schema discovery** without a data model where the schema itself is queryable data — a **reflexive ontology** — which only works if the schema lives in the same **knowledge graph** as the data.

- You cannot have meaningful **temporal queries** without a graph that preserves entity relationships across time, which requires edges and nodes with explicit temporal ranges, which requires an **event-sourced** model where updates create new versions rather than overwriting.

Solving any one of these gaps in isolation produces a system that is architecturally inconsistent. The remainder of this paper describes how Resonansia solves all five simultaneously.

---

## 2. Solution Architecture

### 2.1 Three-Layer Data Model

Resonansia's data model has three layers, each with a distinct responsibility:

```
+-----------------------------------------------+
|  ONTOLOGY LAYER (graph describes itself)       |
|  Type nodes define what kinds of things exist  |
|  Type nodes ARE nodes — queryable, temporal    |
+-----------------------------------------------+
|  EVENT LAYER (immutable truth)                 |
|  Append-only events, never updated/deleted     |
|  Every mutation in the system originates here  |
+-----------------------------------------------+
|  FACT LAYER (materialized projections)         |
|  Nodes, edges, grants — derived from events    |
|  Every row references its creating event       |
+-----------------------------------------------+
```

**The Event Layer** is the single source of truth. The events table is append-only: events are never updated, never deleted. Corrections are modeled as new events that reference the original. This means the full history of every entity — every creation, modification, relationship change, and status transition — is permanently preserved as an immutable audit log.

**The Fact Layer** contains projections of the event stream. The `nodes` table holds entities (people, bookings, properties), the `edges` table holds relationships between them, and the `grants` table holds cross-tenant access permissions. Every row in these tables carries a `created_by_event` foreign key linking it back to the specific event that created it. This is not optional metadata — it is a structural invariant enforced at the database level.

**The Ontology Layer** is what makes the system self-describing. Entity types (lead, booking, campaign), relationship types (includes, sells, booked_at), and event types are all stored as nodes in the graph itself. They are not a separate configuration file or registry table. This means an agent can discover the schema using the same tools it uses to query data — a property we call *reflexive ontology*.

The entire schema fits in **7 tables**: tenants, events, nodes, edges, grants, blobs, dicts. This minimal surface area is deliberate. Every business domain — CRM, property management, ticket sales, project management — maps onto the same generic node-edge-event structure, differentiated only by type nodes.

### 2.2 Event Sourcing with Atomic Projections

Every mutation in the system follows the same flow:

```
1. VALIDATE   — Check permissions, resolve types, verify constraints
2. EXTERNAL   — LLM extraction, deduplication search (if applicable)
3. BEGIN TX   — Start database transaction
4. WRITE EVENT — INSERT into events table
5. PROJECT    — INSERT/UPDATE fact tables (nodes, edges, grants)
6. COMMIT TX  — Commit transaction
7. ASYNC      — Queue embedding generation, notifications
```

The critical property is **atomicity between steps 4 and 5**: the event and its projection are written in the same database transaction. If the projection fails (constraint violation, FK error), the event is rolled back. There are no orphaned events and no eventual consistency between the event layer and the fact layer.

This is a deliberate departure from many event-sourcing implementations that use message queues between events and projections. In those systems, an agent might write data and then immediately read stale results because the projection hasn't caught up. In Resonansia, the moment a tool call returns success, the data is queryable — because the event and its projection were committed atomically.

The one exception is embedding generation (step 7), which happens asynchronously. An entity exists and is queryable via structured filters immediately after creation, but may not appear in semantic search until its embedding is generated (typically within seconds). This trade-off is deliberate: embedding API failures must not prevent entity creation.

### 2.3 Bitemporality: Two Kinds of Time

Every mutable entity in Resonansia tracks two independent timelines:

**Business time** (`valid_from` / `valid_to`): When something was true in reality. A booking's check-in date, a lead's interest level, a property's price — these are facts about the real world that have a specific temporal range.

**System time** (`recorded_at` or UUIDv7 timestamp): When the system learned about the fact. You might discover today that a customer's address changed last month. Business time is "last month." System time is "today."

This dual-timeline model enables two classes of queries that single-timeline systems cannot answer:

- **"What was true then?"** — `query_at_time(entity_id, valid_at="2026-01-15")` returns the entity's state as it existed in business reality on January 15, regardless of when that information was recorded.

- **"What did we know then?"** — Adding `recorded_at="2026-02-01"` further constrains to what the system knew as of February 1. This answers questions like "what data was the agent working with when it made that decision?"

Implementation uses a composite primary key `(node_id, valid_from)` on the nodes table with an `EXCLUDE USING gist` constraint that prevents overlapping valid ranges for the same entity. When an entity is updated, the current version's `valid_to` is set to `now()` and a new version row is inserted with `valid_from = now()` and `valid_to = 'infinity'`. The old version remains permanently in the database, queryable by temporal tools.

UUIDv7 is used for all primary keys, embedding a millisecond-precision timestamp that provides natural chronological ordering without a separate sequence. The `recorded_at` column is technically redundant with UUIDv7's embedded timestamp but is retained for practical reasons: direct indexing, readable queries, and no dependency on timestamp extraction functions not yet standard in PostgreSQL.

---

## 3. Solving Gap 1: The Knowledge Graph

### 3.1 Nodes and Edges

Entities are stored as `nodes` with a JSONB `data` field containing their attributes. Relationships are stored as `edges` connecting a `source_id` to a `target_id` with a typed predicate. Both nodes and edges reference a `type_node_id` that points to the type definition — itself a node in the graph.

This is a labeled property graph where the labels (types) are stored inside the graph rather than as external metadata. The same `find_entities` tool that searches for "leads interested in football" can search for "entity types related to sales."

### 3.2 Semantic + Structured Search

Every entity is embedded using `text-embedding-3-small` (1536 dimensions) and stored in a `VECTOR` column indexed with pgvector HNSW. The `find_entities` tool supports three search modes:

1. **Semantic only**: `find_entities(query="football fans interested in cabin packages")` — vector similarity search against entity embeddings.
2. **Structured only**: `find_entities(filters={"status": "qualified"})` — JSONB field filters.
3. **Combined**: `find_entities(query="cabin enthusiasts", filters={"status": {"$in": ["qualified", "converted"]}})` — semantic search with structured post-filtering.

Results include similarity scores, epistemic status, and pagination cursors. Embedding generation is asynchronous — entities are immediately queryable by structured filters, and become available for semantic search once their embedding is generated (typically within seconds).

### 3.3 Graph Traversal

The `explore_graph` tool enables multi-hop traversal from any starting entity:

```
explore_graph(
  start_id=PACKAGE_NODE,
  edge_types=["includes"],
  direction="outgoing",
  depth=2
)
```

This returns a subgraph centered on the starting node: all connected entities up to the specified depth, with their types, data, and the relationships connecting them. Traversal respects tenant boundaries — cross-tenant entities are only included if the caller has appropriate grants.

Graph traversal is how agents discover relationships that would be invisible in a flat table. A sales agent can start from a lead, traverse to their bookings, from bookings to properties, from properties to packages — building a complete picture of a customer's engagement across multiple business domains.

---

## 4. Solving Gap 2: Multi-Tenancy and Federation

### 4.1 Tenant Isolation via Row-Level Security

Every row in every table carries a `tenant_id`. PostgreSQL Row-Level Security (RLS) policies ensure that queries can only return data from tenants the caller is authorized to access. This enforcement happens at the database level — even if the application code has a bug, RLS prevents data leaks.

The RLS pattern uses `SET LOCAL 'app.tenant_ids'` to inject the caller's authorized tenant IDs into the database session before each query. All RLS policies reference this session variable:

```sql
CREATE POLICY nodes_select ON nodes FOR SELECT
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::uuid[]));
```

The events table has RLS policies for `SELECT` and `INSERT` only — no `UPDATE` or `DELETE` policies exist, structurally enforcing the append-only invariant at the database level.

### 4.2 Federation Without Data Copying

Federation in Resonansia means controlled data sharing across tenant boundaries — not by copying data between databases, but through three primitives:

**Cross-tenant edges**: An edge where `source_id` belongs to tenant A and `target_id` belongs to tenant B. The edge itself is owned by one tenant. Creating such an edge requires write scope on both tenants and a grant from the target tenant's owner.

**Capability grants**: Explicit, temporal, fine-grained permissions stored in the `grants` table. A grant says: "Tenant B may TRAVERSE node N in tenant A during this time range." Grants are temporal — they expire automatically. They emit events when created or revoked, providing a full audit trail of who was authorized to see what, and when.

**Virtual endpoints**: A single MCP server URL with a multi-tenant JWT token that spans multiple tenants. The agent sees a unified knowledge graph across all authorized tenants, with RLS and grants transparently enforcing per-entity permissions.

### 4.3 Two-Layer Access Control

Access control has two complementary layers:

**Scopes** (in JWT tokens): Coarse-grained, tenant-level. Validated in-memory with no database query. Example: `"tenant:T1:write"` — this agent can write to tenant T1. Scopes can be type-specific: `"tenant:T1:nodes:campaign:read"` limits the agent to reading only campaign entities.

**Grants** (in database): Fine-grained, node-level. Requires database lookup. Example: "Tenant T2 can TRAVERSE the package node in tenant T1." Grants enable cross-tenant graph traversal and data access.

Both layers must pass for an operation to succeed. Scopes are the fast outer gate (in-memory check on every call); grants are the fine-grained inner gate (database lookup only for cross-tenant operations).

### 4.4 A Concrete Federation Scenario

Consider a Swedish holding company (Pettson Holding) with three subsidiaries:

- **Taylor Events** — event production (leads, campaigns, venues)
- **Mountain Cabins** — cabin rentals (properties, bookings, guests)
- **Nordic Tickets** — ticket sales (matches, ticket batches, packages)

Natural cross-tenant relationships emerge:
- A "Midsommar Football & Cabin" package (Nordic Tickets) **includes** a cabin property (Mountain Cabins)
- A "Summer Festival 2026" campaign (Taylor Events) **sells** ticket batches (Nordic Tickets)
- A sales lead (Taylor Events) **also_booked** a cabin (Mountain Cabins)

A sales agent with read access to all three tenants and write access to Taylor Events can:
1. Semantically search for "football fans interested in cabin packages" across Taylor Events leads
2. Traverse from a matching lead to their cabin booking (cross-tenant edge to Mountain Cabins)
3. Traverse from the booking to the cabin property, and from there to available packages (cross-tenant edge to Nordic Tickets)
4. Capture a free-text note about the conversation, which automatically extracts entities and creates relationships

All of this happens through a single MCP connection. The agent doesn't need to know about tenant boundaries — they are transparently enforced by RLS and grants.

---

## 5. Solving Gap 3: Temporal Data

### 5.1 Point-in-Time Queries

The `query_at_time` tool lets agents ask "what did this entity look like at a specific moment?"

```
query_at_time(
  entity_id=LEAD_ID,
  valid_at="2026-01-15T00:00:00Z"
)
```

This returns the lead's data as it existed on January 15 in business reality — even if the system has since recorded updates, corrections, or status changes. The query resolves by finding the node version whose `valid_from <= valid_at < valid_to`.

Adding a `recorded_at` parameter further constrains by system time: "Show me what the system knew about this lead as of February 1." This is essential for audit scenarios where you need to reconstruct the state of knowledge at the time a decision was made.

### 5.2 Entity Timelines

The `get_timeline` tool returns a chronological history of everything that happened to an entity:

```
timeline: [
  { type: "version_change", data: { intent: "entity_created" }, timestamp: "2026-01-01" },
  { type: "edge_created", data: { edge_type: "contacted_via" }, timestamp: "2026-01-15" },
  { type: "version_change", data: { intent: "entity_updated" }, timestamp: "2026-02-01" },
  { type: "epistemic_change", data: { old: "hypothesis", new: "confirmed" }, timestamp: "2026-02-10" }
]
```

Every entry in the timeline references its source event_id, making the complete provenance chain traceable: from the current state, to the event that created it, to the actor who triggered it.

### 5.3 Event Lineage Verification

The `verify_lineage` tool checks the structural integrity of the event-fact relationship for any entity. It verifies that every row in the fact tables references an existing event, and that there are no gaps or orphans in the event stream. This is a runtime health check that agents can use to assess data trustworthiness — a concept we call "verifiable provenance."

---

## 6. Solving Gap 4: Epistemic Status

### 6.1 Three Levels of Certainty

Every node carries an `epistemic` field with one of three values:

**Hypothesis**: "The system inferred this, but it has not been verified by a human." Set automatically by the `capture_thought` tool when an LLM extracts entities from free text. Also used for automated imports from unverified sources.

**Asserted**: "A human or trusted agent explicitly stated this." Set by direct `store_entity` calls — manual data entry, form submissions, or trusted API integrations.

**Confirmed**: "Verified against an authoritative source." Set by explicit confirmation actions — verifying a phone number via SMS, checking an address against a registry, or cross-referencing with an accounting system.

### 6.2 Status Transitions

Epistemic status can only move forward: `hypothesis -> asserted -> confirmed`. There is no backward transition — if a confirmed fact turns out to be wrong, the correction is modeled as a new entity or a new version with its own epistemic status, preserving the full provenance chain.

Status transitions emit dedicated `epistemic_change` events, separate from regular `entity_updated` events. This means the audit trail distinguishes between "the data changed" and "our confidence in the data changed" — two fundamentally different operations.

### 6.3 Impact on Agent Behavior

Epistemic status changes how agents should behave:

- A sales agent sending an outreach email should probably not email a `hypothesis` contact extracted from a quick note — the extraction might be wrong.
- A booking system should require `confirmed` status on a customer's identity before processing payment.
- A reporting dashboard can filter by epistemic status to show "verified data only" vs. "everything including hypotheses."
- Search results can be ranked by epistemic status, prioritizing confirmed facts over hypotheses.

This is not a theoretical feature. In the validation scenario, the system explicitly tests that an entity created via `capture_thought` starts as `hypothesis`, can be promoted to `confirmed` via `store_entity`, and that the promotion emits a distinct event type.

---

## 7. Solving Gap 5: Reflexive Ontology

### 7.1 The Schema Is the Graph

In most knowledge graph systems, entity types are defined externally — in configuration files, hardcoded enums, or a separate metadata database. Resonansia takes a different approach: **entity types are nodes in the graph.**

A type node is a regular node whose `type_node_id` points to a special bootstrap node called the **metatype**. The metatype is self-referential — its own `type_node_id` points to itself, forming the root of the ontology tree.

This means:
- The same `find_entities` tool that searches for "leads named Johan" can search for "entity types related to sales"
- The same `explore_graph` tool that traverses customer relationships can traverse the type hierarchy
- If a new entity type is created via `store_entity`, it immediately appears in schema queries — no sync, no deployment, no prompt updates

The `get_schema` tool is a convenience wrapper that queries "all nodes whose type_node_id is the metatype." It returns entity types with their schemas, edge types, and usage counts. But crucially, it queries the graph — not a separate registry. An agent that knows how to `explore_graph` already knows how to discover the schema.

### 7.2 Type-Aware Schema Validation

Type nodes can carry a `label_schema` field containing a JSON Schema that defines valid attributes for entities of that type. When a type node has a schema, the `store_entity` tool validates entity data against it. Invalid data returns a `SCHEMA_VIOLATION` error with specific validation messages.

This creates a gradient of formality:
- **Fully typed**: The type node defines a schema. Data must conform. Ideal for well-understood entities like bookings, invoices, and contacts.
- **Schema-free**: The type node has no schema. Any JSONB data is accepted. Ideal for exploratory or evolving concepts.
- **Hypothesis exception**: The `capture_thought` tool creates entities with relaxed validation, because LLM-extracted data may not perfectly match schemas. The epistemic status `hypothesis` signals that the data needs human review.

### 7.3 The Bootstrap Problem

A self-referential type system creates a chicken-and-egg problem: how do you create the first type node when type nodes must reference a type node that doesn't exist yet?

The solution uses PostgreSQL's deferred constraints. During database migration:
1. Tables are created without enforcing the self-referencing FK
2. The metatype node is inserted with `type_node_id = node_id` (pointing to itself)
3. The FK constraint is added after the bootstrap node exists

The metatype uses a well-known fixed UUID (`00000000-0000-7000-0000-000000000001`), ensuring deterministic, reproducible bootstrapping across environments. This is the only node created outside the normal event-then-projection flow — every other node in the system, including all subsequent type nodes, is created through the standard tool interface.

---

## 8. AI-Native Data Ingestion: The `capture_thought` Pattern

### 8.1 The Problem with Structured Data Entry

AI agents receive information in natural language. A salesperson says "Met Johan at the cabin fair, he wants 20 tickets for Allsvenskan and a cabin for midsommar." This single sentence contains:

- A new contact entity (Johan)
- A relationship to an event (Allsvenskan)
- A relationship to a product category (tickets)
- A relationship to a product (cabin)
- A quantity (20 tickets)
- A time context (midsommar)
- An implied action item (follow up with Johan)

Forcing the agent to decompose this into separate `store_entity` and `connect_entities` calls loses the natural language fluency that makes AI agents useful. The `capture_thought` tool solves this by accepting free text and automatically extracting structured data.

### 8.2 How It Works

1. **Schema context injection**: The tool fetches the tenant's type nodes (available entity types + their schemas) and provides them to the LLM as context. The LLM knows what kinds of entities exist and what fields they have.

2. **LLM extraction**: A lightweight LLM (gpt-4o-mini) extracts: the primary entity, its type classification, structured fields, mentioned entities, relationships between them, and action items.

3. **Entity deduplication**: For each extracted entity, the system checks whether it already exists before creating a new one. This uses a three-tier approach:
   - **Tier 1 (Exact match)**: Case-insensitive name match. O(1). If found, link to existing entity.
   - **Tier 2 (Embedding similarity)**: Vector search. If cosine similarity > 0.95, auto-link with high confidence.
   - **Tier 3 (LLM disambiguation)**: For the uncertain zone (0.85-0.95 similarity), ask an LLM to determine whether two entities are the same. This handles cases like "Johan" vs. "Johan Eriksson" or "Björnen cabin" vs. "Fjällstugan Björnen."
   - Below 0.85: create a new entity.

4. **Atomic creation**: All extracted entities and edges are created within a single database transaction. If any insert fails, everything rolls back — no partial extractions.

5. **Epistemic marking**: Everything created by `capture_thought` gets epistemic status `hypothesis`. This is automatic and non-overridable. The data is flagged as "AI-inferred, not yet verified."

### 8.3 Deduplication Confidence

The response includes `match_confidence` scores for every linked entity, providing transparency about how the deduplication decision was made. An agent can inspect these scores and decide whether to trust the linkage or investigate further.

In the validation scenario, this is tested explicitly: after creating "Johan" via `capture_thought`, a subsequent call mentioning "Johan Eriksson" must link to the existing entity (not create a duplicate) and return a confidence score above 0.85.

---

## 9. The MCP Interface: Designing Tools for Agents

### 9.1 Design Principles

The MCP tool interface follows principles derived from production experience with agent-facing APIs:

1. **Outcome over operation**: Tools represent what agents want to accomplish, not database operations. `capture_thought` is a single tool that performs LLM extraction, deduplication, entity creation, and edge creation — not four separate tools chained together.

2. **Flat arguments**: No nested objects in parameters. This reduces prompt engineering complexity when agents construct tool calls.

3. **Every mutation emits an event automatically**: The caller never needs to worry about audit trails or event creation — it happens transparently.

4. **Errors enable self-correction**: Error messages include specific, actionable information. `SCHEMA_VIOLATION` tells the agent which fields failed validation and why. `CONFLICT` tells the agent the current version so it can retry.

5. **15 tools total**: Curated to the recommended 5-15 range for MCP servers. Each tool has a single, clear purpose. More tools means agents struggle to choose; fewer means each tool is overloaded with parameters.

### 9.2 Tool Inventory

| Category | Tools | Purpose |
|---|---|---|
| Entity Management | `store_entity`, `find_entities`, `connect_entities`, `explore_graph`, `remove_entity` | CRUD + search + graph traversal |
| Temporal | `query_at_time`, `get_timeline` | Point-in-time queries + entity history |
| AI Capture | `capture_thought` | Free-text to structured data with dedup |
| Discovery | `get_schema`, `get_stats` | Runtime schema + dashboard stats |
| System | `propose_event`, `verify_lineage` | Raw events + integrity checks |
| Utility | `store_blob`, `get_blob`, `lookup_dict` | Binary storage + reference data |

### 9.3 Actor Identity: Who Did What

Every row in the system carries a `created_by` UUID. This is not a raw JWT subject claim — it is the `node_id` of an actor entity in the knowledge graph. Actors are nodes, queryable through the same tools as any other entity.

When a JWT is presented for the first time, the system automatically creates an actor node for that identity in the relevant tenant. Subsequent requests reuse the existing actor node. This means the question "what did Sales Agent do last week?" is answerable through a graph query — traverse from the actor node to all entities where `created_by` matches.

---

## 10. MCP and A2A: The Agent Interoperability Stack

### 10.1 Two Complementary Protocols

The agent ecosystem is converging on two protocols:

- **MCP (Model Context Protocol)**: How agents access tools and data. The agent connects to an MCP server and calls its tools.
- **A2A (Agent2Agent Protocol)**: How agents discover and collaborate with each other. Agents publish their capabilities via AgentCards and delegate tasks between themselves.

These are complementary, not competing. MCP is "agent-to-tool." A2A is "agent-to-agent." A Resonansia tenant is an MCP tool server (agents call its tools) AND could be an A2A-discoverable agent (other agents find it and delegate knowledge management tasks to it).

### 10.2 Architectural Readiness

Resonansia's architecture is designed to support A2A without requiring A2A implementation from day one:

- Tool descriptions are machine-readable (MCP tool schemas with Zod), enabling automatic AgentCard generation from tool metadata.
- Tenant capabilities are introspectable via `get_schema`, providing the raw material for A2A skill descriptions.
- The OAuth 2.1 auth model aligns with A2A's securitySchemes.
- Streamable HTTP transport aligns with A2A's SSE streaming.

Future generations will auto-generate AgentCards per tenant, enabling each Resonansia tenant to be discovered by external agents as a knowledge management service.

### 10.3 The Federation Vision

The long-term vision combines MCP, A2A, and cryptographic event integrity:

- **Gen1**: MCP server with cross-tenant federation via edges and grants
- **Gen2**: A2A AgentCard generation per tenant; consent protocol for automated grant negotiation
- **Gen3**: Cryptographic event chains (SHA-256 hash linking, Ed25519 signatures) enabling trustless federation between separate Resonansia instances; A2A federated mesh where tenants across instances discover each other

The cryptographic event chain is particularly significant: it means a remote Resonansia instance can verify that an event stream has not been tampered with *without trusting the source database*. This is the knowledge graph equivalent of blockchain's tamper-evident ledger, applied to inter-organizational knowledge sharing.

---

## 11. Architectural Invariants

The system enforces 12 invariant rules that no implementation may violate. These serve as both documentation and testable constraints:

| ID | Rule | Enforcement |
|---|---|---|
| INV-TENANT | `tenant_id` on every row | RLS policies on all tables |
| INV-APPEND | Events are append-only | No UPDATE/DELETE RLS policies on events |
| INV-BITEMP | Dual-timeline versioning | EXCLUDE constraint prevents overlapping versions |
| INV-SOFT | Soft deletes only | No DELETE RLS policies on fact tables |
| INV-XTEN | Cross-tenant edges require grants | Application-level + grants table check |
| INV-TYPE | Type nodes are the schema | Metatype bootstrap in migration |
| INV-BLOB | Blobs use external storage | No BYTEA columns |
| INV-IDENT | node_id never changes meaning | Set at creation, never reassigned |
| INV-LINEAGE | Every fact row traces to an event | NOT NULL on `created_by_event` |
| INV-NOJSON | Relationships are edges, not JSONB FKs | Schema validation in type nodes |
| INV-ATOMIC | Event + projection in same transaction | Single BEGIN...COMMIT block |
| INV-CONCURRENCY | Optimistic concurrency on updates | `expected_version` check |

These invariants are not aspirational guidelines — they are enforced by database constraints, RLS policies, and acceptance tests. Test T13, for example, directly queries the database to verify that no fact row exists without a corresponding event.

---

## 12. Technical Implementation

### 12.1 Stack

The reference implementation targets a serverless Supabase deployment:

| Layer | Technology |
|---|---|
| Runtime | Deno (Supabase Edge Functions) |
| Framework | Hono + @hono/mcp middleware |
| Protocol | MCP 2025-11-25 (Streamable HTTP) |
| Database | PostgreSQL 15+ with pgvector and btree_gist |
| Auth | OAuth 2.1 (Resource Server), Supabase Auth + custom JWT |
| Embeddings | text-embedding-3-small, 1536 dimensions |
| LLM (extraction) | gpt-4o-mini |
| Storage | Supabase Storage (blobs) |
| Validation | Zod |

The spec is technology-agnostic by design: a "tech profile" binds the abstract specification to concrete technology choices. An alternative profile could target Bun + Docker + Neon + Fly.io with the same logical architecture.

### 12.2 Performance Characteristics

At the target scale (<100K nodes per tenant):

| Operation | Target | Mechanism |
|---|---|---|
| Semantic search | <200ms p95 | pgvector HNSW (240 QPS at 100K vectors, 4GB RAM) |
| Structured query | <50ms p95 | PostgreSQL JSONB indexes |
| Entity creation | <100ms p95 | Single INSERT + event in same transaction |
| `capture_thought` | <5s wall | Synchronous: LLM (~1-3s) + dedup (~100ms) + DB (~100ms) |
| Embedding generation | Async | Batched, 100 texts/call, exponential backoff |

The `capture_thought` latency is dominated by the LLM extraction call, which is async I/O and does not count against Supabase's 2-second CPU limit. This was a critical design decision — synchronous execution simplifies the programming model while fitting within platform constraints.

### 12.3 Cost Model

For a typical deployment (4 tenants, ~1000 nodes, ~100 capture_thought calls/month):

- **Database**: Supabase Pro plan (~$25/month)
- **Embeddings**: ~$0.002/1K embeddings (negligible)
- **LLM extraction**: ~$0.01-0.05/capture_thought call (~$5/month at 100 calls)
- **Total**: ~$30/month for the reference scenario

---

## 13. What This Enables: Use Cases

### 13.1 Multi-Agent CRM

A holding company deploys specialized agents per subsidiary — a sales agent for lead management, a content agent for marketing campaigns, a booking agent for reservations, and a partner agent for external distributors. Each operates within its tenant's boundary but can traverse cross-tenant relationships to build a unified customer view.

### 13.2 Collaborative Knowledge Building

Multiple agents contribute knowledge to a shared graph. A data import agent ingests records from CSV (status: `asserted`). A web scraping agent adds supplementary information (status: `hypothesis`). A human reviewer confirms critical facts (status: `confirmed`). Each contribution is traceable to its source, and downstream agents can filter by confidence level.

### 13.3 Temporal Audit and Compliance

Regulated industries need to answer "what did we know, and when did we know it?" Bitemporality provides exact answers. An auditor can query the system as it appeared at any historical moment, seeing not just what the data said but which version of the data was current at the time a decision was made.

### 13.4 Federated Supply Chain Knowledge

Multiple organizations share data about shared resources without copying data between databases. A subcontractor can see project details they're assigned to (via grants) without accessing the general contractor's full project list. Access is temporal — grants expire when the subcontract ends — and fully auditable.

### 13.5 AI-Assisted Research Networks

Researchers across organizations maintain a shared knowledge graph where findings are nodes, citations are edges, and epistemic status tracks the progression from hypothesis through peer review to confirmed result. Federation ensures each institution maintains data sovereignty while enabling collaborative discovery.

---

## 14. Comparison with Alternatives

### 14.1 vs. Graphiti (Zep)

Graphiti is the closest existing system — a temporal knowledge graph with MCP support and sophisticated entity deduplication. Key differences:

- **Multi-tenancy**: Graphiti has `group_id` for basic grouping but no RLS-enforced tenant isolation or cross-tenant federation.
- **Event sourcing**: Graphiti updates records in place. Resonansia's append-only event layer provides an immutable audit trail and supports event replay for disaster recovery.
- **Reflexive ontology**: Graphiti uses a fixed schema. Resonansia's schema is part of the graph and discoverable at runtime.
- **Epistemic tracking**: Graphiti does not distinguish between AI-inferred and human-verified data.

### 14.2 vs. Neo4j MCP Server

Neo4j provides a powerful graph database with Cypher queries. Its MCP server exposes graph operations. Key differences:

- **No multi-tenancy**: Neo4j MCP has no tenant isolation.
- **No bitemporality**: Queries see current state only.
- **No event sourcing**: No immutable audit trail.
- **Different deployment model**: Neo4j requires dedicated infrastructure; Resonansia targets serverless.

### 14.3 vs. Mem0

Mem0 provides agent memory as a service with graph-enhanced storage. Key differences:

- **Managed service only**: No self-hosting option. Resonansia is fully open-source and self-hostable.
- **Fixed schema**: Mem0's data model is predetermined. Resonansia's is fully dynamic.
- **No federation**: Mem0 has no cross-organization data sharing mechanism.
- **No MCP server**: Mem0 is not accessible as an MCP server.

---

## 15. Open Questions and Future Work

### 15.1 GDPR Erasure in an Append-Only System

Event sourcing's immutability creates tension with GDPR's right to erasure. The planned approach for Gen2 is crypto-shredding: encrypting personal data with per-entity keys and destroying the key when erasure is requested. The events remain but their personal data becomes unreadable.

### 15.2 Epistemic Branching

When multiple federated instances hold conflicting assertions about the same entity (Tenant A says the price is 500 SEK; Tenant B says 600 SEK), how should the system represent and resolve the conflict? Gen3 plans to explore epistemic branching — maintaining parallel assertion trees with provenance metadata.

### 15.3 Event Replay for Schema Migration

If fact tables are truly projections of the event stream, then changing the projection logic and replaying all events should produce fact tables conforming to a new schema. This is planned for Gen3 and would provide a migration mechanism that is inherently safe — the original events are never modified.

### 15.4 Deduplication Threshold Tuning

The three-tier deduplication thresholds (0.85/0.95 cosine similarity) are based on Graphiti's research but have not been validated on production data. Real-world tuning based on false positive and duplicate rates will be critical for `capture_thought` usability.

### 15.5 Scale Beyond 100K Nodes

The current architecture is optimized for <100K nodes per tenant. Beyond this, several components need scaling work: pgvector HNSW index parameters, embedding batch strategies, and potentially read replicas for query-heavy tenants.

---

## 16. Conclusion

AI agents need infrastructure, not just prompts. They need persistent, structured, queryable knowledge that survives across sessions. They need to share data across organizational boundaries without copying it. They need to know what was true when, and what they knew when. They need to distinguish between what they inferred and what was verified. And they need to discover the data model at runtime without hardcoded configuration.

These are not nice-to-have features. They are the missing infrastructure layer that prevents AI agents from operating as reliable knowledge workers in production environments.

Resonansia addresses these gaps through five interlocking architectural primitives:

1. **A knowledge graph accessible via MCP** with semantic + structured search and multi-hop traversal
2. **Multi-tenant isolation with federation** via RLS, cross-tenant edges, and capability grants
3. **Bitemporal event sourcing** with atomic projections and immutable audit trails
4. **Epistemic status tracking** that distinguishes hypothesis from assertion from confirmation
5. **Reflexive ontology** where the schema is part of the graph and discoverable at runtime

These primitives are not independent — they reinforce each other to produce a system that is more than the sum of its parts. The result is an infrastructure layer that treats AI agents as first-class citizens: their data is structured, their knowledge is temporal, their inferences are marked, and their organizational boundaries are respected.

The specification and reference implementation are available under the Apache 2.0 license. We invite the open-source AI community to build on, challenge, and extend this work.

---

## References

**Core Protocols**
- MCP Specification (2025-11-25): https://modelcontextprotocol.io/specification/2025-11-25
- A2A Protocol Specification (v0.3): https://a2a-protocol.org/latest/specification/
- MCP Authorization: https://modelcontextprotocol.io/specification/draft/basic/authorization

**Related Systems**
- Graphiti (Zep): https://github.com/getzep/graphiti
- Graphiti Architecture Paper: https://arxiv.org/abs/2501.13956
- Open Brain: https://github.com/benclawbot/open-brain
- Mem0: https://github.com/mem0ai/mem0
- MindBase: https://github.com/agiletec-inc/mindbase
- AWS Multi-tenant MCP: https://github.com/aws-samples/sample-multi-tenant-saas-mcp-server

**Best Practices**
- MCP Tool Design: https://www.philschmid.de/mcp-best-practices
- MCP Server Production: https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/
- MCP Security: https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/
- Multi-tenant Auth in MCP: https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol

**Technical Foundations**
- pgvector Benchmarks: https://supabase.com/docs/guides/ai/choosing-compute-addon
- PostgreSQL Temporal Constraints: https://wiki.postgresql.org/wiki/SQL2011Temporal
- A2A Security Analysis: https://semgrep.dev/blog/2025/a-security-engineers-guide-to-the-a2a-protocol/
