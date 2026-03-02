# Phase 3 Research Report: Quality Audit & Spec Engineering

**Date:** 2026-03-01
**Scope:** Code review, spec analysis, architecture audit, industry research, Phase 4 pre-flight

---

## Part 1: Critical Bugs to Fix Before Phase 4

### P0: Edge Column Name Mismatch (RUNTIME CRASH)

The database DDL defines `source_id` and `target_id` on the edges table. **Five files use the wrong column names `from_id` / `to_id` in raw SQL**, which would crash at runtime:

| File | Lines |
|------|-------|
| `packages/core/src/economics/rot-rut-tracking.ts` | 30, 32 |
| `packages/core/src/signing/bankid.ts` | 78, 80 |
| `packages/core/src/invoicing/approve.ts` | 51, 53 |
| `packages/core/src/invoicing/generate.ts` | 136, 138 |
| `packages/core/src/ai/context.ts` | 141, 143 |

Additionally, these same wrong column names appear in web app files:
- `apps/web/src/app/(app)/projects/[id]/quotes/page.tsx`
- `apps/web/src/app/(app)/projects/[id]/invoices/page.tsx`
- `apps/web/src/app/(public)/quote/[token]/page.tsx`
- `apps/web/src/app/actions/quotes.ts`
- `apps/web/src/app/actions/invoicing.ts`
- `apps/web/src/app/api/pdf/[type]/[id]/route.ts`

**Fix:** Global replace `e.from_id` -> `e.source_id` and `e.to_id` -> `e.target_id`.

### P0: Hardcoded HMAC Secret Fallback

`packages/core/src/quotes/token.ts:3` — Falls back to a well-known string if `QUOTE_TOKEN_SECRET` is unset. Anyone reading the source can forge tokens to access any quote.

**Fix:** Throw if env var is missing. No fallback.

### P0: `recomputeProposal` Dead-Code Bug

`packages/core/src/proposals/store.ts:33-41` — The expression `(a + b) - (b + a) + 0` is mathematically always `0`. Also passes empty string as personNumber. Yearly ROT/RUT cap is **never enforced** on proposal reload.

**Fix:** Store `previouslyClaimedThisYear` in proposal data, or make recomputation async with DB access.

### P1: Missing Authentication on Server Actions

- `apps/web/src/app/actions/quotes.ts` — `sendQuoteAction` never calls `getSession()`
- `apps/web/src/app/actions/invoicing.ts` — `submitRotRutAction` never calls `getSession()`

Both allow unauthenticated financial operations.

### P1: Proposal Editor Edits Silently Discarded

`apps/web/src/app/(app)/projects/[id]/components/proposal-editor.tsx` — User edits (qty, price, description) only update local React state. On "Approve", the original DB proposal is approved, discarding all user changes. The `updateProposalLine` function exists but is never called from the UI.

### P1: BankID Signing Accepts Client-Supplied PersonNumber

`apps/web/src/app/api/signing/initiate/route.ts:25` — `personNumber` comes from request body with no validation. Client can initiate signing with any personnummer.

### P1: ROT/RUT Tracking Cannot Distinguish ROT from RUT

`packages/core/src/economics/rot-rut-tracking.ts:57-66` — The accumulation query calculates BOTH 30% and 50% for the same labor lines regardless of which deduction type was actually applied. Yearly caps use incorrect accumulated amounts.

### P1: PDF Route Uses ProposalId but Download Link Sends ProjectId

The "Download PDF" link on quotes page: `/api/pdf/quote/${projectId}`. The PDF route handler calls `getProposal(db, tenantId, id)` which expects a proposalId. This would 404 for all approved quotes.

### P1: Quote Delivery PDF Missing ROT/RUT

`apps/web/src/app/actions/quotes.ts:176` — `rotRut: null` hardcoded. Customer-facing PDF shows full price without legally required deduction breakdown.

### P2: Race Condition on Proposal Approval

`packages/core/src/proposals/approve.ts:13-49` — No transaction or optimistic locking. Concurrent approvals create duplicate events.

### P2: No Transaction Around Multi-Event Approval

If server crashes mid-approval (after some events created but before proposal marked approved), re-approval creates duplicates.

### P2: Hardcoded Unit Label Maps Bypass Label System

Six files contain `{ 1: "tim", 2: "min", 3: "m²" ... }` maps instead of using `getLabelCode(db, unitId, tenantId)`. If label IDs change via seeding, maps silently produce wrong results.

### P2: Deep Imports Bypass Barrel Exports (6 files)

Web app uses `from "@resonansia/core/src/quotes/deliver"` etc. instead of `from "@resonansia/core"`.

### P2: OCR Delivery Note Creates Wrong Proposal Type

`packages/core/src/ai/ocr-delivery-note.ts:74,114` — `type: "quote"` but should be delivery note / material events.

### P2: Email HTML Injection in Quote Delivery

`packages/core/src/quotes/deliver.ts:77-81` — `tenantName` interpolated into HTML without escaping. Stored XSS via email.

### P2: PersonNumber Logged in Error Messages

`packages/core/src/signing/bankid.ts:90-92` — Swedish PII in error messages violates GDPR.

---

## Part 2: Spec Quality Analysis

### Section Scorecards

| # | Section | Precision | Completeness | Buildability | Verify Quality |
|---|---------|:---------:|:------------:|:------------:|:--------------:|
| 0 | Conventions | 9 | 8 | 9 | N/A |
| 1 | ROT/RUT Engine | 9 | 9 | **10** | 9 |
| 2 | AI Abstraction | 7 | 5 | 5 | 4 |
| 3 | Proposal System | 8 | 7 | 7 | 7 |
| 4 | AI Quote Gen | 7 | 6 | 6 | 5 |
| 5 | PDF Generation | 8 | 7 | 6 | 6 |
| 6 | BankID Signing | 8 | 7 | 7 | 6 |
| 7 | Quote Delivery | 7 | 5 | 5 | 5 |
| 8 | Invoice Gen | 8 | 7 | 7 | 7 |
| 9 | Skatteverket | 7 | 6 | 7 | 6 |
| 10 | Material OCR | 7 | 5 | 7 | 4 |
| 11 | Quote/Invoice UI | 6 | 5 | 5 | 4 |
| 12 | Final Verify | 6 | 7 | 4 | 5 |
| | **Average** | **7.3** | **6.3** | **6.5** | **5.6** |

### The Gold Standard: Section 1

Section 1 (ROT/RUT) scored 9-10 across all metrics. Pattern:
- Pure functions with no side effects
- Exact input/output types specified
- Five concrete numerical test vectors with expected outputs
- Deterministic — same inputs always same outputs

**Zero friction during build.** This is the template all sections should follow.

### The Worst Performer: Section 11 + 12

Section 11 (UI) was the most underspecified — abstract prose about "editable table" and "inline editing" with no component hierarchy, state management approach, or data fetching pattern.

Section 12 consumed **78 tool calls** (more than all building sections combined) because all integration bugs surfaced at the end when tsc was finally run.

### Top Friction Points

| # | Friction Point | Impact | Root Cause |
|---|---------------|--------|------------|
| F1 | Drizzle `.rows` trap | 22 fix edits | Spec didn't document that postgres-js returns arrays directly |
| F2 | Adapter constructor signatures | Multiple fixes | Spec referenced adapters without documenting their constructor args |
| F3 | Wrong file paths | Recreated files | Spec wrote `apps/web/app/` but actual path is `apps/web/src/app/` |
| F4 | Monorepo TSX compilation | Multiple config changes | Spec didn't mention cross-package JSX requires tsconfig changes |
| F5 | Missing `package.json` dependencies | Discovery during tsc | Spec never listed which packages need which dependencies |
| F6 | "Choose one" decisions | Agent guessed | Spec offered options instead of making the product decision |
| F7 | Narrative VERIFY steps | Not executable | "Generate quote for '3 rum'" requires running AI model |

---

## Part 3: Architecture Compliance

### Scorecard

| Category | Score | Notes |
|----------|:-----:|-------|
| Event sourcing consistency | 8/10 | Events created correctly; origin tracking imprecise |
| Label system consistency | **5/10** | Hardcoded unit maps in 6 files |
| `computeTotal` usage | 9/10 | One violation in `sendQuoteAction` |
| Integration adapter patterns | 10/10 | All adapters instantiated correctly |
| Error handling | 8/10 | Consistent pattern |
| Import/export conventions | **6/10** | 6 deep imports bypass barrels |
| AI arithmetic boundary | **10/10** | Perfectly enforced |
| Proposal transience | 9/10 | Proposals stay out of events until approval |
| SQL window function resolution | **10/10** | Used consistently everywhere |
| Cross-phase integration | 8/10 | Good messaging integration; PDF route ID mismatch |

### End-to-End Path Verification

| Path | Status |
|------|--------|
| AI quote -> proposal -> edit -> approve -> events -> PDF | **BREAK**: ROT/RUT cap not enforced during editing |
| Invoice from quote+actuals -> deviations -> approve -> Fortnox -> ROT/RUT | **PASS** |
| Customer receives link -> views quote -> BankID sign -> state change | **PASS** (minor: deep imports) |

---

## Part 4: Industry Research — State of the Art

### StrongDM Software Factory

StrongDM pioneered the "Software Factory" — no human writes code, no human reviews code. Humans define intent, agents do everything else. Key components:

- **Attractor**: DAG-based workflow orchestration using Graphviz DOT syntax
- **Digital Twin Universe**: Behavioral clones of third-party services
- **Gene Transfusion**: Move working patterns between codebases via exemplars
- **Pyramid Summaries**: Reversible summarization at multiple zoom levels
- **Shift Work**: Explicit interactive/non-interactive boundary

**Resonansia already implements several of these patterns** — digital twins (`packages/twins/`), domain skills (`.claude/skills/`), and the spec-as-source pattern.

### The Emerging Consensus on Spec-Driven Development

Thoughtworks, GitHub, Red Hat, AWS (Kiro), and Anthropic all converge on:
- Structured natural language with formal blocks is the sweet spot
- Separate "what" specs from "how" specs
- Multi-layered specs achieve 95%+ first-pass accuracy (Red Hat finding)
- Property-based testing is a natural match for spec-driven development

### The Three Laws of Spec Compilation

1. **The Spec Determines the Ceiling.** No agent sophistication compensates for a bad spec.
2. **Context is the Bottleneck.** The constraint is attention, not compute. Context rot begins immediately.
3. **Verification Must Be Co-Designed with Specification.** An ARTIFACT without a VERIFY is a function without a return type.

### The Compiler Analogy

| Compiler Phase | Spec Equivalent |
|---------------|-----------------|
| Lexical analysis | Extracting INVARIANT/ARTIFACT/VERIFY blocks |
| Syntactic analysis | Building dependency graph between artifacts |
| Semantic analysis | Cross-reference validation (types exist, invariants consistent) |
| Code generation | Actual code synthesis |
| Optimization | Refactoring (agents do this poorly without prompting) |

**Where the analogy breaks:** Traditional compilers are deterministic. LLM "compilation" is probabilistic. Same spec can produce structurally different but functionally equivalent code each run.

### Spec Smells (New Taxonomy)

| Spec Smell | Description |
|------------|-------------|
| Vague Quantifier | "should be fast" / "handle many users" |
| Implicit Dependency | Section A needs Section B but doesn't say so |
| Orphan Artifact | Defined but never referenced in VERIFY |
| God Section | One section specifying UI + logic + data |
| Pronoun Ambiguity | "it should update the record" — which record? |
| Untestable Requirement | "The system must be intuitive" |
| Missing Error Path | Only happy path specified |

### Context Window Economics

Chroma Research found that **performance degrades at every context length increment**, not just near the limit. The input-output ratio for production agents is approximately **100:1** — context is the dominant cost.

Key insight: Place critical constraints at the **beginning and end** of documents. Models attend weakly to the middle ("lost in the middle" effect).

---

## Part 5: Phase 4 Pre-flight Analysis

### Critical Issues (7)

1. **Edge column names wrong** — `from_id`/`to_id` vs actual `source_id`/`target_id`
2. **No web app frontend exists** — spec references project pages, tabs, dashboard that don't exist
3. **`node-cron` not installed** — Section 5 requires it
4. **No `jobs` script** in root package.json
5. **`job_runs` table** needs migration + schema (3rd extra table beyond "7 tables" rule)
6. **`nodeDataProjectSchema`** lacks `auto_status` field
7. **Customer node** missing `language` field

### High Issues (9)

- `MessagingAdapter` vs `EmailAdapter` — different interfaces, auto-status must handle both
- `handleIncomingMessage` assumes person senders — customer reply handling is a significant refactor
- `messageIntentSchema` missing customer intents (`customer_ack`, `customer_question`, `customer_complaint`)
- `NotificationType` missing customer escalation types
- No priority field on notifications
- `SendMessageInput.channel` doesn't include `"email"`
- PDF report component doesn't exist yet (complex layout: cover page, photo collages)
- `calculateProjectEconomics` missing weekly/date-range filtering
- Photo URLs may need signed URL conversion for customer-facing messages

### Recommended Build Order

```
1. Fix pre-existing bugs (edge column names)
2. Section 1 (Config Schema) — quick, schema-only
3. Section 2 (AI Summarization) — pure function
4. Section 4 (Customer Reply) — extends existing handler
5. Section 3 (Auto-Status Engine) — depends on 1 + 2
6. Section 6 (BRF Weekly Report) — depends on 2
7. Section 7 (Report PDF) — depends on 6
8. Section 5 (Scheduled Jobs) — depends on 3 + 6
9. Section 8 (UI) — defer or build minimal
10. Section 9 (Final Verification)
```

---

## Part 6: Recommendations for Better Specs

### Must-Have Changes

**R1: Add Type Check Gates after every section**
```
GATE:
  Run: pnpm tsc --noEmit --project packages/core/tsconfig.json
  Run: pnpm tsc --noEmit --project apps/web/tsconfig.json
  Must: Exit 0
```
This alone would have eliminated 78 tool calls in Phase 3.

**R2: Replace narrative VERIFYs with executable test skeletons**
```
VERIFY (executable):
  Test: calculateRotRut([{total: 30000, isLabor: true, rotRutType: 'rot'}], 0, '198001011234')
  Assert: result.deductionAmount === 9000
```

**R3: Include dependency cross-reference table per section**
```
DEPENDS_ON:
  SmsAdapter({ baseUrl, apiUser, apiPassword }) — packages/integrations/src/sms/adapter.ts
  calculateRotRut(lines, claimed, pn) — packages/core/src/economics/rot-rut.ts
```

**R4: Add "Codebase State" section (Section 0.5)**
```
CODEBASE_STATE:
  Pattern: db.execute(sql`...`) returns rows directly (NO .rows)
  Pattern: Edge columns are source_id/target_id (NOT from_id/to_id)
  Pattern: File paths use apps/web/src/app/ (note /src/)
  Pattern: Adapter constructors all take { baseUrl, ...config }
```

### Should-Have Changes

**R5: Standardize the spec grammar**
```
PhaseSpec   ::= Header Conventions Section+
Section     ::= SectionHeader Artifact+ Verify Gate Git
Artifact    ::= 'ARTIFACT' name ':' File Types? Functions? Logic?
Verify      ::= 'VERIFY' name ':' TestCase+
Gate        ::= 'GATE' ':' ShellCommand+
```

**R6: Structure VERIFY in three tiers**
- Tier 1: "It compiles" — `pnpm tsc --noEmit`
- Tier 2: "It works" — unit test assertions pass
- Tier 3: "It's correct" — scenario validation against holdout set

**R7: Add explicit "Why" rationale to each ARTIFACT**
Explaining WHY enables correct edge-case inference by the agent.

**R8: Run phase validation in a separate agent session**
After implementation, a fresh agent (with no memory of how code was written) runs all VERIFY steps.

**R9: Move `resonansia-scenarios.md` to a holdout location**
Implementation agents seeing test scenarios enables reward-hacking.

**R10: Add a "lessons learned" file that compounds across phases**
Record corrections, patterns that worked, anti-patterns discovered.

### Nice-to-Have Changes

**R11:** Property-based tests for pure calculation engines using `fast-check`
**R12:** Formal state machine definitions for node state transitions
**R13:** Small TLA+ model for bitemporal event resolution invariants
**R14:** Spec linter that detects ambiguity/incompleteness before implementation
**R15:** Convergence criteria per phase (quantitative "done" definition)

---

## Appendix: Agent Adapter Constructor Signatures

For reference in future specs:

| Adapter | Constructor |
|---------|-------------|
| `WhatsAppAdapter` | `{ baseUrl: string; phoneNumberId: string; accessToken: string }` |
| `SmsAdapter` | `{ baseUrl: string; apiUser: string; apiPassword: string }` |
| `ResendEmailAdapter` | `{ baseUrl: string; apiKey: string }` |
| `SupabaseStorageAdapter` | `{ baseUrl: string; accessToken: string }` |
| `FortnoxAdapter` | `{ baseUrl: string; accessToken: string }` |
| `SkatteverketAdapter` | `{ baseUrl: string }` |
| `BankIdAdapter` | `{ baseUrl: string }` |

## Appendix: Full Source List

- [StrongDM Software Factory Blog](https://www.strongdm.com/blog/the-strongdm-software-factory-building-software-with-ai)
- [StrongDM Factory Techniques](https://factory.strongdm.ai/techniques)
- [StrongDM Attractor Spec (GitHub)](https://github.com/strongdm/attractor/blob/main/attractor-spec.md)
- [Simon Willison's Analysis](https://simonwillison.net/2026/Feb/7/software-factory/)
- [Thoughtworks: Spec-Driven Development](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- [GitHub Blog: Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Red Hat: SDD Improves AI Coding Quality](https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality)
- [Martin Fowler: SDD Tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [Kiro: Future of Software Development](https://kiro.dev/blog/kiro-and-the-future-of-software-development/)
- [Anthropic: 2026 Agentic Coding Trends](https://resources.anthropic.com/2026-agentic-coding-trends-report)
- [Anthropic: Property-Based Testing with Claude](https://red.anthropic.com/2026/property-based-testing/)
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot)
- [AgentOS Framework (arxiv)](https://arxiv.org/html/2602.20934v1)
- [LLM4PR: Program Refinement (arxiv)](https://arxiv.org/html/2406.18616v1)
- [Stanford Law: Built by Agents, Tested by Agents](https://law.stanford.edu/2026/02/08/built-by-agents-tested-by-agents-trusted-by-whom/)
- [Agentic AI Architectures Taxonomy (arxiv)](https://arxiv.org/html/2601.12560v1)
