# Resonansia — Phase 3: Quoting & Invoicing

> Implementation spec for AI-generated quotes, transient proposals,
> PDF generation, ROT/RUT tax deductions, BankID signing, invoice
> generation with deviation detection, Fortnox sync, and material OCR.
>
> **Validates scenarios:** S-01, S-04, S-10
>
> **Depends on:** Phase 1 (auth, CRUD, events, economics, UI) and
> Phase 2 (messaging adapters, AI classification).
> If Phase 2 is not complete, delivery falls back to email-only.

---

## 0. Conventions

```
INVARIANT no_laziness:
  Write complete files. No "// ... rest" or "// TODO".

INVARIANT non_interactive_commands:
  All CLI tools with non-interactive flags.

INVARIANT spec_is_source_of_truth:
  docs/resonansia-spec.md wins over skills if they conflict.

INVARIANT test_against_twins:
  All integration code (Fortnox, BankID, SMS, Email, Skatteverket)
  MUST be tested against the digital twin server on port 9999.
  Start twins with `pnpm twins` before running integration tests.

INVARIANT ai_arithmetic_boundary:
  AI returns structured data (descriptions, quantities, unit prices).
  The APPLICATION computes all totals, sums, VAT, ROT/RUT deductions.
  If AI returns a total field, it MUST be ignored and recomputed.
  This boundary is sacred — violating it is a critical bug.
```

---

## 1. ROT/RUT Calculation Engine

Build this first — it's a pure calculation module with no AI or UI
dependencies. Everything else in this phase depends on it.

### Artifact

```
ARTIFACT rot_rut_engine:
  File: packages/core/economics/rot-rut.ts

  Types:

    RotRutType = 'rot' | 'rut' | 'none'

    RotRutConfig = {
      rotRate: number       // 0.30 for Sweden
      rutRate: number       // 0.50 for Sweden
      maxPerPersonPerYear: number  // 75_000 SEK
      maxRotPerPersonPerYear: number // 50_000 SEK
    }

    RotRutLineInput = {
      total: number         // Line total (qty × unitPrice)
      isLabor: boolean      // From EventData_QuoteLine.is_labor
      rotRutType: RotRutType
    }

    RotRutResult = {
      laborTotal: number
      materialTotal: number
      deductionAmount: number
      customerPays: number
      deductionType: RotRutType
      deductionRate: number
      cappedByYearlyMax: boolean
      remainingAllowance: number
    }

  Functions:

    calculateRotRut(
      lines: RotRutLineInput[],
      previouslyClaimedThisYear: number,
      personNumber: string,
      config?: RotRutConfig  // defaults to Swedish 2025/2026 rules
    ) -> RotRutResult

    Logic:
    1. laborTotal = SUM of lines where isLabor = true
    2. materialTotal = SUM of lines where isLabor = false
    3. grossDeduction = laborTotal × config.rotRate (or rutRate)
    4. Apply yearly cap:
       available = config.maxPerPersonPerYear - previouslyClaimedThisYear
       if rotRutType = 'rot': available = min(available, config.maxRotPerPersonPerYear - previousRotClaimed)
    5. deductionAmount = min(grossDeduction, available)
    6. customerPays = laborTotal + materialTotal - deductionAmount

    ALL arithmetic in TypeScript. No rounding until final display.

ARTIFACT rot_rut_accumulation:
  File: packages/core/economics/rot-rut-tracking.ts

  Functions:

    getAccumulatedRotRut(
      tenantId: string,
      personNumber: string,
      year: number
    ) -> { rotClaimed: number, rutClaimed: number, totalClaimed: number }

    Queries invoice_line events where:
    - The associated customer has this personNumber
    - occurred_at falls within the given year
    - isLabor = true
    - Uses active event resolution (corrections handled)

    This is needed for the yearly cap check.
```

### Invariants

```
INVARIANT rot_arithmetic_deterministic:
  ROT/RUT calculation MUST be a pure function.
  Same inputs → same outputs. No AI involvement.
  No floating point: use integer öre (minor units) internally
  or at minimum ensure consistent rounding at the final step.

INVARIANT rot_cap_enforced:
  System MUST check yearly cap BEFORE generating the quote/invoice PDF.
  If cap would be exceeded: warn the user in the approval UI.
  NEVER silently exceed the cap.
```

### Verify

```
VERIFY rot_rut:
  1. laborTotal=30000, materialTotal=15000, rot, previousClaimed=0
     → deduction=9000 (30000×0.30), customerPays=36000
  2. laborTotal=200000, rot, previousClaimed=0
     → deduction=50000 (capped at ROT max), customerPays=165000
  3. laborTotal=100000, rot, previousClaimed=40000
     → deduction=10000 (only 10000 remaining of 50000 ROT cap)
  4. laborTotal=30000, rut, previousClaimed=0
     → deduction=15000 (30000×0.50), customerPays=15000
  5. laborTotal=0, materialTotal=15000
     → deduction=0 (no labor = no ROT/RUT)
```

### Git

```
git add -A && git commit -m "feat: add ROT/RUT calculation engine with yearly cap tracking"
```

---

## 2. AI Abstraction Layer

### Artifact

```
ARTIFACT ai_client:
  File: packages/core/ai/client.ts

  A thin abstraction over Vercel AI SDK that enforces model tiering
  and provides structured output.

  Types:

    ModelTier = 'cheap' | 'medium' | 'expensive'

    AiConfig = {
      cheap:     { provider: 'openai', model: 'gpt-4o-mini' }
      medium:    { provider: 'anthropic', model: 'claude-haiku-4-5' }
      expensive: { provider: 'anthropic', model: 'claude-sonnet-4-5' }
    }

  Functions:

    aiComplete(options: {
      tier: ModelTier
      system: string
      prompt: string
      schema?: ZodSchema  // for structured output
      maxTokens?: number
    }) -> AiResponse

    Uses Vercel AI SDK's `generateObject()` when schema is provided
    (structured/typed output). Uses `generateText()` otherwise.

    Always logs: tier, model, input tokens, output tokens, latency.
    Never throws — returns { success: false, error } on failure.

ARTIFACT ai_context_builder:
  File: packages/core/ai/context.ts

  Builds hierarchical AI context for a project, respecting token budgets.

  buildProjectContext(tenantId, projectId, purpose: string) -> string

  Levels (from docs/resonansia-spec.md section 5.1):
    L1: Platform context (industry rules, label definitions) — 500 tokens max
    L2: Tenant context (org info, product catalog summary) — 1000 tokens max
    L3: Project context (description, photos, address, scope) — 2000 tokens max
    L4: Detail context (events, assigned persons, quotes) — 4000 tokens max
    L5: History (similar past projects, if available) — 2000 tokens max

  Uses @anthropic-ai/tokenizer for counting.
  If a level exceeds its budget: truncate and add truncation notice.
  
  INVARIANT: If any level is truncated, the context MUST include:
  "[Truncated: {N} items omitted from {level_name}. 
   Ask for specific details if needed.]"
```

### Invariants

```
INVARIANT ai_model_tiering:
  Cheap tasks (classification, translation) MUST use cheap tier.
  Complex generation (quotes, insights) MUST use expensive tier.
  OCR / document understanding MUST use medium tier.
  Agent MUST NOT default everything to expensive.

INVARIANT ai_no_arithmetic_in_prompt:
  AI prompts MUST NOT ask the model to calculate totals, sums, or deductions.
  The prompt says "return qty and unit_price for each line"
  and the application computes the rest.

INVARIANT ai_structured_output:
  Quote generation and OCR extraction MUST use Zod schemas
  with generateObject() for typed, validated AI output.
  Freeform text output is NOT acceptable for structured data.
```

### Verify

```
VERIFY ai_client:
  1. aiComplete with tier='cheap' → uses GPT-4o-mini
  2. aiComplete with tier='expensive' → uses Claude Sonnet
  3. aiComplete with schema → returns typed object matching schema
  4. aiComplete with invalid API key → returns { success: false, error }
  5. buildProjectContext for a project → string under 10000 tokens
  6. buildProjectContext with many events → truncates with notice
```

### Git

```
git add -A && git commit -m "feat: add AI abstraction layer with tiered models and context builder"
```

---

## 3. Transient Proposal System

This is the mechanism that keeps AI drafts OUT of the event log
until human approval. Central to AXIOM-02 and the biggest
architectural distinction in the system.

### Artifact

```
ARTIFACT proposal_types:
  File: packages/shared/types/proposals.ts

  TransientProposal = {
    id: string                    // temporary ID (UUIDv7)
    tenantId: string
    projectId: string
    type: 'quote' | 'invoice'
    status: 'draft' | 'approved' | 'rejected'
    createdAt: Date
    createdBy: string             // user who triggered generation
    lines: ProposalLine[]
    rotRut?: RotRutResult         // pre-calculated by deterministic code
    deviations?: Deviation[]      // AI-flagged deviations (invoice only)
    aiModel: string               // which model generated this
    aiContextSummary: string      // what context was used (transparency)
  }

  ProposalLine = {
    tempId: string                // temporary line ID
    description: string           // from AI
    qty: number                   // from AI
    unitId: number                // label ref (hour, sqm, piece, etc.)
    unitPrice: number             // from AI or catalog
    total: number                 // COMPUTED by system: qty × unitPrice
    isLabor: boolean              // from AI
    vatRate: number               // from system rules (0.25 default)
    sortOrder: number             // from AI
    catalogProductId?: string     // matched product node ID
    quoteLineRef?: string         // for invoice: which quote_line event
  }

  Deviation = {
    field: string                 // e.g. "material_cost"
    message: string               // human-readable, e.g. "12% higher than quote"
    quotedValue: number
    actualValue: number
    percentageDiff: number
  }

ARTIFACT proposal_storage:
  File: packages/core/proposals/store.ts

  Proposals are stored OUTSIDE the events table.
  Two valid storage strategies (choose one):

  Option A — Database table (recommended for multi-device):
    Table: proposals (tenant_id, project_id, type, status, data JSONB, created_at, created_by)
    RLS enabled with standard tenant_id policy.
    On approval: data → events, proposal.status = 'approved'
    On rejection: proposal.status = 'rejected'

  Option B — In-memory/session only:
    Stored in server-side session or cache.
    Simpler but lost on session expiry.

  Functions:
    createProposal(proposal: TransientProposal) -> TransientProposal
    getProposal(tenantId, proposalId) -> TransientProposal | null
    updateProposalLine(proposalId, lineIndex, updates) -> TransientProposal
    approveProposal(proposalId) -> Event[]  // creates events, returns them
    rejectProposal(proposalId) -> void

ARTIFACT proposal_approval:
  File: packages/core/proposals/approve.ts

  approveQuoteProposal(tenantId, proposalId, approvedBy) -> Event[]
    1. Load proposal, verify status = 'draft'
    2. For each line: create a quote_line event:
       - id = generateId()
       - node_id = projectId
       - type_id = getLabelId('event_type', 'quote_line')
       - qty = line.qty
       - unit_id = line.unitId
       - unit_price = line.unitPrice
       - total = computeTotal(line.qty, line.unitPrice)
       - origin = 'ai_generated'
       - data = { description, is_labor, vat_rate, sort_order }
       - occurred_at = now
    3. Update proposal status to 'approved'
    4. Return created events

  approveInvoiceProposal(tenantId, proposalId, approvedBy) -> Event[]
    Same pattern but creates invoice_line events.
    Each line has quote_line_ref pointing to the corresponding quote_line event.
```

### Invariants

```
INVARIANT proposals_not_events:
  While status = 'draft', ZERO events exist for this proposal.
  The events table MUST NOT contain any reference to the proposal.
  Only on approval do events get created.

INVARIANT proposal_economics_zero:
  calculateProjectEconomics MUST return the SAME result whether
  a draft proposal exists or not. Drafts are invisible to economics.

INVARIANT proposal_lines_recomputed:
  When a proposal is loaded for display, every line.total MUST be
  recomputed as qty × unitPrice (not trusting stored total).
  Same for rotRut — recalculated from current lines.
```

### Verify

```
VERIFY proposals:
  1. Create a draft quote proposal → stored, no events created
  2. calculateProjectEconomics with draft proposal → same as without
  3. Edit a proposal line (change qty) → total recomputed
  4. Approve proposal → quote_line events created, all with origin=ai_generated
  5. calculateProjectEconomics now includes quote totals
  6. Reject proposal → status=rejected, no events created, economics unchanged
  7. Create proposal in tenant A → not visible from tenant B
```

### Git

```
git add -A && git commit -m "feat: add transient proposal system with approval flow"
```

---

## 4. AI Quote Generation

### Artifact

```
ARTIFACT quote_generator:
  File: packages/core/ai/generate-quote.ts

  generateQuoteProposal(input: {
    tenantId: string
    projectId: string
    description: string
    photoUrls?: string[]
    catalogProducts?: Node[]     // product nodes with pricing
    historicalProjects?: { name: string, lines: ActiveEvent[] }[]
  }) -> TransientProposal

  Flow:
  1. Build project context via buildProjectContext()
  2. Build AI prompt that includes:
     - Project description and scope
     - Product catalog with names, units, prices, coverage_sqm
     - 2-3 similar past projects (summary only: line descriptions + quantities)
     - Instruction: "Return structured quote lines. Include qty and unit_price.
       DO NOT calculate totals — the system does that."
  3. Call aiComplete(tier='expensive', schema=quoteLineArraySchema)
  4. For each AI-returned line:
     - Match against catalog products (by name/SKU similarity)
     - If matched: use catalog price as unit_price (override AI's price)
     - Compute total = computeTotal(qty, unitPrice)
     - Set isLabor based on AI classification
     - Set vatRate from system default (0.25)
  5. Calculate ROT/RUT from deterministic engine
  6. Build TransientProposal with all lines + rotRut result
  7. Store as draft proposal
  8. Return proposal for UI display

ARTIFACT quote_line_schema:
  File: packages/shared/schemas/ai-output.ts

  Zod schema for AI structured output:

  aiQuoteLineSchema = z.object({
    description: z.string(),
    qty: z.number().positive(),
    unitPrice: z.number().positive(),
    unitCode: z.string(),           // 'hour', 'sqm', 'piece', etc.
    isLabor: z.boolean(),
    sortOrder: z.number().int(),
    catalogMatch: z.string().optional()  // product name AI thinks matches
  })

  aiQuoteOutputSchema = z.object({
    lines: z.array(aiQuoteLineSchema).min(1),
    reasoning: z.string()           // AI explains its estimate (transparency)
  })
```

### Invariants

```
INVARIANT catalog_price_overrides_ai:
  If AI returns a unit_price but the line matches a catalog product,
  the catalog product's default_price MUST be used instead.
  AI guesses prices poorly. Catalog is ground truth.

INVARIANT ai_output_revalidated:
  Every field returned by AI MUST be validated by Zod.
  If AI returns unexpected structure: fail gracefully,
  log the error, and return empty proposal with error message.

INVARIANT quote_reasoning_stored:
  The AI's reasoning (why it chose these quantities/items) MUST be
  stored in the proposal for transparency. The user can see it.
```

### Verify

```
VERIFY quote_generation:
  1. Generate quote for "3 rum, 85 kvm, 2 lager" with paint catalog
     → returns proposal with labor + material lines
  2. All line totals = qty × unitPrice (computed, not from AI)
  3. Lines matching catalog products use catalog prices
  4. isLabor correctly set (painting hours = true, paint = false)
  5. ROT/RUT calculated from labor lines
  6. Proposal is draft — no events exist
  7. reasoning field present and non-empty
  8. Generate with empty description → graceful error, not crash
```

### Git

```
git add -A && git commit -m "feat: add AI quote generation with catalog matching"
```

---

## 5. PDF Generation

### Artifact

```
ARTIFACT pdf_quote:
  File: packages/pdf/quote.tsx

  React component (using @react-pdf/renderer) that renders a quote PDF.

  Props:
    tenant: NodeData_Org       // logo, colors, company info, bankgiro
    customer: NodeData_Customer // name, address
    project: NodeData_Project   // name, address, description
    lines: ProposalLine[]       // or approved quote_line events
    rotRut: RotRutResult | null
    quoteNumber: string         // sequential per tenant
    quoteDate: Date
    validUntil: Date

  Layout (from docs/design-system.md):
    - Header: tenant logo (left), "OFFERT" title (right)
    - Recipient: customer name and address
    - Project: name, address, description
    - Line items table: description, qty, unit, unit price, total
    - Subtotals: labor total, material total
    - ROT/RUT section (if applicable):
      "Arbetskostnad: {laborTotal} kr"
      "ROT-avdrag ({rate}%): -{deductionAmount} kr"
      "Att betala: {customerPays} kr"
    - VAT summary per rate
    - Footer: payment terms, bankgiro, org number, valid until date
    - Page numbers

ARTIFACT pdf_invoice:
  File: packages/pdf/invoice.tsx

  Same structure as quote but:
  - Title: "FAKTURA"
  - Invoice number (from Fortnox or sequential)
  - Due date (from NodeData_Org.payment_terms)
  - OCR reference for bankgiro payment
  - ROT/RUT section with personnummer (masked: XXXXXX-XXXX, last 4 visible)
  - Quote reference if applicable

ARTIFACT pdf_generator:
  File: packages/pdf/generate.ts

  Functions:
    generateQuotePdf(data: QuotePdfInput) -> Buffer
    generateInvoicePdf(data: InvoicePdfInput) -> Buffer

  Uses @react-pdf/renderer's renderToBuffer().
  Returns a Buffer that can be saved to blob storage or sent as attachment.

ARTIFACT pdf_route:
  File: apps/web/app/api/pdf/[type]/[id]/route.ts

  Route Handler (one of the few allowed uses of /api):
  GET /api/pdf/quote/{proposalOrProjectId} → returns quote PDF
  GET /api/pdf/invoice/{proposalOrProjectId} → returns invoice PDF

  Sets Content-Type: application/pdf
  Sets Content-Disposition: inline (view in browser) or attachment (download)
```

### Invariants

```
INVARIANT pdf_numbers_match_economics:
  Every number on the PDF MUST match the output of calculateProjectEconomics
  and calculateRotRut. The PDF renderer NEVER computes its own totals —
  it receives pre-computed values.

INVARIANT pdf_branding_from_tenant:
  Logo, colors, company info MUST come from the tenant's org node
  (NodeData_Org). Never hardcoded.

INVARIANT pdf_rot_rut_display:
  If ROT/RUT applies, the PDF MUST clearly show:
  total, labor cost, deduction rate, deduction amount, customer pays.
  This is a legal requirement.

INVARIANT pdf_rtl_support:
  If customer or project has Arabic content, PDF MUST handle RTL text.
  @react-pdf/renderer supports this via style direction='rtl'.
```

### Verify

```
VERIFY pdf:
  1. Generate quote PDF → valid PDF buffer (starts with %PDF)
  2. PDF contains tenant company name and logo reference
  3. PDF line items match proposal lines
  4. ROT deduction shown correctly: 30000 labor → 9000 deduction → 36000 customer pays
  5. Invoice PDF has different title, invoice number, due date, OCR ref
  6. PDF route returns correct Content-Type header
  7. Empty lines array → PDF still renders (with "No line items" message)
```

### Git

```
git add -A && git commit -m "feat: add PDF generation for quotes and invoices"
```

---

## 6. Customer-Facing Quote View & BankID Signing

No login required. Customer receives a link, views the quote, signs with BankID.

### Artifact

```
ARTIFACT customer_quote_page:
  File: apps/web/app/(public)/quote/[token]/page.tsx

  A PUBLIC page (no auth required) that:
  1. Receives a signed token in the URL (JWT or HMAC-signed ID)
  2. Validates the token (expiry, integrity)
  3. Fetches the quote data (via service client — this is public access)
  4. Renders:
     - Tenant branding (logo, company name)
     - Project description
     - Line items table
     - ROT/RUT breakdown (if applicable)
     - "Sign with BankID" button (or "Accept" if BankID not configured)
  5. Mobile-friendly layout (customer likely opens on phone from SMS)

ARTIFACT quote_token:
  File: packages/core/quotes/token.ts

  Functions:
    generateQuoteToken(projectId, tenantId, expiresIn='30d') -> string
      Creates a signed token (JWT or HMAC) that grants read-only access
      to this specific quote. No auth session required.

    verifyQuoteToken(token) -> { projectId, tenantId } | null
      Validates signature and expiry.

  The token MUST NOT contain sensitive data.
  It is a capability token: possession = access to view this quote.

ARTIFACT bankid_signing:
  File: packages/core/signing/bankid.ts

  Functions:
    initiateSigning(personNumber: string) -> { orderRef: string, autoStartToken: string }
      Calls BankID adapter (which calls twin in dev).
      Returns orderRef for polling and autoStartToken for mobile BankID launch.

    pollSigningStatus(orderRef: string) -> SigningStatus
      Polls BankID collect endpoint.
      Returns: 'pending' | 'complete' | 'failed' | 'expired'
      When 'complete': returns the signed person's personnummer for verification.

    onSigningComplete(projectId, tenantId, signedByPersonNumber) -> void
      1. Creates state_change event:
         from_state = current state
         to_state = 'active'
         trigger = 'customer_signing'
         origin = 'system'
      2. Logs signing metadata (IP, timestamp, personnummer match)

ARTIFACT bankid_ui:
  File: apps/web/app/(public)/quote/[token]/components/bankid-signing.tsx

  Client Component that:
  1. On "Sign with BankID" click: calls initiateSigning via Server Action
  2. Shows QR code or autostart link for mobile BankID
  3. Polls status every 2 seconds
  4. On complete: shows success message, triggers state change
  5. On failure/timeout: shows error with retry option
```

### Invariants

```
INVARIANT quote_view_no_auth:
  The customer quote page MUST NOT require any login or account.
  Token in URL = sufficient authorization.

INVARIANT signing_creates_event:
  A successful BankID signing MUST create a state_change event.
  This is the audit trail that proves the customer accepted.

INVARIANT signing_verifies_person:
  The personnummer returned by BankID MUST match the customer's
  rot_rut_person_number (if set). Mismatch = signing rejected.
  (Different person cannot sign someone else's quote.)

INVARIANT token_expiry:
  Quote view tokens MUST expire (default 30 days).
  Expired tokens return a friendly "This link has expired" page.
```

### Verify

```
VERIFY customer_quote:
  1. Generate token → valid signed string
  2. Open /quote/{token} → quote page renders without login
  3. Page shows line items, ROT/RUT breakdown, tenant branding
  4. Invalid token → "Invalid link" page
  5. Expired token → "Link expired" page

VERIFY bankid_signing:
  (Against BankID twin on port 9999)
  1. Initiate signing → returns orderRef
  2. Poll → returns 'pending', then 'complete' after ~2 seconds
  3. On complete → state_change event created (draft → active)
  4. Project state updated to 'active'
  5. Second signing attempt → rejected (already signed)
```

### Git

```
git add -A && git commit -m "feat: add customer quote view with BankID signing"
```

---

## 7. Quote Delivery

### Artifact

```
ARTIFACT quote_delivery:
  File: packages/core/quotes/deliver.ts

  Functions:
    deliverQuote(input: {
      tenantId: string
      projectId: string
      channel: 'sms' | 'email' | 'whatsapp'
      recipientPhone?: string
      recipientEmail?: string
      pdfBuffer: Buffer
      quoteViewUrl: string
    }) -> { success: boolean, messageEventId: string }

    Flow:
    1. Upload PDF to storage (via storage adapter → twin in dev)
    2. Send message via chosen channel adapter:
       - SMS: short text + link to quote view
       - Email: branded email with PDF attachment + link
       - WhatsApp: template message with link + PDF
    3. Create message event:
       type_id = 'message'
       origin = 'system'
       data = { text, channel, direction: 'outbound', external_id }
    4. Return success + event ID

ARTIFACT quote_send_action:
  File: apps/web/app/actions/quotes.ts

  Server Actions:
    generateQuoteAction(projectId) -> TransientProposal
      Triggers AI quote generation, returns proposal for UI.

    approveQuoteAction(proposalId) -> Event[]
      Approves proposal, creates events, generates PDF.

    sendQuoteAction(projectId, channel, recipient) -> void
      Generates token, builds URL, generates PDF, delivers via channel.
```

### Verify

```
VERIFY quote_delivery:
  (Against twins)
  1. Send via SMS → twin receives message with URL
  2. Send via email → twin receives email with PDF attachment
  3. Message event created with channel='sms' and direction='outbound'
  4. Quote view URL in message is accessible and valid
```

### Git

```
git add -A && git commit -m "feat: add quote delivery via SMS, email, and WhatsApp"
```

---

## 8. Invoice Generation with Deviation Detection

### Artifact

```
ARTIFACT invoice_generator:
  File: packages/core/invoicing/generate.ts

  generateInvoiceProposal(tenantId, projectId) -> TransientProposal

  Flow:
  1. Fetch active quote_line events for the project
  2. Fetch active time events + material events
  3. For each quote line, build a corresponding invoice line:
     - Use actual qty/prices from events where they exist
     - Fall back to quoted values for items without actuals
  4. Detect deviations:
     For each category (labor, material):
     - Compare actual total vs quoted total
     - If deviation > 5%: add to deviations array
     - deviation.message = human-readable explanation
       (e.g., "Material cost 12% higher than quote (16,800 vs 15,000)")
  5. Calculate ROT/RUT from the invoice lines (deterministic engine)
  6. Check yearly cap with getAccumulatedRotRut()
  7. Build TransientProposal with type='invoice' + deviations

ARTIFACT deviation_detector:
  File: packages/core/invoicing/deviations.ts

  detectDeviations(
    quotedEconomics: ProjectEconomics,
    actualEconomics: ProjectEconomics,
    threshold: number = 0.05  // 5%
  ) -> Deviation[]

  Checks:
  - timeCost vs quoted labor: percentage diff
  - materialCost vs quoted material: percentage diff
  - Total actual vs total quoted: percentage diff

  Each deviation includes:
  - field: 'time_cost' | 'material_cost' | 'total'
  - quotedValue, actualValue, percentageDiff
  - message: human-readable in Swedish
    "Materialkostnad 12% högre än offert (16 800 kr vs 15 000 kr)"

ARTIFACT invoice_approval:
  File: packages/core/invoicing/approve.ts

  approveInvoiceProposal(tenantId, proposalId, approvedBy) -> {
    events: Event[]
    fortnoxInvoiceId?: string
    pdfBuffer: Buffer
  }

  Flow:
  1. Create invoice_line events (same pattern as quote approval)
  2. Each line has quote_line_ref linking to original quote_line event
  3. Generate invoice PDF
  4. Sync to Fortnox (via accounting adapter → twin in dev)
  5. Create a system event logging the Fortnox sync (origin=external_api)
  6. Prepare ROT/RUT submission data (but don't submit yet)
  7. Return events + Fortnox ID + PDF
```

### Invariants

```
INVARIANT deviations_before_approval:
  Deviations MUST be presented in the proposal UI BEFORE approval.
  The user MUST acknowledge deviations (adjust or accept) before
  the "Approve" button becomes active.

INVARIANT invoice_traces_to_quote:
  Every invoice_line event SHOULD have quote_line_ref pointing
  to the corresponding quote_line event. This enables
  quote-vs-actual analysis.

INVARIANT fortnox_sync_logged:
  Every Fortnox sync MUST be logged as an event (origin=external_api).
  If Fortnox sync fails: the invoice is still created locally,
  the sync is queued for retry, and the user is notified.
```

### Verify

```
VERIFY invoice_generation:
  1. Project with quote 45000 (30000 labor + 15000 material)
     and actuals 50600 (33800 labor + 16800 material)
     → deviations detected for both categories
  2. Invoice lines computed with actual values
  3. ROT: 33800 × 0.30 = 10140 deduction
  4. customerPays = 33800 + 16800 - 10140 = 40460
  5. Proposal has deviations array with human-readable messages

VERIFY invoice_approval:
  (Against Fortnox twin)
  1. Approve invoice → invoice_line events created
  2. Events have origin=ai_generated and quote_line_ref set
  3. Fortnox twin received invoice data
  4. System event logged for Fortnox sync
  5. Invoice PDF generated with correct numbers
```

### Git

```
git add -A && git commit -m "feat: add invoice generation with deviation detection and Fortnox sync"
```

---

## 9. Skatteverket ROT/RUT Submission

### Artifact

```
ARTIFACT rot_rut_submission:
  File: packages/core/invoicing/skatteverket.ts

  submitRotRutClaim(input: {
    tenantId: string
    projectId: string
    invoiceEventIds: string[]    // the invoice_line events
    customerPersonNumber: string
    deductionAmount: number
    deductionType: RotRutType
  }) -> { submissionId: string, status: string }

  Flow:
  1. Validate all inputs (person number format, amounts)
  2. Call tax adapter (→ Skatteverket twin in dev)
  3. Twin validates against yearly cap and returns submission ID
  4. Create system event logging the submission
  5. Return submission ID and status

ARTIFACT rot_rut_action:
  File: apps/web/app/actions/invoicing.ts

  submitRotRutAction(projectId) -> void
    Called after invoice approval.
    Fetches the invoice's labor lines, calculates deduction,
    submits to Skatteverket adapter.
```

### Verify

```
VERIFY skatteverket:
  (Against Skatteverket twin)
  1. Submit ROT claim for 10140 SEK → returns submission ID
  2. Twin tracks accumulated amount per personnummer
  3. Submit second claim that would exceed 50000 → twin rejects
  4. System event logged for submission
```

### Git

```
git add -A && git commit -m "feat: add Skatteverket ROT/RUT submission"
```

---

## 10. Material OCR (Delivery Note Scanning)

### Artifact

```
ARTIFACT material_ocr:
  File: packages/core/ai/ocr-delivery-note.ts

  extractDeliveryNote(input: {
    tenantId: string
    projectId: string
    imageUrl: string           // photo of delivery note
    catalogProducts: Node[]     // product catalog for matching
  }) -> TransientProposal

  Flow:
  1. Call aiComplete(tier='medium', schema=deliveryNoteSchema)
     Prompt includes: "Extract line items from this delivery note.
     Return article name, quantity, unit price. DO NOT compute totals."
  2. For each extracted line:
     - Match against catalog products (name/SKU similarity)
     - Compute total = computeTotal(qty, unitPrice)
     - Set isLabor = false (materials)
  3. Build TransientProposal with type='quote' (or direct material lines)
  4. Return for user review

  On approval: creates material events with origin=ai_generated

ARTIFACT delivery_note_schema:
  File: packages/shared/schemas/ai-output.ts

  aiDeliveryNoteLineSchema = z.object({
    articleName: z.string(),
    qty: z.number().positive(),
    unitPrice: z.number().positive(),
    unit: z.string(),
    catalogMatch: z.string().optional()
  })

  aiDeliveryNoteSchema = z.object({
    lines: z.array(aiDeliveryNoteLineSchema),
    supplierName: z.string().optional(),
    deliveryNoteNumber: z.string().optional(),
    date: z.string().optional()
  })
```

### Invariants

```
INVARIANT ocr_is_transient:
  Extracted delivery note data is a transient proposal.
  User MUST review and confirm before events are created.

INVARIANT ocr_corrections_tracked:
  If the user corrects an AI-extracted quantity, the correction
  creates an adjustment event (origin=human) referencing the
  original AI-generated event (origin=ai_generated).
```

### Verify

```
VERIFY material_ocr:
  1. Upload delivery note image → AI extracts lines
  2. Lines have qty and unitPrice (totals computed by system)
  3. Catalog products matched where possible
  4. User confirms → material events created with origin=ai_generated
  5. User corrects one qty → adjustment event with origin=human, ref_id → root
```

### Git

```
git add -A && git commit -m "feat: add material OCR with delivery note scanning"
```

---

## 11. Quote & Invoice UI

### Artifact

```
ARTIFACT quote_ui:
  File: apps/web/app/(app)/projects/[id]/quotes/page.tsx

  Server Component:
  1. Fetches active quote_line events (or draft proposal if exists)
  2. Renders:
     - If draft proposal exists: editable proposal view
       (inline editing of qty, unitPrice, description)
       "Generate Quote" button triggers AI generation
       "Approve" button creates events
       "Reject" button discards proposal
       ROT/RUT breakdown shown in real-time as lines change
     - If approved quotes exist: read-only quote view
       "Send to customer" button with channel selector
       "Download PDF" button
       "Generate invoice" button (if project completed)
  3. AI reasoning panel: expandable section showing why AI
     chose these quantities (transparency)

ARTIFACT invoice_ui:
  File: apps/web/app/(app)/projects/[id]/invoices/page.tsx

  Server Component:
  1. Fetches invoice proposals or approved invoice_line events
  2. If draft proposal:
     - Shows editable lines (same pattern as quote)
     - Deviation warnings displayed prominently:
       yellow banner per deviation with message
       "Material cost 12% higher than quote — adjust?"
     - User can adjust lines before approving
     - ROT/RUT breakdown with yearly cap status
  3. If approved:
     - Read-only invoice view
     - "Download PDF" button
     - "Send to customer" button
     - Fortnox sync status badge
     - ROT/RUT submission status badge

ARTIFACT proposal_edit_component:
  File: apps/web/app/(app)/projects/[id]/components/proposal-editor.tsx

  Client Component ('use client'):
  - Renders proposal lines in an editable table
  - Inline editing: click cell → edit qty, unitPrice, description
  - On any change: recomputes line total + ROT/RUT + grand total
  - All computation in the component (deterministic JS, no API calls)
  - "Add line" and "Remove line" buttons
  - "Approve" calls approveQuoteAction / approveInvoiceAction
  - Visual distinction: AI-generated lines have violet background
    (per design system AXIOM-05)

ARTIFACT deviation_banner:
  File: apps/web/app/(app)/projects/[id]/components/deviation-banner.tsx

  Shows deviation warnings for invoice proposals.
  Yellow/amber background, icon + message per deviation.
  "Adjust" button on each deviation that pre-fills the correction.
```

### Invariants

```
INVARIANT proposal_editable_before_approval:
  Lines MUST be editable while proposal status = 'draft'.
  After approval: read-only. No editing approved events
  (corrections via adjustment events only).

INVARIANT ai_lines_visually_distinct:
  AI-generated lines MUST have violet background (bg-violet-50)
  per the design system. User-added lines have default background.

INVARIANT real_time_rot_rut:
  As the user edits lines, the ROT/RUT breakdown MUST update
  immediately in the UI. This is deterministic client-side math,
  not an API call.
```

### Verify

```
VERIFY quote_ui:
  1. Open project → click "Generate Quote" → AI generates proposal
  2. Proposal lines shown with violet background (AI content)
  3. Edit a quantity → total and ROT/RUT update instantly
  4. Click "Approve" → events created, page shows approved quote
  5. Click "Download PDF" → PDF downloads with correct numbers
  6. Click "Send via SMS" → message sent (verify in twin)

VERIFY invoice_ui:
  1. Mark project complete → click "Generate Invoice"
  2. Deviations shown as yellow banners
  3. Adjust material line → deviation recalculates
  4. Click "Approve" → invoice events created, Fortnox synced
  5. ROT/RUT submission button available
```

### Git

```
git add -A && git commit -m "feat: add quote and invoice UI with proposal editor"
```

---

## 12. Final Verification

### Run all verifies

Re-run every VERIFY block from sections 1–11. Fix any failures.

### End-to-end scenario (S-01)

```
VERIFY s01_end_to_end:
  Full flow without shortcuts:
  1. Log in as Kimmo
  2. Create project "Eriksson — Interior Painting"
  3. Add customer "Erik Eriksson" with personnummer
  4. Enter description: "3 rum, 85 kvm, 2 lager, tak och väggar"
  5. Click "Generate Quote" → AI returns proposal with labor + material lines
  6. Review lines — AI reasoning visible
  7. Adjust one line, approve → quote_line events created
  8. Verify: no events existed BEFORE approval
  9. Download PDF → correct numbers, ROT deduction, tenant branding
  10. Send quote via SMS → twin receives message
  11. Open customer link → quote page renders without login
  12. Sign with BankID (twin) → project state changes to active
  13. Verify project economics match quote
```

### End-to-end scenario (S-04)

```
VERIFY s04_invoice_with_rot:
  1. Project "Eriksson" with approved quote (45000 = 30000 labor + 15000 material)
  2. Register time events totaling 33800 labor
  3. Register material events totaling 16800
  4. Click "Generate Invoice" → deviations flagged
  5. Review deviations, adjust material to match quote
  6. Approve → invoice_line events created
  7. ROT: 30% of labor = correct deduction
  8. PDF generated with ROT breakdown
  9. Fortnox twin received invoice
  10. Skatteverket twin received ROT claim
```

### Invariant checks

```
VERIFY invariants:
  1. grep -r "computeTotal" in packages/core/ai/ → ZERO results
     (AI code never computes totals)
  2. grep -r "origin.*ai_generated" → present in proposal approval code
  3. All proposal tests pass with draft → no events, approved → events
  4. `pnpm tsc --noEmit` → exits 0
  5. `pnpm test` → all tests pass
  6. Twin server: all 7 services respond correctly after full flow
```

### Git

```
git add -A && git commit -m "chore: phase 3 complete — quoting and invoicing verified"
git push
```

### Report

When done, report:
1. Total files created/modified
2. Deviations from this spec and why
3. Status of every VERIFY block
4. The economics for S-01 test project:
   quoted total, labor, material, ROT deduction, customer pays
5. The economics for S-04 test project:
   quoted vs actual, deviations detected, invoice total, ROT
