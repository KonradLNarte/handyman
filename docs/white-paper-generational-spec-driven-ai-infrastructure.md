# Generational Spec-Driven AI Infrastructure: A Pattern for Building Knowledge Systems That Evolve Across AI Sessions

**White Paper v1.0 — March 2026**

**Authors:** Resonansia Project Contributors
**License:** Apache 2.0
**Target Audience:** Open source developers building AI agent infrastructure, MCP server authors, knowledge graph practitioners, and anyone designing systems that must evolve across multiple AI-assisted development sessions.

---

## Abstract

Building complex AI infrastructure with AI assistants presents a paradox: the systems are too large for a single AI session, yet each new session starts with zero context. Current approaches — long prompt chains, monolithic specs, or ad-hoc code-first development — all produce drift between intent and implementation as complexity grows.

This paper presents a pattern called **Generational Spec-Driven Development (GSDD)**, extracted from the Resonansia project — a federated, bitemporal, event-sourced knowledge graph exposed as an MCP server. The pattern separates specification evolution from code production across AI "generations," enforces architectural invariants that no generation may violate, and creates a structured handoff protocol that preserves design intent across arbitrary context boundaries.

We describe seven interlocking techniques: (1) generational contracts with mandatory assumption-challenging, (2) strict spec/implementation session separation, (3) reflexive graph-native ontology, (4) epistemic status tracking for AI-generated data, (5) bitemporal event sourcing with atomic projections, (6) federated multi-tenant knowledge graphs via capability grants, and (7) MCP/A2A protocol convergence for agent interoperability. Each technique addresses a specific failure mode observed in AI-assisted system development.

The paper argues that as AI agents become primary builders of infrastructure, the spec — not the code — must be the durable artifact, and that systems designed for AI consumption require fundamentally different architectural primitives than those designed for human developers alone.

---

## 1. Introduction: The Multi-Session AI Development Problem

### 1.1 The Context Window Is Not the Constraint

The most discussed limitation of AI-assisted development is the context window. But in practice, the binding constraint is not how much an AI can hold in memory during one session — it is how much design intent survives the transition between sessions.

A typical complex system requires decisions across dozens of interconnected concerns: data models, authorization rules, API contracts, consistency guarantees, deployment constraints, and interaction patterns. When a human architect makes these decisions, they persist in the architect's long-term memory, reinforced through months of daily engagement. When an AI assistant makes these decisions, they vanish the moment the session ends.

The result is a well-documented failure pattern:

1. **Session 1** makes careful architectural decisions with full reasoning.
2. **Session 2** receives a summary of Session 1's output but not the reasoning. It makes different (often contradictory) decisions on edge cases.
3. **Session 3** inherits inconsistencies from Sessions 1 and 2, compounds them, and introduces its own.
4. By **Session N**, the system is a geological record of conflicting design philosophies, each locally coherent but globally incoherent.

This is not a problem of AI capability. It is a problem of information architecture. The question is: **what artifact carries design intent across session boundaries, and what protocol governs how each session interacts with that artifact?**

### 1.2 Why Code-First Fails for AI-Built Systems

The dominant approach to AI-assisted development is code-first: describe what you want, let the AI write code, iterate. This works well for small tasks but fails systematically for large ones because:

- **Code is too granular to carry design intent.** A 500-line module encodes decisions implicitly — in naming conventions, error handling patterns, data flow. A new AI session reading this code can understand *what* it does but not *why* it does it that way, or what alternatives were considered and rejected.

- **Code invites premature commitment.** Once code exists, subsequent sessions optimize locally around it rather than questioning whether the approach is correct. The code becomes a constraint rather than a servant of the design.

- **Code conflates interface and implementation.** An AI session reading a function signature doesn't know whether that signature is a deliberate public contract or an accidental artifact of the first session's implementation choices.

### 1.3 The Generational Hypothesis

The Resonansia project proposes an alternative: treat AI-assisted development as a series of **generations**, each with explicit contracts, deliverables, and handoff protocols. The specification — not the code — is the primary artifact. Code is a derived, disposable projection of the spec.

This mirrors how biological evolution works: the genotype (spec) is the durable information carrier; the phenotype (code) is expressed anew in each generation. Mutations (design changes) happen in the genotype and are expressed through the phenotype, never the reverse.

The remainder of this paper describes the specific techniques that make this pattern practical.

---

## 2. Generational Spec-Driven Development (GSDD)

### 2.1 The Generational Contract

Each generation in GSDD has a type and a set of obligations:

```
gen0:      Seed spec. Human + AI. Defines invariants, interfaces, open questions.
gen1-spec: AI-only. Resolves open questions. Challenges assumptions. Produces refined spec.
gen1-impl: AI-only. Receives spec. Produces code + tests. Reports feedback.
gen2-spec: AI-only. Inherits spec + feedback. Resolves new questions. Challenges prior decisions.
gen2-impl: AI-only. Implements gen2 spec.
genN:      Pattern continues indefinitely.
```

The critical insight is the alternation between **spec generations** (which refine design) and **implementation generations** (which produce code). These must be separate sessions with separate AI agents. A spec agent must never have access to a code execution environment. A code agent must never modify the spec.

**Why this separation matters:** When spec and code share a session, the spec inevitably drifts to describe what was built rather than what should be built. Post-hoc specifications are worse than no specification — they create false confidence that the system matches a design when in fact the "design" was reverse-engineered from implementation accidents.

### 2.2 The Eight Obligations

Every generation, regardless of type, must fulfill eight obligations:

1. **INHERIT** — Read the full spec and decision log. Understand prior rationale before making changes.

2. **QUESTION** — Challenge at least three assumptions or decisions from prior generations. This is not optional politeness — it is a structural requirement. Each challenge is documented with the assumption, the rationale for challenging it, and the outcome: `upheld`, `revised`, or `deferred`.

3. **RESOLVE** — Every open decision marker assigned to this generation must be resolved with: the decision, alternatives considered, rationale, confidence level (high/mid/low), and a `question_this_if` trigger condition for future generations.

4. **RESEARCH** — Every research marker assigned to this generation requires actual investigation (web research, documentation review, benchmarking) before deciding. No armchair decisions on factual questions.

5. **BUILD** — Produce the artifacts listed in the generation's deliverables section.

6. **VALIDATE** — Run (or verify against) the validation scenario. Report pass/fail per test case.

7. **SEPARATE** — Spec generations produce only spec. Implementation generations produce only code. This boundary is inviolable.

8. **HAND OFF** — Update the decision log. Write a generation summary: what was built, what was learned, what the next generation should watch for.

### 2.3 Decision Log Entries

The decision log is the institutional memory of the project. Each entry follows a structured format:

```yaml
- id: D-001
  generation: gen1
  marker: "[DECIDE:gen1] embedding dimensions"
  decision: "1536 dimensions with text-embedding-3-small"
  alternatives: ["768 dimensions", "1024 with custom model"]
  rationale: "Best recall for knowledge graph entities at acceptable storage cost."
  confidence: mid
  question_this_if: "Node count exceeds 500K or embedding latency exceeds 100ms p95"
  references: ["https://supabase.com/docs/guides/ai/choosing-compute-addon"]
  spec_section_updated: "2.1 — column type changed"
```

The `question_this_if` field is particularly important. It converts every decision from a permanent commitment into a conditional one — valid until specific circumstances change. This prevents both the "we've always done it this way" problem and the "let's revisit everything every session" problem. Decisions are stable by default but include their own expiration conditions.

### 2.4 Anti-Drift Rules

Four rules prevent the spec from drifting away from implementable precision:

1. **No scope creep:** If a feature is not in the system definition or current generation's deliverables, propose it for a future generation instead of building it now.

2. **No phantom requirements:** Do not invent requirements. If the spec doesn't mention something, ask whether it's needed before adding it.

3. **Spec stays in sync:** After resolving a decision marker, update the spec text. Never leave resolved decisions only in the log — the spec must always be self-contained.

4. **Minimal viable first:** When a decision has a simple option and a complex option, prefer the simple option unless a validation test specifically requires the complex one.

### 2.5 Challenged Assumptions in Practice

The mandatory assumption-challenging obligation produced concrete architectural improvements in the Resonansia project. Four examples:

**Challenge C-001: Edge versioning (REVISED)**
Gen0 recommended composite primary keys for edges (mirroring the nodes table) for consistency. Gen1 challenged this: edges represent relationships, not entities. Edge "updates" are nearly always soft-delete + recreate. Full bitemporality on edges adds EXCLUDE constraint complexity with zero benefit — no validation test required edge versioning. Result: edges use simple primary keys, saving significant schema complexity.

**Challenge C-002: Schema enforcement (REVISED)**
Gen0 made schema validation optional for entity data. Gen1 challenged this: without mandatory validation, data quality depends entirely on agent discipline, undermining the epistemic honesty principle. Result: when a type node defines a schema, validation is mandatory. Exception carved for `capture_thought` which creates hypothesis entities from LLM output.

**Challenge C-003: Capture-thought atomicity (DEFERRED)**
Gen1 questioned whether the `capture_thought` tool should be split into "extract" (returns plan) and "apply" (commits), allowing agents to review LLM extraction before committing. This was deferred: splitting would push the tool count above the recommended range, and adding extraction transparency to the response achieves most of the same benefit.

**Challenge C-004: Tool count (UPHELD)**
Gen1 questioned whether 15 tools were too many, noting that `query_at_time` could be a parameter on `find_entities`. After analysis, each tool was found to have a distinct mental model that would be obscured by merging. The count was upheld.

These examples demonstrate that the obligation to challenge is not make-work. It consistently produces better architecture — sometimes by changing things, sometimes by strengthening the rationale for keeping them.

---

## 3. Reflexive Graph-Native Ontology

### 3.1 The Schema-in-the-Graph Pattern

Most knowledge graphs have a hard boundary between schema and data. The schema is defined in configuration files, code, or a separate metadata store. The data lives in graph tables. Tools that query data cannot query the schema, and vice versa.

Resonansia eliminates this boundary. Entity types, relationship types, and event types are **nodes in the graph** — specifically, nodes whose `type_node_id` points to a special bootstrap node called the **metatype**. The metatype is self-referential: its own `type_node_id` points to itself.

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
└─────────────────────────────────────────────┘
```

### 3.2 Why This Matters for AI Agents

The reflexive property has a profound consequence for AI agents: **an agent that knows how to query data already knows how to discover the schema.** The same `explore_graph` tool that traverses data relationships can traverse the ontology by starting at the metatype node. The same `find_entities` tool that searches data can search type definitions by name or content.

This means a `get_schema` convenience tool is exactly that — a convenience. It queries the graph internally, not a separate registry. If a new type node is created via `store_entity`, it immediately appears in schema queries without synchronization. There is no schema drift because there is no separate schema to drift from.

For the open source AI community, this pattern solves a recurring problem: how do you let an agent understand what data exists in a system without hardcoding that knowledge into the agent? With a reflexive ontology, the agent can discover the data model at runtime using the same tools it uses for everything else.

### 3.3 The Bootstrap Problem

Self-referential schemas create a bootstrap problem: how do you create the first type node when type nodes must reference a type node that doesn't exist yet?

The solution uses PostgreSQL's `DEFERRABLE INITIALLY DEFERRED` constraints:

1. Create tables without enforcing the self-referencing FK.
2. Within a single transaction, insert the metatype node with `type_node_id = node_id` (self-referential).
3. Add the FK constraint after the bootstrap node exists.

The metatype uses a well-known fixed UUID (`00000000-0000-7000-0000-000000000001`), ensuring deterministic bootstrapping across environments.

### 3.4 Schema Validation via Type Nodes

Type nodes carry an optional `label_schema` field in their JSONB data. When present, this schema is enforced: any entity stored via `store_entity` must validate against the schema of its type node. When absent, the type is schema-free.

This creates a gradient of formality:
- **Fully typed:** Type node has a JSON Schema. Data must conform. Suitable for well-understood entity types.
- **Schema-free:** Type node has no schema. Any data accepted. Suitable for exploratory or evolving entity types.
- **Hypothesis exception:** The `capture_thought` tool creates entities with `epistemic: "hypothesis"` and relaxed validation, because LLM-extracted data may not perfectly match schemas.

---

## 4. Epistemic Status: Tracking What the System Believes and Why

### 4.1 The Problem of AI-Generated Data

AI agents generate data with varying degrees of reliability. A customer name extracted from a free-text note by an LLM has different confidence than the same name entered manually by a sales representative, which in turn differs from the name verified against a government ID.

Most systems treat all data as equally authoritative once stored. This creates a dangerous information illusion: queryable data *feels* reliable regardless of its provenance.

### 4.2 The Epistemic Status Model

Resonansia assigns every entity an epistemic status:

```yaml
hypothesis:
  meaning: "System inferred this, not yet verified by a human."
  set_by: capture_thought (LLM extraction), automated imports
  transitions_to: [asserted, confirmed]

asserted:
  meaning: "A human or trusted agent explicitly stated this."
  set_by: Direct store_entity calls, manual data entry
  transitions_to: [confirmed]

confirmed:
  meaning: "Verified against an authoritative source."
  set_by: Explicit confirmation action, integration verification
  transitions_to: [] # terminal — corrections are new entities
```

Status transitions emit events, creating an audit trail of how knowledge matured from inference to fact. Search results can be filtered or ranked by epistemic status, allowing agents to distinguish between "things we think might be true" and "things we know are true."

### 4.3 Implications for the AI Community

This pattern is applicable far beyond knowledge graphs. Any system where AI generates data that humans eventually act on benefits from epistemic tracking:

- **RAG systems:** Retrieved facts could carry epistemic status from their source documents.
- **Agent memory:** An agent's beliefs about user preferences have different confidence levels depending on whether they were inferred, stated, or confirmed.
- **Multi-agent systems:** When Agent A tells Agent B a fact, the receiving agent should know whether Agent A observed it directly, inferred it, or was told it by Agent C.

The key insight is that **epistemic status is metadata about the system's relationship to a claim, not metadata about the claim itself.** Two agents can hold the same fact with different epistemic statuses, and that difference carries operational meaning.

---

## 5. Bitemporal Event Sourcing with Atomic Projections

### 5.1 Two Kinds of Time

Most databases track one kind of time: when a record was created or modified. Bitemporal systems track two:

- **Business time** (`valid_from` / `valid_to`): When something was true in reality. "This customer's address was X from January to March."
- **System time** (`recorded_at` or UUIDv7 timestamp): When the system learned about it. "We recorded this address change on February 15."

These two timelines are independent. You can learn about a past event today (backdate business time), or discover that a record you entered yesterday was wrong (system time shows when you knew what you knew).

### 5.2 Event Primacy

In Resonansia's architecture, the `events` table is the single immutable source of truth. The `nodes`, `edges`, and `grants` tables are **projections** — materialized views derived from the event stream. Every row in a projection table must reference the event that created it via a `created_by_event` foreign key.

This design has a critical invariant: **the same event stream + same projection logic = identical state.** The projection tables can theoretically be rebuilt from scratch by replaying the event stream.

Events are append-only. They are never updated, never deleted. Corrections are new events that reference the original. This creates an immutable audit trail that is not just "nice to have" but is the *foundational data structure* of the system.

### 5.3 Atomic Event+Projection Transactions

A subtle but critical design decision is that events and their projections must be written within the same database transaction:

```
1. VALIDATE — check permissions, resolve types (outside transaction)
2. EXTERNAL CALLS — LLM extraction, dedup search (outside transaction)
3. BEGIN TRANSACTION
4. WRITE EVENT — INSERT into events table
5. PROJECT — INSERT/UPDATE fact tables
6. COMMIT TRANSACTION
7. ASYNC SIDE EFFECTS — queue embedding generation (outside transaction)
```

If the projection fails, the event is rolled back. There are no orphaned events and no eventual consistency between the event layer and the fact layer.

This stands in contrast to many event-sourcing implementations that use message queues between events and projections, accepting eventual consistency. For a knowledge graph where agents make decisions based on query results, eventual consistency means an agent might read stale data immediately after writing — a subtle but dangerous bug.

### 5.4 Why UUIDv7

All primary keys use UUIDv7, which embeds a millisecond-precision timestamp. This provides natural chronological ordering without a separate sequence, enables system time derivation from the primary key, and avoids the performance problems of random UUIDs in B-tree indexes.

The `recorded_at` column is technically redundant with the UUIDv7 timestamp but is retained for practical reasons: direct indexing, readable queries, and no dependency on UUID timestamp extraction functions that aren't yet standard in PostgreSQL.

---

## 6. Federated Multi-Tenant Knowledge Graphs

### 6.1 The Federation Problem

Multi-tenancy is well understood: isolate each customer's data. Federation is harder: allow controlled sharing *between* isolated tenants without copying data.

The typical approach — data replication between tenants — creates synchronization nightmares and makes access revocation nearly impossible (you can't un-copy data).

### 6.2 Federation via Edges and Grants

Resonansia's approach is federation through the graph itself:

- **Cross-tenant edges:** An edge where `source_id` and `target_id` belong to different tenants. The edge itself belongs to the tenant that created it.
- **Capability grants:** Explicit, temporal, fine-grained permissions stored in the database. A grant says: "Tenant B may TRAVERSE node N in Tenant A during this time range."
- **Virtual endpoints:** A single MCP connection with a multi-tenant token sees a unified graph spanning all authorized tenants.

No data is copied. Access is controlled through grants that can be created, revoked, and audited. Grants are temporal — they expire automatically. And grants emit events, creating an audit trail of who was authorized to see what, when.

### 6.3 Two-Layer Access Control

Access control uses two complementary layers:

- **Scopes** (in JWT tokens): Coarse-grained, tenant-level. Fast (in-memory check, no database query). Example: "This agent can read Tenant A."
- **Grants** (in database): Fine-grained, node-level. Requires database lookup. Example: "Tenant B can TRAVERSE node N in Tenant A."

Both must pass for a cross-tenant operation to succeed. Scopes are the fast outer gate; grants are the fine-grained inner gate.

PostgreSQL Row-Level Security (RLS) provides defense-in-depth: even if application code has a bug, RLS prevents accessing data outside the token's authorized tenant IDs.

### 6.4 The Pettson Validation Scenario

The spec includes a concrete multi-tenant scenario: a Swedish holding company (Pettson Holding) with three subsidiaries — an event production company (Taylor Events), a cabin rental company (Mountain Cabins), and a ticket sales company (Nordic Tickets).

Cross-tenant relationships are natural:
- A "Midsommar Football & Cabin" package (Nordic Tickets) *includes* a cabin property (Mountain Cabins)
- A "Summer Festival 2026" campaign (Taylor Events) *sells* ticket batches (Nordic Tickets)
- A sales lead (Taylor Events) *also_booked* a cabin (Mountain Cabins)

These relationships create a federated graph where an agent with appropriate grants can traverse from a package → cabin property → booking → lead across three tenant boundaries, seeing a unified customer journey that no single tenant could see alone.

---

## 7. MCP as Knowledge Graph Infrastructure

### 7.1 Tool Design for AI Agents

The Model Context Protocol (MCP) defines how AI agents access tools and data. Resonansia's MCP tool interface follows specific design principles:

1. **Outcome over operation:** Tools represent agent goals, not database operations. An agent should accomplish its intent in 1-2 tool calls, not 5.
2. **Flat arguments:** Top-level primitives and constrained types. No nested objects as parameters. This reduces the cognitive load on the AI agent calling the tool.
3. **5-15 tools total:** Curate ruthlessly. Each tool has one clear purpose. Too few tools means each tool is overloaded with parameters. Too many means the agent can't discover the right one.
4. **Every mutation emits an event:** Automatic. The caller doesn't need to emit events separately.
5. **Errors enable self-correction:** Error messages tell the agent what went wrong and how to fix it.

### 7.2 The 15-Tool Interface

The interface is organized into four groups:

**Entity Management (5 tools):**
- `store_entity` — Create or update an entity. Returns full entity with ID.
- `find_entities` — Search by semantic similarity, structured filters, or both.
- `connect_entities` — Create typed relationships. Works across tenant boundaries.
- `explore_graph` — Traverse from an entity to discover connected entities.
- `remove_entity` — Soft-delete. Remains in history for audit.

**Temporal (2 tools):**
- `query_at_time` — Retrieve entity state at a specific point in business time and/or system time.
- `get_timeline` — Chronological history of an entity: versions, events, changes.

**Capture (1 tool):**
- `capture_thought` — Submit free text. System extracts structured data via LLM, classifies entity type, identifies mentioned entities, deduplicates, creates nodes and edges automatically. All created entities get epistemic status "hypothesis."

**Discovery & System (4+3 tools):**
- `get_schema` — Discover entity types, relationship types, event types. Queries the graph (reflexive ontology).
- `get_stats` — Dashboard-level statistics.
- `propose_event` — Submit raw events for system integration.
- `verify_lineage` — Check event-fact integrity.
- `store_blob`, `get_blob`, `lookup_dict` — Utility tools.

### 7.3 Capture-Thought: The AI-Native Ingestion Pattern

The `capture_thought` tool deserves special attention because it represents a pattern broadly applicable to AI systems: **structured data extraction with epistemic honesty and entity deduplication.**

The flow:

1. Receive free text: "Met Johan at the cabin fair, he wants 20 tickets for Allsvenskan and a cabin for midsommar."
2. Fetch the tenant's type nodes (available entity types + their schemas).
3. Call an LLM to extract: entity type classification, structured fields, mentioned entities, relationships, action items.
4. For each mentioned entity, **deduplicate** before creating:
   - **Tier 1 (Exact match):** Case-insensitive name match. O(1). Confidence: 1.0.
   - **Tier 2 (Embedding similarity):** Vector search. If similarity > 0.95, auto-link. Confidence: similarity score.
   - **Tier 3 (LLM disambiguation):** For the uncertain zone (0.85-0.95 cosine similarity), ask an LLM to disambiguate. Confidence: LLM assessment.
   - Below 0.85: create new entity.
5. Create primary node as "hypothesis."
6. Create edges between primary node and mentioned/found entities.
7. Return extraction results with match confidence scores for transparency.

The three-tier deduplication strategy is inspired by the Graphiti project's approach but simplified for the expected scale. The `question_this_if` trigger is: "Duplicate entities exceed 5% of total OR false positive matches exceed 2%."

---

## 8. MCP + A2A: The Agent Interoperability Stack

### 8.1 Two Protocols, One System

The AI agent ecosystem is converging on two complementary protocols:

- **MCP (Model Context Protocol):** How an agent connects to *tools and data*. The agent calls tools, reads resources, follows prompts.
- **A2A (Agent2Agent Protocol):** How agents discover and collaborate with *each other*. Agents publish capabilities via AgentCards, delegate tasks, exchange results.

Resonansia sits at the intersection. It is an MCP server (agents use its tools) AND its tenants could be A2A-discoverable agents (agents find each other through Resonansia).

### 8.2 A2A Readiness Without A2A Complexity

Gen1 of Resonansia does not implement A2A. But it is architecturally prepared for it:

- Tool descriptions are machine-readable (MCP tool schemas with Zod).
- Tenant capabilities are introspectable (`get_schema` returns type nodes).
- The auth model is compatible (OAuth 2.1 aligns with A2A's securitySchemes).
- Streaming support via Streamable HTTP transport aligns with A2A's SSE streaming.

Gen2 will auto-generate AgentCards from MCP tool metadata, augmented with tenant-specific information. Each tenant would publish its capabilities at `/.well-known/agent-card.json`.

Gen3 envisions a federated agent mesh where Resonansia tenants across different instances discover each other via A2A, with cryptographic AgentCard signing for trust verification.

### 8.3 Implications for the Open Source Community

The MCP+A2A convergence creates an opportunity for the open source community: build systems that are both tool servers (MCP) and agent-discoverable services (A2A) from the ground up. Resonansia demonstrates that this doesn't require implementing both protocols simultaneously — it requires designing the architecture so that A2A capabilities can be layered on without breaking changes.

The key architectural decision is: make your system's capabilities introspectable through its own data model. If an agent can discover what your system does by querying your system (rather than reading documentation), then generating an AgentCard is a mechanical transformation rather than a creative exercise.

---

## 9. Practical Patterns for Open Source Adoption

### 9.1 Pattern: Invariant Rules

Define rules that no generation — and no contributor — may violate. Give each invariant an ID for referencing in code and tests. Examples from Resonansia:

- **INV-TENANT:** `tenant_id` on every row. No exceptions.
- **INV-APPEND:** Events are never updated, never deleted.
- **INV-BITEMP:** Every mutable entity tracks business time and system time.
- **INV-SOFT:** Soft deletes only. Hard deletes only for GDPR erasure.
- **INV-ATOMIC:** Event and projection in the same transaction. No orphaned events.
- **INV-LINEAGE:** Every fact row must reference its creating event.
- **INV-NOJSON:** Relationships between entities must be edges, not foreign keys buried in JSONB.

These invariants serve as guardrails for AI agents writing code against the system. An AI can be told "implement feature X, respecting invariants INV-TENANT, INV-APPEND, and INV-ATOMIC" and produce correct code without understanding the full system.

### 9.2 Pattern: Decision Markers

Use explicit markers in your spec for unresolved decisions:

- `[DECIDE:genN]` — A design decision that generation N must resolve.
- `[RESEARCH:genN]` — A factual question that generation N must investigate before deciding.
- `[FEEDBACK:genN-impl]` — Implementation learnings that the next spec generation should consider.

These markers make the spec's maturity state machine-readable. You can grep for `[DECIDE:gen2]` to see exactly what the next spec generation must do.

### 9.3 Pattern: Validation Scenarios

Define concrete acceptance tests in the spec, not in code. Each test specifies:
- Which agent role executes it
- The exact tool call with exact parameters
- The exact expected response shape
- What invariants it validates
- Preconditions and post-conditions

This allows the spec to be validated *before* implementation begins — a spec generation can verify completeness by checking that every test references entities defined in the seed data and tools defined in the interface.

### 9.4 Pattern: Tech Profile Separation

Separate "what the system does" from "how it's built." The spec defines the system in tech-agnostic terms. A separate tech profile binds it to specific technologies:

```yaml
runtime: "deno"
framework: "hono"
database: "supabase postgres + pgvector"
auth_provider: "supabase auth + custom JWT"
embedding_api: "text-embedding-3-small via OpenAI"
extraction_llm: "gpt-4o-mini via OpenAI"
deployment: "supabase edge functions"
```

This allows the same spec to be implemented on different stacks. An organization using AWS could bind the same spec to a profile with Lambda, Aurora, Cognito, and Bedrock.

---

## 10. Lessons Learned

### 10.1 What Worked

**Mandatory assumption-challenging produced genuine improvements.** The requirement to challenge three assumptions per generation initially felt artificial. In practice, it consistently surfaced decisions that were "inherited but not justified" — adopted from a prior generation's context without re-evaluation. The edge versioning revision (C-001) saved significant implementation complexity.

**Spec/implementation separation prevented spec rot.** In early iterations before the separation was formalized, specs consistently drifted to describe implementations rather than prescribe designs. The separation, while seemingly bureaucratic, maintained the spec as a forward-looking design document.

**Epistemic status tracking changed how agents interact with data.** Without epistemic tracking, agents treated LLM-extracted data with the same confidence as human-verified data. With tracking, agents could make different decisions for hypotheses vs. confirmed facts — for example, not sending a sales email to a "hypothesis" lead.

**Decision log entries with `question_this_if` created durable but non-permanent decisions.** This pattern prevents both "analysis paralysis" (endlessly revisiting decisions) and "architecture astronaut" syndrome (over-engineering for hypothetical futures). Each decision is valid until a specific, measurable condition changes.

### 10.2 What Was Hard

**Maintaining spec precision is labor-intensive.** A spec that says "implement authentication" is useless. A spec that says "validate JWT signature using HS256 with the Supabase JWT secret, extract `tenant_ids` and `scopes` claims, call `has_scope(token, required_scope)` per the pseudocode in section 4.8, set `app.tenant_ids` via `SET LOCAL` before every query" is implementable. Getting to the latter takes significantly more effort.

**Balancing spec completeness with spec readability.** The Resonansia gen1 spec is approximately 3,800 lines. This is exhaustive and implementation-ready, but it's also a lot for a human to review. The trade-off between "precise enough for an AI to implement" and "concise enough for a human to understand" is real.

**Cross-cutting concerns are hard to specify.** Auth, tenant isolation, and event emission touch every tool. Specifying these per-tool creates redundancy. Specifying them once creates indirection. The Resonansia spec uses both: a central section for the model and per-tool sections for specific scope requirements.

### 10.3 What We'd Do Differently

**Start with fewer tools.** The 15-tool interface, while each tool is justified, is at the upper limit. A first generation with 8-10 tools would have been more tractable, with the remaining tools deferred to gen2.

**Include performance budgets in the spec.** The spec defines what each tool does but not how fast it should do it. Adding latency targets per tool (e.g., "find_entities with semantic search: <200ms p95") would have prevented implementation choices that are correct but slow.

**Formalize the tech profile contract.** The tech profile concept works but the interface between "tech-agnostic spec" and "tech-specific profile" is informal. A more rigorous mapping (e.g., "every occurrence of VECTOR in the spec maps to `vector(dimensions)` in pgvector profiles") would make multi-stack support more systematic.

---

## 11. Comparison with Existing Approaches

### 11.1 vs. Graphiti/Zep

Graphiti is the closest existing system: a temporal knowledge graph with MCP support. Resonansia differs in three ways: (1) multi-tenancy with federation (Graphiti has `group_id` but no cross-tenant access control), (2) event sourcing with immutable audit trail (Graphiti updates records in place), and (3) reflexive ontology (Graphiti uses a fixed schema).

### 11.2 vs. Traditional Spec-Driven Development (e.g., OpenAPI)

OpenAPI specs describe API surfaces. GSDD specs describe entire systems including data models, authorization rules, consistency guarantees, and test scenarios. The generational protocol and mandatory assumption-challenging have no equivalent in traditional spec-driven development.

### 11.3 vs. ADR (Architecture Decision Records)

ADRs capture individual decisions. GSDD's decision log captures decisions *plus* their expiration conditions, alternatives considered, and the generation that made them. More importantly, ADRs are supplementary documents alongside code. In GSDD, the decision log is embedded in the spec, which is the primary artifact.

### 11.4 vs. StrongDM Attractor

Attractor is the closest methodological relative: a spec-driven coding agent methodology with NLSpec format and pipeline-as-graph. Resonansia's GSDD adds the generational protocol, mandatory assumption-challenging, and the spec/implementation session separation — mechanisms specifically designed for the multi-session AI development context.

---

## 12. Future Directions

### 12.1 Cryptographic Event Chains

Gen3 envisions hash-linked events (SHA-256 chain where each event references the hash of the previous event in its stream) and Ed25519 signatures per actor. This enables **trustless federation** — a remote instance can verify that an event stream has not been tampered with without trusting the source database. This is the knowledge graph equivalent of blockchain's append-only ledger, applied to verifiable inter-organizational data sharing.

### 12.2 Epistemic Branching

When multiple federated instances hold conflicting assertions about the same entity, the system needs a way to represent and eventually reconcile these conflicts. Epistemic branching — maintaining parallel assertion trees with provenance metadata — is planned for gen3.

### 12.3 Event Replay for Schema Migration

If fact tables are truly projections of the event stream, then changing the projection logic and replaying all events should produce fact tables conforming to a new schema. This is the event-sourcing equivalent of a database migration, but with a guarantee of correctness: the new schema is populated from the same immutable events that populated the old one.

### 12.4 Generational Protocol as a Standard

The GSDD pattern described in this paper is not specific to knowledge graphs. Any complex system built across multiple AI sessions could benefit from generational contracts, mandatory assumption-challenging, and spec/implementation separation. We invite the open source community to adopt, adapt, and improve the pattern.

---

## 13. Conclusion

The central argument of this paper is that AI-assisted development of complex systems requires a different information architecture than human-only development. The spec — not the code — must be the durable artifact. Design intent must be encoded in structured, machine-readable formats that survive session boundaries. And the protocol governing how each AI session interacts with the accumulated design must be explicit, enforceable, and self-correcting.

The seven techniques presented here — generational contracts, spec/implementation separation, reflexive ontology, epistemic tracking, bitemporal event sourcing, federated multi-tenancy, and MCP/A2A convergence — address specific failure modes observed in real AI-assisted development. They are not theoretical proposals but patterns extracted from a working system specification that has been evolved through multiple AI generations.

As AI agents become increasingly capable builders of infrastructure, the systems they build will need to be designed for AI consumption from the ground up. Knowledge graphs that describe their own schemas. Data models that track what the system believes and why. Authorization models that agents can reason about programmatically. And development protocols that preserve architectural coherence across arbitrary numbers of AI sessions.

The source specification for Resonansia is available under the Apache 2.0 license. We welcome contributions, critiques, and adaptations of the patterns described here.

---

## Appendix A: Quick Reference — The GSDD Protocol

```
FOR EACH GENERATION:

1. INHERIT    Read full spec + decision log. Understand prior rationale.
2. QUESTION   Challenge >= 3 assumptions. Document outcomes.
3. RESOLVE    Every [DECIDE:genN] → decision + alternatives + rationale + confidence + question_this_if.
4. RESEARCH   Every [RESEARCH:genN] → investigate before deciding. Document findings.
5. BUILD      Produce deliverables listed for this generation.
6. VALIDATE   Run/verify validation scenario. Report pass/fail.
7. SEPARATE   Spec generations: spec only. Impl generations: code only.
8. HAND OFF   Update decision log. Write generation summary.

ANTI-DRIFT RULES:
- No scope creep (propose for future generation)
- No phantom requirements (ask first)
- Spec stays in sync (update text after resolving decisions)
- Minimal viable first (prefer simple over complex)

DECISION ENTRY FORMAT:
- id, generation, marker, decision, alternatives, rationale,
  confidence, question_this_if, references, spec_section_updated
```

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **GSDD** | Generational Spec-Driven Development. The pattern described in this paper. |
| **Generation** | One cycle of spec refinement or code production. |
| **Spec generation** | A session that refines the specification without producing code. |
| **Impl generation** | A session that produces code from the specification without modifying it. |
| **Decision marker** | `[DECIDE:genN]` — an unresolved design decision assigned to generation N. |
| **Research marker** | `[RESEARCH:genN]` — a factual question requiring investigation. |
| **Feedback marker** | `[FEEDBACK:genN-impl]` — implementation learnings for the next spec generation. |
| **Invariant** | A rule that no generation may weaken or violate. |
| **Metatype** | The self-referential bootstrap node that types all type nodes. |
| **Epistemic status** | `hypothesis`, `asserted`, or `confirmed` — tracking data provenance. |
| **Projection** | The process of materializing fact table rows from events. |
| **Federation** | Controlled cross-tenant data sharing via edges and grants. |
| **Tech profile** | A binding that maps tech-agnostic spec to specific technologies. |
| **MCP** | Model Context Protocol — how agents access tools and data. |
| **A2A** | Agent2Agent Protocol — how agents discover and collaborate with each other. |
| **AgentCard** | A2A discovery document published at `/.well-known/agent-card.json`. |

## Appendix C: The Resonansia Architecture at a Glance

```
                    ┌─────────────────┐
                    │  AI Agent (MCP   │
                    │  Client)         │
                    └────────┬────────┘
                             │ MCP (Streamable HTTP)
                             │ OAuth 2.1 JWT
                    ┌────────▼────────┐
                    │  MCP Server      │
                    │  (Hono + Edge    │
                    │   Functions)     │
                    │                  │
                    │  15 Tools        │
                    │  5 Resources     │
                    │  4 Prompts       │
                    └────────┬────────┘
                             │ SET LOCAL app.tenant_ids
                             │ + Application-level grants check
                    ┌────────▼────────┐
                    │  PostgreSQL      │
                    │  + pgvector      │
                    │  + RLS           │
                    │                  │
                    │  7 Tables:       │
                    │  tenants         │
                    │  events          │◄── append-only truth
                    │  nodes           │◄── bitemporal projections
                    │  edges           │◄── including cross-tenant
                    │  grants          │◄── capability-based ACL
                    │  blobs           │◄── metadata only
                    │  dicts           │◄── reference data
                    └─────────────────┘

    Tenant A ◄──── cross-tenant edge ────► Tenant B
                        │
                    requires GRANT
                    (checked at query time)
```

---

*This white paper is derived from the Resonansia MCP Server Gen1 Specification (v1), produced on 2026-03-03 by a gen1-spec agent (Claude Opus 4.6) following the Generational Spec-Driven Development protocol. The specification itself was evolved from a gen0-v5 seed spec through the process described in this paper.*
