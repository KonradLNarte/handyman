# Resonansia — Scenarios v2.0 (Holdout Validation Set)

> These scenarios define observable end-to-end behaviors that the system
> must satisfy. They are the acceptance criteria.
>
> **This file is a holdout set.** It should NOT be stored in the codebase
> where coding agents can see it during implementation. It is used only
> for validation — analogous to a holdout set in ML training.

**Version:** 2.0
**Last updated:** 2026-02-28
**Authors:** Snack & Verkstad + Claude + Gemini

---

## How Scenarios Work

Each scenario describes:
- **Personas** involved
- **Preconditions** that must be true before the scenario starts
- **Steps** that occur (user actions + expected system behaviors)
- **Satisfaction criteria** that determine if the scenario passes

Validation is probabilistic: run each scenario N times (N ≥ 20),
measure what fraction of trajectories satisfy the criteria.
Target: > 95% satisfaction.

---

## Personas

| ID | Name | Role | Primary Interface | Language |
|----|------|------|-------------------|----------|
| P-01 | Kimmo | Business owner, Vi Tre Målar Sverige AB (3 employees + 2 subcontractors) | Web app (laptop), mobile app (field) | Swedish |
| P-02 | Aziz | Subcontractor painter, sole proprietor | WhatsApp only | Arabic (mother tongue), basic Swedish |
| P-03 | Lisa | Office admin / project coordinator | Web app (desktop) | Swedish |
| P-04 | Erik & Maria Eriksson | Homeowner customers | Email, SMS (no account, no login) | Swedish |
| P-05 | Johan | Property association (BRF) chairman | Email, PDF reports (no account) | Swedish |

---

## S-01: Quote to Signing (End-to-End)

**Personas:** Kimmo (P-01), Erik & Maria Eriksson (P-04)

**Preconditions:**
- Kimmo has an active tenant with NodeData_Org (logo, colors, bankgiro, payment terms)
- Eriksson exists as a customer node with rot_rut_person_number set
- Product catalog contains painting materials with coverage_sqm and default_price

**Steps:**

1. Kimmo creates a new project node (type=project, state=draft)
2. Kimmo uploads 4 photos (creates blob entries)
3. Kimmo enters description: "3 rum, 85 kvm, 2 lager, tak och väggar, NCS S0502-Y"
4. Kimmo requests AI quote generation

**Expected system behavior:**
- AI generates quote lines as **transient proposal** (NOT events yet)
- Proposal includes material quantities (based on sqm × coverage_sqm from catalog)
- Proposal includes labor hours × hourly rate
- System calculates ROT deduction (30% on is_labor=true lines)
- All arithmetic done by deterministic code, not AI

5. Kimmo reviews proposal in UI, adjusts one line item, clicks "Approve"

**Expected system behavior:**
- quote_line events created with origin=ai_generated
- Each event has EventData_QuoteLine with is_labor, vat_rate, sort_order
- PDF generated with tenant branding from NodeData_Org

6. Kimmo sends quote to Eriksson via SMS

**Expected system behavior:**
- SMS sent with link (no login required)
- message event logged with origin=system, EventData_Message.channel="sms"

7. Erik opens link, sees quote, signs with BankID

**Expected system behavior:**
- state_change event: draft → active, trigger=customer_signing, origin=system
- Project economics now computed from the quote_line events

**Satisfaction criteria:**
- [ ] End-to-end time from photos to signed quote: < 30 minutes
- [ ] Customer required NO account and NO login
- [ ] ROT deduction correct: 30% of labor lines, respecting 50,000 SEK/person/year max
- [ ] PDF professionally formatted with Kimmo's branding
- [ ] Quote lines reasonable for 85 sqm interior painting (AI did not hallucinate)
- [ ] AI proposals were transient until approval — no events existed before "Approve"
- [ ] All events have correct origin field (ai_generated for quote_lines, system for state_change)
- [ ] Project economics correctly computed from events after signing

---

## S-02: Work Order to Subcontractor (End-to-End)

**Personas:** Kimmo (P-01), Aziz (P-02)

**Preconditions:**
- Project "Eriksson" exists, state=active
- Aziz exists as person node with language="ar"
- subcontractor_of edge exists between Aziz and Kimmo's org
- Federation edge with scope=subcontractor_default, status=accepted

**Steps:**

1. Kimmo assigns Aziz to Eriksson project (creates assigned_to edge)

**Expected system behavior:**
- Work order sent to Aziz via WhatsApp in Arabic
- Contains: map link (from NodeData_Project.address), scope, checklist, photos
- message event logged: origin=system, channel="whatsapp", direction="outbound"

2. Aziz replies "OK" in WhatsApp

**Expected system behavior:**
- AI classifies as confirmation (not time report)
- message event logged: origin=human, direction="inbound"

3. Day 1: Aziz sends a photo + replies "8"

**Expected system behavior:**
- Photo: blob created, associated with Eriksson project and today's date
- photo event: origin=human, actor_id=Aziz
- "8" classified as time report
- time event: qty=8, origin=human, actor_id=Aziz, node_id=Eriksson
- unit_price from EdgeData_SubcontractorOf.rate (or NodeData_Person.hourly_rate)
- Aziz receives confirmation in Arabic: "✓ 8h registered. Day 1 of 5."
- Kimmo receives notification

4. Day 2: Aziz sends "7"

**Expected system behavior:**
- Same flow. Response includes cumulative context.

5. Day 5: Aziz sends "klart"

**Expected system behavior:**
- AI classifies as status update (completed)
- System asks Aziz for confirmation before state change
- If confirmed: state_change event, origin=human, trigger=human
- Summary generated: total hours, photos count, total cost

**Satisfaction criteria:**
- [ ] Aziz NEVER logged into any app
- [ ] All communication in Arabic with correct trade terminology
- [ ] Time reporting worked by sending a single number
- [ ] Photos correctly associated to project and date
- [ ] Kimmo received daily notifications
- [ ] All events have origin=human (Aziz's actions) or origin=system (notifications)
- [ ] Unit price correctly sourced from edge or person data

---

## S-03: Daily Customer Status Update

**Personas:** Kimmo (P-01), Aziz (P-02), Erik & Maria Eriksson (P-04)

**Preconditions:**
- Eriksson project in_progress, day 3 of 5
- Aziz reported time and sent 2 photos today
- Automatic daily status configured for this project

**Steps:**

1. End of day: system triggers automatic status generation

**Expected system behavior:**
- Collects today's events for Eriksson project
- AI generates summary (origin will be system on the message event)
- SMS sent to Eriksson (preferred_channel from NodeData_Customer)
- Message includes 1-2 photos
- No cost details (Eriksson has not opted in)
- message event logged: origin=system, direction="outbound"

2. Erik replies "Great, thanks!"

**Expected system behavior:**
- message event: origin=human, direction="inbound"
- No further action (positive acknowledgment)

**Satisfaction criteria:**
- [ ] Customer received update without asking
- [ ] No login or app required
- [ ] Message was short (< 200 characters + photos)
- [ ] Professional and human-sounding (not robotic)
- [ ] No cost details leaked
- [ ] Reply logged correctly with origin=human

---

## S-04: Invoicing with ROT/RUT and Deviation Flagging

**Personas:** Kimmo (P-01), Lisa (P-03), Erik & Maria Eriksson (P-04)

**Preconditions:**
- Eriksson project completed
- Quote: 45,000 SEK (30,000 labor + 15,000 material)
- Actual time events: 52h (vs estimated 48h) = 33,800 SEK labor
- Actual material events: 16,800 SEK (12% over quote)
- Eriksson has rot_rut_person_number set, ROT applies

**Steps:**

1. Lisa marks project complete (state_change event)
2. Lisa clicks "Generate invoice proposal"

**Expected system behavior:**
- System computes invoice from events (resolving adjustment chains via root pointer)
- Invoice proposal is **transient** (not events yet)
- AI flags deviations in the approval UI:
  - "Material cost 12% higher than quote (16,800 vs 15,000) — adjust?"
  - "52h actual vs 48h estimated — check."
- ROT calculation: 30% of 33,800 = 10,140 SEK deduction
- Customer pays: (33,800 + 16,800) - 10,140 = 40,460 SEK

3. Lisa adjusts material to match quote, clicks "Approve"

**Expected system behavior:**
- invoice_line events created with origin=ai_generated
- Each has EventData_InvoiceLine with is_labor, vat_rate, quote_line_ref
- Invoice PDF with correct ROT breakdown
- Sent to Eriksson via email
- ROT/RUT submission prepared for Skatteverket
- Invoice synced to Fortnox (origin=external_api on sync confirmation event)

**Satisfaction criteria:**
- [ ] Deviations flagged BEFORE invoice finalized (in transient proposal stage)
- [ ] ROT calculation correct: 30% of labor
- [ ] Invoice PDF has correct breakdown (total, labor, ROT deduction, customer pays)
- [ ] Accumulated ROT checked against 50,000 SEK/person/year limit
- [ ] Data synced to accounting system
- [ ] All events have correct origin (ai_generated for invoice lines)
- [ ] Adjustment chains resolved correctly (root pointer, UUIDv7 sort)

---

## S-05: AI Insight Prevents Loss (with Blind Spot Check)

**Personas:** Kimmo (P-01)

**Preconditions:**
- Eriksson project in_progress
- Tenant has 20+ completed projects with historical data (≥ 100 material events)
- Three delivery notes from Colorama registered in last 3 days

**Steps:**

1. AI background job analyzes ongoing projects

**Expected system behavior:**
- AI evaluates Eriksson material cost against BOTH:
  A. The project quote (merged estimate)
  B. Historical data from semantically similar projects
- Similarity evaluation justifies scope: "Compared against 4 past interior
  painting projects of 80-90 sqm"
- Minimum 3 similar projects found (otherwise: skip comparison)
- Anomaly shield checks for outlier events before building AI context
- Notification to Kimmo: "Material cost 15% above average for similar jobs.
  Last 3 delivery notes from Colorama: [links]. Want to review?"

2. Kimmo clicks notification, sees details, discovers mis-order

**Satisfaction criteria:**
- [ ] AI compared against historical data WITHIN same tenant only
- [ ] Scope similarity justified in the insight ("Compared against 4 projects of 80-90 sqm")
- [ ] Insight stated specific cause and pointed to underlying data (delivery notes)
- [ ] User could verify AI's reasoning (transparent source references)
- [ ] No insight delivered without source
- [ ] Anomaly shield ran before AI context injection
- [ ] If quote itself was an outlier vs historical: flagged retroactively (blind spot prevention)

---

## S-06: Subcontractor Becomes Own Customer (Network Effect)

**Personas:** Aziz (P-02), Kimmo (P-01)

**Preconditions:**
- Aziz is subcontractor in Kimmo's tenant
- Federation edge exists (subcontractor_default, accepted)
- Aziz has completed multiple projects via WhatsApp

**Steps:**

1. Aziz taps link in WhatsApp: "Start your own account"

**Expected system behavior:**
- New tenant created on Free tier
- NodeData_Person migrated (with consent) — name, contact, language
- Aziz is owner of new tenant
- New NodeData_Org created for Aziz's business

2. Federation edge created between Kimmo ↔ Aziz tenants

**Expected system behavior:**
- Existing subcontractor relationship maintained via federation edge
- Aziz's data in Kimmo's tenant REMAINS in Kimmo's tenant
- New tenant is fully isolated
- Projection scope: subcontractor_default on Kimmo→Aziz edge

3. Aziz sends a quote from his own account (in Arabic)

**Satisfaction criteria:**
- [ ] Onboarding < 5 minutes
- [ ] Existing subcontractor relationship NOT broken
- [ ] Aziz's data in Kimmo's tenant NOT deleted or moved
- [ ] New tenant completely isolated (separate data, separate RLS)
- [ ] Federation edge connects tenants with accepted consent
- [ ] Aziz can send quotes in Arabic from own account
- [ ] Federation projection correctly restricts what each tenant sees

---

## S-07: Federation Consent Flow

**Personas:** Kimmo (P-01), Piotr (new subcontractor, Polish)

**Preconditions:**
- Piotr is NOT yet in the system
- Kimmo has Piotr's phone number

**Steps:**

1. Kimmo invites Piotr as subcontractor

**Expected system behavior:**
- Person node created for Piotr in Kimmo's tenant
- WhatsApp message sent to Piotr with Magic Link
- Message in Polish (Kimmo specified Piotr's language)

2. Piotr clicks Magic Link

**Expected system behavior:**
- Web view opens showing federation projection contract in Polish:
  "Vi Tre Målar Sverige AB wants to share project assignments
   and receive your time reports."
- Exact projection scope displayed (what Piotr will see, what Kimmo will see)

3. Piotr clicks "Accept"

**Expected system behavior:**
- Federation edge created: status=accepted, scope=subcontractor_default
- System logs: IP, timestamp, user agent, projection scope
- Confirmation sent to Piotr via WhatsApp in Polish
- Kimmo notified of acceptance

4. Later: Kimmo terminates the relationship

**Expected system behavior:**
- Federation edge status → revoked
- Piotr's cross-tenant access immediately severed
- Piotr's events in Kimmo's tenant remain (append-only)
- Piotr notified via WhatsApp

**Satisfaction criteria:**
- [ ] Consent flow required explicit action (not just "reply YES")
- [ ] Projection contract displayed in Piotr's language before acceptance
- [ ] Proof of consent logged (IP, timestamp, user agent)
- [ ] Revocation immediately severs access
- [ ] Historical events preserved after revocation
- [ ] Piotr could later request GDPR erasure (crypto-shredding of PII, economics retained)

---

## S-08: BRF Weekly Report

**Personas:** Kimmo (P-01), Johan (P-05)

**Preconditions:**
- Ongoing maintenance contract with Johan's BRF
- Multiple sub-projects under BRF contract
- Weekly automatic reports configured

**Steps:**

1. Friday: system generates weekly report

**Expected system behavior:**
- Aggregates week's activity across all BRF sub-projects
- PDF with: photos, economic summary, progress status
- AI narrative: "This week: facade repair on building A completed.
  Stairwell B painting in progress, day 3 of 7. Budget on track."
- AI context truncation transparent if > 10 sub-projects
- PDF emailed to Johan
- message event: origin=system

2. Johan forwards PDF to BRF board

**Satisfaction criteria:**
- [ ] Johan needed NO account or login
- [ ] Report professional enough to forward to a board
- [ ] Photos, economics, and narrative all included
- [ ] Economic summary matches actual events (verified via cache reconciliation logic)
- [ ] All data sourced from actual events (verifiable)
- [ ] If context was truncated, disclosure present in report

---

## S-09: Multi-Language Work Order Chain

**Personas:** Kimmo (P-01), Aziz (Arabic), Piotr (Polish)

**Preconditions:**
- Both Aziz and Piotr have accepted federation edges
- A large project requires both workers

**Steps:**

1. Kimmo assigns both to same project

**Expected system behavior:**
- Aziz receives work order in Arabic via WhatsApp
- Piotr receives work order in Polish via WhatsApp
- Both contain: identical scope, map link, checklist, photos
- Industry glossary used for trade term translation

2. Both workers report time daily (numbers via WhatsApp)

3. Kimmo views project dashboard

**Expected system behavior:**
- Aggregated time from both workers
- Each worker's contribution visible
- Total labor cost computed correctly (may have different rates)
- Economic aggregation resolves any adjustment chains

**Satisfaction criteria:**
- [ ] Each worker received instructions in own language
- [ ] Both time-reported identically (number via WhatsApp)
- [ ] Project economics correctly aggregated both workers
- [ ] Industry terminology correctly translated (not generic)
- [ ] Neither worker logged in anywhere
- [ ] Different hourly rates correctly applied per worker

---

## S-10: Delivery Note OCR

**Personas:** Lisa (P-03)

**Preconditions:**
- Active project exists
- Product catalog has entries for Colorama products

**Steps:**

1. Lisa photographs delivery note, uploads to project

**Expected system behavior:**
- AI performs OCR + comprehension
- Extracts: article names, quantities, unit prices, total
- Matches against product catalog (NodeData_Product.sku or name)
- Presents as **transient proposal** for Lisa to confirm

2. Lisa reviews, corrects one quantity, clicks "Confirm"

**Expected system behavior:**
- material events created: origin=ai_generated (since AI extracted them)
- One adjustment event for corrected quantity: origin=human
- Blob created linked to project
- Project economics updated

**Satisfaction criteria:**
- [ ] AI extracted ≥ 90% of line items correctly
- [ ] Articles matched to catalog where entries existed
- [ ] Lisa could correct before finalizing (transient proposal)
- [ ] All events created with correct origin
- [ ] Adjustment uses root pointer pattern
- [ ] Project cost updated immediately

---

## S-11: Tenant Isolation Verification

**Personas:** Kimmo (P-01), Another_Tenant_Owner

**Preconditions:**
- Two active tenants with projects, customers, events

**Steps:**

1. Kimmo searches, queries API, views dashboard

**Satisfaction criteria:**
- [ ] Kimmo sees ONLY his own data in every query
- [ ] No data from other tenant in any response
- [ ] API calls without valid tenant_id in JWT are rejected
- [ ] RLS confirmed active on ALL tables (node, edge, event, blob, dict)
- [ ] Federation edges only visible when both parties have consented
- [ ] Federation projections correctly mask data per scope

---

## S-12: GDPR Data Subject Request (with Federation)

**Personas:** Aziz (P-02), Kimmo (P-01)

**Preconditions:**
- Aziz worked as subcontractor in Kimmo's tenant for 6 months
- 50+ events reference Aziz as actor_id
- Federation edge exists (status=accepted or revoked)
- Multiple blobs associated with Aziz's work

**Steps:**

1. Aziz requests data export (right of access)

**Expected system behavior:**
- Export includes: person node data, all events where actor_id=Aziz,
  all blobs, all edges, federation edge data
- Format: JSON (machine-readable)

2. Aziz requests deletion (right to erasure)

**Expected system behavior:**
- Person node: actually deleted
- Events where actor_id=Aziz: crypto-shred actor_id and personal data in
  event.data payload. RETAIN: qty, unit_price, total (economic integrity)
- Blobs: deleted from object storage, metadata crypto-shredded
- Edges: deleted
- Federation edge: status → revoked, personal data shredded
- Audit log records the deletion itself

**Satisfaction criteria:**
- [ ] Export was complete and machine-readable (JSON)
- [ ] After deletion: no PII about Aziz retrievable
- [ ] Events remain as records but personal data unreadable
- [ ] Economic data (qty, unit_price, total) preserved
- [ ] Audit trail shows deletion occurred
- [ ] Federation edge handled correctly (access severed, pointer shredded)
- [ ] Kimmo's project economics still correct after erasure

---

## S-13: Event Correction Chain Resolution

**Personas:** Aziz (P-02), Kimmo (P-01)

**Preconditions:**
- Eriksson project active
- Aziz has reported time today

**Steps:**

1. Aziz sends "8" via WhatsApp → time event A created (qty=8)
2. Aziz sends "nej, 6" → system creates adjustment event B (qty=6, ref_id=A)
3. 10 minutes later, Aziz sends "faktiskt 7" → adjustment event C (qty=7, ref_id=A)

**Expected system behavior:**
- Three events exist: A (root), B (adjustment), C (adjustment)
- Both B and C point to A (root pointer, NOT B→A, C→B chain)
- Active quantity = 7 (C has highest UUIDv7 id)
- Project economics use active value only
- Events A and B physically preserved for audit

4. Kimmo views project detail

**Expected system behavior:**
- Shows 7h for Aziz today (not 8, not 6, not 21)
- Audit trail shows the correction history
- Economic aggregation correct

**Satisfaction criteria:**
- [ ] Root pointer pattern: B.ref_id = A.id AND C.ref_id = A.id (NOT C.ref_id = B.id)
- [ ] Resolution by UUIDv7 sort order (transaction time), not occurred_at
- [ ] Active quantity = 7 (latest adjustment)
- [ ] Project total hours correct (sum of all active event values)
- [ ] All three events physically preserved
- [ ] Cache reconciliation would detect any mismatch

---

## S-14: AI Transient Proposal Lifecycle

**Personas:** Kimmo (P-01)

**Preconditions:**
- New project in draft state
- Product catalog populated

**Steps:**

1. Kimmo requests AI quote generation for "3 rum, 85 kvm"

**Expected system behavior:**
- AI generates quote proposal as transient JSON (NOT events)
- No quote_line events exist in the database yet
- Project economics show zero (no events = no budget)

2. Kimmo reviews, changes the hourly rate on labor lines

3. Kimmo clicks "Approve"

**Expected system behavior:**
- quote_line events created NOW, with origin=ai_generated
- Project economics update immediately
- Event totals computed by deterministic code (qty × unit_price), not by AI

4. Kimmo realizes one line is wrong, clicks "Edit quote" and adjusts

**Expected system behavior:**
- New quote_line events created (versioning, append-only)
- OR adjustment events with ref_id to original quote_lines
- Previous version preserved in event log

**Satisfaction criteria:**
- [ ] No events existed before "Approve" (transient proposal only)
- [ ] Events have origin=ai_generated after approval
- [ ] Economics were zero during draft phase
- [ ] Deterministic code computed all totals (not AI)
- [ ] Edit after approval preserved original events (append-only)

---

## Validation Harness Notes

### Automated Testing

Scenarios S-01 through S-04, S-06, S-07, S-09, S-11, S-12, S-13, S-14
have deterministic inputs and verifiable outputs. Use digital twins for
WhatsApp, SMS, email, BankID, Fortnox.

### LLM-as-Judge

Scenarios involving AI quality require LLM-as-judge evaluation:
- S-01: Quote line reasonableness for 85 sqm interior painting
- S-03: Message quality (short, human, professional)
- S-05: Insight quality, transparency, scope similarity justification
- S-08: Report narrative quality and economic accuracy

### Satisfaction Scoring

- Run each scenario N times (N ≥ 20)
- Score each satisfaction criterion as pass/fail
- Overall satisfaction = fraction passed across all runs
- Target: > 95% overall satisfaction

### Digital Twin Universe (Recommended)

Build behavioral clones of:
- WhatsApp Business API (message send/receive, template messages, media)
- SMS gateway (send/receive)
- Fortnox (invoice sync, payment sync, customer balance)
- BankID (signing flow, status polling)
- Skatteverket ROT/RUT API (submission, status)

### Key Invariants to Verify Across ALL Scenarios

- [ ] `event_append_only`: No UPDATE or DELETE on events table ever
- [ ] `event_correction_root_pointer`: All adjustments point to root, resolved by UUIDv7
- [ ] `ai_proposals_not_events`: No AI-generated events exist before human approval
- [ ] `tenant_isolation`: No cross-tenant data leakage in any query
- [ ] `federation_strict_restriction`: Custom projections never expand visibility
- [ ] `ai_no_arithmetic`: All calculations by deterministic code
- [ ] `event_economics_source_of_truth`: Cached aggregates match event sums
