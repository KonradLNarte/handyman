# Resonansia — Bootstrap NLSpec v1.0

> Natural Language Specification for project bootstrap.
> Describes the desired end state. The agent decides how to get there.
>
> **TILL KONRAD:** Innan du matar in detta till Claude Code:
>
> ```bash
> mkdir resonansia && cd resonansia
> git init
> git remote add origin git@github.com:snackverkstad/resonansia.git
> mkdir docs
> ```
>
> Kopiera `resonansia-spec.md`, `tech-decisions.md`, `design-system.md`,
> `integration-twins.md` till `docs/`.
>
> Starta Claude Code: `claude`
> Säg:
>
> "Read docs/bootstrap-spec.md. Execute the entire bootstrap process,
> phases 1 through 7. After each phase, run the VERIFY steps, ensure
> they pass, and commit to git as specified. Do not pause to ask me
> for confirmation between phases unless an error occurs that you
> absolutely cannot resolve yourself. Begin with Phase 1."

---

## 0. Conventions

- `MUST` = bootstrap is incorrect without this
- `SHOULD` = strongly recommended
- `ARTIFACT` = a file or directory that must exist after bootstrap
- `INVARIANT` = property that must hold
- `VERIFY` = a check the agent must run and confirm passes

**Reference documents** (in `docs/`, already present):
- `resonansia-spec.md` — System spec. Read relevant sections on demand.
- `tech-decisions.md` — Stack lock.
- `design-system.md` — UI rules.
- `integration-twins.md` — Digital twin HTTP contracts.

**Execution model:**
Work through phases 1–6 in order. Each phase has artifacts, invariants,
and verifications. Commit to git after each phase. Do not ask for
permission between phases. Report results at the end.

```
INVARIANT no_laziness:
  You MUST write complete files. DO NOT use placeholders like
  "// ... rest of code", "// TODO: implement", or "// similar for other types".
  Write the full schemas, the full SQL queries, and the full skill files.
  You are an autonomous execution agent, not an advisor.

INVARIANT non_interactive_commands:
  All CLI tools MUST be run with flags that disable interactive prompts.
  If a tool asks for user input, the agent will hang.
  Always use --yes, -y, -d, or equivalent flags.
  If no such flag exists, pre-configure via config files before running.

INVARIANT one_phase_at_a_time:
  Do not try to hold all phases in context simultaneously.
  Read the relevant docs/ section for the current phase,
  execute it, verify, commit, then move to the next phase.
```

---

## 1. Monorepo Foundation

### Artifacts

```
ARTIFACT monorepo_root:
  A Turborepo monorepo with pnpm workspaces.
  
  CRITICAL ORDER: pnpm-workspace.yaml and root package.json MUST be
  created BEFORE running create-next-app. Otherwise pnpm may fail
  with hoisting errors when Next.js tries to install react.
  
  Structure:
    resonansia/
    ├── apps/
    │   └── web/              # Next.js 15, App Router, TypeScript, Tailwind, shadcn/ui
    ├── packages/
    │   ├── db/               # Drizzle schema, migrations, queries
    │   ├── core/             # Business logic (events, economics, ai, federation)
    │   ├── integrations/     # External service adapters
    │   ├── twins/            # Digital twin test server
    │   ├── shared/           # Zod schemas, types, label definitions
    │   └── pdf/              # PDF generation
    ├── supabase/
    │   ├── migrations/
    │   └── seed.sql
    ├── docs/                 # Already present — do not modify
    ├── .claude/skills/       # 6 domain skills
    ├── CLAUDE.md
    ├── .env.example
    ├── .gitignore
    ├── turbo.json
    ├── pnpm-workspace.yaml
    └── package.json

ARTIFACT next_app:
  Located at apps/web/.
  MUST be created using non-interactive flags to avoid terminal hangs:
  
  `pnpm dlx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*" --use-pnpm --yes`
  
  shadcn/ui MUST be initialized non-interactively:
  `cd apps/web && pnpm dlx shadcn@latest init -d -y`
  
  MUST compile with zero errors.

ARTIFACT workspace_config:
  pnpm-workspace.yaml MUST include apps/* and packages/*.
  turbo.json MUST define dev, build, test pipelines.
  Root package.json MUST have scripts: dev, build, test, twins, db:migrate, db:seed.
```

### Dependencies

```
INVARIANT dependencies_present:
  The following MUST be available in the workspace:
  
  Runtime:
    zod, drizzle-orm, @supabase/supabase-js, uuid,
    ai, @ai-sdk/anthropic, @ai-sdk/openai,
    @anthropic-ai/tokenizer, @react-pdf/renderer
  
  Dev:
    drizzle-kit, typescript, @types/node, @types/uuid
  
  In apps/web:
    shadcn/ui initialized, lucide-react, tailwind-merge, clsx,
    class-variance-authority
  
  In packages/twins:
    express, @types/express
```

### Invariants

```
INVARIANT monorepo_compiles:
  Running `pnpm install` from root MUST succeed with zero errors.

INVARIANT gitignore_covers:
  .gitignore MUST exclude: node_modules, .next, .turbo, dist,
  .env, .env.local, .env.*.local, *.tsbuildinfo
```

### Verify

```
VERIFY monorepo:
  1. `pnpm install` exits 0
  2. `pnpm tsc --version` prints TypeScript version
  3. apps/web/package.json exists and has next as dependency
```

### Git

```
git add -A && git commit -m "chore: initialize monorepo"
```

---

## 2. CLAUDE.md

### Artifact

```
ARTIFACT claude_md:
  File: CLAUDE.md (project root)
  
  MUST contain exactly these sections, in this order:
  
  1. Project identity (1–2 sentences: what Resonansia is)
  2. Stack (bullet list: language, framework, DB, ORM, AI, UI, monorepo)
  3. Architecture rules (numbered list, max 8 rules):
     - 7 tables only
     - Events append-only, corrections via root pointer
     - AI proposes, human decides (transient proposals)
     - AI never does arithmetic
     - RLS on every table, federation via has_federation_access()
     - Next.js: RSC for data, Server Actions for mutations, Route Handlers only for webhooks
     - Event resolution via SQL window functions, never in JavaScript
     - Bitemporality: id=transaction time, occurred_at=valid time
  4. Commands (dev, build, test, twins, db:migrate, db:seed)
  5. Project structure (brief directory listing with 1-line descriptions)
  6. Skills reference (list 6 skill names with 1-line trigger descriptions)
  7. Pointer to docs/resonansia-spec.md for full spec
  8. Git conventions (branch naming, conventional commits)

INVARIANT claude_md_length:
  CLAUDE.md MUST be under 150 lines.
  It is loaded into EVERY Claude Code session.
  Brevity is critical — use skills for detail.

INVARIANT claude_md_no_spec_content:
  CLAUDE.md MUST NOT contain schemas, SQL, API contracts, or
  other detail that belongs in skills or docs.
  It is a map, not the territory.
```

### Git

```
git add CLAUDE.md && git commit -m "chore: add CLAUDE.md"
```

---

## 3. Skills

### Artifact

```
ARTIFACT skills:
  Directory: .claude/skills/
  6 subdirectories, each containing one SKILL.md file.
  
  Each SKILL.md MUST have:
  - YAML frontmatter with `name` and `description`
  - description written for semantic matching (include trigger words)
  - Markdown body under 400 lines
  - Focus on RULES, INVARIANTS, and ANTI-PATTERNS
  - Concrete code examples for critical patterns
  - Pointers to relevant docs/ sections for full reference
```

#### 3.1 data-model

```
ARTIFACT skill_data_model:
  File: .claude/skills/data-model/SKILL.md
  Source: docs/resonansia-spec.md section 2, docs/tech-decisions.md
  
  Trigger words in description: table, schema, RLS, Drizzle, migration,
    Zod, node, edge, label, blob, dict, tenant, database, partition
  
  MUST contain:
  - All 7+1 table definitions (compressed: name, key columns, purpose)
  - All Node Data Schemas (fields + types for Org, Person, Customer,
    Project, Product, Location, Supplier)
  - All Edge Data Schemas
  - All Event Data Schemas
  - RLS policy pattern WITH has_federation_access() SQL
  - Label domains required at launch (table from spec)
  - UUIDv7 generation rule (app layer, not DB)
  - Anti-patterns:
    "NEVER create new tables"
    "RLS MUST exist on every table"
    "NEVER disable RLS for federation queries"
    "NEVER use service_role key in API handlers"
```

#### 3.2 event-system

```
ARTIFACT skill_event_system:
  File: .claude/skills/event-system/SKILL.md
  Source: docs/resonansia-spec.md section 2.8
  
  Trigger words: event, time, bitemporality, correction, adjustment,
    aggregation, economics, cache, reconciliation, append-only
  
  MUST contain:
  - Bitemporality explanation (id = transaction time, occurred_at = valid time)
  - Root pointer pattern with concrete example (A→B→C)
  - Active event resolution SQL — COMPLETE window function query
    (COALESCE + ROW_NUMBER OVER PARTITION BY ... ORDER BY id DESC)
  - Instruction to encapsulate as getActiveEvents(tenantId, nodeId, typeIds)
  - Transient AI proposals lifecycle (JSON in app → approve → events)
  - EventOrigin enum (human, ai_generated, system, external_api)
  - Cache reconciliation: materialized view, trigger/cron, 10% sample
  - Anti-patterns:
    "NEVER aggregate events in JavaScript — always SQL"
    "NEVER use recursive CTEs for correction chains"
    "AI returns ONLY qty and unit_price — system computes total"
    "NEVER load all events into memory"
```

#### 3.3 ai-pipeline

```
ARTIFACT skill_ai_pipeline:
  File: .claude/skills/ai-pipeline/SKILL.md
  Source: docs/resonansia-spec.md section 5
  
  Trigger words: AI, LLM, classification, quote, generation, anomaly,
    context, prompt, token, translate, OCR, insight
  
  MUST contain:
  - AI capability list with model tier (cheap/medium/expensive)
  - Context protocol: 5 levels with token budgets
  - Dynamic resolution degradation (>10 projects → truncate)
  - Truncation transparency invariant
  - Anomaly shield: Phase 1 (platform, <100 events) + Phase 2 (tenant, ≥100)
  - Blind spot prevention: compare actuals vs BOTH quote AND historical
  - Scope similarity: semantic AI evaluation, min 3 projects, fail open
  - Token counting: USE @anthropic-ai/tokenizer, NEVER string.length/4
  - AI model config (3 tiers with provider + model name)
  - Anti-patterns:
    "AI NEVER does arithmetic"
    "NEVER silently exclude anomalies"
    "NEVER present partial answer as complete"
```

#### 3.4 federation

```
ARTIFACT skill_federation:
  File: .claude/skills/federation/SKILL.md
  Source: docs/resonansia-spec.md section 2.7
  
  Trigger words: federation, cross-tenant, subcontractor, projection,
    consent, magic link, revocation, GDPR
  
  MUST contain:
  - FederationEdge interface and status enum
  - ProjectionScope enum (3 defaults)
  - Masking schemas (SubcontractorProjectionView, ClientProjectionView, SupplierProjectionView)
  - federation_strict_restriction: custom scopes restrict only, never expand
  - Consent flow sequence (WhatsApp → Magic Link → web view → Accept → log)
  - Revocation behavior (immediate access removal, events preserved)
  - GDPR erasure at federation boundary (crypto-shred PII, retain economics)
  - has_federation_access() SQL — COMPLETE function definition
  - Anti-patterns:
    "NEVER copy data between tenants"
    "NEVER expand visibility beyond base template"
    "NEVER disable RLS for federation"
```

#### 3.5 integrations

```
ARTIFACT skill_integrations:
  File: .claude/skills/integrations/SKILL.md
  Source: docs/integration-twins.md
  
  Trigger words: WhatsApp, SMS, email, Fortnox, BankID, Skatteverket,
    integration, webhook, adapter, twin
  
  MUST contain:
  - All 7 integrations: endpoint summary (method, path, request/response shape)
  - Twin architecture: single Express server, port 9999, in-memory state
  - Control endpoints (/twin/reset, /twin/inspect, /twin/simulate-incoming, /twin/fail-next)
  - Environment config pattern (env vars point to twins in dev, real APIs in prod)
  - Adapter interface pattern (swap provider without code change)
  - Anti-patterns:
    "NEVER hardcode API URLs"
    "NEVER call real APIs in tests"
    "ALL integrations behind an interface"
```

#### 3.6 ui

```
ARTIFACT skill_ui:
  File: .claude/skills/ui/SKILL.md
  Source: docs/design-system.md
  
  Trigger words: UI, component, design, layout, dashboard, PDF, form,
    RTL, color, typography, shadcn, tailwind
  
  MUST contain:
  - Color palette (hex codes for all semantic colors)
  - Typography (sizes, fonts, number formatting)
  - Layout patterns: Dashboard desktop + mobile, Project detail (ASCII)
  - Component taxonomy (DataTable, KpiCard, Timeline, AiInsightCard, etc.)
  - AI content visual rules (violet palette, "AI-generated" label, source refs)
  - RTL support (dir="rtl", Noto Sans Arabic, Tailwind RTL)
  - PDF layout (quote + invoice ASCII mockup)
  - Next.js rules (RSC, Server Actions, Route Handlers scope)
  - Anti-patterns:
    "NEVER fetch() own API from Client Component"
    "NEVER Route Handler for internal data fetching"
    "NEVER show AI content without violet visual distinction"
```

### Invariants

```
INVARIANT skill_independence:
  Each skill MUST be self-contained enough to be useful without
  loading other skills simultaneously.

INVARIANT skill_no_redundancy_with_claude_md:
  Skills MUST NOT duplicate content already in CLAUDE.md.
  CLAUDE.md has rules. Skills have details and code examples.
```

### Git

```
git add .claude/ && git commit -m "chore: add 6 domain skills"
```

---

## 4. Shared Schemas

### Artifact

```
ARTIFACT shared_schemas:
  Directory: packages/shared/
  
  All SCHEMA blocks from docs/resonansia-spec.md translated to Zod.
  
  Files:
    schemas/common.ts      — Address, ContactInfo, MoneyAmount, DateRange, Locale
    schemas/node-data.ts   — NodeData_Org through NodeData_Supplier (7 schemas)
    schemas/edge-data.ts   — EdgeData_MemberOf through EdgeData_UsesProduct (7 schemas)
    schemas/event-data.ts  — EventData_Time through EventData_Note (10 schemas)
    schemas/enums.ts       — TenantStatus, FederationStatus, ProjectionScope, EventOrigin
    schemas/index.ts       — Re-exports everything
    labels/platform-defaults.ts — All launch-required labels as typed array
    types/index.ts         — Re-exports z.infer<> types for all schemas
    package.json           — name: @resonansia/shared

  Every schema MUST export both:
    - Zod schema (e.g. `export const nodeDataOrgSchema = z.object({...})`)
    - TypeScript type (e.g. `export type NodeDataOrg = z.infer<typeof nodeDataOrgSchema>`)
```

### Invariants

```
INVARIANT schema_spec_match:
  Every SCHEMA block in docs/resonansia-spec.md section 2 MUST have a
  corresponding Zod schema. No fields omitted, no fields invented.

INVARIANT schema_compiles:
  `pnpm tsc --noEmit` in packages/shared/ MUST exit 0.
```

### Verify

```
VERIFY schemas:
  1. Count: at least 27 named schemas (7 node + 7 edge + 10 event + 3 shared)
  2. All enums present (TenantStatus, FederationStatus, ProjectionScope, EventOrigin)
  3. Platform-default labels cover all 8 domains from spec
  4. TypeScript compilation succeeds
```

### Git

```
git add packages/shared/ && git commit -m "feat: add Zod schemas and platform labels"
```

---

## 5. Database Layer

### Artifact

```
ARTIFACT database_schema:
  Directory: packages/db/
  
  Drizzle ORM schema defining all 8 tables:
    schema/tenants.ts
    schema/labels.ts
    schema/nodes.ts
    schema/edges.ts
    schema/events.ts
    schema/blobs.ts
    schema/dicts.ts
    schema/federation-edges.ts
    schema/index.ts
  
  Every table MUST match its INTERFACE block in docs/resonansia-spec.md section 2.
  
  Column conventions (from docs/tech-decisions.md):
  - Table names: snake_case, plural
  - PKs: uuid, app-generated UUIDv7
  - Timestamps: timestamptz, default now()
  - JSON: jsonb for data columns
  - tenant_id on all tables except labels and federation_edges

ARTIFACT database_migration:
  Directory: supabase/migrations/
  
  A single initial SQL migration that:
  1. Creates PostgreSQL enums: event_origin, federation_status
  2. Creates all 8 tables with correct types and constraints
  3. Creates has_federation_access() as SECURITY DEFINER function
  4. Enables RLS on ALL tables
  5. Creates RLS policies:
     - Standard tables: own tenant OR has_federation_access()  (SELECT)
     - Standard tables: own tenant only (INSERT, UPDATE, DELETE)
     - Federation edges: visible if source_tenant or target_tenant matches JWT
     - Labels: readable by all, writable only platform admin
  6. Creates indexes:
     - events(tenant_id, node_id)
     - events(tenant_id, ref_id) — for correction chain lookup
     - edges(source_id), edges(target_id)
     - labels(domain, code)
     - federation_edges(source_tenant, target_tenant, status)

ARTIFACT database_seed:
  File: supabase/seed.sql
  Inserts all platform-default labels from packages/shared/labels/platform-defaults.ts
  as SQL INSERT statements with tenant_id = NULL.

ARTIFACT database_queries:
  Directory: packages/db/queries/
  
  active-events.ts:
    Function getActiveEvents(tenantId, nodeId, typeIds) -> ActiveEvent[]
    MUST use the window function pattern from the spec (COALESCE + ROW_NUMBER).
    MUST execute as a single SQL query, NOT in JavaScript.
  
  project-economics.ts:
    Function getProjectEconomics(tenantId, projectId) -> ProjectEconomics
    Uses getActiveEvents internally.
    Returns: quote_total, time_cost, material_cost, invoiced, margin.
```

### Invariants

```
INVARIANT rls_on_all_tables:
  Every table with tenant_id MUST have RLS enabled.
  No exceptions. No bypasses.

INVARIANT federation_rls_correct:
  has_federation_access() MUST be SECURITY DEFINER.
  It MUST check federation_edges for status=accepted.
  RLS SELECT policy MUST be: tenant_id = jwt OR has_federation_access(tenant_id).
  RLS INSERT/UPDATE/DELETE MUST be: tenant_id = jwt ONLY (no federation write).

INVARIANT event_resolution_in_sql:
  getActiveEvents MUST resolve correction chains entirely in SQL.
  It MUST NOT load events into JavaScript for filtering.

INVARIANT schema_compiles:
  `pnpm tsc --noEmit` in packages/db/ MUST exit 0.
```

### Verify

```
VERIFY database:
  1. Migration SQL is syntactically valid
  2. has_federation_access() function exists in migration
  3. RLS CREATE POLICY statements exist for all 8 tables
  4. getActiveEvents uses ROW_NUMBER window function (grep for it)
  5. TypeScript compilation succeeds
```

### Git

```
git add packages/db/ supabase/ && git commit -m "feat: add database schema, RLS, migrations, queries"
```

---

## 6. Digital Twins & Integration Layer

### Artifact

```
ARTIFACT twin_server:
  Directory: packages/twins/
  
  A single Express.js TypeScript server implementing 7 digital twins
  as specified in docs/integration-twins.md.
  
  Routes:
    /whatsapp/*       — WhatsApp Business Cloud API twin
    /sms/*            — 46elks SMS twin
    /fortnox/*        — Fortnox accounting twin
    /bankid/*         — BankID signing twin
    /email/*          — Resend email twin
    /skatteverket/*   — ROT/RUT submission twin
    /storage/*        — Object storage twin
    /twin/*           — Control endpoints
  
  Control endpoints:
    POST /twin/reset                 — Clear all in-memory state
    GET  /twin/inspect/:service      — Return stored data for a service
    POST /twin/simulate-incoming     — Trigger inbound webhook
    POST /twin/fail-next/:service    — Next call returns error
  
  All state in-memory. No external dependencies except express and uuid.
  
  MUST include a basic test file that verifies each twin responds correctly
  to at least one request matching the contract in docs/integration-twins.md.

ARTIFACT integration_adapters:
  Directory: packages/integrations/
  
  types.ts:
    Interfaces: MessagingAdapter, AccountingAdapter, SigningAdapter,
    EmailAdapter, TaxAdapter, StorageAdapter
  
  One adapter file per service:
    whatsapp/adapter.ts, sms/adapter.ts, fortnox/adapter.ts,
    bankid/adapter.ts, email/adapter.ts, skatteverket/adapter.ts,
    storage/adapter.ts
  
  Each adapter:
  - Implements its interface
  - Reads base URL from environment variable
  - Makes HTTP calls to that URL
  - Works identically against twin (dev) and real API (prod)

ARTIFACT env_example:
  File: .env.example
  
  Contains all environment variables the system needs:
  - Integration URLs (7, all defaulting to localhost:9999 twins)
  - Supabase connection (URL, anon key, service role key)
  - AI API keys (Anthropic, OpenAI)
```

### Invariants

```
INVARIANT twin_contract_fidelity:
  Each twin MUST implement the exact HTTP endpoints, request formats,
  and response formats documented in docs/integration-twins.md.
  The coding agent building integrations later will test against these.

INVARIANT adapter_abstraction:
  Application code MUST NEVER import from a specific adapter directly.
  It imports the interface. The concrete adapter is injected via config.
  Swapping WhatsApp provider MUST NOT require business logic changes.

INVARIANT twin_isolation:
  Twin server MUST have zero external dependencies beyond express and uuid.
  It MUST be startable with a single command.
```

### Verify

```
VERIFY twins:
  1. `pnpm twins` starts server on port 9999 without error
  2. GET /twin/inspect/whatsapp returns 200
  3. POST to each twin's primary endpoint returns expected response shape
  4. POST /twin/reset returns 200 and clears state
  5. Twin test file passes
```

### Git

```
git add packages/twins/ packages/integrations/ .env.example
git commit -m "feat: add digital twins and integration adapters"
```

---

## 7. Final Assembly

### Verify All

```
VERIFY final:
  1. `pnpm install` exits 0
  2. CLAUDE.md exists and is under 150 lines
  3. 6 skill files exist in .claude/skills/
  4. All Zod schemas compile (packages/shared)
  5. Database schema compiles (packages/db)
  6. Twin server starts (packages/twins)
  7. .env.example contains all required variables
  8. Git log shows one commit per phase (6 commits minimum)
```

### Final commit and push

```
git add -A
git commit -m "chore: bootstrap complete — ready for implementation"
git push -u origin main
```

### Report

When done, report:
1. File count per package
2. Any deviations from this spec and why
3. Status of every VERIFY block (pass/fail)
4. Any compilation warnings
