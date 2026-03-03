# Resonansia Context Index

> **Purpose:** AI-optimized navigation map for the entire project knowledge base.
> Read this FIRST. It tells you WHERE to find things, WHAT principles govern decisions, and WHY they exist.
> It does NOT replace reading source documents — it tells you which ones to read and when.

---

## 0. ORIENTATION (30 seconds)

**What:** Multi-tenant ERP platform for Swedish SMEs. Currently serves construction (painting); expanding to travel/events.

**Thesis:** 7 database tables + append-only events + AI assistance = one platform for a thousand trades.

**Motto:** "Sju tabeller. Tusen yrken. En plattform."

**People:**
| Name | Role | Key trait | Reference |
|------|------|-----------|-----------|
| Konrad | Platform architect / founder | Designs the spec pipeline, sees the "software factory" | All docs |
| Kimmo | Domain expert — painting company owner (Vi Tre Malar) | Communication is his #1 pain. Trust wins jobs over price. | `docs/voice_recording.txt` |
| Lisa | Office admin at Kimmo's company | Meticulous, prefers paper. System must be simpler than what she abandons. | `docs/voice_recording.txt` |
| Aziz | Subcontractor — sole proprietor painter | Arabic-speaking. WhatsApp-only. Never logs in. | `docs/voice_recording.txt` |
| Pettson/Erik | Domain expert — Taylor Events / N-Tech entrepreneur | Results over architecture. Burned by Mariano's "advanced automations that produced nothing." | `docs/Recording.txt` |
| Dova | Office team at Pettson's company | Paper and Excel. "Stuck in the stone age." System must feel like a spreadsheet. | `docs/Recording.txt` |

**Current state:** Phases 1-3 implemented (data layer, messaging, quoting/invoicing). Phase 4 specified but not built. Taylor Events spec complete, not yet built.

---

## 1. DOCUMENT MAP

### When to read what

```
BUILDING SOMETHING NEW?
  │
  ├─ Need domain context?
  │   ├─ Construction domain ──→ docs/voice_recording.txt (Swedish, raw conversation)
  │   ├─ Travel/Events domain ─→ docs/Recording.txt (Swedish, raw conversation)
  │   └─ Both domains distilled → docs/spec alpha 0.1.md (Swedish, structured)
  │
  ├─ Need architecture rules?
  │   ├─ Complete system spec ──→ docs/resonansia-spec.md (1767 lines, authoritative)
  │   ├─ Technology choices ────→ docs/tech-decisions.md (335 lines, binding)
  │   └─ Quick reference ───────→ CLAUDE.md (69 lines, always loaded)
  │
  ├─ Need implementation patterns?
  │   ├─ Data model ────────────→ .claude/skills/data-model/SKILL.md
  │   ├─ Events & bitemporality → .claude/skills/event-system/SKILL.md
  │   ├─ AI pipeline ───────────→ .claude/skills/ai-pipeline/SKILL.md
  │   ├─ Federation ────────────→ .claude/skills/federation/SKILL.md
  │   ├─ External integrations ─→ .claude/skills/integrations/SKILL.md
  │   └─ UI components ─────────→ .claude/skills/ui/SKILL.md
  │
  ├─ Need to understand what exists?
  │   ├─ Phase 1 (foundation) ──→ docs/phase-1-spec.md
  │   ├─ Phase 2 (messaging) ───→ docs/phase-2-spec.md
  │   ├─ Phase 3 (quoting) ─────→ docs/phase-3-spec.md
  │   ├─ Phase 4 (auto-reports) → docs/phase-4-spec.md (NOT YET BUILT)
  │   └─ Known bugs & lessons ──→ docs/phase-3-research-report.md
  │
  ├─ Building Taylor Events?
  │   ├─ The spec ──────────────→ docs/taylor-spec.md
  │   ├─ Platform constraints ──→ docs/resonansia-spec.md (Section inherited)
  │   └─ Spec methodology ──────→ docs/spec-evolution-research.md
  │
  └─ Need UX / design guidance?
      ├─ Design system ─────────→ docs/design-system.md
      ├─ User scenarios ────────→ docs/resonansia-scenarios.md
      └─ Digital twin contracts ─→ docs/integration-twins.md
```

### Document genealogy

```
voice_recording.txt ──→ spec alpha 0.1.md ──→ resonansia-spec.md ──→ bootstrap-spec.md ──→ phase-1/2/3/4-spec.md
     (Gen 0)               (Gen 1)              (Gen 2)               (Gen 3)               (Gen 4)
    100% domain            60% domain           30% domain            10% domain             5% domain
      0% structure          70% structure        90% structure         95% structure          98% structure

Recording.txt ──→ taylor-spec.md
   (Gen 0)           (Gen 1, improved methodology — includes provenance tracking)
```

**Critical insight:** Domain knowledge dies at each transformation. The voice recordings contain knowledge that NO other document preserves. The `spec-evolution-research.md` catalogues 12 specific losses.

---

## 2. AXIOMS (non-negotiable, in priority order)

| # | Axiom | One-line rule | Why it exists | Enforced in |
|---|-------|---------------|---------------|-------------|
| A1 | **7+1 tables** | All business concepts fit in nodes/edges/events/labels/blobs/dicts/tenants + federation_edges. No new tables. | Prevents schema sprawl. Simplifies RLS (7 policies to audit). Forces generic-yet-typed modeling. | `resonansia-spec.md:69`, `data-model/SKILL.md` |
| A2 | **Append-only events** | No UPDATE, no DELETE on events. Corrections via root pointer. | Complete audit trail for Swedish construction regulations. Enables bitemporal queries. | `resonansia-spec.md:576`, `event-system/SKILL.md` |
| A3 | **AI proposes, human decides** | AI output is transient until human clicks "Approve". Economics = zero until approval. | Trust mechanism. Users must always feel in control. Born from Kimmo's need for accuracy. | `resonansia-spec.md:62-67`, `ai-pipeline/SKILL.md` |
| A4 | **AI never does arithmetic** | AI returns qty + unit_price. System computes total. If AI returns "total", ignore and recompute. | LLMs hallucinate math. Deterministic computation guarantees correct invoices. | `resonansia-spec.md:1171-1178`, `ai-pipeline/SKILL.md` |
| A5 | **RLS on every table** | Row-Level Security with tenant_id. Federation via `has_federation_access()`. Never bypass, never disable, never use service_role in handlers. | Multi-tenant isolation is a database-level invariant, not an application-level feature. | `resonansia-spec.md:1537`, `data-model/SKILL.md` |
| A6 | **Event resolution in SQL** | Window functions (ROW_NUMBER OVER PARTITION BY). Never aggregate in JavaScript. | Prevents memory blowout on large projects. DB can index and optimize; JS cannot. | `resonansia-spec.md:621-664`, `event-system/SKILL.md` |
| A7 | **Bitemporality** | `id` (UUIDv7) = transaction time. `occurred_at` = valid time. Resolution uses transaction time. Reporting uses valid time. | Enables "what did we know and when?" queries. Corrections resolve correctly regardless of claimed time. | `resonansia-spec.md:553-570`, `event-system/SKILL.md` |
| A8 | **Federation is read-only** | Cross-tenant access never grants write. Projection scopes only restrict, never expand. No data copying. | Subcontractors report in their own tenant. Main contractor sees via federation. Write isolation is absolute. | `federation/SKILL.md`, `tech-decisions.md:239-241` |
| A9 | **Transparency over magic** | AI content visually distinct (violet palette). Truncation disclosed. Sources cited. Anomalies never hidden. | A painting company owner making bid decisions must know if data is partial or AI-generated. | `ui/SKILL.md`, `ai-pipeline/SKILL.md` |
| A10 | **Labels are the type system** | Adding a new entity type = INSERT into labels. Never a code change. | Extensibility without deployment. Tenant-specific customization. | `resonansia-spec.md:200-232`, `data-model/SKILL.md` |

---

## 3. THE 5 PERSONAS (and what they demand of the architecture)

### Construction domain

| Persona | Interface | Never does | Architecture consequence |
|---------|-----------|------------|--------------------------|
| **Kimmo** (owner) | Full web app | — | Dashboard must show real-time economics. KPI cards, project margins, AI insights. |
| **Lisa** (admin) | Full web app (desktop power user) | — | Dense data tables, sortable/filterable. AI-flagged deviations before invoice approval. |
| **Aziz** (subcontractor) | WhatsApp only | Log in, create account, visit website | AI message classification IS the UI. Arabic translation with trade glossary. |
| **Erik & Maria** (customers) | SMS + email links + PDFs | Log in, create account | PDF quality = brand quality. ROT deduction breakdown crystal clear. BankID signing. |
| **Johan** (BRF chairman) | Email PDFs | Log in | Weekly report PDF must be boardroom-ready. Forwarded as-is to BRF board. |

**Key insight:** 3 of 5 personas never log in. The system's primary interface for most humans is WhatsApp, SMS, email, and PDFs — not the web UI.

### Travel/Events domain

| Persona | Interface | Never does | Architecture consequence |
|---------|-----------|------------|--------------------------|
| **Pettson** (owner) | Dashboard + reports | Touch daily operations | Results-visible metrics. Revenue attribution. ROI per campaign. |
| **Dova** (office) | Admin UI | Learn complex software | Must feel like a spreadsheet. Two clicks max for any action. |
| **Customer** (prospect) | WhatsApp/email conversation with AI agent | Know they're talking to AI (initially) | AI agent has personality, name, goals. Seamless handoff to human when needed. |

---

## 4. PATTERN CATALOG

### 4.1 Data patterns

| Pattern | When to use | Template location |
|---------|-------------|-------------------|
| **Node polymorphism** | Any business entity (person, org, project, customer, agent, campaign, conversation, booking) | `data-model/SKILL.md` → Node Data Schemas |
| **Edge typing** | Any relationship (member_of, assigned_to, customer_of, etc.) | `data-model/SKILL.md` → Edge Data Schemas |
| **Label lookup** | Type discrimination, state machines, units, currencies | `data-model/SKILL.md` → Label System |
| **Active event resolution** | Any query over events (economics, timelines, corrections) | `event-system/SKILL.md` → canonical SQL query |
| **Root pointer correction** | Correcting any event (time, material, quote line) | `event-system/SKILL.md` → ref_id always points to ROOT |
| **Transient proposal** | AI generates structured output before human approval | `event-system/SKILL.md` + `ai-pipeline/SKILL.md` |

### 4.2 AI patterns

| Pattern | When to use | Template location |
|---------|-------------|-------------------|
| **3-tier model selection** | Any AI call (cheap/medium/expensive) | `ai-pipeline/SKILL.md` → AI_TIERS config |
| **5-level context protocol** | Building AI prompts with project/tenant data | `ai-pipeline/SKILL.md` → Context Protocol |
| **Structured output (Zod)** | All AI responses (classification, generation, OCR) | `ai-pipeline/SKILL.md` → generateObject() |
| **Anomaly shield** | Pre-processing data before AI analysis | `ai-pipeline/SKILL.md` → 2-phase detection |
| **Truncation disclosure** | When context exceeds token budget | `ai-pipeline/SKILL.md` → mandatory notice |
| **Blind spot prevention** | Comparing actuals against BOTH quote AND history | `ai-pipeline/SKILL.md` → dual-reference check |

### 4.3 Integration patterns

| Pattern | When to use | Template location |
|---------|-------------|-------------------|
| **Adapter interface** | Any external service call | `integrations/SKILL.md` → interface definitions |
| **Digital twin** | Testing any integration | `integrations/SKILL.md` → twin server on port 9999 |
| **Webhook → Event** | Processing inbound messages/callbacks | `integrations/SKILL.md` + `event-system/SKILL.md` |

### 4.4 Next.js patterns

| Pattern | When to use | Anti-pattern |
|---------|-------------|--------------|
| **RSC for data** | All data fetching. Call Drizzle directly. | Never fetch() own API from Client Component. |
| **Server Actions for mutations** | All writes. Zod validate → Drizzle mutate → revalidatePath. | Never Route Handler for internal mutations. |
| **Route Handlers** | ONLY for webhooks, PDF endpoints, cron jobs. | Never for internal data or mutations. |
| **Client Components** | Interactive UI, realtime, browser APIs. Receive data as props. | Never fetch data themselves. |

### 4.5 UI patterns

| Pattern | When to use | Key rule |
|---------|-------------|----------|
| **Violet AI zone** | Any AI-generated content | `bg-violet-50`, `border-violet-200`, "AI Draft" label, `AiSourceRef` for every claim |
| **StatusBadge** | Node lifecycle display | draft=slate, active=blue, in_progress=amber, completed=green, cancelled=red |
| **Number formatting** | All financial data | Right-aligned, monospace, Swedish locale: "45 000,00 kr" |
| **Color + icon/text** | Any status indicator | Color is never the sole indicator (WCAG 2.1 AA) |

---

## 5. DOMAIN KNOWLEDGE VAULT

> **WARNING:** This knowledge exists in the voice recordings but was systematically lost in later specs.
> It represents tacit expert knowledge that AI cannot infer. Preserve it.

### Construction domain (from Kimmo)

| Knowledge | Value | Source location |
|-----------|-------|-----------------|
| Material = 30-35% of labor cost | AI quoting baseline | `voice_recording.txt` ~line 340 |
| Always buy 10L paint buckets even if you need less | Waste is built into calculations | `voice_recording.txt` ~line 350 |
| Trim paint (snickerifärger) 3L can cost 2000+ SEK | High unit cost, often underestimated | `voice_recording.txt` ~line 355 |
| Wallpaper = worst margins. Example: 4500 SEK/roll, redone twice (20K each time) | Risk factor for AI quoting | `voice_recording.txt` ~line 380 |
| BRF chairman pays more for trust, not cheapest price | Competitive positioning insight | `voice_recording.txt` ~line 149 |
| "Berit i lägenheten längst ner" complains about everything | BRF communication is about managing residents, not just the board | `voice_recording.txt` ~line 155 |
| Kimmo quotes optimistically ("glädjekalkyl"), Lisa is meticulous | Systematic quoting bias to detect and correct | `voice_recording.txt` ~line 290 |
| Summer = BRF facades. Winter = interior homeowner jobs. | Seasonal demand patterns | `voice_recording.txt` ~line 200 |
| Communication is THE #1 pain point — above economics, above tools | Should weight dashboard design toward "what's happening" not just margins | `voice_recording.txt` ~line 149 |
| Subcontractors rarely speak Swedish | Multi-language is not a feature — it's a requirement | `voice_recording.txt` ~line 250 |

### Travel/Events domain (from Pettson)

| Knowledge | Value | Source location |
|-----------|-------|-----------------|
| Mariano's failure: "advanced automations that produced nothing" | Results must be tangible and immediate | `Recording.txt` ~line 50 |
| Office team uses paper and Excel | UI complexity ceiling is very low | `Recording.txt` ~line 120 |
| "Pettson sitter ju på cash" — ready to invest | Value-based pricing, not cost-based | `Recording.txt` ~line 280 |
| Football tickets: 100,000 for Aug 1 and 8 | Scale requirement for AI agent conversations | `Recording.txt` ~line 90 |
| April 1 hard deadline for football ticket sales | 30-day MVP scope constraint | `Recording.txt` ~line 95 |
| Existing booking platforms should NOT be replaced | Layer intelligence on top, don't rebuild | `Recording.txt` ~line 130 |
| Cross-selling: ticket buyer → cabin recommendation | Federation-enabled upselling across businesses | `Recording.txt` ~line 180 |

---

## 6. DECISION TREES FOR IMPLEMENTERS

### "Where does this data go?"

```
Business entity (person, org, project, agent, campaign)? → NODES table (type via label)
Relationship between entities? → EDGES table (type via label)
Something that happened? → EVENTS table (append-only, type via label)
File/image/document? → BLOBS table (metadata) + object storage (content)
Translation/config/semantics? → DICTS table
Cross-tenant relationship? → FEDERATION_EDGES table
None of the above? → Re-examine. One of the above IS correct. Do NOT create a new table.
```

### "Which AI tier?"

```
Classification, translation, summarization, scoring? → CHEAP (gpt-4o-mini, <2s)
OCR, document understanding, anomaly detection? → MEDIUM (claude-haiku-4-5, <5s)
Quote/content generation, complex Q&A? → EXPENSIVE (claude-sonnet-4-5, <10s)
```

### "How do I correct data?"

```
1. NEVER update or delete the original event
2. Create NEW event with ref_id = ORIGINAL root event ID (not another correction)
3. Active event resolution SQL automatically picks the latest correction
```

### "How do I fetch data in Next.js?"

```
Page rendering? → RSC, call Drizzle directly
Mutation? → Server Action with Zod validation
External webhook / PDF / cron? → Route Handler
Client Component needs data? → Pass as props from parent RSC. NEVER fetch() own API.
```

### "How do I add a new business domain?"

```
1. Define new label codes (node_type, edge_type, event_type) — data INSERT, not code change
2. Define Zod schemas for new NodeData_*, EdgeData_*, EventData_* types
3. Add dispatch mappings in schema lookup functions
4. The 7-table model, event system, federation, and AI pipeline all work unchanged
5. See taylor-spec.md for a worked example of mapping travel/events to the existing model
```

---

## 7. DRIZZLE/POSTGRES TRAPS (cause runtime crashes)

These are documented because they actually occurred and consumed significant debugging time:

### Trap 1: db.execute() result shape
```typescript
// WRONG — crashes with "undefined"
const result = await db.execute(sql`SELECT * FROM labels`);
const labels = result.rows as Label[];

// CORRECT — postgres-js returns rows directly
const labels = result as unknown as Label[];
```

### Trap 2: SQL array parameters
```typescript
// WRONG — "op ANY/ALL requires array on right side"
sql`AND e.type_id = ANY(${typeIds})`

// CORRECT — use IN with sql.join
sql`AND e.type_id IN (${sql.join(typeIds.map(id => sql`${id}`), sql`, `)})`
```

### Trap 3: Edge column names
```
Database DDL: source_id, target_id
Some code used: from_id, to_id  ← P0 BUG, causes runtime crash
ALWAYS use: source_id, target_id
```

---

## 8. KNOWN BUGS (from phase-3-research-report.md)

| Severity | Issue | Location hint |
|----------|-------|---------------|
| **P0** | Edge column mismatch (from_id vs source_id) | 5 core files + 6 web app files |
| **P0** | Hardcoded HMAC secret fallback for quote tokens | `packages/core/src/quotes/token.ts` |
| **P0** | Dead-code ROT/RUT recomputation | `packages/core/src/economics/` |
| **P1** | Missing auth on sendQuoteAction, submitRotRutAction | `apps/web/` server actions |
| **P1** | Proposal editor edits silently discarded on approval | `apps/web/` proposal editor UI |
| **P1** | BankID accepts client-supplied personnummer | `packages/core/src/signing/` |
| **P1** | ROT/RUT tracking conflates ROT and RUT | `packages/core/src/economics/rot-rut-tracking.ts` |

Read `docs/phase-3-research-report.md` for the complete list (15+ bugs) and fix guidance.

---

## 9. SPEC METHODOLOGY (meta-knowledge)

The project has developed a methodology for turning conversations into software:

### The generation chain
```
Gen 0: Voice recording (raw domain knowledge, unstructured)
Gen 1: Product spec (structured, ~60% domain retention, ~40% AI additions)
Gen 2: Technical spec (architecture, ~30% domain retention)
Gen 3: Bootstrap (execution instructions, ~10% domain retention)
Gen 4: Phase specs (buildable sections with ARTIFACT/INVARIANT/VERIFY/GIT blocks)
```

### Key methodological innovations (from spec-evolution-research.md)

1. **Domain Insights Companion** — A section that "never gets compressed or abstracted, travels unchanged" through all spec generations. Implemented in taylor-spec.md Section 1.

2. **Provenance tracking** — Every requirement tagged as `[domain-expert]`, `[domain-inferred]`, `[architect-decision]`, or `[market-research]`. Prevents certainty inflation (AI converting "maybe" into "MUST").

3. **GATE blocks** — Type-check gates (`pnpm tsc --noEmit`) between spec sections, not just at the end. Prevents error accumulation.

4. **Skills as backward-flowing memory** — After each phase, update skill files with implementation-derived knowledge. The only mechanism that feeds learning from code back into agent context.

5. **Three Laws of Spec Compilation:**
   - The Spec Determines the Ceiling (bad spec → bad code, regardless of agent quality)
   - Context is the Bottleneck (agent can only use what fits in context window)
   - Verification Must Be Co-Designed with Specification (narrative "verify" steps fail; executable assertions succeed)

---

## 10. PLATFORM EXTENSIBILITY PROOF

The taylor-spec.md demonstrates that the 7-table model extends to a completely different vertical:

| Construction concept | Taylor Events concept | Same table |
|---------------------|-----------------------|------------|
| Project | Campaign | nodes (type=campaign) |
| Customer | Lead/Prospect | nodes (type=customer) |
| Person (subcontractor) | AI Agent | nodes (type=agent) |
| Work order (event) | Conversation | nodes (type=conversation) |
| Quote line (event) | Booking | nodes (type=booking) |
| WhatsApp message (event) | Agent message (event) | events (type=message) |
| assigned_to (edge) | handles (edge) | edges |
| member_of (edge) | belongs_to (edge) | edges |
| Federation (cross-tenant) | Cross-selling (cross-business) | federation_edges |

**The same 7 tables. The same event system. The same AI pipeline. The same federation model.** Only the label codes and Zod schemas change.

---

## 11. EMOTIONAL DESIGN COMPASS

When making product decisions, consult these voices:

| Decision about... | Ask yourself... | Voice |
|-------------------|-----------------|-------|
| Dashboard layout | "Would Kimmo understand this in 10 seconds between job sites?" | Kimmo |
| Data density | "Can Lisa find the deviation before approving the invoice?" | Lisa |
| Messaging UX | "Can Aziz do this by sending one WhatsApp message in Arabic?" | Aziz |
| PDF quality | "Can Johan forward this to the BRF board without editing?" | Johan |
| AI agent personality | "Does this produce a visible result Pettson can show his team?" | Pettson |
| Admin UI complexity | "Could Dova do this with paper and a calculator?" | Dova |
| Feature scope | "Is this a result, or an 'advanced automation that produces nothing'?" | Mariano lesson |

---

## 12. FILE STRUCTURE QUICK REFERENCE

```
apps/web/src/app/           # Next.js pages and routes
  (app)/                    # Authenticated app routes
  (public)/                 # Public routes (quote signing)
  api/                      # Route handlers (webhooks, PDF, cron ONLY)

packages/shared/src/        # Zod schemas, types, label definitions, utilities
packages/db/src/            # Drizzle schema, migrations, queries, helpers
packages/core/src/          # Business logic
  events/                   #   Event creation, correction, resolution
  economics/                #   Project economics, ROT/RUT, compute
  ai/                       #   Client, context, classify, translate, generate, OCR
  messaging/                #   Handler, sender, send, work-order
  proposals/                #   Store, approve (transient AI proposals)
  quotes/                   #   Token generation, delivery
  invoicing/                #   Generate, deviations, approve, skatteverket
  signing/                  #   BankID flow
  notifications/            #   Notify
  labels.ts                 #   Label cache with load/get

packages/integrations/src/  # External service adapters (WhatsApp, SMS, Fortnox, BankID, Email, Skatteverket, Storage)
packages/twins/src/         # Digital twin server (Express, port 9999)
packages/pdf/src/           # PDF generation (quote, invoice, shared styles)

supabase/                   # Migrations and seed data
docs/                       # All specification documents
.claude/skills/             # 6 domain-specific AI skill files
```

---

*This index was generated by analyzing 15 project documents + 6 skill files + CLAUDE.md through 5 parallel research agents. Last updated: 2026-03-02.*
