# The Evolution of Specifications: From Voice Recording to Buildable Blueprints

**A research report on how natural language specifications evolve through iterative human-AI collaboration**

*Subject: The Resonansia Project — an ERP system built entirely from specs fed to AI coding agents*
*Date: 2026-03-01*

---

## 1. Executive Summary

This report traces the complete arc of specification evolution across the Resonansia project — from a raw voice conversation between a developer and a painting company owner in Swedish, through four generations of increasingly formal documents, to phase specs that an AI coding agent executes to produce working code.

**The five most important insights:**

1. **The most valuable information dies first.** Kimmo's domain expertise — the 30-35% material-to-labor ratio, the BRF chairman psychology ("Berit i lagenheten langst ner"), the wallpaper economics disaster, the seasonal scheduling patterns — is exactly the knowledge an AI agent cannot infer, yet almost none of it survives past Generation 1. The spec pipeline optimizes for structural clarity at the cost of domain richness. The voice recording is the most underexamined artifact in the entire project.

2. **Formality follows a power curve, not a line.** The jump from Gen 0 (voice recording) to Gen 1 (structured spec) delivers ~70% of the value. The jump from Gen 1 to Gen 2 (technical architecture) delivers ~20%. Generations 3 and 4 deliver the final ~10% — but that 10% is what makes the difference between "a good description of a system" and "instructions an agent can execute." The optimal formality level is different for each transformation, and over-specification becomes counterproductive in UI sections.

3. **The spec determines the ceiling; the agent determines the floor.** Phase 3's ROT/RUT section scored 10/10 buildability and produced zero-friction code. The same phase's UI section scored 5/10 and consumed 78 fix cycles. No amount of agent sophistication compensates for an underspecified section. Conversely, a perfectly specified section is robust to agent variation.

4. **The pipeline has one too many steps.** The current chain is: conversation -> product spec -> tech spec -> bootstrap -> phases (4 transformations). The product spec (Gen 1) could be eliminated by going directly from a structured conversation to a technical specification that preserves domain knowledge in a companion document. The bootstrap could be merged into Phase 0 of the phase spec series. This reduces the chain to: structured interview -> tech spec + domain companion -> phase specs (2 transformations).

5. **Skills are the sleeper innovation.** The `.claude/skills/` files are the only artifacts that flow knowledge *backward* — from implementation experience into the agent's working memory. The Drizzle Raw SQL Traps section was added after bugs were discovered, not specified in advance. Skills are the project's immune system: they learn from infections and prevent recurrence. They should be a first-class part of the spec pipeline, not an afterthought.

---

## 2. The Transformation Chain

### 2.1 Gen 0 -> Gen 1: Conversation -> Product Spec

**Source:** `docs/voice_recording.txt` (738 lines, Swedish, transcribed voice recording)
**Output:** `docs/spec alpha 0.1.md` (1036 lines, Swedish, RFC 2119 structure)

This is the most dramatic transformation in the entire pipeline: raw human conversation becoming structured specification. Two people — Konrad (developer) and Kimmo (painting company owner) — sit at a table and talk for roughly an hour about everything from customer acquisition to subcontractor psychology.

**What Claude extracted successfully:**

The conversation's *scope* was captured with high fidelity. Almost every major topic found its way into the spec: the quote-to-project flow, BRF vs. private customer distinction, the subcontractor portal with WhatsApp and translation, photo documentation, delivery note tracking from Flygel, ROT/RUT handling, BankID authentication, Fortnox integration, upselling mechanics, post-project Google Review requests, and multiple payment options.

The spec preserves the WhatsApp-as-primary-channel insight faithfully:

> **Kimmo (voice recording):** "De ar valdigt sallan svensktalande" [They very rarely speak Swedish] — about subcontractors, explaining why WhatsApp and translation are essential.
> **Spec (CAP-UE-01):** UE SKALL kunna ta emot arbetsorder pa sitt sprak via WhatsApp.

The BankID signing requirement also transfers cleanly:

> **Kimmo (voice recording, ~line 569):** "via BankID... det ser proffsigt ut" [via BankID... it looks professional]
> **Spec (CAP-OFR-05):** Kund SKALL kunna acceptera offert via BankID-signering.

**What Claude added (not in the conversation):**

Claude's additions are substantial — roughly 40% of the spec's content has no basis in the voice recording:

- The entire **7-table data model** (Section 3) — node-edge-event architecture
- The **AI Context Protocol** with five levels and token budgets (Section 6.3)
- The **Federation model** with consent flows and cross-tenant edges (Section 3.6)
- **Scaling requirements** to 1M+ organizations (Section 9)
- **GDPR compliance** with crypto-shredding (Section 10.3)
- **Pricing tiers**: Free/Pro/Business/Enterprise at specific SEK amounts (Section 7.3)
- **Market research appendix** with ServiceTitan valuation and Bygglet customer stats
- **Risk matrix** with 7 identified risks
- **Named personas** (Erik & Maria Eriksson) — the conversation only said "kunden" (the customer)
- **North Star Metric** — "Antal framgangsrikt levererade AI-insikter per dag som leder till en anvandaratgard"
- **e-faktura/Peppol** and **ID06 integration** — never mentioned

Some additions are brilliant architectural insights. Others are scope inflation. The danger is that Claude's additions carry the same authority as Kimmo's requirements — the spec does not distinguish between "domain expert said this" and "AI inferred this."

**What was lost:**

The losses are severe and systematically biased toward domain expertise:

| Lost Information | Source (Voice Recording) | Significance |
|---|---|---|
| Material = 30-35% of labor cost | Line 97 | Quantitative business rule for AI quoting |
| "Berit i lagenheten langst ner" | Line 207 | BRF stakeholder psychology |
| Wallpaper = worst margins; Djursholm disaster | Lines 291-293 | Pricing risk knowledge |
| Lisa vs. Kimmo quoting accuracy | Lines 86-97 | UX personas for error prevention |
| Paint bucket economics (10L always, waste is baked in) | Line 77 | Material estimation logic |
| Trim paint cost explosion (3L = 2000+ SEK) | Lines 101-105 | Price calibration data |
| Customer expectation gap ("results they don't pay for") | Line 75 | Scope management logic |
| Seasonal cycle (summer = BRF facades) | Lines 207, 329 | Scheduling constraints |
| Repeat customer -> running account evolution | Lines 183-197 | Customer lifecycle stages |
| Commission for painter upselling | Line 281 | Incentive structure |
| "Glabjekalkyl" (optimistic quoting) risk | Lines 86-97 | Error pattern recognition |
| Chat service costs (1800 SEK/month + 175/lead) | Lines 10-15 | Cost basis for build-vs-buy |

**The emotional flattening:**

Perhaps the most significant loss is emotional signal. In the conversation, Kimmo returns to communication and transparency *repeatedly*. It is clearly his #1 concern:

> **Kimmo (~line 149):** "Den storsta utmaningen inom hantverkaryrket... det ar kommunikationen. Vad har jag lovat? Vad ar det som gors? Och vad ar det som inte gors?"
> [The biggest challenge in the trades is communication. What did I promise? What is being done? And what is not being done?]

In the spec, communication becomes one of nine capability areas (Section 4.6), given equal weight to document generation. The spec does not convey that communication is the *primary* pain point — the thing that, if solved, would deliver the most value.

**The certainty inflation:**

Kimmo often speaks tentatively — "det skulle vara bra kanske" (it would maybe be good), "vi far se hur vi landar" (we'll see how we land). Claude converts these into SKALL (MUST) requirements. Conversational exploration became mandatory functionality. Several of Konrad's speculative ideas (360-degree cameras, network-effect federation, pricing insurance) appear in the spec with the same authority as Kimmo's core needs.

### 2.2 Gen 1 -> Gen 2: Product Spec -> Technical Architecture

**Source:** `docs/spec alpha 0.1.md` (Swedish, tech-agnostic, what/why)
**Output:** `docs/resonansia-spec.md` (English, AXIOM/INTERFACE/SCHEMA/RULE, how) + 4 companion documents

This transformation is where the system's *identity* crystallized. The major architectural decisions were all made here:

- **7 tables** — radical normalization of a domain that typically requires 20-50 tables
- **Event sourcing with root-pointer corrections** — instead of CQRS or traditional CRUD
- **Bitemporality via UUIDv7** — encoding transaction time in the primary key itself
- **Labels as type system** — making the schema extensible without code changes
- **Federation via RLS + SECURITY DEFINER** — cross-tenant access without disabling security
- **AI boundaries** — the "no arithmetic" rule and "transient proposals" pattern

The block type system emerged here: AXIOM, INTERFACE, INVARIANT, BEHAVIOR, RULE, SCHEMA, ENUM, NOT. This is not standard software engineering — it is closer to formal methods (Z notation, TLA+) expressed in natural language. The block types create a parseable specification where an agent can filter statements by category: SCHEMA blocks map to Zod schemas, INVARIANT blocks map to tests, BEHAVIOR blocks map to implementations.

**The language transition (Swedish -> English):**

Domain terms are handled through a pragmatic bilingual approach. The spec is English-first for agent consumption, but preserves Swedish in all user-facing contexts: ROT/RUT, NCS color codes, "personnummer," "Alcro Besta Vaggfarg Helmatt Vit 10L," currency formatting ("45 000,00 kr"), PDF templates ("OFFERT / QUOTE"), and the Skatteverket API fields ("utforare_orgnr", "avdrag_typ"). The AI Industry Glossary (Section 5.6) explicitly handles per-language trade terms.

This is effectively lossless for domain terminology. The cultural knowledge that was lost was already gone by Gen 1.

**Companion document architecture:**

The master spec delegates specifics to four companions:
- `tech-decisions.md` — Stack choices (technology-specific, what the spec leaves open)
- `design-system.md` — Visual system (colors, typography, layouts, components)
- `integration-twins.md` — HTTP contracts for all 7 external services
- `resonansia-scenarios.md` — 14 end-to-end validation scenarios (marked "hidden from coding agent")

This separation of concerns is well-designed: different agents can receive different document subsets. The master spec is technology-agnostic (could be implemented in any stack); tech-decisions locks it to Next.js/Supabase/Drizzle. The design system operationalizes BEHAVIOR blocks into visual components. The integration twins provide concrete JSON contracts.

### 2.3 Gen 2 -> Gen 3: Architecture -> Bootstrap Instructions

**Source:** `docs/resonansia-spec.md` + companions
**Output:** `bootstrap-spec.md` (694 lines, ARTIFACT/INVARIANT/VERIFY/GIT pattern)

This transformation introduces the execution grammar that all subsequent specs will use. The ARTIFACT/INVARIANT/VERIFY/GIT pattern creates a state machine for the agent:

1. **ARTIFACT** — Declarative end state ("this must exist")
2. **INVARIANT** — Universal constraints ("this must always be true")
3. **VERIFY** — Concrete checks ("run this command, expect this output")
4. **GIT** — Checkpoint commit ("save progress here")

The bootstrap is notable for its agent-aware design: the `non_interactive_commands` invariant prevents agent hangs, the `one_phase_at_a_time` invariant manages context window limits, and the instruction "You are an autonomous execution agent, not an advisor" establishes the agent's persona.

The bootstrap does not implement the master spec — it creates the scaffolding and knowledge base (CLAUDE.md + skills) that enable implementation. It is a "boot loader for a boot loader."

### 2.4 Gen 3 -> Gen 4: System Spec -> Phase Specs

**Source:** `docs/resonansia-spec.md` + bootstrap artifacts
**Output:** Phase 1-4 specs (815-1206 lines each)

Phase specs carve the master spec into implementable slices organized by business capability. Each phase re-derives content from the master spec for its domain, adding implementation-level details: file paths, function signatures, UI layouts, type definitions.

**The evolution across phases is measurable:**

| Innovation | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Scenario validation refs (S-XX) | No | Yes | Yes | Yes |
| Depends-on header | No | Yes | Yes | Yes |
| Build-order rationale | No | No | Yes | Yes |
| Numerical test vectors | No | No | Yes | Yes |
| Sacred boundary language | No | No | Yes | Yes |
| Lessons-learned invariants | No | No | No | Yes |
| Cross-references to skills | No | No | No | Yes |
| Conditional dependency clause | No | No | Yes | No |

Phase 3 is the best spec (its ROT/RUT section scored 10/10 buildability), but Phase 4 is the most structurally mature — it is the first to include lessons learned from a prior build (the `drizzle_raw_sql` invariant) and the first to reference skill files directly from conventions.

**Repeated mistakes across phases:**

Three problems persist from Phase 1 through Phase 4 without correction:

1. **Wrong file paths** — Specs write `apps/web/app/` but the codebase uses `apps/web/src/app/`
2. **Deferred type checking** — Every phase runs `tsc --noEmit` only at the end, causing cascading fix cycles
3. **Underspecified UI sections** — Prose descriptions without component hierarchies or state management

---

## 3. Information Loss Audit

### 3.1 The Longest Surviving Thread

The longest thread that survives from voice recording to Phase 3 code is the **ROT deduction calculation**:

- **Gen 0 (voice recording, ~lines 533-610):** Kimmo explains ROT: 30% deduction on labor, the Skatteverket submission process, the risk of incorrect claims, customer responsibility for checking remaining allowance.
- **Gen 1 (alpha spec, BR-ROT-01 through BR-ROT-06):** Formalized as business rules with SKALL modals. ROT = 30% of labor, RUT = 50%, maximum 50,000 SEK/year.
- **Gen 2 (resonansia-spec.md, RULE rot_calculation, lines 1351+):** `rot_deduction = SUM(labor_events.total) x 0.30`, capped at customer's remaining allowance.
- **Gen 3 (bootstrap):** Creates the shared schemas package where ROT types will live.
- **Gen 4 (phase-3-spec.md, Section 1):** Full TypeScript type definitions (`RotRutConfig`, `RotRutResult`), pure function signature, 5 numerical test vectors with exact expected outputs.
- **Built code:** Zero-friction implementation, scored 10/10 by the research report.

This thread survives because ROT/RUT is *unambiguous*: it is a government-defined calculation with fixed percentages and clear rules. The more ambiguous the original information, the less likely it survives.

### 3.2 The Most Significant Loss

The most significant loss is **Kimmo's emphasis on communication as the primary pain point.** In the voice recording, this is the single thing he returns to most often and speaks about with the most conviction:

> "Den storsta utmaningen inom hantverkaryrket... det ar kommunikationen."

This insight should have become AXIOM-01 — ahead of "append-only events" and "AI as intermediary." Instead, it was distributed across multiple capability areas and diluted into equal priority with document generation, scheduling, and economics. The system *does* communication, but it doesn't *lead* with communication.

If the spec pipeline had a "domain expert priority weighting" step — where emotional emphasis in the conversation maps to priority ordering in the spec — this loss could have been prevented.

### 3.3 What Was Never Captured

Several categories of knowledge exist only in Kimmo's head and were never articulated fully enough to be captured:

- **Pricing heuristics**: How Kimmo looks at a room and estimates hours. The formula in his head that produces "60 sqm apartment = 40,000-110,000 SEK." This tacit knowledge is exactly what the AI quoting system needs to learn, but the conversation didn't probe it deeply enough.
- **Failure modes**: When projects go wrong, what goes wrong first? (Paint absorption on old wood? Customer scope creep? Subcontractor no-shows?) The conversation touched on wood rot discovery but didn't systematically catalogue failure modes.
- **Lisa's workflow**: Lisa is referenced as the gold standard for accuracy, but her actual process was never mapped. What does her quoting spreadsheet look like? What fields does she check? What's her review checklist?
- **BRF sales dynamics**: Kimmo wins most BRF jobs despite not being cheapest. The *how* of this was gestured at (trust, communication, schedule adherence) but never decomposed into specific behaviors the system could support.

### 3.4 The Swedish -> English Impact

The language transition is less lossy than expected for technical content, because domain terms are preserved in Swedish. The loss occurs at the *cultural context* level:

- **BRF governance** — The full cooperative housing governance model (ordforande, styrelse, boende) is assumed knowledge that a non-Swedish agent will not understand
- **ROT/RUT cultural context** — Not just a tax deduction but a political institution that homeowners plan around
- **"Lopande rakning"** — Running account billing carries cultural connotations about trust and relationship that "time and materials" doesn't fully capture
- **The painting industry's labor market** — "Ingen vill egentligen vara underentreprenoer" (Nobody actually wants to be a subcontractor) encodes Swedish construction industry dynamics

---

## 4. Pattern Catalog

### 4.1 Durable Patterns (Gen 0 -> Gen 4)

| Pattern | First Seen | Last Seen | Notes |
|---|---|---|---|
| ROT/RUT as hard business rule | Gen 0 (conversation) | Gen 4 (phase 3 code) | Perfect survival. Government-defined = spec-friendly. |
| WhatsApp as UE channel | Gen 0 (conversation) | Gen 4 (phase 2 code) | Survived because Kimmo was emphatic and specific. |
| BankID for signing | Gen 0 (conversation) | Gen 4 (phase 3 spec) | Clear, atomic requirement. |
| Delivery note auto-association | Gen 0 (conversation) | Gen 4 (phase 3 spec) | Workflow requirement with clear trigger. |
| Photo documentation | Gen 0 (conversation) | Gen 4 (phase 4 spec) | Multi-phase survival, growing in specificity. |
| "Premium, not cheapest" positioning | Gen 0 (conversation) | Gen 1 (alpha spec) | Dies at Gen 2. Business strategy, not implementable. |
| Kimmo's quoting errors | Gen 0 (conversation) | Gen 0 only | Never captured. Tacit knowledge. |
| "Berit i lagenheten" | Gen 0 (conversation) | Gen 0 only | Never captured. Behavioral insight. |

### 4.2 Emergent Patterns (invented at each generation)

| Pattern | Generation Invented | Purpose |
|---|---|---|
| SKALL/BOR/KAN modality | Gen 1 | Priority classification |
| Requirement IDs (P-01, CAP-OFR-03) | Gen 1 | Traceability |
| AXIOM/INTERFACE/INVARIANT/BEHAVIOR/RULE/SCHEMA blocks | Gen 2 | Statement type classification |
| Negative constraints ("MUST NOT") | Gen 2 | Error prevention |
| Concrete SQL patterns in spec | Gen 2 | Reference implementation |
| Companion document architecture | Gen 2 | Separation of concerns |
| Holdout validation set | Gen 2 | Prevent agent overfitting |
| ARTIFACT/INVARIANT/VERIFY/GIT state machine | Gen 3 | Agent execution grammar |
| Agent-aware invariants (non_interactive, one_phase_at_a_time) | Gen 3 | Agent failure prevention |
| Numerical test vectors in VERIFY | Gen 4 (Phase 3) | Deterministic verification |
| Sacred boundary language | Gen 4 (Phase 3) | Priority signaling |
| Lessons-learned invariants | Gen 4 (Phase 4) | Knowledge feedback |
| Skills as implementation memory | Meta (skills) | Backward knowledge flow |

### 4.3 Failed Patterns

| Pattern | Tried In | Abandoned By | Reason |
|---|---|---|---|
| "Read relevant sections on demand" | Gen 3 (bootstrap) | Gen 4 (Phase 3) | Cross-referencing caused friction; self-contained specs work better |
| Exact line count limits | Gen 3 (bootstrap) | Gen 4 | Arbitrary constraint, not useful |
| Skill trigger words | Gen 3 (bootstrap) | Gen 4 | Phase specs reference files directly, not via keyword matching |
| "Choose one" design decisions | Gen 4 (Phase 1, 3) | Research report | Agent guesses incorrectly; spec should decide |
| Prose UI descriptions | Gen 4 (all phases) | Never abandoned but consistently lowest-scoring | Should be replaced by component trees + state specs |
| Deferred type checking | Gen 4 (all phases) | Research report (recommended GATE blocks) | Accumulates bugs; per-section gates would prevent |

### 4.4 Minimal Spec Grammar

Based on the pattern evolution, the minimal grammar for a buildable spec is:

```
SPEC        = SECTION+
SECTION     = CONVENTIONS | BUILD_SECTION
CONVENTIONS = INVARIANT+ CODEBASE_STATE?
BUILD_SECTION = DEPENDS_ON? ARTIFACT+ INVARIANT* VERIFY GATE GIT
ARTIFACT    = description + FILE_PATHS + TYPES? + FLOW? + TEST_VECTORS?
INVARIANT   = property_that_must_hold
VERIFY      = (SHELL_CHECK | ASSERT)+
GATE        = "pnpm tsc --noEmit" + GREP_CHECKS
GIT         = commit_message
DEPENDS_ON  = section_id+ (with adapter signatures if cross-phase)
CODEBASE_STATE = pattern_documentation (e.g., db.execute() return shape)
```

---

## 5. The Formality Curve

The formality gradient across generations:

```
        Formality
           ^
           |
    10 ----+                                    Gen 4 best (ROT/RUT)
           |                              .....
     8 ----+                    Gen 2 ...
           |                  /       Gen 3
     6 ----+            Gen 2/          Gen 4 average
           |           /
     4 ----+     Gen 1
           |    /
     2 ----+   /                              Gen 4 worst (UI)
           |  /
     0 ----Gen 0
           +----+----+----+----+----+----+---->
                0    1    2    3    4    5   Generation
```

**Key observations:**

1. **The biggest value jump is Gen 0 -> Gen 1** (conversation -> structured spec). This single transformation creates traceability, priority classification, and scope definition. Everything after this is refinement.

2. **Gen 2 is the plateau** — the "sweet spot" of formality. The master spec is precise enough to implement from, readable enough for humans to review, and structured enough for agent consumption. Adding more formality (Gen 3, 4) has diminishing returns except in specific areas.

3. **Within Gen 4, formality is wildly uneven.** The ROT/RUT section (pure types + test vectors) achieves near-perfect buildability. The UI sections (prose descriptions) achieve barely-passable buildability. The optimal formality level depends on the *domain*: algorithmic sections benefit from maximal precision; UI sections benefit from visual specifications (wireframes, component trees) over text.

4. **The "formality cliff"** exists at the UI boundary. Going from "build a dashboard" to "build a dashboard with these 5 components in this layout" is valuable. Going further to specify every CSS class and state transition is counterproductive — the agent is actually *better* at UI implementation with some creative latitude than with pixel-perfect specifications that may conflict with the component library's conventions.

5. **Over-specification is counterproductive in two cases:**
   - When the spec conflicts with the implementation reality (wrong file paths repeated across 4 phases)
   - When the spec specifies *how* instead of *what* for areas where the agent has strong priors (UI component composition, code organization)

---

## 6. The Domain Expert Interview Protocol

Based on analyzing what was captured and lost from Kimmo's conversation, here is a template for maximizing spec quality from domain expert sessions:

### Phase 1: The Workflow Walk-Through (30 min)

**Goal:** Capture the complete business process, end to end.

1. "Walk me through a typical job from first customer contact to final payment."
2. At each step, ask: "What can go wrong here?" and "How do you handle that today?"
3. "Walk me through an unusual job — one that was particularly difficult."
4. "Walk me through a BRF/large project versus a small residential job."

**Capture:** Process steps, decision points, failure modes, exception handling.

### Phase 2: The Quantitative Probe (20 min)

**Goal:** Extract the numbers the system needs to know.

1. "What's the typical price range for [job type]? What drives the variation?"
2. "What percentage of your costs are materials vs. labor?"
3. "How many quotes do you send per week? What's your conversion rate?"
4. "What's your average project duration? Shortest? Longest?"
5. "How many active projects do you run simultaneously?"
6. "What are your seasonal patterns?"

**Capture:** Quantitative benchmarks, ratios, thresholds, seasonal curves.

### Phase 3: The People Probe (15 min)

**Goal:** Understand stakeholder dynamics and persona differences.

1. "Who are the different types of people who interact with your business?"
2. For each: "What do they care about most? What frustrates them?"
3. "Tell me about your best employee and your most difficult one."
4. "Who is the most accurate person in your office? What do they do differently?"
5. "Tell me about a customer complaint that taught you something."

**Capture:** Personas grounded in real behavior, not archetypes.

### Phase 4: The Priority Stack-Rank (10 min)

**Goal:** Establish unambiguous priority ordering.

1. "If I could only build three features, which three would make the biggest difference?"
2. "What's the one thing that, if we got it wrong, would make you stop using the system?"
3. "What's something your current system does that you never use?"
4. "On a scale of simple-to-complex, where does the system need to sit for your team to actually use it?"

**Capture:** Priority ranking with emotional weighting. The things they mention first and with most energy are highest priority.

### Phase 5: The Counter-Factual (10 min)

**Goal:** Surface implicit knowledge through hypotheticals.

1. "If a new employee started tomorrow with zero experience, what would they get wrong first?"
2. "If you could change one thing about how your industry works, what would it be?"
3. "If a competitor offered a free system, what would make you still choose ours?"
4. "What do your customers not understand about your work?"

**Capture:** Tacit knowledge, competitive positioning, customer education gaps.

### Post-Interview

- **Immediately:** Write a "Domain Insights" companion document that preserves quantitative benchmarks, behavioral insights, priority ordering, and emotional emphasis — in a structured format separate from the product spec.
- **This document travels with the spec through all generations.** It is never compressed or abstracted. It is the "ground truth" for product decisions.
- **Review with domain expert within 48 hours** to catch misinterpretations.

---

## 7. The Spec Factory Blueprint

### 7.1 Proposed Pipeline

```
                    HUMAN                    AI                    HUMAN               AI
                      |                       |                      |                  |
  Structured     ->  Domain           ->  Technical Spec     ->  Priority     ->  Phase Specs
  Interview          Insights Doc          + Companions          Review             (buildable)
  (90 min)           + Draft Spec          (Gen 2 equivalent)   (30 min)           (Gen 4)
                     (Gen 1 equivalent)
                      |
                      v
                    Domain Companion
                    (travels unchanged)
```

**Stage 1: Structured Interview (Human + AI listener)**
- Duration: 90 minutes, following the protocol in Section 6
- AI listens in real-time, extracting: process steps, quantitative data, personas, priorities, failure modes
- Output: Transcript + AI-generated interview summary with flagged gaps ("Question not asked: seasonal cash flow patterns")

**Stage 2: Parallel Document Generation (AI)**
- **Domain Insights Companion** — Preserves all quantitative benchmarks, behavioral insights, and priority ordering. Never abstracted. Never compressed. Travels unchanged through all subsequent stages.
- **Draft Product Spec** — Structured requirements with RFC 2119 modality. Explicitly marks items as "domain expert stated" vs. "AI inferred."
- **Gap Analysis** — List of questions that should have been asked but weren't. Fed back to the human for a 15-minute follow-up interview.

**Stage 3: Technical Specification (AI, with human architect review)**
- Transforms draft spec into technical architecture
- Produces master spec + companion documents (stack choices, design system, integration contracts, validation scenarios)
- The Domain Insights Companion is attached as an appendix, ensuring domain knowledge is accessible during implementation
- Human architect reviews: Does the architecture serve the priorities? Does the 7-table model (or equivalent) capture the domain?

**Stage 4: Priority Review (Human, 30 min)**
- Domain expert reviews the spec's priority ordering against their stated priorities
- Catches certainty inflation ("I said 'maybe'; why is this MUST?")
- Catches scope additions ("I never asked for this; should it be here?")
- Sign-off produces a "Priority-Locked" version of the spec

**Stage 5: Phase Spec Generation (AI)**
- Decomposes the priority-locked spec into buildable phases
- Each phase spec uses the ARTIFACT/INVARIANT/VERIFY/GATE/GIT grammar
- Algorithmic sections get full type definitions + numerical test vectors
- UI sections get component trees + state specifications (not prose)
- Each phase spec includes a CODEBASE_STATE section documenting known implementation patterns
- Each phase spec includes a DEPENDS_ON section with adapter signatures from prior phases

### 7.2 The Intermediate Representation

The Gen 2 technical specification serves as the intermediate representation, but with one critical addition: the **Domain Insights Companion**. This document preserves the domain expert's quantitative benchmarks, behavioral insights, and priority ordering in a format that is:
- Never compressed or abstracted
- Referenced by phase specs when making product decisions
- Used to train AI quoting/estimation models
- Updated after each build phase with new domain knowledge

### 7.3 The Bootstrapping Problem

The first spec has no codebase to reference; later specs must reference existing code. The current solution (bootstrap -> phases) is workable but could be improved:

- **Phase 0** replaces the bootstrap spec: it creates the monorepo, installs dependencies, creates CLAUDE.md and skills, and commits. It is treated as the first phase spec rather than a separate document format.
- **Each subsequent phase's CODEBASE_STATE section** documents the patterns established by prior phases: `db.execute()` return shape, column naming, file path conventions, adapter constructor signatures.
- **Skills accumulate backward** — after each phase, the implementation-derived knowledge (Drizzle traps, path conventions, etc.) is written into skill files, creating a growing implementation memory.

### 7.4 Is the Voice Recording a Viable Input?

Yes, with caveats. The voice recording is actually a *better* input than a written requirements document because it captures:
- Emotional emphasis (what the domain expert cares about most)
- Uncertainty signals (hedging, tentative language)
- Negotiation dynamics (which ideas the expert deflects vs. embraces)
- Tangential insights (the "Berit" anecdote, the wallpaper disaster)

But it needs **structure**. An unstructured conversation meanders through tangents, gets interrupted by phone calls, and circles back to topics already discussed. The Structured Interview Protocol (Section 6) provides this structure while preserving the benefits of natural conversation.

The ideal input format is: **structured interview + AI listener** that extracts structured data in real-time while preserving the raw transcript as the ground truth record.

### 7.5 How Close Is This Project?

Resonansia is ~70% of the way to a spec factory. What exists:
- A mature spec grammar (ARTIFACT/INVARIANT/VERIFY/GIT)
- A proven block type system (AXIOM/INTERFACE/SCHEMA/RULE)
- Skills as backward-flowing implementation memory
- A post-mortem process (the Phase 3 research report) that feeds improvements into future specs
- Quantitative evidence of what works (ROT/RUT = 10/10, UI = 5/10)

What's missing:
- The Domain Insights Companion (domain knowledge currently dies at Gen 1)
- Priority-locking with domain expert sign-off (certainty inflation is unchecked)
- GATE blocks between sections (deferred type-checking persists)
- CODEBASE_STATE documentation (implementation patterns are discovered, not documented)
- Provenance tracking ("domain expert stated" vs. "AI inferred")

---

## 8. Recommendations

Ranked by impact (highest first):

### Must-Have

**R1: Create a Domain Insights Companion document.**
Extract the voice recording's quantitative benchmarks, behavioral insights, and priority ordering into a structured companion that travels unchanged through all spec generations. This is where the 30-35% material ratio, the BRF chairman psychology, and the "communication is the primary pain point" priority should live. This document should be referenced by phase specs when making product decisions and used to train AI models.

**R2: Add provenance tracking to all spec items.**
Every requirement should be marked as `[domain-expert]`, `[ai-inferred]`, or `[architect-decision]`. This prevents certainty inflation and ensures domain expert priorities are not diluted by AI additions.

**R3: Add GATE blocks after every build section.**
The research report showed that deferred type-checking caused 78 fix cycles in Phase 3. A `GATE` block (`pnpm tsc --noEmit` + grep checks for invariant violations) after every section would catch errors incrementally.

**R4: Fix the file path specification.**
All four phase specs use `apps/web/app/` instead of the actual `apps/web/src/app/`. This should be corrected in Phase 4 and documented in CODEBASE_STATE.

### Should-Have

**R5: Replace prose UI sections with component specifications.**
Instead of "Inline editing: click cell -> edit qty, unitPrice, description," specify: component tree (parent -> child relationships), state management approach (server state vs. client state), data fetching pattern (RSC vs. client fetch), and key interactions (what triggers what). Use ASCII wireframes for layout.

**R6: Eliminate "choose one" design decisions from specs.**
The spec author should make all product decisions. When genuine trade-offs exist, document the decision and rationale. The agent should implement, not choose.

**R7: Add CODEBASE_STATE sections to each phase spec.**
Document known implementation patterns from prior phases: `db.execute()` return shape, edge column names, adapter constructor signatures, path conventions. This prevents the most common cross-phase friction.

**R8: Implement the structured interview protocol for future domain sessions.**
Use the protocol in Section 6 for the next conversation with Kimmo. Specifically probe: seasonal cash flow patterns, Lisa's actual quoting workflow, failure mode catalogue, and pricing heuristics.

### Nice-to-Have

**R9: Build a spec linter.**
A tool that checks for: undefined cross-references, ambiguous VERIFY steps (narrative vs. executable), missing GATE blocks, wrong file paths, and "choose one" delegations. Run it before handing specs to the agent.

**R10: Create a "lessons learned" file that compounds across phases.**
Currently, lessons flow backward through skills (good) but not through a single compounding document. A `docs/lessons-learned.md` that grows with each phase would provide a longitudinal view.

**R11: Merge bootstrap into Phase 0.**
The bootstrap spec uses a slightly different grammar than phase specs and exists as a separate document. Making it Phase 0 of the phase series would unify the execution grammar and simplify the pipeline.

**R12: Record the next domain expert session with AI listener.**
Use real-time transcription + AI extraction to produce the Domain Insights Companion simultaneously with the interview, rather than as a post-processing step.

---

*This report was generated by analyzing 10,000+ lines of specification documents spanning 5 generations, from raw Swedish voice recording to English phase specs with TypeScript type signatures. The analysis was conducted using four parallel research agents, each focused on a different generation of the specification evolution.*
