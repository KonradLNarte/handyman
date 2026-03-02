# Resonansia — Phase 4: Communication & Automatic Reporting

> Implementation spec for automatic customer status updates, BRF weekly
> reports, AI summarization, scheduled job infrastructure, customer reply
> handling, and report PDF generation.
>
> After this phase: the system automatically sends daily status updates
> to customers with photos and AI-generated summaries, generates weekly
> PDF reports for BRF contracts aggregating multiple sub-projects, and
> handles inbound replies from customers — all without anyone logging in.
>
> **Validates scenarios:** S-03, S-08
>
> **Depends on:** Phase 1 (CRUD, events, economics), Phase 2 (messaging,
> AI classification, outbound channels), Phase 3 (PDF generation base)

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
  All channel delivery (SMS, email, WhatsApp) tested against twins.
  Start twins: `pnpm twins` in a separate terminal.

INVARIANT drizzle_raw_sql:
  db.execute() returns rows directly as array — never use .rows
  Array parameters: use IN (sql.join(...)), never ANY().
  See .claude/skills/data-model/SKILL.md "Drizzle Raw SQL Traps".

INVARIANT cost_details_never_leak:
  Automatic customer-facing messages MUST NEVER include cost data
  (prices, margins, invoiced amounts, hourly rates) UNLESS the
  customer has explicitly opted in. This is the cardinal rule of
  Phase 4. Leaking internal economics to a customer is a business-
  critical bug — treat violations as severity P0.
```

---

## 1. Project Communication Configuration

The system needs to know: which projects send auto-updates, how often,
to whom, via which channel, and what to include.

### Artifact

```
ARTIFACT communication_config:
  Extend NodeData_Project schema to include communication settings.

  File: packages/shared/schemas/node-data.ts
  Update nodeDataProjectSchema to add:

    auto_status: {
      enabled: boolean           // default false
      frequency: 'daily' | 'weekly' | 'none'
      dayOfWeek?: number         // 0-6 for weekly (0=Sunday). Ignored for daily.
      timeOfDay: string          // "17:00" — when to send (24h format)
      includePhotos: boolean     // default true
      includeCostDetails: boolean // default false — MUST default to false
      maxPhotos: number          // default 2
    } | null

  File: packages/shared/schemas/node-data.ts
  Update nodeDataCustomerSchema to ensure:
    preferred_channel: 'email' | 'sms' | 'whatsapp'  // already exists
    // Used to determine HOW to send the status

  These fields configure per-project communication.
  A project without auto_status (or enabled=false) gets no automatic messages.

ARTIFACT communication_config_migration:
  No database migration needed — auto_status lives inside Node.data (JSON).
  Existing projects have auto_status = null = disabled.
  The Zod schema treats the field as optional with defaults.
```

### Invariants

```
INVARIANT cost_opt_in_explicit:
  includeCostDetails MUST default to false.
  It can only be set to true via explicit user action in the UI.
  The UI MUST show a warning: "Cost details will be visible to the customer."

INVARIANT customer_channel_required:
  Auto-status MUST use the customer's preferred_channel.
  If no customer is linked to the project: auto-status is disabled
  (no one to send to). Log a warning, not an error.
```

### Verify

```
VERIFY config:
  1. Create project with auto_status.enabled=true → validates via Zod
  2. Create project without auto_status → defaults to null (disabled)
  3. Update project to enable auto_status → field updates correctly
  4. Set includeCostDetails=true → accepted (but defaults to false)
  5. Existing projects (no auto_status field) → treated as disabled
```

### Git

```
git add -A && git commit -m "feat: add project communication configuration schema"
```

---

## 2. AI Summarization

### Artifact

```
ARTIFACT ai_summarizer:
  File: packages/core/ai/summarize.ts

  Functions:

    summarizeProjectPeriod(input: {
      tenantId: string
      projectId: string
      period: { start: Date, end: Date }
      includeCostDetails: boolean
      targetLanguage: string      // customer's language (from customer node or default 'sv')
    }) -> {
      summary: string             // human-readable, < 200 chars for SMS
      longSummary: string         // for PDF reports, no char limit
      photoUrls: string[]         // selected photos from the period
    }

    Flow:
    1. Fetch events for the project in the given period:
       - Time events (hours worked, by whom)
       - Photo events (blob URLs)
       - State change events
       - Material events (what was delivered)
    2. Build AI context:
       - Project name, description, address
       - Total estimated days (from NodeData_Project.dates)
       - Current day number (elapsed since project start)
       - Events from the period (structured, not raw)
    3. Call aiComplete(tier='cheap') with prompt:
       "Generate a short customer-friendly status update for a construction project.
        Max 180 characters for SMS version.
        Include: what was done, progress (day X of Y).
        Tone: professional, warm, informative.
        Language: {targetLanguage}.
        {if !includeCostDetails: 'DO NOT mention any costs, prices, or amounts.'}"
    4. Select 1-2 best photos from the period:
       - Prefer the most recent photos
       - If more than maxPhotos: pick the last N
    5. Return summary + longSummary + photos

ARTIFACT ai_report_narrative:
  File: packages/core/ai/report-narrative.ts

  generateReportNarrative(input: {
    tenantId: string
    projectId: string            // can be parent project (BRF)
    subProjects: { id: string, name: string, events: ActiveEvent[] }[]
    period: { start: Date, end: Date }
    includeCostDetails: boolean
    targetLanguage: string
  }) -> {
    narrative: string            // Multi-paragraph report narrative
    truncated: boolean           // true if context was truncated
    truncationNotice?: string    // "10 of 15 sub-projects included" 
  }

  Flow:
  1. For each sub-project: aggregate events from period
  2. Build context with token budgeting:
     - If total context > 8000 tokens: truncate least-active sub-projects
     - Set truncated = true, generate notice
  3. Call aiComplete(tier='medium') with prompt:
     "Generate a professional project report narrative.
      This is for a property association (BRF) board.
      Cover each sub-project's progress, highlight completions,
      flag any delays. Tone: professional, factual.
      {if truncated: 'Note: {truncationNotice}'}
      {if !includeCostDetails: 'DO NOT mention costs or amounts.'}"
  4. Return narrative + truncation info
```

### Invariants

```
INVARIANT summary_short_for_sms:
  The summary field MUST be < 200 characters.
  If AI returns longer: truncate at sentence boundary + "..."
  SMS has technical limits and long messages split awkwardly.

INVARIANT summary_no_cost_default:
  If includeCostDetails is false (the default), the AI prompt MUST
  explicitly instruct "DO NOT mention costs". AND the application
  MUST post-validate: scan the output for currency patterns
  (kr, SEK, numbers > 1000 followed by "kr").
  If detected: regenerate with stricter prompt.

INVARIANT report_truncation_transparent:
  If context was truncated to fit token budget, the report MUST
  disclose this. "This report covers 10 of 15 sub-projects.
  Contact us for the complete report."
  This is per S-08 satisfaction criteria.

INVARIANT narrative_from_events:
  AI narrative MUST be based on actual events.
  It MUST NOT invent progress or fabricate details.
  The prompt includes structured event data, not freeform instructions.
```

### Verify

```
VERIFY summarizer:
  1. Project with 2 time events and 3 photos in period
     → summary < 200 chars, 2 photos selected
  2. includeCostDetails=false → no cost mentions in output
  3. includeCostDetails=true → cost summary included
  4. Empty period (no events) → "No activity recorded this period."
  5. Summary in Swedish for Swedish customer
  6. Summary in Arabic for Arabic-speaking customer

VERIFY report_narrative:
  1. BRF with 3 sub-projects → narrative covers all three
  2. BRF with 15 sub-projects → truncates, notice present
  3. includeCostDetails=false → no amounts in narrative
  4. Narrative references actual events (not fabricated)
```

### Git

```
git add -A && git commit -m "feat: add AI summarization for status updates and reports"
```

---

## 3. Auto-Status Generation

The core engine that generates and sends daily/weekly status updates.

### Artifact

```
ARTIFACT auto_status_engine:
  File: packages/core/communication/auto-status.ts

  Functions:

    generateAutoStatus(tenantId: string, projectId: string) -> {
      sent: boolean
      channel: string
      recipientPhone?: string
      recipientEmail?: string
      eventId?: string
    }

    Flow:
    1. Load project node (with auto_status config from data)
    2. Verify auto_status.enabled = true, else return { sent: false }
    3. Find the customer for this project:
       - Follow customer_of edge from project
       - Load customer node (for preferred_channel + contact info)
       - If no customer: log warning, return { sent: false }
    4. Determine period:
       - daily: last 24 hours (or since last status was sent)
       - weekly: last 7 days
    5. Call summarizeProjectPeriod() with:
       - includeCostDetails from config
       - targetLanguage from customer or default 'sv'
    6. If no events in period: skip (don't send "nothing happened" messages)
    7. Build message:
       - SMS: summary (< 200 chars) + photo link (if photos)
       - Email: summary + embedded photos + project name
       - WhatsApp: summary + photos as media
    8. Send via appropriate channel adapter (Phase 2 infrastructure)
    9. Log outbound message event:
       type_id = 'message', origin = 'system', direction = 'outbound'
       data = { text: summary, channel, auto_status: true }
    10. Return result

ARTIFACT auto_status_batch:
  File: packages/core/communication/auto-status-batch.ts

  processAutoStatusBatch() -> {
    processed: number
    sent: number
    skipped: number
    errors: { projectId: string, error: string }[]
  }

  Flow:
  1. Query all projects where:
     - state IN ('active', 'in_progress')
     - data->'auto_status'->>'enabled' = 'true'
     - Frequency matches today:
       - daily: always
       - weekly: today's day of week matches config.dayOfWeek
     - Time of day has passed (compare config.timeOfDay with now)
     - No auto-status message event exists for today (prevent duplicates)
  2. For each project: call generateAutoStatus()
  3. Aggregate results
  4. Return batch report

  CRITICAL: This runs as a background job (section 5).
  It must be idempotent — running twice in the same day
  sends zero duplicate messages (checked by "already sent today").
```

### Invariants

```
INVARIANT auto_status_idempotent:
  Running the batch multiple times in the same period MUST NOT
  send duplicate messages. Check: does a message event with
  data.auto_status=true exist for this project in the current period?

INVARIANT auto_status_skip_empty:
  If no events occurred in the period: do NOT send a status update.
  "Nothing happened today" messages annoy customers.

INVARIANT auto_status_per_project:
  Each project has its own schedule. A tenant with 10 projects
  may have 3 with daily updates, 2 with weekly, and 5 disabled.

INVARIANT auto_status_customer_channel:
  The message MUST be sent via the customer's preferred_channel.
  Not the project owner's preference, not a system default.
```

### Verify

```
VERIFY auto_status:
  1. Project with auto_status enabled + events today
     → status sent to customer, message event logged
  2. Project with auto_status enabled + no events today
     → nothing sent
  3. Project with auto_status disabled → nothing sent
  4. Run batch twice → second run sends zero messages
  5. Daily project → sends every day with events
  6. Weekly project (dayOfWeek=5) on a Friday → sends
  7. Weekly project (dayOfWeek=5) on a Monday → skips
  8. Customer prefers SMS → sent via SMS twin
  9. Customer prefers email → sent via email twin
  10. Message event has data.auto_status=true
```

### Git

```
git add -A && git commit -m "feat: add auto-status generation engine with batch processing"
```

---

## 4. Customer Reply Handling

Customers reply to status updates. These replies must be captured.

### Artifact

```
ARTIFACT customer_reply_handler:
  File: packages/core/communication/customer-reply.ts

  Extends the message handler from Phase 2 to handle customer replies.

  The Phase 2 handler resolves senders by phone → person node.
  Customers are NOT person nodes (they're customer nodes).
  We need a second resolution path:

  resolveCustomerSender(phoneNumber: string) -> {
    customer: Node | null
    tenant: Tenant | null
    projects: Node[]            // projects linked to this customer
  }

  Logic:
  1. Search customer nodes where data->'contact'->>'phone' matches
  2. If found: load tenant, find projects via customer_of edges
  3. Return customer + projects

  Integration with Phase 2 handler:
  Update handleIncomingMessage() to:
  1. First try resolveSender (person = worker)
  2. If not found: try resolveCustomerSender
  3. If customer found:
     - Log inbound message event (origin=human, actor_id=null,
       node_id=project)
     - Classify message:
       - Positive acknowledgment ("Great!", "Thanks") → log only, no reply
       - Question → forward to project owner as notification
       - Complaint/issue → forward to project owner as HIGH priority notification
     - Respond: "Thanks! We'll get back to you." (or nothing for ack)
  4. If neither found: generic rejection message

ARTIFACT customer_intent_schema:
  Extend the messageIntentSchema (Phase 2) with customer-specific intents:

  | { type: 'customer_ack' }                           // "Great, thanks!"
  | { type: 'customer_question', question: string }    // "When will it be done?"
  | { type: 'customer_complaint', issue: string }      // "There's paint on the floor"

  The classifier distinguishes worker intents from customer intents
  based on who the sender is (worker vs customer).
```

### Invariants

```
INVARIANT customer_replies_logged:
  Every customer reply MUST be logged as an event (origin=human).
  Even "thanks" messages — they prove the customer received the update.

INVARIANT customer_never_auto_responded_with_details:
  Automatic responses to customer replies MUST be generic.
  Never auto-respond with project details, costs, or schedules.
  Those go to the project owner who responds manually.

INVARIANT customer_complaints_escalated:
  Messages classified as complaints MUST generate a HIGH priority
  notification to the project owner. Not silently logged.
```

### Verify

```
VERIFY customer_replies:
  (Against twins)
  1. Customer sends "Great, thanks!" → event logged, no reply sent
  2. Customer sends "When will it be done?" → event logged,
     notification to project owner as question
  3. Customer sends "There's paint on my carpet!" → event logged,
     HIGH priority notification to project owner
  4. Unknown number → generic rejection
  5. All replies have origin=human in the event
```

### Git

```
git add -A && git commit -m "feat: add customer reply handling with escalation"
```

---

## 5. Scheduled Jobs Infrastructure

Auto-status and weekly reports need a scheduler. Build it properly
once, use it for all future background tasks.

### Artifact

```
ARTIFACT scheduler:
  File: packages/core/jobs/scheduler.ts

  A simple job runner that can be triggered by:
  A. A cron endpoint (Route Handler called by external cron service)
  B. Supabase Edge Functions with pg_cron (if using hosted Supabase)
  C. A long-running process with node-cron (for local development)

  For Phase 4, implement option A (cron endpoint) + C (local dev):

  Job registry:

    JobDefinition = {
      id: string                  // 'auto-status', 'weekly-report', etc.
      schedule: string            // cron expression: '0 17 * * *' (daily at 17:00)
      handler: () => Promise<JobResult>
      enabled: boolean
    }

    jobs: JobDefinition[] = [
      {
        id: 'auto-status',
        schedule: '0 17 * * *',   // daily at 17:00
        handler: processAutoStatusBatch,
        enabled: true,
      },
      {
        id: 'weekly-report',
        schedule: '0 9 * * 5',    // Fridays at 09:00
        handler: processWeeklyReportBatch,
        enabled: true,
      },
    ]

ARTIFACT cron_endpoint:
  File: apps/web/app/api/cron/[jobId]/route.ts

  Route Handler (POST):
  1. Validate authorization header (shared secret from env: CRON_SECRET)
  2. Look up job by jobId in registry
  3. Execute handler
  4. Return job result as JSON
  5. Log execution (start time, duration, result)

  Usage:
    curl -X POST http://localhost:3000/api/cron/auto-status \
      -H "Authorization: Bearer ${CRON_SECRET}"

  In production: external cron service (Vercel Cron, Railway, etc.)
  calls this endpoint on schedule.

ARTIFACT local_scheduler:
  File: packages/core/jobs/local-runner.ts

  For local development only:
  Uses node-cron to run jobs on schedule in a separate process.

  `pnpm jobs` starts the local scheduler.
  Add to root package.json: "jobs": "tsx packages/core/jobs/local-runner.ts"

  Logs each execution to console.

ARTIFACT job_lock:
  Prevent concurrent execution of the same job:

  Before running: INSERT into a job_runs table (or use advisory locks):
    job_id, started_at, status='running'

  After completion: UPDATE status='completed', finished_at, result

  If a row with status='running' and started_at < 10 minutes ago exists:
  skip execution (another instance is running).

  Table: job_runs
    id:          uuid
    job_id:      text
    started_at:  timestamptz
    finished_at: timestamptz | null
    status:      'running' | 'completed' | 'failed'
    result:      jsonb | null

  Migration added to supabase/migrations/.
  RLS: not needed (jobs run with service_role — they are system processes).
```

### Invariants

```
INVARIANT job_idempotent:
  Every job MUST be safe to run multiple times.
  Duplicate runs produce zero side effects.

INVARIANT job_no_overlap:
  A job MUST NOT run concurrently with itself.
  The lock mechanism prevents this.

INVARIANT cron_authenticated:
  The cron endpoint MUST validate CRON_SECRET.
  Without it: return 401. This prevents external abuse.

INVARIANT jobs_service_role:
  Jobs run outside user context. They use service_role
  for database access. This is one of the few justified uses.
  Jobs MUST scope all operations to specific tenants —
  never operate on the entire database without tenant filtering.
```

### Verify

```
VERIFY scheduler:
  1. POST /api/cron/auto-status with correct CRON_SECRET → 200 + result
  2. POST /api/cron/auto-status without auth → 401
  3. POST /api/cron/nonexistent → 404
  4. Run auto-status job → batch processes all eligible projects
  5. Run auto-status job again immediately → skipped (lock or idempotency)
  6. `pnpm jobs` starts local scheduler, logs registered jobs
  7. job_runs table records execution history
```

### Git

```
git add -A && git commit -m "feat: add scheduled job infrastructure with cron endpoint"
```

---

## 6. BRF Weekly Report

S-08: aggregated PDF report across multiple sub-projects for a BRF.

### Artifact

```
ARTIFACT brf_report_generator:
  File: packages/core/communication/weekly-report.ts

  generateWeeklyReport(tenantId: string, parentProjectId: string) -> {
    sent: boolean
    pdfBuffer?: Buffer
    recipientEmail?: string
    eventId?: string
  }

  Flow:
  1. Load the parent project node (BRF contract)
  2. Load sub-projects: query nodes where parent_id = parentProjectId
     and state IN ('active', 'in_progress', 'completed')
  3. For each sub-project:
     - Fetch active events for the past week
     - Calculate economics (time cost, material cost)
     - Collect photos from the period
  4. Find the customer (BRF chairman) via customer_of edge
  5. Determine includeCostDetails from parent project config
  6. Generate narrative via generateReportNarrative()
  7. Generate PDF via generateReportPdf() (see section 7)
  8. Send PDF via email to customer
     (BRF reports always email — PDF is the deliverable)
  9. Log message event (origin=system, data.report_type='weekly')
  10. Return result

ARTIFACT weekly_report_batch:
  File: packages/core/communication/weekly-report-batch.ts

  processWeeklyReportBatch() -> BatchResult

  Flow:
  1. Find all parent projects that:
     - Have child projects (sub-projects exist)
     - Have auto_status.frequency = 'weekly'
     - auto_status.dayOfWeek matches today
     - No weekly report event exists for this week
  2. For each: call generateWeeklyReport()
  3. Return aggregate results

ARTIFACT sub_project_aggregation:
  File: packages/core/economics/aggregate.ts

  aggregateSubProjectEconomics(tenantId: string, parentProjectId: string) -> {
    subProjects: {
      id: string
      name: string
      state: string
      quotedTotal: number
      actualCost: number
      margin: number
      hoursThisWeek: number
      photosThisWeek: number
    }[]
    totals: {
      quotedTotal: number
      actualCost: number
      margin: number
      hoursThisWeek: number
    }
  }

  Queries:
  1. All nodes where parent_id = parentProjectId
  2. For each: calculateProjectEconomics() (from Phase 1)
  3. For weekly data: filter events by occurred_at in last 7 days
  4. Aggregate into totals
```

### Invariants

```
INVARIANT report_aggregates_from_events:
  Every number in the report MUST come from calculateProjectEconomics
  or direct event queries. No manual totals, no AI math.

INVARIANT report_matches_dashboard:
  If Kimmo views the same projects on the dashboard, the numbers
  MUST match the report. Single source of truth: events.

INVARIANT brf_report_via_email:
  BRF reports are ALWAYS sent via email with PDF attachment.
  SMS and WhatsApp are not suitable for multi-page PDF reports.
  The customer's preferred_channel is overridden for this purpose.
```

### Verify

```
VERIFY brf_report:
  1. Parent project "BRF Strandvägen" with 3 sub-projects
  2. Sub-projects have time + material events this week
  3. Generate weekly report → PDF generated
  4. PDF contains: all 3 sub-projects, photos, narrative
  5. Economics in PDF match dashboard values
  6. PDF emailed to BRF customer (via email twin)
  7. Message event logged with data.report_type='weekly'
  8. Run batch again same week → no duplicate report
```

### Git

```
git add -A && git commit -m "feat: add BRF weekly report generation"
```

---

## 7. Report PDF

### Artifact

```
ARTIFACT pdf_report:
  File: packages/pdf/report.tsx

  React component (@react-pdf/renderer) for the weekly/monthly report PDF.

  Props:
    tenant: NodeData_Org
    customer: NodeData_Customer
    parentProject: NodeData_Project
    subProjects: SubProjectReportData[]
    period: { start: Date, end: Date }
    narrative: string
    truncated: boolean
    truncationNotice?: string
    includeCostDetails: boolean
    photos: { url: string, caption: string, projectName: string }[]

  Layout:
    Page 1 — Cover:
      - Tenant logo + company name (header)
      - Report title: "Veckorapport — {parentProject.name}"
      - Period: "{start} — {end}"
      - Customer: BRF name + chairman name

    Page 2+ — Narrative:
      - AI-generated narrative text (multi-paragraph)
      - If truncated: truncation notice at end

    Sub-project sections (one per sub-project):
      - Sub-project name + state
      - If includeCostDetails:
        - Table: quoted, actual, margin
      - Photos from this period (2-3 per sub-project, inline)
      - Activity summary: "{X} hours worked, {Y} photos"

    Final page — Summary:
      - If includeCostDetails: totals table across all sub-projects
      - Photo collage (top 4-6 photos from the period)

    Footer (every page):
      - Tenant contact info
      - Page numbers
      - Generated date

ARTIFACT pdf_report_generator:
  File: packages/pdf/generate.ts

  Add to existing file:
    generateReportPdf(data: ReportPdfInput) -> Buffer
```

### Invariants

```
INVARIANT report_pdf_professional:
  The PDF MUST be professional enough that a BRF chairman
  can forward it directly to the board. Clean layout, consistent
  fonts, tenant branding, proper page breaks.

INVARIANT report_cost_conditional:
  Cost tables only appear when includeCostDetails = true.
  When false: the economics sections are entirely absent,
  not hidden behind "0 kr" values.

INVARIANT report_photos_real:
  Photos in the report MUST come from actual blob/photo events.
  No placeholder images, no stock photos.
```

### Verify

```
VERIFY report_pdf:
  1. Generate report PDF → valid PDF buffer (%PDF header)
  2. PDF has cover page with tenant branding and period
  3. Narrative section present
  4. Sub-project sections with photos
  5. includeCostDetails=false → no numbers anywhere in PDF
  6. includeCostDetails=true → economics tables present
  7. Truncation notice visible when context was truncated
  8. PDF renders correctly with 1 sub-project
  9. PDF renders correctly with 10 sub-projects (multiple pages)
```

### Git

```
git add -A && git commit -m "feat: add report PDF generation with BRF layout"
```

---

## 8. Communication UI

### Artifact

```
ARTIFACT project_communication_settings:
  File: apps/web/app/(app)/projects/[id]/settings/page.tsx

  Server Component + Client Form for editing project communication config:
  - Toggle: "Send automatic status updates"
  - Frequency: daily / weekly
  - Day of week (for weekly)
  - Time of day
  - Include photos (toggle, default on)
  - Include cost details (toggle, default off, with warning text)
  - Max photos per update

  Saves via updateNodeAction (Phase 1) updating the data.auto_status field.

ARTIFACT communication_history:
  File: apps/web/app/(app)/projects/[id]/communication/page.tsx

  Server Component:
  1. Fetches all message events where data.auto_status = true
     for this project, sorted by occurred_at DESC
  2. Shows each sent status update:
     - Date + time
     - Channel (SMS, email, WhatsApp)
     - Message text (summary)
     - Photos included
     - Customer's reply (if any — matched by time proximity)
  3. Button: "Send status now" (triggers manual auto-status generation)

ARTIFACT project_tabs_update:
  Add "Communication" tab to project detail page:
  Timeline | Messages | Photos | People | Economics | Communication

  Communication tab shows:
  - Settings (link to settings page)
  - History of sent status updates
  - Last sent: date + status

ARTIFACT dashboard_communication_status:
  On the dashboard project table (Phase 1), add a column:
  "Last update" — shows when the last auto-status was sent.
  If never: "—". If today: green dot. If > 3 days ago: amber dot.
```

### Verify

```
VERIFY communication_ui:
  1. Open project settings → auto-status form renders
  2. Enable auto-status, set daily → saves correctly
  3. Communication tab shows sent history
  4. "Send status now" → triggers auto-status, appears in history
  5. Dashboard shows last update indicator per project
  6. Cost details toggle shows warning text
```

### Git

```
git add -A && git commit -m "feat: add communication settings UI and history"
```

---

## 9. Final Verification

### Run all verifies

Re-run every VERIFY block from sections 1–8. Fix any failures.

### End-to-end scenario (S-03)

```
VERIFY s03_daily_status:
  Full flow against twins:
  1. Kimmo has project "Eriksson" in state in_progress
  2. Auto-status configured: daily at 17:00, photos=true, costs=false
  3. Customer "Erik Eriksson" linked, preferred_channel='sms'
  4. Aziz reported 8h and sent 2 photos today
  5. Trigger auto-status batch (via cron endpoint or manual)
  6. SMS twin receives message:
     - Text < 200 characters
     - Contains project progress ("Day 3 of 5" or similar)
     - NO cost details anywhere in the message
     - Photo link included
  7. Message event logged: origin=system, data.auto_status=true
  8. Simulate customer reply "Great, thanks!" via SMS twin
  9. Reply event logged: origin=human
  10. No automatic reply sent back (positive ack = no response)
  11. Run batch again → no duplicate message sent
```

### End-to-end scenario (S-08)

```
VERIFY s08_brf_weekly_report:
  Full flow against twins:
  1. Parent project "BRF Strandvägen — Underhåll" in state active
  2. Auto-status: weekly, dayOfWeek=5 (Friday)
  3. Three sub-projects:
     a. "Fasadreparation Hus A" — completed this week
     b. "Trapphusmålning Hus B" — in_progress, day 3 of 7
     c. "Balkongräcken Hus C" — active, not started
  4. Time events + photos on sub-projects a and b
  5. Customer "Johan" (BRF chairman), preferred_channel='email'
  6. Trigger weekly-report batch on a Friday
  7. Email twin receives:
     - PDF attachment (valid PDF)
     - PDF cover: tenant branding + "Veckorapport" + period
     - PDF narrative: covers all 3 sub-projects
     - PDF photos from sub-projects a and b
     - No cost details (includeCostDetails=false)
  8. Message event logged: origin=system, data.report_type='weekly'
  9. Economics in PDF (if cost details were enabled) would match
     calculateProjectEconomics for each sub-project
  10. Run batch again same Friday → no duplicate report
```

### Invariant checks

```
VERIFY invariants:
  1. grep -r "includeCostDetails.*true" in default/seed data → ZERO
     (never defaults to true)
  2. All auto-status message events have data.auto_status=true
  3. All report message events have data.report_type set
  4. No cost patterns (kr, SEK, \d+\s*kr) in SMS summaries
     when includeCostDetails=false
  5. Job lock prevents concurrent execution
  6. `pnpm tsc --noEmit` → exits 0
  7. `pnpm test` → all tests pass
```

### Git

```
git add -A && git commit -m "chore: phase 4 complete — communication and reporting verified"
git push
```

### Report

When done, report:
1. Total files created/modified
2. Deviations from this spec and why
3. Status of every VERIFY block
4. The auto-status message text for S-03 (actual AI output)
5. The BRF report: number of pages, narrative excerpt, photo count
6. Cost leak check: confirm zero cost data in customer-facing messages
   when includeCostDetails=false
