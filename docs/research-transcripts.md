# Research Agent Transcripts

> Complete record of all prompts sent to research agents and their full responses.
> Generated 2026-03-02 during creation of CONTEXT-INDEX.md

---

## AGENT 1: Vision & Origin Researcher

### Prompt

```
You are a research agent. Read and deeply analyze the following documents that represent the VISION and ORIGIN of the Resonansia project. For each document, extract:

1. Core principles — non-negotiable beliefs and values
2. Customer emotions — what feelings, frustrations, aspirations are expressed
3. Domain concepts — business entities and their relationships
4. Architectural decisions — technical choices and their rationale
5. Open questions — things left undefined or ambiguous
6. Cross-references — how this document relates to others

Read these files:
- docs/taylor-spec.md
- bootstrap-spec.md
- docs/spec alpha 0.1.md
- docs/spec-evolution-research.md
- docs/voice_recording.txt
- docs/Recording.txt

Return a structured analysis in markdown format. Be thorough — every principle, every emotion,
every decision matters. This will be used to create a context bridge for another AI instance.
```

### Response

# Resonansia Origin Documents: Deep Analysis

## Document Inventory

| # | Document | Path | Language | Length | Generation | Role |
|---|----------|------|----------|--------|------------|------|
| 1 | `voice_recording.txt` | `docs/voice_recording.txt` | Swedish | ~739 lines | Gen 0 | Raw conversation between Konrad and Kimmo (painting company owner) |
| 2 | `Recording.txt` | `docs/Recording.txt` | Swedish | ~331 lines | Gen 0 (second) | Raw conversation with Pettson/Erik (Taylor Events), Konrad, and Bjorn |
| 3 | `spec alpha 0.1.md` | `docs/spec alpha 0.1.md` | Swedish | ~1037 lines | Gen 1 | First structured product specification for the construction/painting domain |
| 4 | `bootstrap-spec.md` | `bootstrap-spec.md` | English | ~694 lines | Gen 3 | Bootstrap execution instructions for the AI coding agent |
| 5 | `taylor-spec.md` | `docs/taylor-spec.md` | English | ~926 lines | Gen 1 (second domain) | Structured spec for Taylor Events / AI sales agent vertical |
| 6 | `spec-evolution-research.md` | `docs/spec-evolution-research.md` | English | ~541 lines | Meta-analysis | Research report on how specs evolve across generations |

## DOCUMENT 1: `voice_recording.txt` (Gen 0 -- The Origin)

### Core Principles

1. **Communication is the primary pain point.** Kimmo returns to this repeatedly with the most emotional emphasis of anything in the conversation. The exact quote (approx. line 149 equivalent): "Den storsta utmaningen inom hantverkaryrket... det ar kommunikationen. Vad har jag lovat? Vad ar det som gors? Och vad ar det som inte gors?" (The biggest challenge in the trades is communication. What did I promise? What is being done? And what is not being done?)

2. **Trust wins jobs over price.** Kimmo explains that his company is "sallan den minsta" (rarely the cheapest) but wins the most BRF contracts because of reliability, schedule adherence, and communication. The BRF chairman values trust because of "Berit i lagenheten langst ner" who complains about everything -- the chairman pays more for a contractor who handles that communication.

3. **Simplicity above all for end users.** Kimmo tested many systems before; his team stopped using them because they were too complex. Lisa "sitter garns och skriver pa ett block" (likes writing on a notepad). The system must be simpler than what they abandon.

4. **AI-first as a design philosophy.** Konrad introduces this principle: subcontractors like Aziz should never need to visit a website. WhatsApp messages with simple responses (send a number for hours) are the interface.

5. **The subcontractor should never need to log in.** Aziz, the archetypal subcontractor, interacts entirely through WhatsApp -- receiving work orders in Arabic, reporting time by sending a number, and sending photos.

6. **Transparency for customers.** Customers should be able to see material deliveries in real time, get daily photo updates, and never be surprised by the final invoice.

7. **The system should be invisible infrastructure.** "Den basta infrastrukturen ar den som ingen marker att de anvander -- tills de forsoker klara sig utan."

### Customer Emotions

- **Frustration with manual processes:** Kimmo describes manually sorting delivery notes ("foljsedlar") from Flygel, matching them to projects, a tedious process that should be automated.
- **Anxiety about quoting accuracy:** There is a clear distinction between Kimmo (who sometimes quotes optimistically -- "gladjekalkyl") and Lisa (who is meticulous). The gap between them creates financial risk.
- **Pride in craftsmanship and professionalism:** Signing quotes via BankID "ser proffsigt ut" (looks professional). The company wants to project seriousness.
- **Fear of cost overruns being invisible:** The scenario of discovering extra paint costs on day 2 and communicating that proactively to the customer, rather than surprising them at invoice time.
- **Desire for control without micromanagement:** Kimmo wants to see real-time economics (margins, project status) without having to manually enter data.
- **Fatigue with existing tools:** They use Bygglet for project management and Fortnox for accounting, but the integration is manual and painful.
- **Excitement about the subcontractor network effect:** Both Konrad and Kimmo get animated about the idea that subcontractors could become independent customers of the platform.

### Domain Concepts

- **Customer types:** Private homeowners (villakunder), BRF (bostadsrattsforening -- cooperative housing associations), commercial (rare/exception)
- **BRF governance:** ordforande (chairman), styrelse (board), boende (residents). The chairman is the decision-maker who values communication and schedule adherence.
- **Project hierarchy:** Project > work orders (arbetsordrar). A BRF can be one project with 21 facades, each being a work order with specific color codes.
- **Quote-to-project flow:** Customer contact > site visit > photos > dictation/measurement > quote generation > PDF > BankID signing > project creation with budget from quote lines
- **Material tracking:** Delivery notes (foljsedlar) arrive by email from suppliers (Flygel/Colorama), tagged with project numbers. These must auto-associate to projects.
- **Material-to-labor ratio:** 30-35% of labor cost is the standard material cost ratio. This is critical domain knowledge for AI quoting.
- **Paint bucket economics:** Always buy 10L buckets even if you need less -- waste is baked into the calculation. Trim paint (snickerifarger) at 3L can cost 2000+ SEK.
- **ROT/RUT deductions:** ROT = 30% off labor for renovation. RUT = 50% off labor for household services. Maximum 50,000 SEK/year per person. Customer is responsible for checking their remaining allowance. Skatteverket API integration desired.
- **Upselling dynamics:** Painters on-site can suggest additional work (e.g., "should we paint the trim too?"). This goes to backoffice for pricing, then to customer for approval. Commission-based incentive possible.
- **Wallpaper economics:** Worst margins. Specific disaster example -- Djursholm villa, 4500 SEK/roll wallpaper, had to redo twice (20,000 SEK each time) before finding the right adhesive.
- **Running account (lopande rakning):** For repeat customers/BRF, billing evolves into a running account model based on trust.
- **Fortnox integration:** Invoice created in Bygglet, sent from Bygglet, then exported to Fortnox for bookkeeping. Goal is to eventually replace both.
- **Google Reviews:** 5.0 rating, critically important for new customer acquisition. Post-project review request desired.

### Architectural Decisions (as emerged in conversation)

- **WhatsApp as primary channel for subcontractors.** Kimmo explicitly states subcontractors rarely speak Swedish ("de ar valdigt sallan svensktalande") and WhatsApp is universal.
- **BankID for quote signing.** Both Konrad and Kimmo agree this projects professionalism.
- **Delivery note auto-association:** When Flygel sends a delivery note by email tagged with a project number (e.g., P2901), the system should auto-associate it.
- **Multi-level authorization:** Painters can report upsell opportunities, but backoffice prices them and the customer approves. Trusted painters with long tenure could get higher authority.

### Open Questions

- Lisa's exact workflow and spreadsheet structure -- never mapped
- How Kimmo visually estimates room sizes and translates them to hours
- Seasonal patterns in detail (summer = BRF facades mentioned but not quantified)
- Failure mode catalogue (what goes wrong first on a typical project?)
- Exact paint absorption rates for different surfaces
- Competitive pricing strategy -- how much cheaper/more expensive than competitors

### Cross-References

- This is the foundational document for everything. The spec-evolution-research.md document explicitly calls this "the most underexamined artifact in the entire project."
- Direct input to `spec alpha 0.1.md` (Gen 1).
- Domain knowledge from this document was systematically lost by Gen 2 (the technical spec). The research report catalogues 12 specific losses.

## DOCUMENT 2: `Recording.txt` (Gen 0 -- Second Customer Conversation)

### Core Principles

1. **Results over architecture.** Pettson's cardinal lesson from the Mariano experience: "Det har inte hant ett skit egentligen, praktiskt sett" (Nothing has happened really, practically speaking). Advanced automations that produce nothing are worthless.

2. **Simplicity for the office team.** "Det far inte vara for krangligt for dem" (It mustn't be too complicated for them). His office team (ex-wife and Dova) still use paper and Excel.

3. **Layer, don't replace.** Pettson already has booking platforms he's happy with. He wants an intelligence layer on top -- customer acquisition, content, "being a little smarter than everyone else."

4. **Shared trunk, different branches.** Both Erik and Konrad independently articulate the tree metaphor: a common core platform with vertical-specific branches for different businesses (football tickets, mountain cabins, Taylor Events).

5. **The cheapest acquisition wins.** Pettson explicitly frames this as finding "det billigaste sattet att fa in ackvisition" (the cheapest way to get customer acquisition).

6. **Start on the right foundation.** Erik emphasizes not building on something that becomes "outbated" (outdated) in 3-6-12 months given the pace of AI development.

### Customer Emotions

- **Impatience.** "Jag vill bara komma igang" (I just want to get started). Pettson has been burned by delays before.
- **Frustration with technical sophistication without results.** The Mariano experience left him disillusioned with "advanced automations" that produce nothing practical.
- **Excitement about AI possibilities.** Erik describes multiple businesses that could benefit from AI agents -- genuine enthusiasm about the potential.
- **Cash-confidence.** Post-call, Bjorn notes "Pettson sitter ju pa cash" -- Pettson has money and is ready to invest.
- **Gold rush mentality.** Bjorn: "Kom ihag att det ar guldruschen och folk vet inte om det" (Remember it's the gold rush and people don't know about it). There is urgency and opportunity.
- **Fear of over-complexity.** Repeatedly: the office team must not be overwhelmed.

### Domain Concepts

- **Business portfolio:** N-Tech Platforms/Hudinavian (real estate B2B), Mountain Cabin Company (rental/sales in Are/Salen), Taylor Events (travel/event booking), Football Matches (100,000 tickets for August 1 and 8)
- **AI agents as conversational sales reps:** "En AI-agent som pratar om bokningar. En stuga i fjallen..." The agent has personality and conducts the full sales conversation.
- **Existing platforms not to replace:** A travel booking platform (~100 agencies) and a Stenbeck/Kinnevik hotel platform -- both operational and satisfactory
- **The April 1 deadline:** Football ticket sales must be running by April 1, 2026 -- four months before the August events
- **Upselling through conversation:** From cabin booking to lift passes, ski rental, restaurant reservations
- **The office team personas:** Ex-wife and Dova, described as "stuck in the stone age" ("de ar kvar pa fast alder"), using paper and Excel

### Architectural Decisions

- **Resonansia platform as the trunk.** Konrad explicitly connects the conversation to the existing 7-table, event-sourced, graph-based data model. Everything goes into the same database -- bookings, content strategies, agent configurations.
- **Multi-tenant for multi-business.** Each of Pettson's businesses becomes a tenant with federation between them.
- **Reuse of existing infrastructure.** WhatsApp/SMS adapters already built for construction domain can serve sales agents.
- **AI model tiering.** Cheap models for classification, expensive for content generation -- the same pattern from the construction domain.

### Open Questions

- Budget range for the engagement
- Current customer lists and databases across businesses
- CRM currently in use (if any)
- Which football teams are playing (legal/rights implications)
- Payment processing preferences (Klarna, Stripe, Swish)
- Anton's exact role and technical capability
- What Mariano actually built and with what tools
- API documentation for the travel platform

### Cross-References

- This conversation directly produced `taylor-spec.md` (Gen 1 for the second vertical).
- It proves the platform's extensibility thesis: the same 7-table model serves both construction and travel/events.
- The Mariano lesson becomes DP-01 in the taylor-spec ("Results over architecture").
- Konrad's explanation of the data model in this conversation (~line 188-191) is the clearest informal articulation of the graph architecture in any document.

## DOCUMENT 3: `spec alpha 0.1.md` (Gen 1 -- First Product Specification)

### Core Principles

1. **"Sju tabeller. Tusen yrken. En plattform."** (Seven tables. A thousand trades. One platform.) This is the motto, crystallized here for the first time.

2. **Seven design principles formalized:**
   - DP-01: Manniskan forst, systemet anpassar sig (Human first, the system adapts)
   - DP-02: AI som mellanhand, aldrig som beslutsfattare (AI as intermediary, never as decision-maker)
   - DP-03: Sju tabeller -- inget mer (Seven tables -- nothing more)
   - DP-04: Natverkseffekt genom generositet (Network effect through generosity -- free tier is real, not a demo)
   - DP-05: Transparens framfor magi (Transparency over magic)
   - DP-06: Offline-kapabel, synk-tolerant (Offline-capable, sync-tolerant)
   - DP-07: Global arkitektur, lokal relevans (Global architecture, local relevance)

3. **Technology-agnostic specification.** "Teknikval specificeras INTE. Specen ar teknikagnostisk." This defines WHAT and WHY, never HOW.

4. **AI never does arithmetic.** Formalized as AI-P-05: "AI SKALL ALDRIG utfora aritmetik direkt. Berakningar (summor, marginaler, moms) SKALL alltid goras av deterministisk kod."

5. **Events are append-only.** R-EVT-01: No UPDATE or DELETE on events. Corrections via compensating events.

6. **Federation is consent-based.** R-FED-01: Both tenants must actively accept federation relationships.

### Customer Emotions (as formalized into personas)

- **Kimmo (P-01):** "Jag ser hela min verksamhets ekonomi i realtid utan att knappa in siffror." Real-time economics without manual data entry.
- **Aziz (P-02):** "Jag far tydliga instruktioner pa mitt sprak och tidrapporterar genom att skicka en siffra." Instructions in Arabic, time reporting via WhatsApp number.
- **Lisa (P-03):** "AI flaggar avvikelser innan de blir problem. Jag hanterar undantag, inte rutinarenden." She wants exception-based management, not routine.
- **Erik & Maria Eriksson (P-04):** "Jag fick ett statusfoto varje dag och slutfakturan matchade offerten. Inga overraskningar." Daily photo updates and invoice matching quote.
- **Johan BRF Chairman (P-05):** "Jag far en veckorapport med foton och ekonomi som jag kan vidarebefordra direkt till styrelsen." Weekly board-ready reports.

### Domain Concepts

The spec defines the complete 7-table data model:

- **TENANT:** Physical isolation unit. Status (active/suspended/deleted). Region for data residency.
- **LABEL:** Controlled vocabularies. Type system. Domain + code pairs. Platform-global (tenant_id=NULL) vs tenant-specific. 8 domains at launch.
- **NODE:** Any business entity. 7 launch types: org, person, customer, project, product, location, supplier.
- **EDGE:** Directed typed relationship between two nodes within same tenant.
- **FEDERATION EDGE:** Cross-tenant relationship. Consent-based. No data copying.
- **EVENT:** Append-only business occurrences. 10 launch types.
- **BLOB:** Binary content metadata. File stored externally. Signed URLs.
- **DICT:** Translations, configuration, semantic data.

Business rules formalized:
- ROT: 30% of labor, max 50,000 SEK/year
- RUT: 50% of labor, max 75,000 SEK/year
- VAT: 25% standard, 12% reduced, 6% culture
- Pricing tiers: Free (0 kr/mo), Pro (499 kr/mo), Business (1,499 kr/mo), Enterprise (~99 kr/user/mo)

### Architectural Decisions

- **Data-defined type system:** Adding a new business entity type is a data operation (INSERT into labels), not a code change.
- **Economics always computed from events:** Aggregations always summed from events, never from separate aggregate tables.
- **5-level AI context protocol:** Platform (100 tokens) > Tenant (50) > Project (200) > Detail (2000) > History (500).
- **Integration abstraction layer:** All integrations behind an abstraction. Swap providers without business logic changes.

### Open Questions

- Offline capability (DP-06) specified as SHOULD but implementation approach undefined
- Exact AI model selection left open (technology-agnostic)
- Named personas (Erik & Maria Eriksson) are inventions, not from the conversation
- The "North Star Metric" was AI-generated, not from Kimmo

### Cross-References

- Direct transformation of `voice_recording.txt`. Research report shows ~60% fidelity to original, ~40% AI additions.
- Input to `resonansia-spec.md` (Gen 2).
- Pricing tiers, risk matrix, market research were entirely added by Claude.

## DOCUMENT 4: `bootstrap-spec.md` (Gen 3 -- Execution Instructions)

### Core Principles

1. **The agent is an autonomous executor, not an advisor.** INVARIANT no_laziness: "You MUST write complete files. DO NOT use placeholders."
2. **Non-interactive execution.** All CLI tools must run with flags disabling prompts.
3. **One phase at a time.** Don't hold all phases in context simultaneously.
4. **CLAUDE.md is a map, not the territory.** Under 150 lines. Skills hold the detail.
5. **Skills are self-contained.** Each skill useful without loading other skills.
6. **Verify everything.** Every phase has ARTIFACT, INVARIANT, VERIFY, and GIT blocks.

### Domain Concepts

- 6 skills mapping to domain areas: data-model, event-system, ai-pipeline, federation, integrations, ui
- 7+1 database tables defined as Drizzle ORM schemas
- 7 digital twin services
- 6 integration adapters with swappable provider pattern

### Architectural Decisions

- Turborepo + pnpm workspaces for monorepo
- Next.js 15, App Router, RSC for frontend
- Supabase (PostgreSQL), Drizzle ORM for database
- Vercel AI SDK, Anthropic Claude, OpenAI for AI
- shadcn/ui, Tailwind CSS for components
- @react-pdf/renderer for PDF generation
- Express.js for digital twins on port 9999
- UUIDv7 generated in app layer
- has_federation_access() as SECURITY DEFINER function
- Event resolution via SQL window functions

### Cross-References

- Depends on `docs/resonansia-spec.md`, `docs/tech-decisions.md`, `docs/design-system.md`, `docs/integration-twins.md`
- Creates the infrastructure that phase specs build upon
- Its ARTIFACT/INVARIANT/VERIFY/GIT grammar becomes the standard for all subsequent phase specs

## DOCUMENT 5: `taylor-spec.md` (Gen 1 -- Second Vertical)

### Core Principles

1. **Results over architecture (DP-01).** Born from the Mariano lesson.
2. **Layer, don't replace (DP-02).** Add intelligence on top of existing booking platforms.
3. **Simple enough for Dova (DP-03).** Office team must use admin UI without training.
4. **Shared trunk, different branches (DP-04).** Common infrastructure, vertical-specific config.
5. **AI agents are team members, not features (DP-05).** Each agent has a name, personality, goals.
6. **The cheapest acquisition wins (DP-06).** Optimize for cost-per-lead and cost-per-conversion.
7. **Smartare an alla andra (DP-07).** Competitive edge is intelligence, not volume.
8. **Provenance tracking.** Every requirement tagged as `[domain-expert]`, `[domain-inferred]`, `[architect-decision]`, or `[market-research]`.

### Customer Emotions

- **Pettson's impatience:** Wants to start immediately, burned by delays.
- **Pettson's pragmatism:** Judges by outcomes, not architecture.
- **Office team tech anxiety:** Paper and Excel people.
- **Bjorn's opportunism:** Value-based pricing, gold rush mentality.

### Domain Concepts

- **AI Agent as a node type:** Agent has name, personality, knowledge base, goals, constraints, channels
- **Conversation as a node type:** State machine: initial_contact > qualifying > presenting_options > negotiating > closing > post_sale / escalated / abandoned
- **Campaign as a node type:** Target audience, agent, templates, schedule, A/B variants
- **Booking as a node type:** Mirrors external platform booking, linked to campaign for attribution
- **Lead scoring:** Hybrid -- engagement metrics computed deterministically, fit/intent assessed by AI
- **Human handoff:** AI generates 3-sentence summary. Triggers: explicit request, blocked topics, low confidence, max turns exceeded
- **Rate limits:** Email 50/hr, 200/day. WhatsApp 30/hr, 250/day. SMS 20/hr, 100/day.

### Architectural Decisions

- **Zero new database tables.** All domain concepts mapped to existing 7-table model.
- **The tree architecture:** Platform trunk with branches for Football, Mountain Cabins, Taylor Events.
- **Three AI tiers reused:** Same cheap/medium/expensive pattern.
- **5-level context protocol adapted for agents.**
- **Digital twins reused.**
- **Federation for cross-selling.**

### Cross-References

- Direct transformation of `Recording.txt` (Gen 0)
- Inherits 8 platform constraints from `docs/resonansia-spec.md`
- Implements Domain Insights Companion recommendation from `spec-evolution-research.md`
- Proves the platform's multi-vertical thesis

## DOCUMENT 6: `spec-evolution-research.md` (Meta-Analysis)

### Core Principles

1. **The most valuable information dies first.** Domain expertise is what AI cannot infer, yet almost none survives past Gen 1.
2. **Formality follows a power curve.** Gen 0 > Gen 1 delivers ~70% of value.
3. **The spec determines the ceiling; the agent determines the floor.**
4. **Skills are the sleeper innovation.** The only artifacts that flow knowledge backward.
5. **The pipeline has one too many steps.** Proposed: structured interview > tech spec + domain companion > phase specs.

### Key Findings

- **Information Loss Gradient:** Gen 0 (100% domain) → Gen 1 (60%) → Gen 2 (30%) → Gen 3 (10%) → Gen 4 (5%)
- **Specific losses identified:** Material ratios, wallpaper economics, Berit, Lisa vs Kimmo quoting gap, seasonal patterns, communication as #1 pain
- **Certainty inflation:** Claude converts tentative language ("maybe") into MUST requirements
- **Three Laws of Spec Compilation:** Spec determines ceiling, context is bottleneck, verification must be co-designed

### Cross-References

- Analyzes ALL other documents
- Domain Insights Companion recommendation implemented in taylor-spec.md Section 1
- Provenance tracking recommendation implemented in taylor-spec.md
- GATE block recommendation not yet implemented
- "Communication as primary pain point" identified as the most significant loss

## CROSS-CUTTING THEMES

### Theme 1: The Two Customers, Two Domains

| Dimension | Construction (Vi Malar Sverige) | Travel/Events (Taylor Events) |
|-----------|-------------------------------|------------------------------|
| Domain expert | Kimmo (painter, hands-on) | Pettson (entrepreneur, strategic) |
| Primary pain | Communication, quoting accuracy | Customer acquisition, scaling sales |
| User archetype | Aziz (WhatsApp, Arabic, non-tech) | Dova (paper, Excel, non-tech) |
| AI role | Quote generation, anomaly detection | Sales conversation, content generation |
| Deadline pressure | None stated | April 1, 2026 (hard) |

### Theme 2: The Dual Nature of AI

1. **AI as the product's intelligence layer** -- bounded by strict rules
2. **AI as the builder** -- Claude Code executing spec-to-code transformations

### Theme 3: The Network Effect Vision

The subcontractor-to-customer pipeline appears across multiple documents. The free tier being fully functional is strategically critical.

### Theme 4: The Spec Factory

The project is building a methodology for turning conversations into software -- itself a product/competitive advantage.

### UNRESOLVED TENSIONS

1. Communication-first vs. economics-first dashboard design
2. Technology-agnostic spec vs. technology-locked implementation
3. Offline capability (DP-06) unresolved
4. April 1 deadline vs. platform ambition
5. Free tier unit economics undefined
6. Certainty inflation remains unchecked in original specs

---

## AGENT 2: Architecture Researcher

### Prompt

```
You are a research agent. Read and deeply analyze the MAIN SYSTEM SPECIFICATION of Resonansia. Extract:

1. Data model — all 7 tables, their relationships, RLS policies
2. Event system — append-only, bitemporality, correction chains, resolution
3. AI architecture — tiers, context protocol, what AI can/cannot do
4. Federation model — cross-tenant access, consent, projections
5. Integration patterns — external services, adapters, webhooks
6. Hard constraints — things that must NEVER be violated
7. Patterns — recurring implementation patterns (how things are done)

Read these files:
- docs/resonansia-spec.md
- docs/tech-decisions.md
- CLAUDE.md

Return a structured analysis in markdown format. Focus on extractable RULES and PATTERNS that
another AI must follow. Include line number references where possible for key sections.
```

### Response

# Resonansia System Specification -- Deep Analysis

## Source Files

- `docs/resonansia-spec.md` (1767 lines) -- the authoritative seed specification
- `docs/tech-decisions.md` (335 lines) -- binding technology choices for V1
- `CLAUDE.md` (69 lines) -- project-level coding agent instructions

## 1. DATA MODEL -- The 7+1 Tables

The entire system is modeled on exactly 7 conceptual tables plus 1 cross-tenant table. This is an **axiom** (AXIOM-03, spec line 69) -- complexity is handled through composition, never through new tables.

### 1.1 Table Summary

| Table | Purpose | Has `tenant_id`? | RLS? | Spec Lines |
|-------|---------|-------------------|------|------------|
| **tenants** | Physical isolation unit | N/A (is the tenant) | N/A | 170-194 |
| **labels** | Controlled vocabularies / type system | `null` = platform-global, else tenant-specific | Special | 196-247 |
| **nodes** | Everything that exists: orgs, people, projects, customers, suppliers, products, locations | Yes | Yes + federation | 248-347 |
| **edges** | All relationships between nodes within one tenant | Yes | Yes + federation | 349-403 |
| **events** | Everything that happens. Append-only, bitemporal. | Yes | Yes + federation | 521-739 |
| **blobs** | Binary content metadata (files stored externally) | Yes | Yes + federation | 741-771 |
| **dicts** | i18n translations, configuration, semantics | `null` = platform-global, else tenant-specific | Yes | 773-791 |
| **federation_edges** | Cross-tenant consent-based relations | Has `source_tenant` + `target_tenant` | Own policy | 405-519 |

### 1.2 Key Relationships

- **Node.type_id -> Label.id** (domain = `node_type`)
- **Node.state_id -> Label.id** (domain = `node_state`)
- **Node.parent_id -> Node.id**: hierarchy
- **Edge.source_id -> Node.id**, **Edge.target_id -> Node.id**: directed typed relation
- **Edge.type_id -> Label.id** (domain = `edge_type`)
- **Event.node_id -> Node.id**: which node this event relates to
- **Event.ref_id -> Event.id | Node.id**: link to another node OR to original event (for corrections)
- **Event.actor_id -> Node.id**: who performed the action
- **Event.type_id -> Label.id** (domain = `event_type`)
- **Event.unit_id -> Label.id** (domain = `unit`)
- **Blob.node_id -> Node.id**, **Blob.event_id -> Event.id**
- **Dict.locale_id -> Label.id** (domain = `locale`)

### 1.3 Label System -- The Type System (spec lines 196-247)

Labels are THE type system. Types are data-defined, not code-defined.

**Three levels** (spec line 213-216): Platform, Organization, User (future)

**Lookup priority** (spec line 222-224): org-specific shadows platform-global for same `domain+code`.

**Required domains at launch** (spec lines 236-247):
- `node_type`: org, person, project, customer, supplier, product, location
- `edge_type`: member_of, assigned_to, subcontractor_of, located_at, owns
- `event_type`: time, material, photo, message, quote_line, invoice_line, adjustment, state_change, payment
- `node_state`: draft, active, in_progress, completed, archived, cancelled
- `unit`: hour, minute, sqm, lm, piece, kg, liter
- `currency`: sek, nok, dkk, eur, usd
- `locale`: sv, en, ar, pl, tr, fi, no, da
- `blob_kind`: photo, document, invoice_scan, delivery_note, signature

**Caching rule** (spec line 227-228): entire label table SHOULD be cached in memory.

### 1.4 Node Data Schemas (spec lines 282-347)

Each node type has a strict SCHEMA for its `data` JSONB column:
- `NodeData_Org`, `NodeData_Person`, `NodeData_Customer`, `NodeData_Project`, `NodeData_Product`, `NodeData_Location`, `NodeData_Supplier`

### 1.5 RLS Policies (tech-decisions lines 199-269)

Standard pattern:
- **SELECT**: `tenant_id = jwt.tenant_id OR has_federation_access(tenant_id)`
- **INSERT/UPDATE**: `tenant_id = jwt.tenant_id` ONLY (federation is read-only)

`has_federation_access()` is `SECURITY DEFINER`. Requires index: `federation_edges(source_tenant, target_tenant, status)`.

**Critical:** `has_federation_access()` grants ROW-level access. Column-level masking is in the application layer via Projection Scope Zod schemas.

## 2. EVENT SYSTEM

### 2.1 Bitemporality (spec lines 553-570)

- **Transaction Time**: embedded in `id` (UUIDv7). When the system learned.
- **Valid Time**: stored as `occurred_at`. When it happened in reality.
- **State resolution** MUST use Transaction Time (`id`)
- **Reporting** MUST group by Valid Time (`occurred_at`)
- UUIDv7 MUST be generated in app layer, not by database

### 2.2 Append-Only and Corrections (spec lines 572-591)

- Events are append-only. No UPDATE or DELETE ever.
- Corrections MUST NOT form recursive chains
- Adjustment event.ref_id MUST always point to ORIGINAL root event
- Resolution: SELECT adjustment with highest `id` for a given `ref_id`

### 2.3 Active Event Resolution SQL (spec lines 621-665)

```sql
WITH ranked AS (
  SELECT
    COALESCE(e.ref_id, e.id) AS root_id,
    e.id, e.qty, e.unit_price,
    e.qty * e.unit_price AS total,
    e.type_id, e.node_id, e.actor_id, e.occurred_at,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(e.ref_id, e.id)
      ORDER BY e.id DESC
    ) AS rn
  FROM events e
  WHERE e.tenant_id = $1 AND e.node_id = $2 AND e.type_id = ANY($3)
)
SELECT * FROM ranked WHERE rn = 1
```

### 2.4 Economic Aggregation (spec lines 595-660)

- Events are immutable source of truth for all economics
- `total` MUST equal `qty * unit_price` for every event
- Cache reconciliation: daily job sampling >= 10% of active projects, delta threshold 0.01 SEK

### 2.5 Event Data Schemas (spec lines 685-739)

EventData_Time, EventData_Material, EventData_Photo, EventData_Message, EventData_QuoteLine, EventData_InvoiceLine, EventData_Adjustment, EventData_StateChange, EventData_Payment, EventData_Note

### 2.6 Event Origin

PostgreSQL enum: `'human' | 'ai_generated' | 'system' | 'external_api'`

### 2.7 AI Transient Proposals (spec lines 667-683)

AI proposals MUST NOT be written as Events until explicitly approved by human. On "Approve": system maps payload into immutable events with `origin=ai_generated`.

## 3. AI ARCHITECTURE

### 3.1 Core Principles (spec lines 1155-1184)

| Principle | Rule |
|-----------|------|
| Transparency | AI MUST always show where information comes from |
| Correctability | Every AI action MUST be undoable |
| Model agnostic | System MUST be able to swap models |
| Tiering | Cheap for classification, expensive for generation |
| **NO ARITHMETIC** | AI returns qty + unit_price. System computes totals. |
| Context hierarchy | 5 levels with token budgets |

### 3.2 AI Model Tiers (tech-decisions lines 285-307)

| Tier | Provider | Model | Max Tokens | Use Cases |
|------|----------|-------|------------|-----------|
| cheap | OpenAI | gpt-4o-mini | 1000 | Classification, translation, summarization |
| medium | Anthropic | claude-haiku-4-5 | 2000 | OCR, anomaly detection |
| expensive | Anthropic | claude-sonnet-4-5 | 4000 | Quote generation, complex Q&A |

### 3.3 AI Context Protocol (spec lines 1242-1286)

| Level | Name | Budget | When Included |
|-------|------|--------|---------------|
| 0 | Platform | ~100 tokens | Always |
| 1 | Tenant | ~50 tokens | Always |
| 2 | Project | ~200 tokens | Project-related |
| 3 | Detail | ~2000 tokens | Detailed queries |
| 4 | History | ~500 tokens | Comparison/analysis |

### 3.4 Anomaly Shield (spec lines 1288-1308)

- Phase 1 (< 100 events): platform-wide stats. Flag if > 5x median.
- Phase 2 (>= 100 events): tenant-specific stats. Flag if > 3x std dev.
- Flagged events are NOT excluded -- annotated in prompt.

### 3.5 Blind Spot Prevention (spec lines 1310-1332)

Must evaluate against BOTH: A) project's approved quote AND B) historical data for similar projects. Minimum 3 similar projects for baseline.

## 4. FEDERATION MODEL

### 4.1 Hard Invariants

- Consent-based: Target must actively accept
- No copy: Only pointers, never data duplication
- Bidirectional visibility: Both sides MAY see the relation
- Projection only: Never raw table access
- Strict restriction: Custom scopes can only RESTRICT, never EXPAND
- Revocation: Access immediately severed. Events remain (append-only). GDPR = crypto-shred PII, retain economics.

### 4.2 Projection Views (spec lines 468-502)

| Scope | Visible | Excluded |
|-------|---------|----------|
| `SubcontractorProjectionView` | project name/address, own events, work order | margins, quotes, invoices, other actors, rates, customer data |
| `ClientProjectionView` | project name, status, photos, AI summary | all costs, notes, subcontractor details |
| `SupplierProjectionView` | material events for their products | everything else |

### 4.3 Consent Flow (spec lines 504-519)

1. Source initiates → 2. WhatsApp with magic link → 3. Projection contract in target's language → 4. Accept → 5. Log (IP, timestamp, user agent, scope) → 6. Status=accepted → 7. Revocation available

## 5. INTEGRATION PATTERNS

### 5.1 Required Integrations (spec lines 1441-1478)

AccountingIntegration (Fortnox), WhatsAppIntegration, SmsIntegration, EmailIntegration, ObjectStorageIntegration, AiModelIntegration

### 5.2 Important Integrations (spec lines 1480-1496)

SigningIntegration (BankID), TaxAuthorityIntegration (Skatteverket), MapIntegration, EInvoiceIntegration (Peppol)

### 5.3 Next.js Routing Rules (tech-decisions lines 56-101)

| Pattern | Use |
|---------|-----|
| RSC | ALL data fetching. Call Drizzle directly. NEVER fetch() own API. |
| Server Actions | ALL mutations. Zod validate, Drizzle mutate, revalidatePath. |
| Route Handlers | ONLY for webhooks, PDF, cron. |
| Client Components | ONLY for interactive UI. Receive data as props. |

## 6. HARD CONSTRAINTS

### 6.1 Architectural

1. 7 tables only (AXIOM-03)
2. Events are append-only (spec line 576)
3. AI proposes, human decides (AXIOM-02)
4. AI never does arithmetic (spec lines 1171-1178)
5. RLS on every table (spec line 1537)
6. Event resolution in SQL (spec lines 621-664)
7. Bitemporality (spec lines 556-569)

### 6.2 Data Integrity

8. `total = qty * unit_price` always
9. Correction root pointer (never chain)
10. UUIDv7 in app layer
11. Tenant isolation
12. Label extensibility (data INSERT, not code)
13. Cache rebuildable from events

### 6.3 Security

14. Federation is read-only
15. Projection scopes only restrict
16. Signed URLs for blobs
17. Crypto-shredding preserves economics
18. Token counting must be accurate (use tokenizer library)
19. Truncation must be disclosed

### 6.4 Drizzle/Postgres

20. `db.execute()` result: `result as unknown as T[]`, NOT `result.rows`
21. Array filter: `IN (${sql.join(...)})`, NOT `ANY(${ids})`

## 7. RECURRING PATTERNS

1. **Label Lookup** — domain+code, tenant-specific shadows platform
2. **Event Creation** — UUIDv7, Zod validate, computeTotal, set origin, INSERT
3. **Correction** — new event with ref_id to ROOT, window function resolves
4. **AI Proposal** — generate → transient store → recompute totals → human review → approve → create events
5. **Federation Access** — RLS row-level, Zod schema column-level
6. **Integration Adapter** — interface → concrete impl → twin for testing → per-tenant config
7. **Next.js Data Flow** — RSC→Drizzle for reads, Server Actions for writes, Route Handlers for webhooks
8. **Zod Schema Mapping** — every SCHEMA block → Zod schema → TypeScript type
9. **Project Economics** — quote_total, time_cost, material_cost, invoiced, margin from active events
10. **Messaging Flow** — webhook → identify sender → classify intent → extract params → create event → respond → notify

---

## AGENT 3: Phase & Implementation Researcher

### Prompt

```
You are a research agent. Read and deeply analyze all PHASE SPECIFICATIONS and implementation
history. Extract:

1. Phase progression — what was built in what order and why
2. Implementation patterns — recurring approaches across phases
3. Lessons learned — what changed from spec to implementation
4. Dependencies — what each phase builds on
5. Technical choices — specific libraries, APIs, patterns chosen
6. What exists now — the current state of the system after all phases

Read these files:
- docs/phase-1-spec.md
- docs/phase-2-spec.md
- docs/phase-3-spec.md
- docs/phase-4-spec.md
- docs/phase-3-research-report.md

Return a structured analysis in markdown format. Focus on the EVOLUTION — how understanding
deepened over time, what patterns solidified.
```

### Response

# Resonansia: Phase Evolution Analysis

## 1. Phase Progression

### Phase 1: Foundation (Data Layer, Auth, Minimal UI)

**Purpose:** Establish the architectural bedrock.

**What was built:**
- Local Supabase with all 8 core tables
- RLS policies on every table
- Drizzle ORM schema and client
- UUIDv7 ID generation in application layer
- Label system with cache
- Node CRUD with Zod validation per type
- Edge CRUD with same-tenant enforcement
- Complete event system: creation, correction chains, active event resolution via SQL window functions
- `computeTotal()` as the single arithmetic function
- Project economics calculation from active events only
- Authentication with Supabase Auth, tenant provisioning on registration
- Minimal dashboard and project detail pages

**Why first:** The spec declares "Events are the economic source of truth." Without the event system, nothing downstream can function.

### Phase 2: Messaging & Field Worker Interaction

**Purpose:** Prove the system works for the primary persona: a subcontractor who never logs in.

**What was built:**
- Phone number normalization and sender identification
- AI message classification (GPT-4o-mini) with Zod structured output
- AI translation with construction glossary
- Central message handler (classify-then-act pipeline)
- WhatsApp and SMS webhook endpoints
- Outbound messaging and work order generation
- Integration adapter layer with digital twins
- In-app notification system

**Why second:** Validates the core product hypothesis: "Send 8 on WhatsApp to report 8 hours."

### Phase 3: Quoting & Invoicing

**Purpose:** Complete the revenue cycle.

**What was built:**
- ROT/RUT calculation engine (pure deterministic functions)
- ROT/RUT yearly cap tracking
- AI abstraction layer with tiered models
- Hierarchical AI context builder with token budgeting
- Transient proposal system (AI drafts outside events table until approval)
- Proposals database table
- AI quote generation with catalog matching
- PDF generation for quotes and invoices
- Customer-facing quote view (public, no auth) with BankID signing
- Quote token generation (HMAC-signed capability tokens)
- Quote delivery via SMS/email/WhatsApp
- Invoice generation with deviation detection
- Fortnox accounting sync adapter
- Skatteverket ROT/RUT submission
- Material OCR via AI for delivery note scanning
- Quote and Invoice UI with proposal editor

**Why third:** This is the money-making machinery. Phases 1-2 capture data; Phase 3 monetizes it.

### Phase 4: Communication & Automatic Reporting (Specified, Not Yet Built)

**Purpose:** Make the system proactive rather than reactive.

**What is specified:**
- Project communication configuration
- AI summarization of project activity
- Auto-status generation engine
- Customer reply handling
- Scheduled job infrastructure
- BRF weekly reports
- Report PDF generation
- Communication settings UI

**Current status:** Not yet implemented. Research report identifies 7 critical and 9 high-priority issues to resolve first.

## 2. Implementation Patterns

### Pattern A: "Pure Function First, Then Integration"

Every phase starts with pure calculation modules, then layers integration:
- Phase 1: `computeTotal()` before any UI
- Phase 2: Phone normalization before webhooks
- Phase 3: ROT/RUT engine before AI or PDF

### Pattern B: "AI Proposes, Human Decides"

The transient proposal pattern:
1. AI generates structured output into `TransientProposal`
2. Stored outside events table
3. User reviews, edits, approves
4. Only on approval do events get created with `origin = 'ai_generated'`

### Pattern C: "AI Never Does Arithmetic"

AI returns `qty` and `unitPrice`. System computes `total = computeTotal(qty, unitPrice)`. Research report scored 10/10 compliance.

### Pattern D: "Tiered AI with Structured Output"

Three tiers (cheap/medium/expensive). All use Zod schemas with `generateObject()`.

### Pattern E: "Everything is an Event"

Every WhatsApp message, state change, Fortnox sync, Skatteverket submission, BankID signing = event.

### Pattern F: "Digital Twins for All External Services"

Twin server on port 9999. Every adapter takes `baseUrl` constructor. Enables fully offline testing.

### Pattern G: "Label System as Vocabulary"

All type discrimination via labels, not string enums. Loaded once per request via React `cache()`.

## 3. Lessons Learned

### Lesson 1: File Paths Wrong in Spec
Spec wrote `apps/web/app/...` but actual structure is `apps/web/src/app/...`. Caused files in wrong locations.

### Lesson 2: Drizzle ORM Hidden Traps
`postgres-js` returns results as arrays directly, not via `.rows`. Caused **22 fix edits** in Phase 3.

### Lesson 3: Column Naming Inconsistency
`from_id`/`to_id` used when database defines `source_id`/`target_id`. P0 crash bug.

### Lesson 4: "Choose One" Creates Confusion
Spec offered options without deciding. Agent had to guess, sometimes incorrectly.

### Lesson 5: Verification at End Too Late
Phase 3 final verification consumed **78 tool calls**. Bugs accumulated. Recommendation: `pnpm tsc --noEmit` gates after every section.

### Lesson 6: Narrative VERIFYs Not Executable
"Generate quote for '3 rum, 85 kvm'" requires running AI. Replace with executable test skeletons.

### Lesson 7: UI Specs Underspecified
Section 11 scored lowest (5-6). Described behavior in prose without component hierarchy or data fetching.

### Lesson 8: Proposal Editor Edits Silently Discarded
P1 bug: editor allowed edits but approved original database version. `updateProposalLine` existed but wasn't wired.

### Lesson 9: Security Defaults Matter
- HMAC secret had fallback to well-known string (P0)
- BankID accepted client-supplied personnummer (P1)
- Two server actions never called `getSession()` (P1)

## 4. Dependencies

```
Phase 1 (Foundation)
  +---> Phase 2 (Messaging)
  |       +---> Phase 3 (Quoting & Invoicing)
  |       |       +---> Phase 4 (Communication & Reporting)
```

Phase 4 is the most dependent: requires messaging (Phase 2), PDF generation (Phase 3), AI infrastructure (Phases 2-3), and complete data layer (Phase 1).

## 5. Technical Choices

- TypeScript (strict), Next.js 15 App Router RSC, Server Actions for mutations
- Supabase (PostgreSQL), Drizzle ORM, RLS, UUIDv7 in app layer
- Vercel AI SDK, GPT-4o-mini / Claude Haiku 4.5 / Claude Sonnet 4.5
- @react-pdf/renderer, Express.js twins on port 9999
- Turborepo + pnpm workspaces
- Zod for all validation

## 6. Current State

**Implemented (Phases 1-3):** ~40+ database files, 15+ shared schemas, 25+ core business logic modules, 7 integration adapters, 4 PDF files, 35+ web app files, digital twin server.

**Known bugs:** 3 P0, 6 P1, 6 P2 (see phase-3-research-report.md).

**Not built:** Phase 4 (auto-reporting, customer reply handling, scheduled jobs, BRF reports).

## 7. How Understanding Deepened

- **Phase 1:** Obsessively focused on invariants. Highest spec quality. Proves arithmetic works.
- **Phase 2:** Discovered integration boundary. Webhooks run outside auth. "Every message is an event."
- **Phase 3:** "AI proposes, human decides" becomes concrete. Transient proposals = cleanest pattern. UI = weakest area. First serious self-reflection via research report.
- **Phase 4:** Most dangerous invariant: `cost_details_never_leak`. Shift to background processing and idempotency.

**Meta-pattern:** The project evolved from "building features" to "understanding how to build features well."

| Aspect | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Focus | Data integrity | External interaction | Revenue cycle | Proactive communication |
| Core Pattern | Append-only events | Classify-then-act | AI proposes, human decides | Auto-status with safety rails |
| Key Innovation | Correction chains | Multilingual WhatsApp | Transient proposals | Cost-leak prevention |
| AI Usage | None | Cheap tier | All tiers | Cheap + Medium |
| Spec Quality | Highest | Good | Mixed (UI weak) | Benefits from lessons |
| Status | Implemented | Implemented | Implemented (bugs) | Specified only |

---

## AGENT 4: Skills & Patterns Researcher

### Prompt

```
You are a research agent. Read and deeply analyze all 6 SKILL FILES that encode domain knowledge
for AI assistants working on Resonansia. Extract:

1. Per skill: core rules — the must-follow directives
2. Per skill: patterns — code patterns, SQL patterns, naming conventions
3. Per skill: anti-patterns — things explicitly prohibited
4. Cross-skill connections — how skills reference each other
5. Implementation templates — reusable code/SQL templates embedded in skills
6. Decision trees — when to use what approach

Read these files:
- .claude/skills/data-model/SKILL.md
- .claude/skills/event-system/SKILL.md
- .claude/skills/ai-pipeline/SKILL.md
- .claude/skills/federation/SKILL.md
- .claude/skills/integrations/SKILL.md
- .claude/skills/ui/SKILL.md

Return a structured analysis in markdown format. These skills are the ENCODED WISDOM of the
project — every rule exists for a reason. Capture that reasoning.
```

### Response

# Resonansia Skill Files -- Deep Analysis

## 1. DATA-MODEL SKILL

### Core Rules

1. **7+1 tables, no exceptions.** All business logic fits within these tables. Creating a new table is categorically prohibited.
2. **RLS on every table with `tenant_id`.** Federation via `has_federation_access()`, never by disabling RLS.
3. **UUIDv7 generated in application layer.** Database does not generate IDs.
4. **Binary content never stored in database.** `blobs` holds metadata and URL only.
5. **Never use `service_role` key in API handlers.** Always `anon` key + RLS.

### Patterns

- **Node polymorphism via labels:** Single `nodes` table, `type_id` determines schema of `data` (JSONB).
- **Edge typing:** Directed, typed relations with auxiliary data schemas.
- **Event typing:** Everything that happens is an event with a data schema.
- **Label domains:** 8 domains at launch.

### Critical Drizzle Traps

**Trap 1 -- `db.execute()` return shape:**
```typescript
// WRONG: result.rows is undefined
const labels = result.rows as Label[];
// CORRECT: result IS the array
const labels = result as unknown as Label[];
```

**Trap 2 -- SQL array parameters:**
```typescript
// WRONG: "op ANY/ALL requires array on right side"
sql`AND e.type_id = ANY(${typeIds})`
// CORRECT: use IN with sql.join
sql`AND e.type_id IN (${sql.join(typeIds.map(id => sql`${id}`), sql`, `)})`
```

## 2. EVENT-SYSTEM SKILL

### Core Rules

1. **Append-only, forever.** No UPDATE, no DELETE.
2. **Bitemporality is structural.** `id` (UUIDv7) = transaction time. `occurred_at` = valid time.
3. **Root pointer corrections, never recursive.** ref_id MUST point to original root.
4. **Event resolution in SQL only.** Window functions, never JavaScript.
5. **AI proposals transient until approved.**

### Canonical Active Event Resolution SQL

```sql
WITH ranked AS (
  SELECT
    COALESCE(e.ref_id, e.id) AS root_id, e.*,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(e.ref_id, e.id)
      ORDER BY e.id DESC
    ) AS rn
  FROM events e
  WHERE e.tenant_id = $1 AND e.node_id = $2 AND e.type_id = ANY($3)
)
SELECT * FROM ranked WHERE rn = 1
```

### Project Economics Formula

```
quote_total   = SUM(active quote_line events .total)
time_cost     = SUM(active time events .total)
material_cost = SUM(active material events .total)
invoiced      = SUM(active invoice_line events .total)
margin        = quote_total - (time_cost + material_cost)
```

### Cache Reconciliation

Daily job samples 10% of active projects. Delta > 0.01 SEK triggers rebuild. Delta in > 5% of samples triggers full rebuild.

### Anti-Patterns

- NEVER aggregate in JavaScript
- NEVER use recursive CTEs for corrections
- AI returns ONLY qty and unit_price
- NEVER load all events into memory

## 3. AI-PIPELINE SKILL

### Core Rules

1. **AI never does arithmetic.** Returns qty + unit_price. System computes total.
2. **Three model tiers.** CHEAP (gpt-4o-mini), MEDIUM (claude-haiku-4-5), EXPENSIVE (claude-sonnet-4-5). Never hardcode model names.
3. **Truncation transparency mandatory.** Must disclose what was omitted.
4. **Anomalies never silently excluded.** Annotated in prompt, AI must mention them.
5. **Use tokenizer, never estimate.** `@anthropic-ai/tokenizer` for Anthropic models.

### Capability-to-Tier Mapping

| Capability | Tier | Latency |
|---|---|---|
| classify_message | CHEAP | < 2s |
| translate | CHEAP/MEDIUM | < 2s |
| summarize | CHEAP | < 2s |
| evaluate_scope_similarity | CHEAP | < 2s |
| understand_document (OCR) | MEDIUM | < 5s |
| detect_anomaly | MEDIUM | < 5s |
| generate_quote | EXPENSIVE | < 10s |
| answer_question | EXPENSIVE | < 10s |

### Context Protocol (5 Levels)

Level 0 Platform (~100), Level 1 Tenant (~50), Level 2 Project (~200), Level 3 Detail (~2000), Level 4 History (~500).

### Anomaly Shield (2-phase)

- Phase 1 (< 100 events): platform-wide stats, flag if > 5x median.
- Phase 2 (>= 100 events): tenant-specific stats, flag if > 3x std dev.

### Blind Spot Prevention

Evaluate actuals against BOTH the project's quote AND historical similar projects. Min 3 similar projects required.

## 4. FEDERATION SKILL

### Core Rules

1. **Read-only.** Cross-tenant access NEVER grants write.
2. **Custom scopes only restrict, never expand.**
3. **Never copy data between tenants.** Only pointers.
4. **Revocation severs access immediately.** Crypto-shred PII, retain economics.
5. **`has_federation_access()` is SECURITY DEFINER.**

### Projection Scopes

| Scope | Sees | Excluded |
|---|---|---|
| subcontractor_default | project name/address, own events, work order | margins, quotes, invoices, rates, customer data |
| client_default | project name, status, photos, AI summary | all costs, notes, subcontractor details |
| supplier_default | material events for their products | everything else |

### Consent Flow

1. Source initiates → 2. WhatsApp magic link → 3. Projection contract in target's language → 4. Accept → 5. Log proof → 6. Status=accepted → 7. Revocation available

### RLS for federation_edges

```sql
CREATE POLICY "federation_edge_visibility" ON federation_edges
  FOR SELECT USING (
    source_tenant = jwt_tenant_id OR target_tenant = jwt_tenant_id
  );
```

## 5. INTEGRATIONS SKILL

### Core Rules

1. **All integrations behind an adapter interface.** Swapping provider = zero business logic changes.
2. **Never hardcode API URLs.** Environment variables for twin/prod switching.
3. **Never call real APIs in tests.** Twin server on port 9999.
4. **Never import a specific adapter directly.** Import the interface.

### 7 Integrations

| Service | Purpose |
|---|---|
| WhatsApp Business Cloud API | Messaging |
| SMS (46elks) | SMS fallback |
| Fortnox | Accounting sync |
| BankID | Swedish digital signing |
| Email (Resend) | Email |
| Skatteverket ROT/RUT | Tax deduction claims |
| Supabase Storage | Object storage |

### Twin Architecture

Single Express.js server on port 9999. Control endpoints:
- `POST /twin/reset` — clear state
- `GET /twin/inspect/:service` — return data
- `POST /twin/simulate-incoming` — trigger inbound webhook
- `POST /twin/fail-next/:service` — next call returns error

## 6. UI SKILL

### Core Rules

1. **AI content visually distinct.** `bg-violet-50`, `border-violet-200`, label, source refs.
2. **RSC for data, Server Actions for mutations, Route Handlers only for webhooks/PDF/cron.**
3. **Never `fetch()` own API from Client Component.**
4. **Color never sole indicator.** Always pair with icon or text.
5. **Numbers right-aligned, monospace, locale-formatted.** Swedish: "45 000,00 kr".

### Color Palette

Primary: slate-900. Accent: blue-600. Success: green-600. Warning: amber-500. Danger: red-600. AI: violet-50/200/700.

### Component Taxonomy

| Category | Components |
|---|---|
| Data Display | DataTable, KpiCard, Timeline, EconomicsBar, StatusBadge |
| AI Content | AiInsightCard, AiProposalView, AiSourceRef, AiTruncationNotice |
| Forms & Input | QuoteBuilder, TimeInput, PhotoUpload, NodeSelector |
| Communication | MessageThread, BroadcastPreview, FederationConsentView |

### StatusBadge Colors

draft=slate, active=blue, in_progress=amber, completed=green, cancelled=red

## 7. CROSS-SKILL CONNECTIONS

- **Data-Model ↔ Event-System:** UUIDv7 as PK IS transaction time. ref_id enables corrections.
- **Data-Model ↔ Federation:** `has_federation_access()` bridges tenant isolation and cross-tenant access.
- **Event-System ↔ AI-Pipeline:** "AI proposes, human decides" in both. origin=ai_generated marks approved AI events. Anomaly detection operates on active events.
- **AI-Pipeline ↔ UI:** Violet palette renders what AI produces. AiTruncationNotice = truncation transparency.
- **Federation ↔ Integrations:** Consent flow uses WhatsApp to send magic links.
- **Integrations ↔ Event-System:** External API events have origin=external_api.
- **Data-Model ↔ UI:** Node types map to views. Labels drive StatusBadge colors.

## 8. IMPLEMENTATION TEMPLATES

1. **Active Event Resolution SQL** — the canonical query
2. **RLS Policy with Federation** — tenant_id check OR has_federation_access()
3. **has_federation_access() Function** — SECURITY DEFINER, checks federation_edges
4. **AI Tier Config** — AI_TIERS constant
5. **Adapter Interface** — MessagingAdapter, AccountingAdapter
6. **Safe Drizzle Array Parameter** — sql.join pattern
7. **Safe Drizzle Result Access** — result as unknown as T[]

## 9. DECISION TREES

### "Where does this data go?"

```
Business entity? → NODES (type via label)
Relationship? → EDGES (type via label)
Something that happened? → EVENTS (append-only)
File/image? → BLOBS (metadata) + object storage
Translation/config? → DICTS
Cross-tenant? → FEDERATION_EDGES
None? → Re-examine. Do NOT create a new table.
```

### "Which AI tier?"

```
Classification/translation/summary? → CHEAP (gpt-4o-mini, <2s)
OCR/anomaly detection? → MEDIUM (claude-haiku-4-5, <5s)
Quote/content generation? → EXPENSIVE (claude-sonnet-4-5, <10s)
```

### "How do I correct an event?"

```
1. NEVER update or delete
2. Create new event with ref_id = ROOT event id
3. Active event resolution picks latest automatically
```

### "Where do I fetch data?"

```
Page rendering? → RSC, Drizzle directly
Mutation? → Server Action, Zod validate
Webhook/PDF/cron? → Route Handler
Client Component needs data? → Props from parent RSC. NEVER fetch() own API.
```

### "How do I handle federation?"

```
Own tenant? → Normal RLS
Federation edge exists + accepted? → Apply projection scope (restrict-only)
No edge? → Access denied (RLS blocks)
```

### "How do I call external services?"

```
1. Import INTERFACE, not concrete implementation
2. Read API URL from environment variable
3. Tests: localhost:9999 (twin). Production: real API.
```

## 10. THE REASONING BEHIND THE RULES

| Rule | Why It Exists |
|---|---|
| 7+1 tables only | Prevents schema sprawl. Simplifies RLS. |
| Append-only events | Audit trail for Swedish regulations. Bitemporal queries. |
| Root pointer corrections | O(1) resolution, not O(n) recursive walks. |
| SQL-only aggregation | Prevents memory blowout. DB indexes optimize. |
| AI never arithmetic | LLMs hallucinate math. Deterministic = correct invoices. |
| Truncation transparency | Business decisions need complete data disclosure. |
| Anomaly shield 2-phase | New tenants bootstrap from platform stats. |
| Federation read-only | Write isolation is absolute. |
| Projection restrict-only | Prevents accidental data exposure. |
| Crypto-shred GDPR | Append-only can't delete. Encrypt + destroy key. |
| Adapter pattern | Provider swaps without business logic changes. |
| Twin server | Deterministic, fast, free testing. |
| AI violet palette | Instant visual distinction for trust. |
| RSC for data | Avoids unnecessary network hops. Streaming benefits. |
| UUIDv7 in app | Monotonic ordering aligned with event creation. |
| Drizzle traps documented | Actually occurred. Cost debugging time. Prevention > cure. |

---

## AGENT 5: UX, Scenarios & Design Researcher

### Prompt

```
You are a research agent. Read and deeply analyze the USER EXPERIENCE and DESIGN documents
of Resonansia. Extract:

1. User personas — who uses this system and what they need
2. User journeys — key workflows and scenarios
3. Design principles — visual and interaction patterns
4. Component patterns — reusable UI building blocks
5. PDF/document generation — quote and invoice patterns
6. Emotional design — how the UI should make users feel
7. Accessibility — RTL support, mobile, etc.

Read these files:
- docs/design-system.md
- docs/resonansia-scenarios.md
- docs/integration-twins.md

Return a structured analysis in markdown format. Focus on the HUMAN side — what does the
customer experience look like, and how do technical decisions serve that experience.
```

### Response

# Resonansia -- User Experience and Design Analysis

## 1. User Personas

The system defines five distinct personas spanning a spectrum from highly technical desktop users to people who will never log in. **Most users of this system are not users of this system in the traditional sense.**

### P-01: Kimmo -- The Business Owner
- **Company:** Vi Tre Malar Sverige AB (3 employees + 2 subcontractors)
- **Primary interface:** Web app on laptop (office), mobile app (field)
- **Needs:** Full operational control -- quoting, invoicing, project oversight, economic visibility, AI insights.
- **Key insight:** Kimmo is the *only* persona who uses the full product surface.

### P-02: Aziz -- The Subcontractor
- **Primary interface:** WhatsApp only. Never logs into any app.
- **Language:** Arabic (mother tongue), basic Swedish
- **Needs:** Receive work orders, report time, send photos, mark complete -- all from WhatsApp.
- **Key insight:** The system must be invisible to him. AI classification IS the UI.

### P-03: Lisa -- The Office Admin
- **Primary interface:** Web app on desktop (power user)
- **Needs:** Project coordination, delivery note scanning, invoice generation, deviation checking.
- **Key insight:** Highest-volume web user. Needs information density, accuracy, throughput.

### P-04: Erik & Maria Eriksson -- The Homeowner Customers
- **Primary interface:** Email and SMS. No account, no login, ever.
- **Needs:** Receive quotes and invoices, sign via BankID, receive daily status with photos.
- **Key insight:** Their impression of Kimmo is shaped by PDF quality and message tone.

### P-05: Johan -- The Property Association Chairman
- **Primary interface:** Email and PDF reports. No account.
- **Needs:** Weekly progress reports with photos and economics for BRF board.
- **Key insight:** Judges the entire system by quality of a single weekly PDF.

### Persona Spectrum

| Persona | Interface | Account? | Login? |
|---------|-----------|----------|--------|
| Kimmo | Full web app | Yes | Yes |
| Lisa | Full web app (desktop) | Yes | Yes |
| Aziz | WhatsApp | No | Never |
| Erik/Maria | SMS + email links | No | Never |
| Johan | Email PDFs | No | Never |

**3 out of 5 personas never log in.** The primary interface for most humans is messaging and generated documents, not the web UI.

## 2. User Journeys

### Journey 1: Quote to Signing (S-01)

Kimmo creates project → uploads photos → enters description → requests AI quote → AI produces TRANSIENT proposal → Kimmo reviews, adjusts → clicks "Approve" → events created, PDF generated → sends via SMS → Eriksson views (no login) → signs with BankID → project active.

**Target:** Under 30 minutes from photos to signed quote.

### Journey 2: Subcontractor Work Execution (S-02)

Kimmo assigns Aziz → Aziz receives WhatsApp work order in Arabic → replies "OK" → sends photo + "8" daily (classified as 8h) → system confirms in Arabic → Day 5: "klart" (completion) → system confirms, marks complete.

**Key:** AI classification is the UI. No buttons, no forms.

### Journey 3: Daily Customer Status (S-03)

End of day → system collects events → AI generates summary → SMS sent to customer with photos → no cost details unless opted in.

**Key:** Under 200 characters + photos. Professional, human-sounding.

### Journey 4: Invoicing with Deviation Flagging (S-04)

Lisa marks complete → generates invoice proposal → system flags deviations ("Material 12% over quote") → Lisa adjusts → approves → PDF generated with ROT breakdown → sent to customer, synced to Fortnox, ROT submitted to Skatteverket.

### Journey 5: AI Insight Prevents Loss (S-05)

Background AI analyzes projects → compares against history → detects 15% above average → notification with linked delivery notes → Kimmo discovers mis-order, saves money.

**Key:** AI claims must cite sources. Clickable through to underlying events.

### Journey 6: Subcontractor Becomes Customer (S-06)

Aziz taps "Start your own account" → new tenant → existing data migrated with consent → federation edge connects tenants → Aziz sends Arabic quotes from own account.

**Target:** Under 5 minutes onboarding. Network growth mechanism.

### Journey 7: Federation Consent (S-07)

Kimmo invites Piotr → WhatsApp in Polish with magic link → consent page in Polish showing exact projection → Piotr accepts → federation edge created → revocation available anytime.

**Key:** Consent must be explicit click, not "reply YES". Proof logged.

## 3. Design Principles

### 3.1 Speed Over Polish
Dashboard loads under 2 seconds. No unnecessary animations. Skeleton loading. Optimistic updates.

### 3.2 Obvious Without Training
"A painter who has never used business software should understand the dashboard in 10 seconds." Plain sidebar with text labels.

### 3.3 Density Where It Matters, Space Where It Helps
- Dense: economics tables, event timelines, financial summaries (DataTable)
- Spacious: message views, photo galleries, quote builders

### 3.4 AI Transparency (AXIOM-05)
Violet palette (`bg-violet-50`, `border-violet-200`, `text-violet-600`). Every AI claim links to source. "AI Draft -- Review before approving" on every proposal.

### 3.5 Two-Tap Maximum
Dashboard → Create project. Project → Register time. Quote → Send to customer.

### 3.6 Anti-Patterns
- Never fetch own API from Client Component
- Never show AI content without violet distinction
- Never use color alone as indicator
- Never show stack traces to users

## 4. Component Patterns

### Data Display

| Component | Purpose |
|-----------|---------|
| DataTable | Lists of projects, events, invoices. Sortable, filterable. |
| KpiCard | Dashboard summary numbers + trend arrow |
| Timeline | Event feed, chronological, grouped by day |
| EconomicsBar | Quote vs. actual with margin |
| StatusBadge | draft=slate, active=blue, in_progress=amber, completed=green, cancelled=red |

### AI Content

| Component | Critical Rule |
|-----------|---------------|
| AiInsightCard | Always violet palette, always with source refs |
| AiProposalView | "AI Draft -- Review before approving", edit-in-place |
| AiSourceRef | Every AI claim must have one |
| AiTruncationNotice | Shows count of items not included |

### Forms & Input

QuoteBuilder (line-item editor), TimeInput (quick time registration), PhotoUpload (drag-drop/camera), NodeSelector (unified entity search)

### Communication

MessageThread (WhatsApp-style), BroadcastPreview (review before send), FederationConsentView (full-page consent)

## 5. PDF/Document Generation

### Technology
`@react-pdf/renderer` — React components server-side to PDF. Same design language as web UI.

### Quote PDF Structure
Header (logo + "OFFERT / QUOTE") → Customer info → Line items (Beskrivning, Antal, a-pris, Summa) → Totals → ROT deduction → Footer (validity, payment terms)

### Invoice PDF
Same as quote + OCR line (payment reference) + bankgiro.

### Key Requirements
- Tenant branding (logo, colors from NodeData_Org)
- Swedish number formatting: "45 000,00 kr"
- ROT/RUT transparency: total → labor → deduction % → deducted amount → customer pays
- RTL support for Arabic
- Boardroom-ready quality (Johan's BRF reports)

## 6. Emotional Design

### For Kimmo (Owner)
**In control and confident.** KPI cards = instant pulse. AI insights = silent business partner. Economics bars = margin at a glance.

### For Aziz (Subcontractor)
**Invisible and respectful.** Just texting. Messages in his language. Brief confirmations ("8h registered. Day 3 of 5."). Never asked to download, create account, or learn.

### For Lisa (Admin)
**Efficient and trustworthy.** Dense tables. AI flags deviations before she approves. Violet distinction gives confidence about AI vs verified data.

### For Erik & Maria (Customers)
**Professional and transparent.** Branded quote PDF. Daily SMS with photos feels personal. BankID signing is familiar. ROT clearly broken down.

### For Johan (BRF Chairman)
**Reliable and boardroom-ready.** Weekly PDF with photos, numbers, narrative. Can forward without editing. Truncation disclosed if context limited.

### Interaction Details
- Empty states are helpful guides, not dead-ends
- Loading = skeleton shimmer, not spinners
- Errors: human-readable, inline, never stack traces
- AI proposals are explicitly transient — nothing permanent until user decides

## 7. Accessibility

### WCAG 2.1 AA Target

### RTL Support
- `dir="rtl"` on root when Arabic locale
- Tailwind RTL plugin for margin/padding flipping
- Noto Sans Arabic loaded conditionally
- PDF RTL via @react-pdf/renderer

### Multi-Language
Swedish, Arabic, Polish minimum. Trade terminology via industry glossary, not generic translation.

### Responsive
Mobile-first. sm:640, md:768, lg:1024, xl:1280.
- Desktop (Lisa): Sidebar, data tables, dense layouts
- Mobile (Kimmo in field): Hamburger, cards, FAB
- Phone link (Aziz): Renders correctly without login

### Specific Measures
- Keyboard navigation for all interactive elements
- Screen reader labels on all inputs
- Color never sole indicator
- Minimum 4.5:1 contrast ratio
- Numbers: monospace, right-aligned, locale-aware

## 8. How Technical Decisions Serve Human Experience

| Technical Decision | Human Experience |
|--------------------|-----------------|
| Append-only events | Aziz can correct time via WhatsApp. Lisa can audit. Nothing lost. |
| AI proposes, human decides | Kimmo and Lisa always feel in control. |
| AI never arithmetic | ROT, invoices, margins always correct. |
| Transient proposals | Zero economics until human commits. Clean state. |
| Bitemporality | Corrections resolve by system time. Prevents gaming. |
| RLS on every table | Kimmo never sees another tenant's data. Period. |
| Digital twins | All integrations testable end-to-end without production APIs. |
| Event resolution in SQL | KPIs and economics always consistent, even under concurrency. |
| RSC for data | Dashboard loads under 2 seconds. |

## 9. Critical UX Findings

1. **Primary interface is NOT the web app.** For 3/5 personas: WhatsApp, SMS, email, PDFs.
2. **AI transparency is first-class design constraint.** Violet palette = trust mechanism.
3. **Zero-account interaction is core requirement.** External touchpoints work via links, messages, documents.
4. **Swedish construction domain specifics permeate UI.** ROT/RUT, BankID, Fortnox, Skatteverket.
5. **Event-sourced architecture directly enables UX.** Corrections, audit trail, transient proposals, clean state.

---

*End of research transcripts. All 5 agents completed 2026-03-02.*
