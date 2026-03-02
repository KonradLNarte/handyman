# Resonansia — Tech Decisions v1.0

> Stack lock for V1. This file is fed to the coding agent alongside
> resonansia-spec.md. It constrains implementation choices that the
> spec intentionally leaves open.

**Last updated:** 2026-02-28

---

## Purpose

The NLSpec (resonansia-spec.md) is technology-agnostic by design —
the same spec can be validated against multiple implementations.
This document locks the technology choices for V1.

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Language** | TypeScript (strict mode) | Single language across stack, strong ecosystem, AI agents trained extensively on TS |
| **Runtime** | Node.js 22+ | LTS, native fetch, good async I/O |
| **Web framework** | Next.js 15+ (App Router) | SSR, API routes, React Server Components |
| **Database** | Supabase (PostgreSQL 16+) | Managed Postgres, built-in RLS, Auth, Realtime, Storage |
| **ORM / Query** | Drizzle ORM | Type-safe, SQL-first, good Supabase/Postgres support |
| **Validation** | Zod | Runtime validation matching the SCHEMA blocks in spec |
| **Auth** | Supabase Auth + custom JWT | Email/password, social login, JWT with tenant_id claim |
| **Object Storage** | Supabase Storage | Signed URLs, integrated with auth |
| **Realtime** | Supabase Realtime (Postgres NOTIFY) | Event notifications, label/dict cache invalidation |
| **AI SDK** | Vercel AI SDK | Model-agnostic, streaming, structured output |
| **AI Models** | Anthropic Claude (expensive), OpenAI GPT-4o-mini (cheap) | Tiered per spec: cheap for classification, expensive for generation |
| **Styling** | Tailwind CSS 4 | Utility-first, good AI agent support |
| **UI Components** | shadcn/ui | Accessible, composable, not a dependency (copied into project) |
| **PDF Generation** | @react-pdf/renderer | React-based PDF, supports RTL, branding |
| **WhatsApp** | Meta WhatsApp Business Cloud API | Official API, template messages, media support |
| **SMS** | 46elks (Sweden) or Twilio (global) | Swedish numbers, bidirectional SMS |
| **Email** | Resend | Developer-friendly, good deliverability |
| **Deployment** | Vercel (app) + Supabase (data) | Managed, auto-scaling, EU regions available |
| **Monorepo** | Turborepo | Shared types between packages |
| **Token counting** | `@anthropic-ai/tokenizer` | Accurate token budgeting for AI context protocol. Do NOT estimate via `string.length / 4`. |

### Drizzle Raw SQL Rules

| Pattern | Correct | WRONG (will crash) |
|---------|---------|-------------------|
| `db.execute()` result | `result as unknown as T[]` | `result.rows as T[]` |
| Array filter in SQL | `IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})` | `ANY(${ids})` or `ANY(${ids}::int[])` |

These are postgres-js driver specifics. The `pg` driver works differently.
Since we use `postgres` (not `pg`), these rules are mandatory.

---

## Next.js Architecture Rules (CRITICAL)

These rules prevent paradigm confusion between RSC, Server Actions, and Route Handlers:

```
RULE nextjs_data_fetching:
  React Server Components (RSC) MUST be used for all data fetching.
  Server Components call Drizzle queries directly — NO fetch() to own API.
  
  CORRECT:
    // app/projects/page.tsx (Server Component)
    const projects = await db.query.nodes.findMany({
      where: and(eq(nodes.type_id, PROJECT_TYPE), eq(nodes.tenant_id, tenantId))
    });

  INCORRECT:
    // app/projects/page.tsx (Client Component fetching own API)
    const res = await fetch('/api/projects');  // ❌ NEVER DO THIS

RULE nextjs_mutations:
  Server Actions MUST be used for all data mutations (creating events,
  approving quotes, registering time, etc.).
  Server Actions validate input with Zod, call Drizzle, and revalidate paths.

  CORRECT:
    // app/projects/[id]/actions.ts
    'use server'
    export async function registerTime(formData: FormData) { ... }

RULE nextjs_route_handlers:
  Route Handlers (/app/api/*) MUST ONLY be used for:
  1. External webhooks (WhatsApp, SMS, email, Fortnox callbacks)
  2. PDF generation endpoints (returning binary data)
  3. Cron job endpoints (cache reconciliation, status broadcasts)
  
  They MUST NOT be used for internal data fetching or mutations.

RULE nextjs_client_components:
  Client Components ('use client') MUST ONLY be used for:
  1. Interactive UI (forms, modals, drag-and-drop)
  2. Real-time subscriptions (Supabase Realtime listeners)
  3. Browser APIs (camera, geolocation)
  
  Client Components receive data as props from parent Server Components.
  They NEVER fetch data themselves (except Realtime subscriptions).
```

---

## Project Structure

```
resonansia/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages and API routes
│       ├── components/         # React components
│       └── lib/                # Client-side utilities
├── packages/
│   ├── db/                     # Drizzle schema, migrations, queries
│   │   ├── schema/             # Table definitions matching spec entities
│   │   ├── migrations/         # SQL migrations
│   │   └── queries/            # Typed query functions
│   ├── core/                   # Business logic, event processing
│   │   ├── events/             # Event creation, aggregation, correction resolution
│   │   ├── economics/          # Deterministic calculations (margins, ROT, VAT)
│   │   ├── ai/                 # AI abstraction layer, context builder, anomaly shield
│   │   └── federation/         # Projection scopes, consent flow
│   ├── integrations/           # External service adapters
│   │   ├── whatsapp/
│   │   ├── sms/
│   │   ├── email/
│   │   ├── fortnox/
│   │   └── bankid/
│   ├── pdf/                    # PDF generation (quotes, invoices, reports)
│   └── shared/                 # Zod schemas, types, constants
│       ├── schemas/            # All SCHEMA blocks from spec as Zod schemas
│       ├── types/              # TypeScript types generated from Zod
│       └── labels/             # Platform-default label definitions
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── seed.sql                # Platform-default labels, dict entries
│   └── config.toml             # Supabase project config
└── turbo.json
```

---

## Database Conventions

| Convention | Rule |
|-----------|------|
| Table names | snake_case, plural: `tenants`, `nodes`, `edges`, `events`, `labels`, `blobs`, `dicts`, `federation_edges` |
| Column names | snake_case |
| Primary keys | `id` (uuid, default gen_random_uuid() — note: app generates UUIDv7, not DB) |
| Timestamps | `created_at` (timestamptz, default now()), `updated_at` (timestamptz) |
| Tenant isolation | `tenant_id` column + RLS policy on every table except `labels` |
| JSON columns | `data` column typed as `jsonb`, validated by Zod in application layer |
| Partitioning | `events` table: hash-partitioned by `tenant_id` (16 partitions), sub-partitioned by quarter on `occurred_at` |
| Indexes | Minimum: tenant_id, node_id on events; source_id/target_id on edges; domain+code on labels |

---

## UUID v7 Generation

UUIDv7 MUST be generated in the application layer (not by the database),
because it embeds the creation timestamp (transaction time per spec).

```typescript
// Use the uuid package with v7 support, or a lightweight implementation
import { v7 as uuidv7 } from 'uuid';
```

---

## Zod Schema Mapping

Every `SCHEMA` block in resonansia-spec.md MUST have a corresponding Zod schema
in `packages/shared/schemas/`. Example:

```typescript
// packages/shared/schemas/node-data.ts
import { z } from 'zod';
import { addressSchema, contactInfoSchema } from './common';

export const nodeDataOrgSchema = z.object({
  name: z.string().min(1),
  org_number: z.string().nullable(),
  address: addressSchema.nullable(),
  contact: contactInfoSchema,
  logo_url: z.string().url().nullable(),
  industry: z.string().nullable(),
  default_currency_id: z.number().int(),
  default_locale_id: z.number().int(),
  vat_number: z.string().nullable(),
  bankgiro: z.string().nullable(),
  plusgiro: z.string().nullable(),
  payment_terms_days: z.number().int().default(30),
});
```

---

## RLS Policy Pattern

Every table with `tenant_id` MUST have RLS enabled. The policy MUST accommodate
federation access (see `auth_rls_federation` in spec).

### Standard tables (nodes, events, edges, blobs, dicts):

```sql
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- Helper function: checks if the JWT's tenant has an accepted federation edge
-- with the target tenant. SECURITY DEFINER runs with elevated privileges.
CREATE OR REPLACE FUNCTION has_federation_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM federation_edges
    WHERE status = 1  -- accepted
      AND (
        (source_tenant = target_tenant_id
         AND target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
        OR
        (target_tenant = target_tenant_id
         AND source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
      )
  );
$$;

-- RLS policy: own tenant OR federated tenant
CREATE POLICY "tenant_isolation_with_federation" ON nodes
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

-- Write policy: own tenant ONLY (federation is read-only)
CREATE POLICY "tenant_write_isolation" ON nodes
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "tenant_update_isolation" ON nodes
  FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
```

**CRITICAL:** `has_federation_access()` grants ROW-level access only.
Column-level masking (what fields are visible) is enforced in the application
layer via Projection Scope Zod schemas. The DB lets you see the row;
the app controls what you see in it.

**Performance:** Index required:
```sql
CREATE INDEX idx_federation_edges_lookup
  ON federation_edges (source_tenant, target_tenant, status);
```

### Federation edges table (spans tenants by definition):

```sql
-- Federation edges have their own RLS: visible if you are either party
CREATE POLICY "federation_edge_visibility" ON federation_edges
  FOR SELECT
  USING (
    source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );
```

---

## Event Origin Tracking

The `origin` column on the events table uses a PostgreSQL enum:

```sql
CREATE TYPE event_origin AS ENUM ('human', 'ai_generated', 'system', 'external_api');
```

---

## AI Model Configuration

```typescript
// packages/core/ai/config.ts
export const AI_TIERS = {
  cheap: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    // Used for: classification, translation, summarization
  },
  medium: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    maxTokens: 2000,
    // Used for: OCR/document understanding, anomaly detection
  },
  expensive: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    maxTokens: 4000,
    // Used for: quote generation, complex Q&A
  },
} as const;
```

### Token Counting (CRITICAL)

The AI Context Protocol requires accurate token counting for budget enforcement.

```
RULE token_counting:
  Token counting MUST use @anthropic-ai/tokenizer (for Anthropic models)
  or tiktoken (for OpenAI models).
  
  The agent MUST NOT estimate tokens via string.length / 4 or similar heuristics.
  This will break the context budget and cause unpredictable AI behavior.
  
  Install: npm install @anthropic-ai/tokenizer

  Usage:
    import { countTokens } from '@anthropic-ai/tokenizer';
    const count = countTokens(text);
```

---

## What This File Does NOT Cover

- UI/UX design decisions → see `design-system.md`
- Integration API contracts → see `integration-twins.md`
- Acceptance criteria → see `resonansia-scenarios.md` (holdout, not visible to agent)
