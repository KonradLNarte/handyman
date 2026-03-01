# Resonansia

Multi-tenant ERP for Swedish construction SMEs. Append-only event-sourced system with bitemporal data, AI-assisted insights, and cross-tenant federation.

## Stack

- **Language:** TypeScript (strict)
- **Framework:** Next.js 15, App Router, RSC
- **Database:** Supabase (PostgreSQL), Drizzle ORM
- **AI:** Vercel AI SDK, Anthropic Claude, OpenAI
- **UI:** shadcn/ui, Tailwind CSS, Lucide icons
- **PDF:** @react-pdf/renderer
- **Monorepo:** Turborepo, pnpm workspaces

## Architecture Rules

1. **7 tables only** — tenants, labels, nodes, edges, events, blobs, dicts (+ federation_edges)
2. **Events are append-only** — corrections via root pointer, never update/delete
3. **AI proposes, human decides** — AI suggestions are transient until approved
4. **AI never does arithmetic** — AI returns qty + unit_price, system computes totals
5. **RLS on every table** — federation via `has_federation_access()`, never bypass
6. **Next.js patterns** — RSC for data, Server Actions for mutations, Route Handlers only for webhooks
7. **Event resolution in SQL** — window functions (ROW_NUMBER), never in JavaScript
8. **Bitemporality** — `id` = transaction time (UUIDv7), `occurred_at` = valid time

## Commands

```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm twins        # Start digital twin server (port 9999)
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed platform-default labels
```

## Project Structure

```
apps/web/              # Next.js frontend
packages/shared/       # Zod schemas, types, label definitions
packages/db/           # Drizzle schema, migrations, queries
packages/core/         # Business logic (events, economics, AI, federation)
packages/integrations/ # External service adapters
packages/twins/        # Digital twin test server
packages/pdf/          # PDF generation (quotes, invoices)
supabase/              # Migrations and seed data
docs/                  # Specification documents
.claude/skills/        # Domain-specific AI skills
```

## Skills

1. **data-model** — table schemas, RLS, Drizzle, Zod, labels
2. **event-system** — bitemporality, corrections, aggregation, cache
3. **ai-pipeline** — LLM tiers, context protocol, anomaly detection
4. **federation** — cross-tenant access, projections, consent, GDPR
5. **integrations** — WhatsApp, SMS, Fortnox, BankID, twins
6. **ui** — design system, components, layout, RTL, PDF

## Full Specification

See `docs/resonansia-spec.md` for complete system specification.

## Git Conventions

- **Branches:** `feat/`, `fix/`, `chore/`, `docs/` prefixes
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
