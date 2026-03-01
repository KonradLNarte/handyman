---
name: federation
description: >
  Federation, cross-tenant access, subcontractor networks, projection scopes,
  consent flow, magic link, revocation, GDPR erasure, crypto-shred,
  has_federation_access SQL function, masking schemas.
---

# Federation Skill

## FederationEdge Interface

```
id:             Uuid7
source_tenant:  Uuid7
source_node:    Uuid7
target_tenant:  Uuid7
target_node:    Uuid7
type_id:        SmallInt        — label ref (edge_type)
status:         FederationStatus
scope:          ProjectionScope
data:           Json | null
```

## FederationStatus Enum

```
pending  = 0   — invitation sent, awaiting consent
accepted = 1   — active federation, cross-tenant access granted
rejected = -1  — target declined
revoked  = -2  — historical, no active access
```

## ProjectionScope Enum

```
subcontractor_default — what a subcontractor sees about source's project
client_default        — what a client/customer sees
supplier_default      — what a supplier sees
```

## Masking Schemas

### SubcontractorProjectionView
- `project_name`, `project_address`, `project_description`
- `own_events` (ONLY where actor_id = target person)
- `work_order` (checklist, scope, photos)
- **EXCLUDED:** margins, quote_lines, invoice_lines, other actors' events, hourly rates, customer data

### ClientProjectionView
- `project_name`, `project_status` (state label code)
- `photos` (metadata only)
- `timeline_summary` (AI-generated narrative)
- **EXCLUDED:** all cost data, internal notes, subcontractor details, margins

### SupplierProjectionView
- `material_events` (ONLY type=material referencing their products)
- **EXCLUDED:** everything else

## Strict Restriction Rule

Custom ProjectionScopes MAY ONLY **restrict** data further than platform defaults. A custom projection MUST NEVER **expand** visibility beyond its base template.

Example: custom subcontractor view can hide project address, but can NEVER expose project margin.

## Consent Flow

```
1. Source tenant initiates federation (e.g., Kimmo invites Aziz)
2. System sends WhatsApp message with short-lived Magic Link
3. Link opens web view showing exact Projection Contract in target's language:
   "Kimmo (Vi Tre Målar Sverige AB) wants to share project assignments
    and receive your time reports."
4. Target clicks "Accept"
5. System logs: IP, timestamp, user agent, projection scope (B2B legitimate interest)
6. Federation edge status → accepted
7. If target later clicks "Revoke":
   Federation edge status → revoked. Access severed immediately.
```

## Revocation Behavior

- When status becomes `revoked`, cross-tenant access is **immediately severed**
- Existing Events in the source tenant remain (append-only)
- If GDPR erasure requested: **crypto-shred** PII (actor_id, personal data in event payloads)
- MUST retain qty, unit_price, total to preserve economic integrity

## has_federation_access() SQL

```sql
CREATE OR REPLACE FUNCTION has_federation_access(target_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
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
```

MUST be `SECURITY DEFINER` — runs with elevated privileges to read federation_edges regardless of the caller's tenant.

## RLS for Federation Edges

Federation edges are NOT partitioned per tenant. Their RLS:

```sql
CREATE POLICY "federation_edge_visibility" ON federation_edges
  FOR SELECT USING (
    source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );
```

## Anti-Patterns

- **NEVER copy data between tenants** — federation uses pointers, not copies
- **NEVER expand visibility beyond base template** — custom scopes restrict only
- **NEVER disable RLS for federation** — use `has_federation_access()`
- **NEVER grant write access via federation** — federation is read-only
- **NEVER delete events on revocation** — crypto-shred PII, retain economics

See `docs/resonansia-spec.md` section 2.7 for full federation contracts.
