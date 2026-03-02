---
name: data-model
description: >
  Database tables, schemas, RLS policies, Drizzle ORM, Zod validation,
  migrations, node types, edge types, labels, blobs, dicts, tenant isolation,
  partition strategy, federation edges, UUIDv7 generation.
---

# Data Model Skill

## Tables (7+1)

| Table | PK | tenant_id | Purpose |
|-------|-----|-----------|---------|
| `tenants` | uuid7 | — | Isolation boundary |
| `labels` | smallint | nullable | Controlled vocabularies (type system) |
| `nodes` | uuid7 | yes | Everything that exists (org, person, project, customer, product, location, supplier) |
| `edges` | uuid7 | yes | Directed typed relations between nodes |
| `events` | uuid7 | yes | Everything that happens (append-only, bitemporal) |
| `blobs` | uuid7 | yes | Binary content metadata + URL |
| `dicts` | uuid7 | nullable | i18n, semantics, config |
| `federation_edges` | uuid7 | — | Cross-tenant consent-based relations |

## Node Data Schemas

```
NodeData_Org: name, org_number?, address?, contact, logo_url?, industry?,
  default_currency_id, default_locale_id, vat_number?, bankgiro?, plusgiro?, payment_terms_days

NodeData_Person: name, contact, language, role?, hourly_rate?, avatar_url?

NodeData_Customer: name, address?, contact, org_number?, is_company,
  preferred_channel, rot_rut_person_number?

NodeData_Project: name, description?, address?, dates?, rot_applicable,
  rut_applicable, estimated_hours?, notes?

NodeData_Product: name, sku?, unit_id, default_price?, coverage_sqm?,
  supplier_id?, barcode?

NodeData_Location: name, address (required with lat/lng)

NodeData_Supplier: name, org_number?, contact, account_number?
```

## Edge Data Schemas

```
EdgeData_MemberOf:       role?, start_date?               (Person → Org)
EdgeData_AssignedTo:     role?, start_date?, end_date?     (Person → Project)
EdgeData_SubcontractorOf: contract_ref?, rate?, currency_id? (Person/Org → Org)
EdgeData_CustomerOf:     since?                            (Customer → Org)
EdgeData_LocatedAt:      (no fields)                       (Project → Location)
EdgeData_SupplierOf:     account_number?                   (Supplier → Org)
EdgeData_UsesProduct:    estimated_qty?, unit_id?           (Project → Product)
```

## Event Data Schemas

```
EventData_Time:        break_minutes?, note?
EventData_Material:    description?, delivery_note_ref?
EventData_Photo:       url, caption?, thumbnail_url?
EventData_Message:     text, channel, direction, external_id?
EventData_QuoteLine:   description, is_labor, vat_rate, sort_order
EventData_InvoiceLine: description, is_labor, vat_rate, sort_order, quote_line_ref?
EventData_Adjustment:  reason
EventData_StateChange: from_state, to_state, trigger
EventData_Payment:     method, reference?
EventData_Note:        text
```

## RLS Policy Pattern

Every table with `tenant_id` MUST have RLS enabled.

```sql
-- Helper: SECURITY DEFINER function
CREATE OR REPLACE FUNCTION has_federation_access(target_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM federation_edges
    WHERE status = 1
      AND (
        (source_tenant = target_tenant_id
         AND target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
        OR
        (target_tenant = target_tenant_id
         AND source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
      )
  );
$$;

-- SELECT: own tenant OR federation access
CREATE POLICY "tenant_isolation_with_federation" ON <table>
  FOR SELECT USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

-- INSERT/UPDATE/DELETE: own tenant ONLY
CREATE POLICY "tenant_write_isolation" ON <table>
  FOR INSERT WITH CHECK (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );
```

## Label Domains (Required at Launch)

| Domain | Codes |
|--------|-------|
| `node_type` | org, person, project, customer, supplier, product, location |
| `edge_type` | member_of, assigned_to, subcontractor_of, customer_of, located_at, supplier_of, uses_product |
| `event_type` | time, material, photo, message, quote_line, invoice_line, adjustment, state_change, payment, note |
| `node_state` | draft, active, in_progress, completed, archived, cancelled |
| `unit` | hour, minute, sqm, lm, piece, kg, liter |
| `currency` | sek, nok, dkk, eur, usd |
| `locale` | sv, en, ar, pl, tr, fi, no, da |
| `blob_kind` | photo, document, invoice_scan, delivery_note, signature |

## UUIDv7 Generation

UUIDv7 MUST be generated in the **application layer**, not the database:

```typescript
import { v7 as uuidv7 } from 'uuid';
const id = uuidv7(); // embeds creation timestamp = transaction time
```

## Anti-Patterns

- **NEVER create new tables** — all business logic fits in the 7+1 tables
- **RLS MUST exist on every table** with tenant_id
- **NEVER disable RLS for federation queries** — use `has_federation_access()`
- **NEVER use service_role key in API handlers** — always use anon key with RLS
- **NEVER store binary content in the database** — blobs table holds metadata + URL only

See `docs/resonansia-spec.md` section 2 for full interface definitions.

## Drizzle Raw SQL Traps (CRITICAL)

These bugs WILL occur if you write raw SQL with Drizzle. Memorize them.

### Trap 1: db.execute() return shape

The `postgres-js` driver returns rows DIRECTLY as an array.
There is NO `.rows` property. This is different from `node-postgres` (`pg`).

```typescript
// ❌ WRONG — result.rows is undefined, "not iterable" crash
const result = await db.execute(sql`SELECT * FROM labels`);
const labels = result.rows as Label[];

// ✅ CORRECT — result IS the array
const result = await db.execute(sql`SELECT * FROM labels`);
const labels = result as unknown as Label[];
```

EVERY call to `db.execute()` must treat the result as a direct array.
Never write `.rows` anywhere in the codebase.

### Trap 2: SQL array parameters with ANY()

Drizzle's `sql` template wraps JS arrays as a "record" type.
PostgreSQL cannot cast record to int[] or any array type.
`ANY(${arr})` crashes. `ANY(${arr}::int[])` also crashes.

```typescript
// ❌ WRONG — "op ANY/ALL requires array on right side"
sql`AND e.type_id = ANY(${typeIds})`

// ❌ ALSO WRONG — "cannot cast type record to integer[]"
sql`AND e.type_id = ANY(${typeIds}::int[])`

// ✅ CORRECT — use IN with sql.join
sql`AND e.type_id IN (${sql.join(typeIds.map(id => sql`${id}`), sql`, `)})`
```

This applies to ALL raw SQL queries that filter by an array of values.
Always use `IN` with `sql.join`, never `ANY`.
