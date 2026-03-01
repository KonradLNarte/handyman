---
name: event-system
description: >
  Event sourcing, bitemporality, transaction time, valid time, correction chains,
  adjustment events, append-only, economic aggregation, cache reconciliation,
  active event resolution, window functions, materialized views.
---

# Event System Skill

## Bitemporality

Every Event operates on **two timelines**:

1. **Transaction Time** (`id` — UUIDv7): When the system learned about the event. Monotonically increasing, immutable. Used for **state resolution** (which adjustment is current).
2. **Valid Time** (`occurred_at`): When the event happened in the real world. Can be retroactive. Used for **business reporting** (hours in March).

## Event Interface

```
id:          Uuid7           — PK, embeds transaction time
tenant_id:   Uuid7
node_id:     Uuid7           — which node this event relates to
ref_id:      Uuid7 | null    — link to another node OR original event (corrections)
actor_id:    Uuid7 | null    — who performed it
type_id:     SmallInt        — label ref (domain = event_type)
origin:      EventOrigin     — human | ai_generated | system | external_api
qty:         Decimal | null
unit_id:     SmallInt | null — label ref (domain = unit)
unit_price:  Decimal | null
total:       Decimal | null  — COMPUTED: qty × unit_price
data:        Json | null
occurred_at: Timestamp       — valid time
```

## Root Pointer Correction Pattern

Corrections form a **flat** chain, not recursive:

```
Event A (original):  id=001, ref_id=null, qty=8
Event B (correction): id=002, ref_id=001, qty=6   ← points to A
Event C (correction): id=003, ref_id=001, qty=7   ← points to A (NOT B)
```

Active value = Event C (highest id for ref_id=001). Events A and B are shadowed but preserved.

**RULE:** `ref_id` of an adjustment MUST always point to the ORIGINAL root event, never to another adjustment.

## Active Event Resolution SQL

This query resolves correction chains **entirely in SQL**:

```sql
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
    e.data,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(e.ref_id, e.id)
      ORDER BY e.id DESC
    ) AS rn
  FROM events e
  WHERE e.tenant_id = $1
    AND e.node_id = $2
    AND e.type_id = ANY($3)
)
SELECT * FROM ranked WHERE rn = 1
```

Encapsulate as: `getActiveEvents(tenantId, nodeId, typeIds) -> ActiveEvent[]`

## Transient AI Proposals

AI-generated proposals (quotes, invoices) MUST NOT be written as Events until human approval:

1. **Draft phase:** AI output lives as JSON in app layer (Node.data with state=draft, or session/cache)
2. **On approval:** System maps payload into immutable `quote_line` or `invoice_line` Events with `origin=ai_generated`
3. A `state_change` event records the approval

## EventOrigin Enum

```
human         — user action
ai_generated  — AI after human approval
system        — automation (state changes, scheduled jobs)
external_api  — integration (accounting sync, webhook)
```

## Project Economics

Computed from active events (after resolving corrections):

```
quote_total   = SUM(active quote_line events .total)
time_cost     = SUM(active time events .total)
material_cost = SUM(active material events .total)
invoiced      = SUM(active invoice_line events .total)
margin        = quote_total - (time_cost + material_cost)
```

## Cache Reconciliation

Materialized views / cache tables are allowed but MUST be deterministically rebuildable:

1. Periodic job (daily minimum) selects random 10% of active projects
2. Recomputes economics from raw events
3. Compares against cached values
4. Delta > 0.01 SEK → alert + rebuild for that project
5. Delta on > 5% of samples → full cache rebuild

## Anti-Patterns

- **NEVER aggregate events in JavaScript** — always SQL window functions
- **NEVER use recursive CTEs** for correction chains — use COALESCE + ROW_NUMBER
- **AI returns ONLY qty and unit_price** — system computes total
- **NEVER load all events into memory** — use SQL with WHERE clauses
- **NEVER UPDATE or DELETE events** — append-only, always

See `docs/resonansia-spec.md` section 2.8 for full behavioral contracts.
