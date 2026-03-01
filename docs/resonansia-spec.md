# Resonansia — NLSpec v2.0

> Natural Language Specification for non-interactive agent implementation.
> This document is the **seed**: sufficient for a coding agent to implement
> and for a validation harness to verify.

**Version:** 2.0 (incorporates architecture decisions from deep analysis)
**Last updated:** 2026-02-28
**Authors:** Snack & Verkstad + Claude + Gemini

---

## 0. How To Read This Spec

This is an **NLSpec** (Natural Language Spec) — a human-readable specification
designed to be directly consumed by coding agents. It defines interfaces,
data structures, behavioral contracts, and invariants at a level of precision
sufficient for implementation without human code review.

**Conventions:**

- `MUST` = implementation is incorrect without this
- `SHOULD` = strongly recommended; omit only with explicit justification
- `MAY` = optional enhancement (Phase 2+)
- `INTERFACE` blocks define contracts. Implement in any language.
- `INVARIANT` blocks define properties that must always hold.
- `BEHAVIOR` blocks define observable system behavior.
- `RULE` blocks define business rules with deterministic logic.
- `SCHEMA` blocks define strict data shapes. No ambiguity allowed.
- All identifiers use snake_case. All types use PascalCase.

**Companion documents:**

| File | Purpose | Agent visibility |
|------|---------|-----------------|
| `resonansia-spec.md` | The Seed. System specification. | ✅ Visible to coding agent |
| `resonansia-scenarios.md` | Holdout validation set. | ❌ Hidden from coding agent |
| `tech-decisions.md` | Stack lock: languages, frameworks, infra. | ✅ Visible to coding agent |
| `design-system.md` | UI primitives, component taxonomy. | ✅ Visible to frontend agent |
| `integration-twins.md` | HTTP/JSON contracts for digital twins. | ✅ Visible to integration agent |

---

## 1. System Identity

Resonansia is an AI-first business management platform for service trades
(painters, plumbers, electricians, gardeners, cleaners, and all people
who perform work for others).

The system captures everything that exists, every relationship, and everything
that happens in a business. It makes the comprehensible visible and the complex
simple. It never hides.

### 1.1 Design Axioms

These axioms constrain all implementation decisions:

```
AXIOM-01: Human first, system adapts.
  The system meets users where they are: WhatsApp, SMS, email, browser.
  No user should have to learn a new interface.

AXIOM-02: AI as intermediary, never as decision-maker.
  AI interprets, suggests, generates, translates.
  AI never decides on behalf of the user.
  Every AI action is transparent and correctable.
  AI proposals MUST NOT become economic truth until human approval.

AXIOM-03: Seven tables, nothing more.
  All business logic is represented in seven conceptual entities.
  Complexity is handled through composition, not new tables.

AXIOM-04: Network effect through generosity.
  Free tier is usable — not a demo.
  Every invited subcontractor is a potential new customer.
  Threshold to value is zero.

AXIOM-05: Transparency over magic.
  Users can always see where a number comes from,
  why AI suggests something, and what happens next.
  Truncated or partial information MUST be disclosed as such.

AXIOM-06: Online-first, offline-tolerant (Phase 2).
  V1 is strictly online-first.
  Offline capability is MAY (Phase 2) — not attempted in V1 due to
  extreme complexity of sync/conflict resolution.

AXIOM-07: Global architecture, local relevance.
  Data model is industry-agnostic, scalable to millions of tenants.
  Each tenant experiences a system built for their industry, language, region.
```

### 1.2 What Resonansia Is NOT

```
NOT-01: Not an accounting system. Integrates with accounting systems (Fortnox, Visma).
NOT-02: Not a marketplace. It is a tool FOR the tradesperson.
NOT-03: Does not make decisions for the user. AI suggests, human decides.
NOT-04: Does not replace industry-specific certification or regulatory management.
NOT-05: Does not handle payroll. Records time exportable to payroll systems.
NOT-06: Does not store payment information. Payments via integration.
```

---

## 2. Data Model

All business logic is represented in seven conceptual entities plus one
cross-tenant relation. This section defines their semantics, fields,
invariants, behavioral contracts, and **strict data schemas**.

### 2.1 Entity Overview

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  TENANT  │────▷│   NODE   │────▷│   EDGE   │
│          │     │          │     │          │
│ isolation│     │ existence│     │ relation │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                      ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  LABEL   │     │  EVENT   │     │   BLOB   │     │   DICT   │
│          │     │          │     │          │     │          │
│vocabulary│     │ happening│     │  binary  │     │ semantics│
└──────────┘     └──────────┘     └──────────┘     └──────────┘

Cross-tenant:
┌──────────────────┐
│ FEDERATION EDGE  │
│ consent-based    │
│ cross-tenant     │
│ relation         │
└──────────────────┘
```

### 2.2 Shared Data Schemas

These schemas are referenced throughout the data model. They define the
exact shape of reusable data structures. No ambiguity allowed.

```
SCHEMA Address:
  street:       String           # "Storgatan 12"
  street2:      String | null    # "Lgh 1402"
  postal_code:  String           # "114 55"
  city:         String           # "Stockholm"
  country:      String           # ISO 3166-1 alpha-2: "SE", "NO", "PL"
  lat:          Float | null     # Latitude (WGS84)
  lng:          Float | null     # Longitude (WGS84)

SCHEMA ContactInfo:
  email:        String | null    # RFC 5322 email
  phone:        String | null    # E.164 format: "+46701234567"
  website:      String | null    # URL

SCHEMA MoneyAmount:
  amount:       Decimal          # Always stored in minor unit (öre/cent)
  currency_id:  SmallInt         # Label reference (domain = currency)

SCHEMA DateRange:
  start_date:   Date             # ISO 8601: "2026-03-15"
  end_date:     Date | null      # null = ongoing

SCHEMA Locale:
  language:     String           # ISO 639-1: "sv", "ar", "pl", "en"
  region:       String | null    # ISO 3166-1 alpha-2: "SE", "NO"
```

### 2.3 TENANT — Physical Isolation

```
INTERFACE Tenant:
  id:         Uuid7          # globally unique, time-sortable
  status:     TenantStatus   # active | suspended | deleted
  region:     String         # data residency zone (e.g. "eu-north", "us-east")
  created_at: Timestamp

ENUM TenantStatus:
  active | suspended | deleted

INVARIANT tenant_region:
  Every tenant MUST have exactly one region controlling physical data location.

INVARIANT tenant_column:
  tenant_id MUST exist as a column in every data table except tenant and label.

INVARIANT tenant_isolation:
  All data for a tenant MUST be accessible only by that tenant,
  except platform-global data (labels, dict with tenant_id = null).

INVARIANT tenant_soft_delete:
  Tenant deletion MUST be soft (status flag), not physical deletion.
```

### 2.4 LABEL — Controlled Vocabularies (Type System)

Labels are the system's type system. They classify nodes, edges, and events.
Types are data-defined, not code-defined. Adding a new business entity type
MUST be a data operation (INSERT into label), NOT a code change.

```
INTERFACE Label:
  id:           SmallInt       # compact, cached
  tenant_id:    Uuid7 | null   # null = platform-global
  domain:       String         # namespace: node_type, edge_type, event_type, unit, locale, etc.
  code:         String         # unique within domain: project, person, hour, sek, sv, ar, etc.
  parent_id:    SmallInt | null # hierarchical vocabularies (e.g. unit > time > hour)
  sort_order:   Int
  is_system:    Boolean        # true = cannot be deleted by tenant

INVARIANT label_levels:
  Labels MUST have three levels:
    Platform (tenant_id = null)
    Organization (tenant_id = X)
    User (future)

INVARIANT label_override:
  Organization labels MAY extend platform labels
  but MUST NOT remove or hide them.

INVARIANT label_lookup_priority:
  When looking up labels, org-specific MUST take priority
  over platform-global with the same domain+code.

INVARIANT label_cache:
  The entire label table SHOULD be cached in memory.
  Invalidation occurs on change via notification channel.

INVARIANT label_extensibility:
  Adding a new type of business entity (e.g. "garden_project")
  MUST be a data operation (INSERT into label), NOT a code change.
```

**Required domains at launch:**

| Domain | Example codes | Purpose |
|--------|--------------|---------|
| `node_type` | `org`, `person`, `project`, `customer`, `supplier`, `product`, `location` | Classifies nodes |
| `edge_type` | `member_of`, `assigned_to`, `subcontractor_of`, `located_at`, `owns` | Classifies relations |
| `event_type` | `time`, `material`, `photo`, `message`, `quote_line`, `invoice_line`, `adjustment`, `state_change`, `payment` | Classifies events |
| `node_state` | `draft`, `active`, `in_progress`, `completed`, `archived`, `cancelled` | Node status |
| `unit` | `hour`, `minute`, `sqm`, `lm`, `piece`, `kg`, `liter` | Units of measure |
| `currency` | `sek`, `nok`, `dkk`, `eur`, `usd` | Currencies |
| `locale` | `sv`, `en`, `ar`, `pl`, `tr`, `fi`, `no`, `da` | Languages |
| `blob_kind` | `photo`, `document`, `invoice_scan`, `delivery_note`, `signature` | Blob types |

### 2.5 NODE — Everything That Exists

A node represents any business entity. The node type is determined by a label.

```
INTERFACE Node:
  id:           Uuid7          # globally unique, time-sortable
  tenant_id:    Uuid7
  parent_id:    Uuid7 | null   # hierarchy: project → room, org → department
  type_id:      SmallInt       # label reference (domain = node_type)
  key:          String | null  # human-readable identifier (e.g. "P-2026-042")
  state_id:     SmallInt | null # label reference (domain = node_state)
  data:         Json           # type-specific properties — see Node Data Schemas below
  search_text:  String         # full-text search generated from data
  created_at:   Timestamp
  updated_at:   Timestamp

INVARIANT node_tenant:
  A node MUST always belong to exactly one tenant.

INVARIANT node_type_valid:
  node.type_id MUST reference a valid label in domain node_type.

INVARIANT node_state_valid:
  If set, node.state_id MUST reference a valid label in domain node_state.

INVARIANT node_data_validation:
  The data field MUST be validated against the schema defined for its node type
  (see Node Data Schemas). Validation occurs in the application layer.

INVARIANT node_search_sync:
  search_text MUST update automatically when data changes.
```

#### 2.5.1 Node Data Schemas

These define the **exact** shape of `Node.data` for each node type.
Fields marked `required` MUST be present. Fields marked `optional` MAY be null or absent.

```
SCHEMA NodeData_Org:
  name:           String            # required — company name
  org_number:     String | null     # optional — Swedish org nr: "556123-4567"
  address:        Address | null    # optional — see shared schema
  contact:        ContactInfo       # required — at least one of email/phone
  logo_url:       String | null     # optional — URL to logo in blob storage
  industry:       String | null     # optional — free text or label code
  default_currency_id: SmallInt     # required — label ref (domain = currency)
  default_locale_id:   SmallInt     # required — label ref (domain = locale)
  vat_number:     String | null     # optional — EU VAT number
  bankgiro:       String | null     # optional — Swedish bankgiro
  plusgiro:       String | null     # optional — Swedish plusgiro
  payment_terms_days: Int           # required — default: 30

SCHEMA NodeData_Person:
  name:           String            # required — full name
  contact:        ContactInfo       # required — at least one of email/phone
  language:       String            # required — ISO 639-1: "sv", "ar", "pl"
  role:           String | null     # optional — free text: "painter", "electrician"
  hourly_rate:    Decimal | null    # optional — default rate in tenant currency
  avatar_url:     String | null     # optional

SCHEMA NodeData_Customer:
  name:           String            # required — person or company name
  address:        Address | null    # optional
  contact:        ContactInfo       # required
  org_number:     String | null     # optional — if company
  is_company:     Boolean           # required — true = B2B, false = B2C
  preferred_channel: String         # required — "email" | "sms" | "whatsapp"
  rot_rut_person_number: String | null  # optional — Swedish personnummer for ROT/RUT

SCHEMA NodeData_Project:
  name:           String            # required — "Eriksson — Interior Painting"
  description:    String | null     # optional — free text scope description
  address:        Address | null    # optional — worksite address
  dates:          DateRange | null  # optional — planned start/end
  rot_applicable: Boolean           # required — default false
  rut_applicable: Boolean           # required — default false
  estimated_hours: Decimal | null   # optional
  notes:          String | null     # optional

SCHEMA NodeData_Product:
  name:           String            # required — "Alcro Bestå Väggfärg Helmatt Vit 10L"
  sku:            String | null     # optional — supplier article number
  unit_id:        SmallInt          # required — label ref (domain = unit): liter, piece, sqm
  default_price:  Decimal | null    # optional — ex VAT, in tenant currency
  coverage_sqm:   Decimal | null    # optional — sqm per unit (for material estimation)
  supplier_id:    Uuid7 | null      # optional — ref to supplier node
  barcode:        String | null     # optional — EAN/UPC

SCHEMA NodeData_Location:
  name:           String            # required — "Eriksson Villa"
  address:        Address           # required — must include lat/lng if available

SCHEMA NodeData_Supplier:
  name:           String            # required
  org_number:     String | null     # optional
  contact:        ContactInfo       # required
  account_number: String | null     # optional — for payment reference
```

### 2.6 EDGE — All Relationships

A directed, typed relation between two nodes within the same tenant.

```
INTERFACE Edge:
  id:           Uuid7
  tenant_id:    Uuid7
  source_id:    Uuid7          # from-node
  target_id:    Uuid7          # to-node
  type_id:      SmallInt       # label reference (domain = edge_type)
  data:         Json | null    # see Edge Data Schemas below
  created_at:   Timestamp

INVARIANT edge_same_tenant:
  source and target MUST belong to the same tenant.

INVARIANT edge_unique:
  (source_id, target_id, type_id) MUST be unique within a tenant.

INVARIANT edge_not_bidirectional:
  Edges are NOT implicitly bidirectional.
  If bidirectional relation needed, create two edges.
```

#### 2.6.1 Edge Data Schemas

```
SCHEMA EdgeData_MemberOf:       # Person → Org
  role:         String | null     # "owner" | "admin" | "member"
  start_date:   Date | null

SCHEMA EdgeData_AssignedTo:     # Person → Project
  role:         String | null     # "lead" | "worker" | "inspector"
  start_date:   Date | null
  end_date:     Date | null

SCHEMA EdgeData_SubcontractorOf: # Person/Org → Org
  contract_ref: String | null     # external contract reference
  rate:         Decimal | null    # agreed hourly rate
  currency_id:  SmallInt | null   # label ref

SCHEMA EdgeData_CustomerOf:     # Customer → Org
  since:        Date | null

SCHEMA EdgeData_LocatedAt:      # Project → Location
  (no additional fields)

SCHEMA EdgeData_SupplierOf:     # Supplier → Org
  account_number: String | null

SCHEMA EdgeData_UsesProduct:    # Project → Product
  estimated_qty: Decimal | null
  unit_id:       SmallInt | null  # label ref
```

### 2.7 FEDERATION EDGE — Cross-Tenant Relations

Enables subcontractor networks, supplier relationships, and industry connections
across tenant boundaries. Federation is **asymmetric** — each direction exposes
different data through Projection Scopes.

```
INTERFACE FederationEdge:
  id:             Uuid7
  source_tenant:  Uuid7
  source_node:    Uuid7
  target_tenant:  Uuid7
  target_node:    Uuid7
  type_id:        SmallInt
  status:         FederationStatus
  scope:          ProjectionScope    # defines the data contract
  data:           Json | null

ENUM FederationStatus:
  pending = 0
  accepted = 1
  rejected = -1
  revoked = -2     # historical relation, no active access

ENUM ProjectionScope:
  subcontractor_default | client_default | supplier_default

INVARIANT federation_consent:
  Federation edges MUST be consent-based.
  Target tenant MUST actively accept via the consent flow (see below).

INVARIANT federation_no_copy:
  No data is copied between tenants — only pointers.

INVARIANT federation_visibility:
  Both sides MAY see the relation.

INVARIANT federation_data_control:
  Each tenant controls what data it exposes via the federation relation.

INVARIANT federation_partitioning:
  Federation edges MUST NOT be partitioned per tenant
  (they span tenants by definition).

INVARIANT federation_projection:
  A Federation Edge NEVER grants raw table access. It grants access via
  a ProjectionScope, enforced by predefined masking schemas in the
  application layer.

INVARIANT federation_strict_restriction:
  Custom Projection Scopes MAY ONLY restrict data further than the
  platform defaults. A custom projection MUST NEVER expand visibility
  beyond its base template. (e.g., a custom subcontractor view can hide
  the project address, but can NEVER expose the project margin.)

INVARIANT federation_revocation_and_history:
  When status becomes `revoked`, cross-tenant access is immediately severed.
  Existing Events in the source tenant remain (append-only).
  If target invokes GDPR erasure, the source tenant MUST crypto-shred
  the target's actor_id and personal data in event data payloads, but
  MUST retain qty, unit_price, and total to preserve economic integrity.
```

#### 2.7.1 Federation Projection Contracts

Each ProjectionScope maps to a strict masking interface in the application layer.
These define exactly what the *receiving* tenant can see.

```
INTERFACE FederationProjection:
  edge_type:          SmallInt            # label: subcontractor_of, supplier_of, etc.
  allowed_event_types: List<SmallInt>     # label-IDs of visible event types
  node_mask:          String             # reference to a predefined masking schema

SCHEMA SubcontractorProjectionView:
  # What a subcontractor (target) sees about the source tenant's project:
  project_name:     String       # from NodeData_Project.name
  project_address:  Address      # from NodeData_Project.address
  project_description: String | null
  own_events:       List<Event>  # ONLY events where actor_id = target person
  work_order:       Json | null  # checklist, scope, photos
  # EXCLUDED: margins, quote_lines, invoice_lines, other actors' events,
  #           hourly rates of other workers, customer personal data

SCHEMA ClientProjectionView:
  # What a client (customer) sees about a project:
  project_name:     String
  project_status:   String       # state label code
  photos:           List<Blob>   # project photos (metadata only)
  timeline_summary: String       # AI-generated narrative
  # EXCLUDED: all cost data, internal notes, subcontractor details,
  #           individual worker data, margins

SCHEMA SupplierProjectionView:
  # What a supplier sees:
  material_events:  List<Event>  # ONLY events of type material referencing their products
  # EXCLUDED: everything else
```

#### 2.7.2 Federation Consent Flow

```
BEHAVIOR federation_consent_flow:
  1. Source tenant initiates federation (e.g., Kimmo invites Aziz as subcontractor).
  2. System sends a WhatsApp message to the target with a short-lived Magic Link.
  3. Link opens a web view displaying the exact Projection Contract in the
     target's language: "Kimmo (Vi Tre Målar Sverige AB) wants to share
     project assignments and receive your time reports."
  4. Target clicks "Accept".
  5. System logs: IP, timestamp, user agent, projection scope as proof of
     B2B legitimate interest.
  6. Federation edge status → accepted.
  7. If target later clicks "Revoke" (available via link or app):
     Federation edge status → revoked. Access severed immediately.
```

### 2.8 EVENT — Everything That Happens

Events represent business occurrences. They are **append-only** — created but
never updated or deleted. Events operate on **two timelines** (bitemporal).

```
INTERFACE Event:
  id:           Uuid7          # globally unique, time-sortable
                               # TRANSACTION TIME: embedded in UUIDv7
                               # = when the system learned about this event
  tenant_id:    Uuid7
  node_id:      Uuid7          # which node this event relates to
  ref_id:       Uuid7 | null   # link to another node OR to original event (for adjustments)
  actor_id:     Uuid7 | null   # who performed the action
  type_id:      SmallInt       # label reference (domain = event_type)
  origin:       EventOrigin    # who/what created this event
  qty:          Decimal | null  # quantity (hours, sqm, count)
  unit_id:      SmallInt | null # label reference (domain = unit)
  unit_price:   Decimal | null  # price per unit
  total:        Decimal | null  # COMPUTED: qty × unit_price
  data:         Json | null     # see Event Data Schemas below
  occurred_at:  Timestamp      # VALID TIME: when the event happened in the real world
                               # May differ from id's embedded timestamp (retroactive entry,
                               # clock skew, offline sync)

ENUM EventOrigin:
  human            # created by a user action
  ai_generated     # created by AI after human approval
  system           # created by system automation (state changes, scheduled jobs)
  external_api     # created by integration (accounting sync, webhook)
```

#### 2.8.1 Bitemporality

```
INVARIANT event_bitemporality:
  Every Event operates on two timelines:
  1. Transaction Time (system_time): Embedded in id (UUIDv7). Monotonically
     increasing, immutable. Defines WHEN the system learned about the event.
  2. Valid Time (domain_time): Stored as occurred_at. Defines WHEN the
     event happened in the real world. Can be clock-skewed or retroactively set.

INVARIANT event_resolution_uses_transaction_time:
  State resolution (which adjustment is "current") MUST use Transaction Time (id),
  NOT Valid Time (occurred_at).

INVARIANT event_reporting_uses_valid_time:
  Business logic and reporting (e.g., "Hours worked in March") MUST group
  by Valid Time (occurred_at).
```

#### 2.8.2 Append-Only & Corrections

```
INVARIANT event_append_only:
  Events MUST be append-only. No UPDATE or DELETE ever.

INVARIANT event_correction_root_pointer:
  Correction events MUST NOT form recursive chains.
  An adjustment event MUST always point its ref_id to the ORIGINAL root event.
  Query logic for current state: SELECT the adjustment event with the highest
  id (UUIDv7 sort order) for a given ref_id, OR the root event if no
  adjustments exist.

BEHAVIOR event_compensation_resolution:
  If Event A (qty=8) is corrected by Event B (qty=6, ref_id=A), and later
  corrected by Event C (qty=7, ref_id=A):
  - The active quantity is 7 (Event C has the highest id).
  - Events A and B are logically shadowed but physically preserved for audit.
  - Economic aggregation uses only the active values.
```

#### 2.8.3 Economic Aggregation

```
INVARIANT event_economics_source_of_truth:
  Events are the immutable source of truth for all economics.
  Aggregated tables or materialized views ARE PERMITTED for performance
  (e.g., project_economics_cache), BUT they MUST be deterministically
  rebuildable from the event log at any moment.

INVARIANT event_total_computed:
  For every event with qty and unit_price, total MUST equal qty × unit_price.

INVARIANT event_time_partitioned:
  Events MUST be partitioned by time (in addition to tenant partitioning)
  for efficient archival and search.

INVARIANT event_realtime:
  Events SHOULD have a notification channel that triggers
  real-time updates to subscribers.

BEHAVIOR cache_reconciliation:
  System MUST run a periodic reconciliation job (at minimum daily) that:
  1. Selects a random sample of N projects (N ≥ 10% of active projects)
  2. Recomputes economics from raw events (resolving adjustment chains)
  3. Compares against cached values
  4. If delta > 0.01 SEK: logs alert and triggers cache rebuild for that project
  5. If delta detected on > 5% of sampled projects: triggers full cache rebuild

BEHAVIOR active_event_resolution_sql:
  The "active value" for any event (considering corrections) MUST be resolved
  in SQL using a window function. This MUST NOT be done in JavaScript/TypeScript
  by loading all events into memory.

  Reference SQL pattern (adapt to Drizzle syntax):

    WITH ranked AS (
      SELECT
        COALESCE(e.ref_id, e.id) AS root_id,
        e.id,
        e.qty,
        e.unit_price,
        e.qty * e.unit_price AS total,
        e.type_id,
        e.node_id,
        e.actor_id,
        e.occurred_at,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(e.ref_id, e.id)
          ORDER BY e.id DESC           -- UUIDv7 sort = transaction time
        ) AS rn
      FROM events e
      WHERE e.tenant_id = $1
        AND e.node_id = $2
        AND e.type_id = ANY($3)        -- filter by event types
    )
    SELECT * FROM ranked WHERE rn = 1  -- only the "active" version

  COALESCE(ref_id, id) groups root events with their adjustments.
  ROW_NUMBER with ORDER BY id DESC picks the latest by transaction time.
  rn = 1 is the active (current) value.

  This query MUST be encapsulated in a reusable Drizzle query function:
    getActiveEvents(tenantId, nodeId, typeIds) -> ActiveEvent[]

  For project economics, the materialized cache (project_economics_cache)
  SHOULD be maintained by a database trigger or a cron job that runs this
  query, NOT by application-layer aggregation on every read.

  The agent MUST NOT:
  - Load all events into JavaScript and filter/sort in memory
  - Use recursive CTEs for adjustment chain resolution
  - Skip the window function approach in favor of multiple queries
```

#### 2.8.4 AI Transient Proposals

```
INVARIANT ai_proposals_not_events:
  AI-generated proposals (quotes, invoice drafts) MUST NOT be written as
  Events until explicitly approved by a human.

BEHAVIOR ai_transient_proposals:
  During the "Draft" phase, AI output lives purely as a JSON payload in the
  Application Layer (e.g., stored in a Node's data field with state=draft,
  or held in session/cache).
  When the user clicks "Approve":
  1. System maps the payload into immutable quote_line or invoice_line Events
  2. Each event gets origin=ai_generated
  3. State change event records the approval
  This preserves AXIOM-02 without corrupting event-sourced economics.
```

#### 2.8.5 Event Data Schemas

```
SCHEMA EventData_Time:
  # No additional fields beyond Event.qty (hours), Event.unit_price, Event.actor_id
  break_minutes:  Int | null      # optional — lunch/break deducted
  note:           String | null   # optional — "Sanding and first coat"

SCHEMA EventData_Material:
  # Event.qty = quantity, Event.unit_id = unit, Event.unit_price = price
  # Event.ref_id = product node or supplier node
  description:    String | null   # optional — if not from catalog
  delivery_note_ref: String | null # optional — delivery note number

SCHEMA EventData_Photo:
  url:            String          # required — blob storage URL
  caption:        String | null   # optional
  thumbnail_url:  String | null   # optional

SCHEMA EventData_Message:
  text:           String          # required — message body
  channel:        String          # required — "whatsapp" | "sms" | "email" | "app"
  direction:      String          # required — "inbound" | "outbound"
  external_id:    String | null   # optional — WhatsApp message ID, email message-id

SCHEMA EventData_QuoteLine:
  description:    String          # required — line item description
  is_labor:       Boolean         # required — true = labor (for ROT/RUT), false = material
  vat_rate:       Decimal         # required — 0.25, 0.12, 0.06, or 0.00
  sort_order:     Int             # required — display order on document

SCHEMA EventData_InvoiceLine:
  description:    String          # required
  is_labor:       Boolean         # required
  vat_rate:       Decimal         # required
  sort_order:     Int             # required
  quote_line_ref: Uuid7 | null    # optional — links to original quote_line event

SCHEMA EventData_Adjustment:
  reason:         String          # required — why the correction was made
  # Event.ref_id MUST point to the ORIGINAL root event (not another adjustment)

SCHEMA EventData_StateChange:
  from_state:     String          # required — label code of previous state
  to_state:       String          # required — label code of new state
  trigger:        String          # required — "human" | "system" | "customer_signing"

SCHEMA EventData_Payment:
  method:         String          # required — "invoice" | "swish" | "bankgiro" | "card"
  reference:      String | null   # optional — OCR number, Swish ref
  # Event.qty = amount in minor units (öre)

SCHEMA EventData_Note:
  text:           String          # required
```

### 2.9 BLOB — Binary Content

```
INTERFACE Blob:
  id:           Uuid7
  tenant_id:    Uuid7
  node_id:      Uuid7 | null
  event_id:     Uuid7 | null
  type_id:      SmallInt       # label reference (domain = blob_kind)
  url:          String         # reference to external storage
  metadata:     Json           # see schema below

SCHEMA BlobMetadata:
  file_size:    Int            # bytes
  mime_type:    String         # "image/jpeg", "application/pdf"
  width:        Int | null     # pixels (images only)
  height:       Int | null     # pixels (images only)
  exif:         Json | null    # EXIF data (images only)
  original_filename: String | null

INVARIANT blob_external:
  Binary content MUST NOT be stored in the database.
  Only metadata and URL reference.

INVARIANT blob_signed_urls:
  URLs MUST be time-limited (signed URLs) or access-controlled.

INVARIANT blob_auto_association:
  Photos received via messaging channel (WhatsApp, SMS) MUST be
  automatically associated with the correct project and day.
```

### 2.10 DICT — Semantics, i18n, Configuration

```
INTERFACE Dict:
  id:           Uuid7
  tenant_id:    Uuid7 | null   # null = platform-global
  scope:        String         # namespace (e.g. "label.node_type.project", "ui.dashboard.title")
  locale_id:    SmallInt       # label reference (domain = locale)
  value:        Json           # translation/configuration data

INVARIANT dict_levels:
  Dict MUST support platform-global and tenant-specific values.

INVARIANT dict_cache:
  Dict SHOULD be aggressively cached — it is read extremely often.

INVARIANT dict_override:
  Tenant-specific dict values MUST shadow platform values on lookup.
```

---

## 3. Interaction Modes

The system has three fundamental ways to interact with users.

### 3.1 Conversation (Messaging)

Users interact via WhatsApp, SMS, or built-in chat. This is the primary
interface for field workers and subcontractors.

```
BEHAVIOR message_receive:
  WHEN an incoming message arrives via WhatsApp or SMS
  THEN the system MUST:
    1. Identify the sender (by phone number → person node)
    2. Classify the message via AI: time_report | status_question | new_issue | photo | other
    3. Extract parameters (hours, project reference, etc.)
    4. Execute the appropriate action
    5. Respond in the sender's preferred language
    6. Log the interaction as an event of type message (origin=human for inbound)

BEHAVIOR time_report_via_message:
  WHEN a user sends a number (e.g. "8") to the system
  THEN the system MUST:
    1. Interpret as hours
    2. Find the user's active work order
    3. Create event(type=time, qty=8, node=active_project, actor=sender, origin=human)
    4. Respond with confirmation: "✓ 8h registered on [project]. Day X of Y."
    5. Notify the project owner

BEHAVIOR photo_via_message:
  WHEN a user sends a photo via WhatsApp
  THEN the system MUST:
    1. Identify the sender's active work order
    2. Create a blob associated with the project and current date
    3. Create an event(type=photo, node=project, actor=sender, origin=human)
    4. Respond with confirmation

BEHAVIOR message_language:
  All messages MUST be communicated in the user's preferred language.
  Language preference is stored in NodeData_Person.language.

BEHAVIOR message_context:
  The system SHOULD maintain conversational context:
  know which project a conversation is about without the user
  explicitly stating it.

BEHAVIOR message_correction:
  Every AI response MUST be correctable.
  If user says "No, it was 6 hours", the system MUST create
  an adjustment event (ref_id → original time event) and confirm.
```

**Sequence — Time report via WhatsApp:**

```
Aziz                    System                     Kimmo (notification)
  │                        │                            │
  │──"8"──────────────────▶│                            │
  │                        │ AI: classify as time_report │
  │                        │ Find active work order      │
  │                        │ Create event(type=time,     │
  │                        │   qty=8, node=Eriksson,     │
  │                        │   actor=Aziz, origin=human) │
  │◀─"✓ 8h registered     │                            │
  │   on Eriksson project. │                            │
  │   Day 3 of 5."────────│                            │
  │                        │──notification─────────────▶│
  │                        │  "Aziz: 8h on Eriksson"    │
```

### 3.2 Application (Web/Mobile)

Full web/mobile interface for overview, administration, and detail work.

```
BEHAVIOR app_dashboard:
  Dashboard MUST show:
  - Active projects with economic summary
  - AI insights (anomalies, suggestions)
  - Recent activity feed
  - Quick actions (create quote, register time)

BEHAVIOR app_project_detail:
  Every project MUST have a detail view with:
  - Economics: quote total, time cost, material cost, margin
    (computed from events, may use cache, see cache_reconciliation)
  - Timeline of events
  - Photos
  - Assigned persons
  - Status and progress

BEHAVIOR app_search:
  User MUST be able to search across entire business:
  projects, customers, persons, events.
  Search MUST use the search_text field on nodes.

BEHAVIOR app_responsive:
  Web interface MUST be responsive (desktop + mobile).

BEHAVIOR app_role_based:
  Interface SHOULD adapt to role:
  - Owner sees economics
  - Field worker sees work orders
  - Admin sees everything
```

### 3.3 Broadcasts (Outbound to Third Parties)

System sends information to people without accounts.

```
BEHAVIOR broadcast_no_account:
  Recipients MUST NOT need an account or login.

BEHAVIOR broadcast_channels:
  System MUST send via: email, SMS (with link), WhatsApp.

BEHAVIOR broadcast_logging:
  Every broadcast MUST be logged as an event of type message (origin=system).

BEHAVIOR broadcast_auto_status:
  System SHOULD support configurable automatic status reports
  per project (daily/weekly) containing:
  - 1-2 photos from the period
  - Short summary: "Day 3 of 5. Living room and hall done."
  - No cost details unless customer has opted in.

BEHAVIOR broadcast_reply:
  Recipients SHOULD be able to reply, and replies
  MUST be logged as incoming events.
```

---

## 4. Core Capabilities

### 4.1 Project Management

```
BEHAVIOR project_lifecycle:
  Project state transitions: draft → active → in_progress → completed → archived.
  Each transition creates a state_change event (origin=human or origin=system).

BEHAVIOR project_hierarchy:
  Projects MUST support hierarchy: project → sub-project → room/zone.
  Implemented via node.parent_id.

BEHAVIOR project_economics:
  Project economics MUST be computed as (resolving adjustment chains per 2.8.2):
    quote_total    = SUM(active quote_line events for project)
    time_cost      = SUM(active time events for project, total)
    material_cost  = SUM(active material events for project, total)
    invoiced       = SUM(active invoice_line events for project, total)
    margin         = quote_total - (time_cost + material_cost)

  "Active" means: the root event if no adjustments exist, otherwise
  the adjustment with the highest id (UUIDv7 sort) pointing to that root.

  Source of truth is always events. Cached aggregates allowed per 2.8.3.
```

### 4.2 Quoting

```
BEHAVIOR quote_creation:
  A quote is a collection of events of type quote_line attached to a project.
  AI MUST be able to suggest quote content based on:
  - Project description
  - Photos
  - Product catalog
  - Historical projects within the tenant
  AI suggestions are transient (per 2.8.4) until human approval.

BEHAVIOR quote_pdf:
  Quotes MUST generate as branded PDF with:
  - Tenant logo, colors, contact info (from NodeData_Org)
  - Line items with quantities, unit prices, totals
  - ROT/RUT deduction breakdown (if applicable)
  - Customer's cost after deduction
  - RTL text support (Arabic)

BEHAVIOR quote_delivery:
  Quotes MUST be sendable via email, SMS (with link), WhatsApp.

BEHAVIOR quote_signing:
  Quotes SHOULD support digital signing (BankID in Sweden, eIDAS in Europe).

BEHAVIOR quote_to_project:
  A signed quote MUST automatically:
  1. Create state_change event (trigger=customer_signing)
  2. Move project to state=active
  3. Quote line events become the project budget

BEHAVIOR quote_versioning:
  Quotes MUST support versioning. New version creates new events,
  old events remain (append-only). Version tracked in EventData_QuoteLine.

BEHAVIOR quote_rot_rut:
  See section 6.1 for ROT/RUT rules.
```

### 4.3 Time Registration

```
BEHAVIOR time_registration:
  Time can be registered via: web app, mobile app, WhatsApp/SMS.
  All create events of type time with origin=human.

BEHAVIOR time_via_message:
  Via messaging: user sends a number (e.g. "8") interpreted as hours.
  System creates event(type=time, qty=8, node=active_project, actor=sender).

BEHAVIOR time_pricing:
  Unit price MUST come from (in priority order):
  1. Project's agreed rate for this person (EdgeData_AssignedTo or EdgeData_SubcontractorOf)
  2. Person's default rate (NodeData_Person.hourly_rate)
  3. Manual input

BEHAVIOR time_suggestion:
  System SHOULD suggest time based on historical patterns:
  "You usually log 8h on Mondays — correct for today?"
```

### 4.4 Material Management

```
BEHAVIOR material_registration:
  Material consumption creates events of type material (origin=human).
  Can be registered via: manual input, photo of delivery note, integration.

BEHAVIOR material_ocr:
  AI SHOULD extract data from photographed delivery notes:
  articles, quantities, prices.
  Extracted data is a transient proposal (per 2.8.4) until human confirmation.

BEHAVIOR product_catalog:
  System MUST support a product catalog (nodes of type product)
  that can be global or tenant-specific.

BEHAVIOR material_comparison:
  System SHOULD compare actual material usage against quote estimate per project.
```

### 4.5 Invoicing

```
BEHAVIOR invoice_generation:
  System MUST generate invoice proposals based on project events (time + material).
  Invoice proposals are transient (per 2.8.4) until human approval.
  On approval: invoice_line events created with origin=ai_generated.

BEHAVIOR invoice_pdf:
  Invoice PDF MUST include correct:
  - VAT (25% / 12% / 6% per EventData_InvoiceLine.vat_rate)
  - ROT/RUT deduction
  - Payment terms, bank details (from NodeData_Org)
  - Tenant branding

BEHAVIOR invoice_deviation_flag:
  AI MUST flag deviations before invoicing:
  - "Material cost 12% higher than quote — adjust?"
  - "Aziz reported 4h more than estimated — check."
  Deviations are presented in the approval UI, not as events.

BEHAVIOR invoice_partial:
  System MUST support partial invoicing during project.

BEHAVIOR invoice_sync:
  Invoice data MUST sync to external accounting system.

BEHAVIOR invoice_e_invoice:
  System SHOULD support Peppol BIS e-invoice for B2B and public sector.

BEHAVIOR invoice_supplier_match:
  System SHOULD match incoming scanned supplier invoices
  against material events.
```

### 4.6 Subcontractor Management

```
BEHAVIOR subcontractor_work_order:
  System MUST send work orders to subcontractors via WhatsApp/SMS.

BEHAVIOR work_order_content:
  Work orders MUST contain:
  - Address with map link
  - Scope of work
  - Checklist (preparations, protection, treatment)
  - Photos from inspection
  ALL translated to the subcontractor's preferred language (NodeData_Person.language).

BEHAVIOR subcontractor_time:
  Subcontractors MUST be able to report time via WhatsApp/SMS
  (send a number = hours).

BEHAVIOR subcontractor_photos:
  Photos sent via WhatsApp MUST auto-associate to correct project.

BEHAVIOR subcontractor_tracking:
  System MUST track subcontractor effort per project:
  time, photos, status.

BEHAVIOR subcontractor_to_customer:
  A subcontractor MUST be able to become their own tenant
  with one click (network effect).
  - New tenant created on Free tier
  - Profile data migrated (with consent via federation consent flow)
  - Existing subcontractor relationship maintained via federation edge
  - Onboarding < 5 minutes
```

### 4.7 Customer Communication

```
BEHAVIOR auto_status:
  System MUST generate automatic status updates to customers
  (daily/weekly, configurable per project).

BEHAVIOR status_content:
  Status updates MUST contain:
  - Photos from the period
  - Short human-readable summary (AI-generated, origin=system)
  - Timeline/progress info
  - NO cost details (unless customer opted in via NodeData_Customer.preferred_channel config)

BEHAVIOR customer_no_account:
  Customer MUST NOT need an account or login to receive updates.

BEHAVIOR customer_reply:
  Customer SHOULD be able to reply. Replies logged as events (origin=human).
```

### 4.8 Document Generation

```
BEHAVIOR pdf_generation:
  System MUST generate PDFs for: quotes, invoices, work orders, reports.

BEHAVIOR pdf_branding:
  All PDFs MUST be branded with tenant identity from NodeData_Org:
  logo_url, company name, address, contact info.

BEHAVIOR pdf_rtl:
  PDFs MUST support right-to-left text (Arabic).

BEHAVIOR pdf_reports:
  Reports SHOULD include photos, economic summary,
  and AI-generated narrative text.

BEHAVIOR pdf_signatures:
  Documents SHOULD support digital signatures.
```

---

## 5. AI Behavior

### 5.1 Principles

```
INVARIANT ai_transparency:
  AI MUST always show where information comes from.
  Never assert without source.

INVARIANT ai_correctability:
  Every AI action MUST be undoable or correctable by the user.

INVARIANT ai_model_agnostic:
  System MUST be able to swap AI models without changing business logic.
  All AI calls go through an abstraction layer.

INVARIANT ai_tiering:
  System MUST use cost-effective model per task:
  cheap model for classification, expensive for complex generation.

INVARIANT ai_no_arithmetic:
  AI MUST NEVER perform arithmetic directly.
  Calculations (sums, margins, VAT, totals) MUST always be done by deterministic code.
  
  Specifically: when AI extracts data (OCR, quote generation, message parsing),
  it MUST output only qty and unit_price (or raw extracted values).
  The system MUST compute total = qty × unit_price AFTER AI returns.
  If AI returns a "total" field, it MUST be ignored and recomputed.

INVARIANT ai_context_hierarchy:
  AI context is built hierarchically:
  platform → tenant → project → detail → history.
  Each level has a token budget.
```

### 5.2 AI Capabilities

```
INTERFACE AiCapability:

  classify_message(message: String, context: AiContext) -> MessageIntent
    # Intent: time_report, status_question, new_issue, photo, other
    # + extracted parameters
    # Model tier: CHEAP. Latency: < 2 seconds.

  generate_quote(description: String, photos: List<Blob>,
                 catalog: List<Node>, history: List<Event>,
                 context: AiContext) -> List<QuoteLine>
    # Structured quote lines with quantities, unit prices
    # Output is TRANSIENT until human approval (per 2.8.4)
    # Model tier: EXPENSIVE. Latency: < 10 seconds.

  translate(text: String, source_locale: String, target_locale: String,
            glossary: Dict) -> String
    # Translation adapted for business context using industry glossary
    # Model tier: CHEAP/MEDIUM.

  understand_document(image: Blob, context: AiContext) -> StructuredData
    # OCR + comprehension of delivery notes, invoices
    # Extracts: articles, quantities, prices, dates
    # Output is TRANSIENT until human confirmation
    # Model tier: MEDIUM.

  detect_anomaly(project_events: List<Event>,
                 comparison_data: List<Event>,
                 context: AiContext) -> Insight | null
    # Compares project against historical data within tenant
    # Returns insight with specific cause + source data
    # Model tier: MEDIUM.

  evaluate_scope_similarity(project: Node, candidates: List<Node>,
                            context: AiContext) -> List<SimilarProject>
    # Estimates semantic similarity based on available data
    # (sqm, room count, surface types, duration)
    # Returns similarity scores and justification
    # Model tier: CHEAP.

  summarize(events: List<Event>, period: DateRange,
            context: AiContext) -> String
    # Human-readable summary: "Day 3 of 5. Living room done."
    # Model tier: CHEAP.

  build_context(tenant: Tenant, focal_node: Node) -> AiContext
    # Constructs token-budgeted context for AI calls
    # Model tier: N/A (deterministic).

  answer_question(question: String, context: AiContext) -> AnswerWithSources
    # Answer with source references to specific events/nodes
    # Model tier: EXPENSIVE.
```

### 5.3 AI Context Protocol

```
BEHAVIOR ai_context_levels:
  Level 0 — Platform     (~100 tokens, always included)
    Labels + dict. Available types, units, currencies.

  Level 1 — Tenant       (~50 tokens, always included)
    Org name, industry, region, currency.

  Level 2 — Project      (~200 tokens, on project-related queries)
    Node data, economic summary, assigned persons, last status change.

  Level 3 — Detail       (~2000 tokens, on detailed queries)
    All events for the node, photo metadata, messages.

  Level 4 — History      (~500 tokens, on comparison/analysis queries)
    Similar projects, trends, benchmarks.

INVARIANT ai_context_minimal:
  Context builder MUST never send more data to AI than needed
  for the current task.

INVARIANT ai_context_priority:
  Context builder MUST prioritize:
  focal entity → directly related → 2 hops away → summary.

INVARIANT ai_context_budget:
  Context builder MUST count tokens and stop at budget.

INVARIANT ai_context_dynamic_resolution:
  If the requested multi-node scope exceeds the Level 2 budget
  (e.g., > 10 projects for a "how's the month going?" query),
  the Builder MUST degrade resolution to Level 1.5
  (topline metrics only: ID, State, Margin) or truncate to
  Top-N nodes sorted by recent activity.
  It MUST explicitly inform the AI:
  "[Context truncated to Top 5 active projects. 15 additional active projects not included.]"

INVARIANT ai_context_truncation_transparency:
  If context is truncated, the AI response MUST include a disclosure:
  "This summary covers your 5 most recently active projects.
   You have 15 additional active projects not included."
  The user MUST never receive a partial answer that appears to be complete.
```

### 5.4 AI Anomaly Shield

```
INVARIANT ai_context_anomaly_shield:
  Deterministic code MUST sanitize data before injecting it into AI prompts.

  Phase 1 (tenant has < 100 events of this type):
    Use PLATFORM-WIDE reference statistics per event_type and industry.
    Flag if value > 5x platform median for this type.
    (Example: platform median for time event qty is 8h. Flag if > 40h.)

  Phase 2 (tenant has ≥ 100 events of this type):
    Use TENANT-SPECIFIC statistics.
    Flag if value > 3x standard deviation from tenant mean.

  In both phases:
    Flagged events are NOT excluded silently.
    They are annotated in the AI prompt:
    "(⚠ Event {id}: qty={value} is {N}x above reference. Possible data error.)"
    AI MUST be instructed to mention the anomaly in its response.
```

### 5.5 AI Blind Spot Prevention

```
INVARIANT ai_blind_spot_prevention:
  The Anomaly Detector MUST evaluate project actuals against BOTH:
  A. The project's approved estimate (the merged quote lines).
  B. Platform/tenant historical data for semantically similar projects.

  Deviation from B MUST flag an anomaly on the QUOTE ITSELF,
  retroactively identifying potential AI estimation errors.

BEHAVIOR ai_scope_similarity:
  When comparing a project against historical data:
  1. AI MUST evaluate semantic similarity based on available data fields
     (sqm, room count, surface types, project duration).
  2. Similarity score and justification MUST be included in anomaly reports.
  3. Minimum 3 semantically similar projects within the tenant required
     to establish a baseline.
  4. If < 3 similar projects exist: fail open (skip comparison),
     state: "Insufficient historical data for anomaly detection."
  5. When anomaly is flagged, AI MUST justify the scope match:
     "Compared against 4 past interior painting projects of 80-90 sqm."
```

### 5.6 AI Industry Glossary

```
BEHAVIOR ai_glossary:
  System MUST maintain an industry glossary with trade terms
  per industry (painting, plumbing, electrical, garden) and language.
  The glossary MUST be used as context for AI translation.
  Tenants SHOULD be able to add their own terms.
```

---

## 6. Business Rules

### 6.1 ROT & RUT (Swedish Tax Deductions)

```
RULE rot_calculation:
  rot_deduction = SUM(labor_events.total) × 0.30
  where labor = events where EventData_QuoteLine.is_labor = true
        OR EventData_InvoiceLine.is_labor = true

RULE rut_calculation:
  rut_deduction = SUM(labor_events.total) × 0.50

RULE rot_rut_max:
  Max per person per year: ROT + RUT ≤ 75,000 SEK
  Of which ROT portion ≤ 50,000 SEK
  Person identified by NodeData_Customer.rot_rut_person_number

RULE rot_rut_display:
  Deduction MUST be displayed clearly on quote and invoice:
  total, labor cost, deduction amount, customer's cost after deduction.

RULE rot_rut_configurable:
  Rules SHOULD be configurable per region
  (for future expansion to Norway, Finland, etc.)

RULE rot_rut_tracking:
  System MUST track accumulated deduction per customer personnummer per year.
```

### 6.2 VAT

```
RULE vat_standard:
  Standard VAT rate Sweden: 25% (0.25)

RULE vat_reduced:
  Reduced rates: 12% (0.12) for food/hotel, 6% (0.06) for books/culture

RULE vat_reverse_charge:
  Reverse charge MUST be supported for B2B within EU.
  Triggered when customer has NodeData_Customer.org_number set
  and country != tenant country.

RULE vat_configurable:
  VAT rate SHOULD be configurable per tenant/region.
```

### 6.3 Pricing Tiers

```
RULE pricing:
  Free:       0 SEK/month  — 1 user, max 5 active projects, basic AI
  Pro:        499 SEK/month — 5 users, unlimited projects, full AI
  Business:   1,499 SEK/month — 20 users, subcontractor mgmt, reports, integrations
  Enterprise: ~99 SEK/user/month — unlimited, customization, SLA

RULE free_tier_functional:
  Free tier MUST be fully functional (not a demo).
  Limits are on volume, not features.

RULE free_tier_subcontractor:
  Free tier users MUST be able to receive work orders and report time.
  Subcontractors invited by a paying customer use the system free
  (not counted against the paying customer's user limit).

RULE upgrade_seamless:
  Upgrade MUST be self-service with no downtime.
```

### 6.4 Data Ownership

```
RULE data_ownership:
  Each tenant owns their data fully.

RULE data_export:
  Data MUST be exportable in standard formats (JSON, CSV).

RULE data_deletion:
  On tenant deletion: all data crypto-shredded
  (encryption key destroyed, data becomes unreadable).

RULE data_gdpr:
  GDPR rights MUST be supported:
  access, rectification, erasure, portability.

RULE data_subcontractor_legal_basis:
  Subcontractor personal data in a contractor's tenant
  MUST be handled with legitimate interest (contractual relationship),
  NOT consent.
```

---

## 7. Integrations

### 7.1 Required Integrations (MUST)

```
INTERFACE AccountingIntegration:
  # Bidirectional: sync invoices, payments, accounts receivable
  # Providers: Fortnox, Visma, etc.
  sync_invoice(invoice: InvoiceData) -> ExternalId
  sync_payment(payment: PaymentData) -> ExternalId
  fetch_customer_balance(customer_id: ExternalId) -> Balance

INTERFACE WhatsAppIntegration:
  # Bidirectional: WhatsApp Business API
  send_message(to: PhoneNumber, text: String, attachments: List<Blob>) -> MessageId
  send_template(to: PhoneNumber, template: String, params: Dict) -> MessageId
  receive_message(webhook: IncomingMessage) -> void

INTERFACE SmsIntegration:
  # Bidirectional: fallback messaging channel
  send_sms(to: PhoneNumber, text: String) -> MessageId
  receive_sms(webhook: IncomingSms) -> void

INTERFACE EmailIntegration:
  # Outbound + inbound
  send_email(to: Email, subject: String, body: String, attachments: List<Blob>) -> MessageId
  receive_email(webhook: IncomingEmail) -> void

INTERFACE ObjectStorageIntegration:
  upload(data: Binary, metadata: BlobMetadata) -> SignedUrl
  get_signed_url(blob_id: Uuid7, ttl: Duration) -> SignedUrl
  delete(blob_id: Uuid7) -> void

INTERFACE AiModelIntegration:
  # Abstraction layer for all AI capabilities
  complete(prompt: String, context: AiContext, model_tier: ModelTier) -> AiResponse
  classify(input: String, context: AiContext) -> Classification
```

### 7.2 Important Integrations (SHOULD)

```
INTERFACE SigningIntegration:
  initiate_signing(document: Blob, signer: PersonData) -> SigningSession
  check_status(session: SigningSession) -> SigningStatus

INTERFACE TaxAuthorityIntegration:
  submit_rot_rut_claim(claim: RotRutClaim) -> SubmissionId

INTERFACE MapIntegration:
  geocode(address: String) -> Coordinates
  get_map_link(coordinates: Coordinates) -> Url

INTERFACE EInvoiceIntegration:
  send_e_invoice(invoice: PeppolInvoice) -> TransmissionId
```

### 7.3 Integration Principles

```
INVARIANT integration_abstraction:
  All integrations MUST go through an abstraction layer.
  Swapping provider MUST NOT require changes to business logic.

INVARIANT integration_health:
  Every integration MUST have health checks and error handling.
  On failure: queue the message and retry.

INVARIANT integration_per_tenant:
  Integration configuration MUST be per tenant.

INVARIANT integration_logging:
  Integration events MUST be logged as events (origin=external_api) for traceability.
```

---

## 8. Security & Compliance

### 8.1 Authentication & Authorization

```
INVARIANT auth_methods:
  System MUST support: email + password, social login.
  System SHOULD support: BankID (Sweden).

INVARIANT auth_api:
  All API calls MUST be authenticated with JWT or equivalent token.

INVARIANT auth_jwt_tenant:
  JWT MUST contain tenant_id to enable RLS without extra DB lookups.

INVARIANT auth_rbac:
  System MUST support RBAC: Owner, Admin, Member, Subcontractor, Customer.

INVARIANT auth_rls:
  Every database query MUST be filtered on tenant_id (Row Level Security).

INVARIANT auth_rls_federation:
  RLS policies MUST accommodate federation access WITHOUT disabling RLS.
  
  The database MUST have a SECURITY DEFINER function:
  
    has_federation_access(target_tenant_id UUID) -> BOOLEAN
    
  This function:
  1. Checks federation_edges for a row where:
     source_tenant = target_tenant_id AND target_tenant = jwt.tenant_id
     AND status = 'accepted'
     (OR the reverse direction)
  2. Returns true ONLY if such a row exists
  3. Runs as SECURITY DEFINER (elevated privileges, not caller's)
  4. Is called within the RLS policy, NOT in application code
  
  The RLS policy on nodes and events becomes:
  
    USING (
      tenant_id = jwt.tenant_id
      OR has_federation_access(tenant_id)
    )
  
  CRITICAL: has_federation_access() grants ROW-LEVEL access only.
  The Projection Scope masking (which COLUMNS/FIELDS are visible)
  is STILL enforced in the application layer via Zod schemas.
  The database lets you SEE the row; the app layer controls WHAT you see in it.
  
  The agent MUST NOT:
  - Disable RLS for federation queries
  - Use the Supabase service_role key in API handlers
  - Create a "bypass" function that skips tenant checks
  
  Performance note: has_federation_access() will be called per-row.
  It MUST be backed by an index on federation_edges(source_tenant, target_tenant, status)
  and SHOULD use a short-lived cache (pg_stat_statements or SET LOCAL for request scope).
```

### 8.2 Data Protection

```
INVARIANT data_transit:
  All data in transit MUST be encrypted (TLS 1.2+).

INVARIANT data_at_rest:
  All data at rest MUST be encrypted.

INVARIANT data_erasure:
  Personal data MUST be deletable per individual (GDPR right to erasure)
  via crypto-shredding. Economic aggregates (qty, unit_price, total)
  MUST be retained for accounting integrity.

INVARIANT data_audit:
  System MUST log all access to personal data (audit trail).

INVARIANT data_signed_urls:
  Attachments/blobs MUST be accessed via time-limited signed URLs.
```

### 8.3 GDPR Compliance

```
INVARIANT gdpr_dpa:
  System MUST support Data Processing Agreement (DPA) with every tenant.

INVARIANT gdpr_access:
  System MUST support data export per individual (right of access).

INVARIANT gdpr_rectification:
  System MUST support right to rectification.

INVARIANT gdpr_erasure:
  System MUST support right to erasure:
  - Person nodes: actual deletion
  - Events where person is actor: crypto-shred actor_id and personal data
    in data payload, retain qty/unit_price/total
  - Blobs: delete from object storage, crypto-shred metadata
  - Edges: delete
  - Audit log: record the deletion itself

INVARIANT gdpr_portability:
  System MUST support data portability (machine-readable JSON export).

INVARIANT gdpr_ropa:
  System MUST have a Record of Processing Activities (ROPA).

INVARIANT gdpr_breach:
  Data breach reporting MUST be possible within 72 hours.
```

---

## 9. Performance & Scaling

### 9.1 Capacity Targets

| Horizon | Tenants | Users | Events/day | Total events |
|---------|---------|-------|-----------|--------------|
| Year 1 | 50 | 500 | 5,000 | 2M |
| Year 3 | 5,000 | 50,000 | 500,000 | 500M |
| Year 5 | 100,000 | 2,000,000 | 10,000,000 | 10B |
| Dream | 1,000,000+ | 20,000,000+ | 100,000,000+ | 100B+ |

### 9.2 Latency Requirements

```
INVARIANT perf_api_read:     API p95 latency for reads: < 200ms
INVARIANT perf_api_write:    API p95 latency for writes: < 500ms
INVARIANT perf_ai_classify:  AI classification: < 2 seconds
INVARIANT perf_ai_quote:     AI quote generation: < 10 seconds
INVARIANT perf_pdf:          PDF generation: < 3 seconds
INVARIANT perf_e2e_message:  End-to-end message flow (in → AI → out): < 10 seconds
INVARIANT perf_dashboard:    Dashboard load: < 2 seconds
INVARIANT perf_search:       Search results: < 500ms
```

### 9.3 Availability

```
INVARIANT avail_uptime:      System uptime: 99.9% (max ~9h downtime/year)
INVARIANT avail_queue:       Messages MUST be queued during downtime and delivered on recovery
INVARIANT avail_backup:      Daily full backup, point-in-time recovery
INVARIANT avail_durability:  No events may ever be lost
```

### 9.4 Scaling Strategy (Conceptual)

```
Phase 1 (0-50 orgs):
  Single-instance database
  16 hash partitions prepared
  Event partitions per quarter
  RLS per tenant

Phase 2 (50-5,000 orgs):
  Read replicas for analytics
  In-memory cache for labels + dict
  Connection pooling
  Automated event partitioning

Phase 3 (5,000-100k orgs):
  Horizontal sharding (tenant_id as distribution key)
  Hash partitions → shards (already prepared)
  Dedicated analytics instance

Phase 4 (100k+ orgs):
  Multi-region deployment
  tenant.region controls data residency
  Federation layer for cross-region queries
  Labels + dict synced globally
```

---

## 10. Success Metrics

### 10.1 North Star Metric

> **Number of successfully delivered AI insights per day that lead to a user action.**

### 10.2 Product Metrics

| Metric | Year 1 Target | Year 3 Target |
|--------|--------------|---------------|
| Registered tenants | 50 | 5,000 |
| DAU | 200 | 20,000 |
| Events/day | 5,000 | 500,000 |
| Quote → Signed conversion | > 30% | > 40% |
| Free → Pro conversion | > 3% | > 5% |
| Subcontractor → Own customer (network) | > 5%/year | > 10%/year |
| NPS | > 40 | > 60 |
| Avg time: quote to signing | < 30 min | < 15 min |
| Churn (Pro/Business) | < 5%/month | < 3%/month |

### 10.3 Technical Metrics

| Metric | Threshold |
|--------|-----------|
| API p95 latency | < 200ms |
| Error rate (5xx) | < 0.1% |
| AI classification accuracy | > 90% |
| WhatsApp delivery rate | > 98% |
| System uptime | > 99.9% |
| Cache reconciliation delta rate | < 1% of sampled projects |

---

## 11. Technical Recommendations (Non-Binding)

See `tech-decisions.md` for binding stack choices.
These recommendations inform but do not constrain additional implementation details:

| Area | Recommendation | Rationale |
|------|---------------|-----------|
| Identifiers | UUID v7 (RFC 9562) | Standardized, time-sortable, embeds transaction time |
| DB partitioning | Hash partition by tenant_id (16 partitions) | Prepares for horizontal sharding without code changes |
| Event partitioning | Quarterly sub-partitions on timestamp | Efficient archival and partition pruning |
| AI routing | Cheap model for classification, expensive for generation | Keeps AI cost under 30 SEK/tenant/month |
| Cache | Labels + Dict in memory with NOTIFY invalidation | Read thousands of times per second |
| GDPR deletion | Crypto-shredding for append-only events | Compatible with event immutability |
| Analytics | Materialized views or separate analytics instance | Avoids analytics queries loading operational DB |
| Messaging | WhatsApp as primary, SMS as fallback | Cheaper, richer features, 80%+ penetration in Europe |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | An organization using the platform. Physical isolation unit. |
| **Node** | An entity: person, project, customer, supplier, product, location. |
| **Edge** | A relation between two nodes within the same tenant. |
| **Federation Edge** | A consent-based relation between nodes in different tenants. |
| **Projection Scope** | A masking contract defining what data is visible across a federation edge. |
| **Event** | An occurrence: time, material, photo, message, invoice. Append-only. |
| **Transaction Time** | When the system learned about an event (embedded in UUIDv7). |
| **Valid Time** | When an event happened in the real world (occurred_at field). |
| **Label** | A typed tag classifying nodes, edges, events. The system's type system. |
| **Blob** | Metadata about binary content (file stored externally). |
| **Dict** | Translations, configuration, semantic data. |
| **Event Origin** | Who/what created an event: human, ai_generated, system, external_api. |
| **Transient Proposal** | AI-generated data that lives in app layer until human approval. |
| **Root Pointer** | Adjustment events always reference the original event, never other adjustments. |
| **Crypto-shredding** | Deletion by destroying the encryption key. |
| **Compensating event** | An event that corrects a prior event (adjustment with ref_id to root). |
| **UE** | Subcontractor (Swedish: underentreprenör). |
| **ROT** | Renovation tax deduction — 30% on labor cost in Sweden. |
| **RUT** | Cleaning/maintenance tax deduction — 50% on labor cost in Sweden. |
