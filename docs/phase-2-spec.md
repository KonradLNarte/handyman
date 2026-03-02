# Resonansia — Phase 2: Messaging & Field Worker Interaction

> Implementation spec for inbound/outbound messaging via WhatsApp and SMS,
> AI message classification, time reporting via chat, photo handling,
> message corrections, work order generation, and multi-language support.
>
> After this phase: a subcontractor can report time by sending "8" on
> WhatsApp, send photos that auto-associate to the right project, correct
> mistakes by saying "nej, 6", and receive work orders in their own language.
> All without ever logging in.
>
> **Validates scenarios:** S-02, S-09
>
> **Depends on:** Phase 1 (auth, tenants, nodes, edges, events, economics, UI)

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
  All messaging code (WhatsApp, SMS) MUST be tested against the
  digital twin server on port 9999.
  Start twins: `pnpm twins` in a separate terminal.
  Verify twins are running: `curl http://localhost:9999/twin/inspect/whatsapp`

INVARIANT messaging_creates_events:
  Every inbound and outbound message MUST be logged as an event
  of type 'message'. Inbound: origin=human. Outbound: origin=system.
  The system has no "dark" messages — everything is traceable.
```

---

## 1. Sender Identification

The first thing that happens when a message arrives: who sent it?

### Artifact

```
ARTIFACT sender_resolver:
  File: packages/core/messaging/sender.ts

  Functions:

    resolveSender(phoneNumber: string) -> {
      person: Node | null
      tenant: Tenant | null
      language: string           // default 'sv' if not found
      activeProject: Node | null // the project this person is currently working on
    }

    Logic:
    1. Normalize phone number (strip spaces, ensure +46 prefix for Swedish numbers)
    2. Search nodes of type 'person' where data->>'phone' matches
       (or data->'contact'->>'phone' — depends on NodeData_Person schema)
    3. If found: load the person's tenant
    4. Determine language from NodeData_Person.language (default 'sv')
    5. Find active project:
       - Look for assigned_to edges from this person to project nodes
       - Filter to projects with state = 'in_progress' or 'active'
       - If exactly one: that's the active project
       - If multiple: pick the most recently updated one
         (or ask the user to clarify — see section 3)
    6. Return all resolved context

    If phone number not found: return nulls.
    The webhook handler decides what to do (ignore, or start onboarding).

ARTIFACT phone_normalizer:
  File: packages/shared/utils/phone.ts

  normalizePhoneNumber(raw: string) -> string
    - Strip all whitespace, dashes, parentheses
    - If starts with 0 (Swedish local): replace with +46
    - If starts with 46 (without +): prepend +
    - Ensure E.164 format: +{country}{number}
    - Validate length (Swedish mobile: +46 followed by 9 digits)
    - Return normalized string or throw if invalid
```

### Invariants

```
INVARIANT sender_lookup_efficient:
  Phone number lookup MUST be indexed.
  Consider a GIN index on nodes.data->>'phone' or a separate
  lookup table / materialized column if JSON querying is too slow.

INVARIANT sender_cross_tenant:
  A person may exist in multiple tenants (e.g., subcontractor in
  tenant A, owner of tenant B). resolveSender returns the person
  node + tenant where they are a WORKER (have assigned_to edges).
  If ambiguous: the system MUST ask the user to clarify.
```

### Verify

```
VERIFY sender:
  1. normalizePhoneNumber('073-123 45 67') → '+46731234567'
  2. normalizePhoneNumber('+46731234567') → '+46731234567' (no change)
  3. normalizePhoneNumber('0731234567') → '+46731234567'
  4. resolveSender for known person → returns person, tenant, language, active project
  5. resolveSender for unknown number → returns nulls
  6. Person assigned to one active project → that project returned
  7. Person assigned to zero active projects → activeProject = null
```

### Git

```
git add -A && git commit -m "feat: add sender identification and phone normalization"
```

---

## 2. AI Message Classification

### Artifact

```
ARTIFACT message_classifier:
  File: packages/core/ai/classify-message.ts

  Types:

    MessageIntent =
      | { type: 'time_report', hours: number }
      | { type: 'correction', hours: number, originalText?: string }
      | { type: 'photo', caption?: string }
      | { type: 'status_question', question: string }
      | { type: 'confirmation' }
      | { type: 'completion', status: string }
      | { type: 'other', text: string }

  Function:

    classifyMessage(input: {
      text: string
      hasMedia: boolean
      senderLanguage: string
      activeProjectName?: string
      recentMessages?: { role: 'user' | 'assistant', text: string }[]
    }) -> MessageIntent

    Uses aiComplete(tier='cheap') with a structured Zod schema.

    Prompt strategy:
    - System prompt explains all intent types with examples per language
    - Include 2-3 recent messages for conversational context
    - Examples:
      "8" → time_report(8)
      "nej 6" / "لا ٦" → correction(6)
      "klart" / "تم" / "gotowe" → completion
      "OK" / "👍" → confirmation
      Photo with no text → photo
      "hur långt har vi kommit?" → status_question
    - The AI returns ONLY the classification + extracted parameters
    - The AI does NOT execute any action

ARTIFACT classification_schema:
  File: packages/shared/schemas/ai-output.ts

  messageIntentSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('time_report'), hours: z.number().positive().max(24) }),
    z.object({ type: z.literal('correction'), hours: z.number().positive().max(24),
               originalText: z.string().optional() }),
    z.object({ type: z.literal('photo'), caption: z.string().optional() }),
    z.object({ type: z.literal('status_question'), question: z.string() }),
    z.object({ type: z.literal('confirmation') }),
    z.object({ type: z.literal('completion'), status: z.string() }),
    z.object({ type: z.literal('other'), text: z.string() }),
  ])
```

### Invariants

```
INVARIANT classification_cheap:
  Message classification MUST use the cheap AI tier (GPT-4o-mini).
  It runs on every inbound message — cost must be minimal.
  Latency target: < 2 seconds.

INVARIANT classification_structured:
  Classification MUST use Zod schema with generateObject().
  No freeform text parsing. Typed, validated output.

INVARIANT classification_multilingual:
  The classifier MUST handle Swedish, Arabic, Polish, and English.
  "8" means 8 hours regardless of language.
  "nej, 6" (Swedish), "لا ٦" (Arabic), "nie, 6" (Polish) all mean correction(6).

INVARIANT classification_no_action:
  The classifier returns an intent. It does NOT create events,
  send responses, or trigger side effects. The message handler
  (section 4) does that.
```

### Verify

```
VERIFY classification:
  1. "8" → { type: 'time_report', hours: 8 }
  2. "nej 6" → { type: 'correction', hours: 6 }
  3. "klart" → { type: 'completion', status: 'completed' }
  4. "OK" → { type: 'confirmation' }
  5. "hur långt har vi kommit?" → { type: 'status_question', ... }
  6. Photo message → { type: 'photo' }
  7. Random gibberish → { type: 'other', ... }
  8. "٨" (Arabic numeral for 8) → { type: 'time_report', hours: 8 }
```

### Git

```
git add -A && git commit -m "feat: add AI message classification with multilingual support"
```

---

## 3. AI Translation

### Artifact

```
ARTIFACT translator:
  File: packages/core/ai/translate.ts

  Functions:

    translateMessage(input: {
      text: string
      sourceLocale: string
      targetLocale: string
      context?: string        // e.g. "construction/painting work order"
      glossaryTerms?: { source: string, target: string }[]
    }) -> string

    Uses aiComplete(tier='cheap') for short messages.
    The prompt includes:
    - Industry context (painting, construction, etc.)
    - Glossary terms if provided (e.g., "spackling" → "معجون" in Arabic)
    - Instruction: "Translate naturally. Use trade terminology, not generic words."

ARTIFACT glossary:
  File: packages/core/ai/glossary.ts

  Platform glossary for construction/painting industry:

  getGlossaryTerms(sourceLocale: string, targetLocale: string) -> GlossaryTerm[]

  Pre-defined terms stored in dict table (scope = 'glossary.{industry}'):
    Swedish → Arabic: spackling, grundning, slipning, täckmålning, NCS, etc.
    Swedish → Polish: same core terms
    Swedish → English: same core terms

  Tenants can add their own terms (tenant-specific dict entries).
  Tenant terms override platform terms.

  For Phase 2: pre-populate with ~30 painting industry terms per language pair.
  Store as seed data in dict table (or in platform-defaults if easier).
```

### Invariants

```
INVARIANT translation_uses_glossary:
  Every translation call SHOULD include industry glossary terms.
  Generic translation without trade terminology is unacceptable
  for professional work orders.

INVARIANT translation_cheap:
  Translation MUST use cheap tier for messages (short text).
  Longer documents (work orders) MAY use medium tier.
```

### Verify

```
VERIFY translation:
  1. Translate "Slipa och grunda väggar" sv→ar → Arabic text with trade terms
  2. Translate "8 timmar registrerade" sv→ar → Arabic confirmation
  3. Translate with glossary term "spackling" → uses glossary translation, not generic
  4. Translate sv→pl → Polish output
  5. Translate short text → uses cheap tier (verify via logs)
```

### Git

```
git add -A && git commit -m "feat: add AI translation with industry glossary"
```

---

## 4. Message Handler (Inbound Processing Pipeline)

This is the central orchestrator. A message arrives, gets classified,
and the appropriate action is executed.

### Artifact

```
ARTIFACT message_handler:
  File: packages/core/messaging/handler.ts

  handleIncomingMessage(input: {
    phoneNumber: string
    text: string
    hasMedia: boolean
    mediaUrl?: string
    channel: 'whatsapp' | 'sms'
    externalId: string           // WhatsApp/SMS message ID
  }) -> { response: string, events: Event[] }

  Flow:
  1. Resolve sender (section 1)
     - If unknown: respond with generic message and return
       ("This number is not registered. Contact your employer.")
       Log as event anyway (for audit).

  2. Log inbound message event:
     type_id = 'message'
     origin = 'human'
     actor_id = sender person ID
     node_id = active project (or tenant org if no active project)
     data = { text, channel, direction: 'inbound', external_id }

  3. Classify message (section 2)

  4. Execute based on intent:

     time_report(hours):
       a. Resolve unit_price:
          - Check EdgeData_AssignedTo or EdgeData_SubcontractorOf for project-specific rate
          - Fall back to NodeData_Person.hourly_rate
          - Fall back to 0 (and warn admin)
       b. Create time event:
          type_id = 'time', qty = hours, unit_id = 'hour',
          unit_price = resolved rate, total = computeTotal(qty, unitPrice),
          origin = 'human', actor_id = sender, node_id = active project
       c. Calculate progress context:
          - Total hours this person on this project
          - Estimated duration from project data (if available)
       d. Respond in sender's language:
          "✓ {hours}h registered on {projectName}. Day {X} of {Y}."
       e. Notify project owner (via in-app notification or message)

     correction(hours):
       a. Find the MOST RECENT time event by this person on this project
       b. Create adjustment event:
          type_id = 'adjustment', ref_id = ROOT of that event,
          qty = hours, origin = 'human', actor_id = sender
          data = { reason: 'User corrected via {channel}' }
       c. Respond: "✓ Changed to {hours}h."
       d. Notify project owner

     photo:
       a. Download media from channel (via adapter)
       b. Upload to storage (via storage adapter → twin)
       c. Create blob entry (node_id = active project)
       d. Create photo event:
          type_id = 'photo', origin = 'human', actor_id = sender,
          node_id = active project
          data = { url, caption, thumbnail_url }
       e. Respond: "✓ Photo saved to {projectName}."

     confirmation:
       a. No action needed. Log only (the inbound message event from step 2).
       b. No response sent.

     completion:
       a. Respond: "You want to mark {projectName} as complete?"
       b. If user confirms (next message classified as 'confirmation'):
          Create state_change event:
          from_state = current, to_state = 'completed',
          trigger = 'human', origin = 'human'
       c. Generate summary: total hours, total photos, total cost
       d. Send summary to project owner

     status_question:
       a. Build project context (economics, recent events)
       b. Use AI (cheap tier) to generate a natural answer
       c. Respond in sender's language

     other:
       a. Respond: "I didn't understand that. Send a number for hours,
          a photo, or 'done' when finished."
       b. Translate response to sender's language

  5. Log outbound response as message event:
     type_id = 'message', origin = 'system', direction = 'outbound'

  6. Send response via channel adapter

  7. Return response text + all created events

ARTIFACT active_project_disambiguation:
  If a person is assigned to MULTIPLE active projects, the handler
  MUST NOT guess. Instead:
  1. Respond: "You're on multiple projects. Which one?
     1. {project1Name}
     2. {project2Name}"
  2. Store disambiguation state (in-memory cache keyed by phone number)
  3. Next message: if it's a number (1 or 2), resolve to that project
  4. Continue with original intent
```

### Invariants

```
INVARIANT every_message_logged:
  BOTH inbound AND outbound messages MUST be logged as events.
  Inbound: origin=human, direction=inbound
  Outbound: origin=system, direction=outbound
  No exceptions. This is the audit trail.

INVARIANT correction_uses_root_pointer:
  When correcting a time event, the adjustment's ref_id MUST point
  to the ROOT event. If the most recent event is itself an adjustment,
  follow its ref_id to the root.

INVARIANT unit_price_from_data:
  Time event unit_price MUST come from edge/person data.
  It MUST NOT be hardcoded or AI-generated.
  Priority: project-specific rate → person default rate → 0 + warning.

INVARIANT response_in_sender_language:
  All system responses MUST be in the sender's preferred language
  (NodeData_Person.language). Swedish is default for unknown senders.

INVARIANT no_active_project_graceful:
  If the sender has no active project, time reports MUST be rejected
  with a clear message: "You're not assigned to any active project."
  NOT silently dropped.
```

### Verify

```
VERIFY message_handler:
  1. Known sender sends "8" → time event created, confirmation in sender's language
  2. Same sender sends "nej, 6" → adjustment event (ref_id = root), confirmation
  3. Sender sends photo → blob created, photo event created
  4. Sender sends "klart" → system asks for confirmation
  5. Sender confirms → state_change event created
  6. Unknown number sends message → rejection message, no events
  7. Sender on 2 projects sends "8" → disambiguation prompt
  8. Sender responds "1" → time event on first project
  9. All responses in sender's language (test with Arabic sender)
  10. Both inbound and outbound messages logged as events
```

### Git

```
git add -A && git commit -m "feat: add message handler with classification, time reporting, and corrections"
```

---

## 5. Webhook Endpoints

### Artifact

```
ARTIFACT whatsapp_webhook:
  File: apps/web/app/api/webhooks/whatsapp/route.ts

  Route Handler (POST + GET):

  GET: WhatsApp webhook verification (hub.challenge response)
  POST: Incoming message processing

  Flow:
  1. Validate webhook signature (or skip validation against twin)
  2. Parse WhatsApp payload:
     - Extract: sender phone, message text, media URLs, message ID
     - Handle different message types: text, image, template reply
  3. Call handleIncomingMessage()
  4. Send response via WhatsApp adapter
  5. Return 200 (WhatsApp requires fast response)

  CRITICAL: This handler runs OUTSIDE normal auth context.
  It does NOT use Supabase user sessions.
  It uses the service client for database access (this is one of
  the few allowed uses of service_role).
  Tenant context is determined by the sender's phone number lookup.

ARTIFACT sms_webhook:
  File: apps/web/app/api/webhooks/sms/route.ts

  Route Handler (POST):

  Flow:
  1. Parse 46elks SMS payload (or twin format)
  2. Extract: sender phone, message text
  3. Call handleIncomingMessage()
  4. Send response via SMS adapter
  5. Return 200

ARTIFACT webhook_auth:
  Webhooks MUST validate the source:
  - WhatsApp: verify X-Hub-Signature-256 header (in production)
  - SMS: verify source IP or auth token (provider-specific)
  - Against twins: skip validation (twin doesn't sign)

  Environment variable WEBHOOK_VALIDATION_ENABLED=false for dev/test.
```

### Invariants

```
INVARIANT webhook_fast_response:
  Webhook handlers MUST return 200 within 5 seconds.
  If processing takes longer: acknowledge immediately,
  process asynchronously (queue or background job).

INVARIANT webhook_idempotent:
  WhatsApp may deliver the same webhook multiple times.
  Handler MUST check external_id (WhatsApp message ID) for duplicates.
  If duplicate: return 200 without processing.

INVARIANT webhook_service_role_justified:
  Webhook Route Handlers are the ONE place where service_role is
  acceptable — incoming messages have no user session.
  BUT: the handler MUST immediately scope all operations to the
  tenant resolved from the sender's phone number.
```

### Verify

```
VERIFY webhooks:
  (Against twins — start twin server first)

  1. POST to /api/webhooks/whatsapp with twin-format payload
     containing text "8" from known sender
     → 200 response, time event created
  2. POST same message again (duplicate external_id)
     → 200 response, no new event
  3. POST photo message → blob + photo event created
  4. POST from unknown number → 200, rejection message sent
  5. Simulate incoming via twin:
     POST /twin/simulate-incoming with sender + text
     → twin sends webhook to our endpoint → event created
  6. SMS webhook: POST with text "7" → time event created
```

### Git

```
git add -A && git commit -m "feat: add WhatsApp and SMS webhook endpoints"
```

---

## 6. Outbound Messaging

### Artifact

```
ARTIFACT message_sender:
  File: packages/core/messaging/send.ts

  Functions:

    sendMessage(input: {
      tenantId: string
      recipientPhone: string
      text: string
      channel: 'whatsapp' | 'sms'
      projectId?: string
      mediaUrls?: string[]
      actorId?: string           // who triggered this (system user)
    }) -> { success: boolean, externalId: string, eventId: string }

    Flow:
    1. Call the appropriate adapter (whatsapp or sms)
    2. Create outbound message event:
       type_id = 'message', origin = 'system',
       data = { text, channel, direction: 'outbound', external_id }
       node_id = projectId (or tenant org)
    3. Return result

    On failure: log error, return { success: false }.
    Do NOT throw — caller decides retry strategy.

ARTIFACT work_order_generator:
  File: packages/core/messaging/work-order.ts

  generateAndSendWorkOrder(input: {
    tenantId: string
    projectId: string
    personId: string             // the assigned worker
    channel: 'whatsapp' | 'sms'
  }) -> { success: boolean, eventId: string }

  Flow:
  1. Load project node (name, description, address)
  2. Load person node (language, phone)
  3. Load project photos (blobs of type 'photo')
  4. Build work order content:
     - Project name
     - Address + map link (Google Maps URL from address)
     - Scope of work (from project description)
     - Checklist (from project data or AI-generated based on scope)
     - 1-2 inspection photos
  5. Translate to worker's language via translateMessage()
     with industry glossary
  6. Send via channel:
     - WhatsApp: text + photos as media
     - SMS: text only (with link to photos if needed)
  7. Log as message event (origin=system)

ARTIFACT assignment_trigger:
  File: packages/core/messaging/triggers.ts

  When a person is assigned to a project (assigned_to edge created):
    1. If project state = 'active' or 'in_progress':
       Automatically generate and send work order
    2. If project state = 'draft':
       Queue work order for when project becomes active

  This can be called from the assignPersonToProjectAction
  (created in Phase 1), adding the work order step.
```

### Invariants

```
INVARIANT work_order_translated:
  Work orders MUST be in the worker's preferred language.
  If language is Arabic: text MUST be in Arabic with trade terms.
  Generic English is NOT acceptable for non-English speakers.

INVARIANT work_order_complete:
  A work order MUST contain: project name, address, scope.
  Map link and photos are SHOULD (included if available).
  If required data is missing: send what's available,
  flag to the project owner that the work order is incomplete.

INVARIANT outbound_always_logged:
  Every outbound message creates an event. No exceptions.
```

### Verify

```
VERIFY outbound:
  (Against twins)
  1. sendMessage via WhatsApp → twin receives message, event logged
  2. sendMessage via SMS → twin receives message, event logged
  3. generateAndSendWorkOrder for Arabic speaker
     → twin receives Arabic work order with address and scope
  4. Work order includes map link (Google Maps URL)
  5. Assign person to active project → work order automatically sent
  6. Assign person to draft project → no work order sent yet
```

### Git

```
git add -A && git commit -m "feat: add outbound messaging with work order generation"
```

---

## 7. Notification System

### Artifact

```
ARTIFACT notifications:
  File: packages/core/notifications/notify.ts

  Functions:

    notifyProjectOwner(tenantId, projectId, notification: {
      type: 'time_reported' | 'photo_added' | 'status_change' | 'correction'
      actorName: string
      summary: string         // "Aziz: 8h on Eriksson"
      eventId: string
    }) -> void

    Flow:
    1. Find the project owner (person with 'owner' role via edges)
    2. For Phase 2: store in a notifications table (or use Supabase Realtime)
    3. Notification displayed in the web app (dashboard or project detail)
    4. Future: configurable push/email/SMS notification (Phase 4)

ARTIFACT notifications_table:
  A simple table for in-app notifications:

    notifications:
      id:          uuid (UUIDv7)
      tenant_id:   uuid
      user_id:     uuid        // recipient
      project_id:  uuid | null
      type:        text
      summary:     text
      event_id:    uuid | null // the event that triggered this
      read:        boolean (default false)
      created_at:  timestamptz

  RLS: tenant_id + user_id filter.
  Migration added to supabase/migrations/.

ARTIFACT notification_ui:
  File: apps/web/app/(app)/components/notification-bell.tsx

  Client Component:
  - Shows notification count badge on a bell icon in the top bar
  - Dropdown shows recent notifications
  - Click → navigate to relevant project/event
  - Mark as read on click
  - Polls every 30 seconds (or Supabase Realtime subscription)
```

### Verify

```
VERIFY notifications:
  1. Time event created via WhatsApp → notification appears for project owner
  2. Notification shows "Aziz: 8h on Eriksson"
  3. Click notification → navigates to project detail
  4. Mark as read → badge count decreases
  5. Notifications from tenant A not visible to tenant B
```

### Git

```
git add -A && git commit -m "feat: add in-app notification system"
```

---

## 8. Messaging UI in Web App

### Artifact

```
ARTIFACT message_thread_view:
  File: apps/web/app/(app)/projects/[id]/messages/page.tsx

  Server Component:
  1. Fetches message events for this project (type='message')
     sorted by occurred_at ascending
  2. Groups by conversation (phone number / channel)
  3. Renders WhatsApp-style thread:
     - Inbound messages (origin=human): left-aligned, gray background
     - Outbound messages (origin=system): right-aligned, blue background
     - Photos inline
     - Timestamps
  4. Shows who sent each message (person name + phone)

ARTIFACT project_detail_tabs:
  Update apps/web/app/(app)/projects/[id]/page.tsx to include tabs:
  - Timeline (existing from Phase 1)
  - Messages (new — links to message thread view)
  - Photos (new — grid of project photos from blob + photo events)
  - People (existing — assigned persons)
  - Economics (existing from Phase 1)

ARTIFACT photo_gallery:
  File: apps/web/app/(app)/projects/[id]/photos/page.tsx

  Server Component:
  1. Fetches blob entries for project (type='photo')
  2. Renders responsive grid of thumbnails
  3. Click → lightbox with full image
  4. Shows caption, date, who sent it
```

### Verify

```
VERIFY messaging_ui:
  1. Send message via twin → appears in message thread
  2. Inbound and outbound visually distinct
  3. Photos appear inline in thread and in photo gallery
  4. Project detail has all tabs: Timeline, Messages, Photos, People, Economics
```

### Git

```
git add -A && git commit -m "feat: add messaging UI with threads, photos, and project tabs"
```

---

## 9. Final Verification

### Run all verifies

Re-run every VERIFY block from sections 1–8. Fix any failures.

### End-to-end scenario (S-02 simplified)

```
VERIFY s02_time_reporting:
  Full flow against twins:
  1. Kimmo exists as tenant owner with one active project "Eriksson"
  2. Aziz exists as person with language='ar', phone='+46701234567'
  3. assigned_to edge: Aziz → Eriksson project
  4. Assign triggers work order → twin receives Arabic WhatsApp message
     containing project name, address, scope
  5. Simulate incoming WhatsApp from Aziz: "8"
     → Time event created: qty=8, unit_price from person/edge data
     → Aziz receives Arabic confirmation via twin
     → Kimmo gets notification: "Aziz: 8h on Eriksson"
  6. Simulate incoming from Aziz: "nej 6" (but in Arabic context the
     classifier should handle "لا ٦" — test both)
     → Adjustment event: qty=6, ref_id = root of step 5 event
     → Aziz receives confirmation
  7. Simulate photo from Aziz
     → Blob created, photo event created
     → Photo visible in project gallery
  8. Dashboard shows: Eriksson project, actual cost using corrected 6h
  9. Message thread shows full conversation (inbound + outbound)
```

### End-to-end scenario (S-09 simplified)

```
VERIFY s09_multilingual:
  1. Aziz (Arabic) and Piotr (Polish) assigned to same project
  2. Both receive work orders → Aziz in Arabic, Piotr in Polish
  3. Aziz sends "8", Piotr sends "7"
  4. Both get confirmations in own language
  5. Project economics: (8 × Aziz_rate) + (7 × Piotr_rate)
     with correct per-worker rates
  6. Dashboard shows both workers' contributions
```

### Invariant checks

```
VERIFY invariants:
  1. Every inbound message has a corresponding event (origin=human)
  2. Every outbound message has a corresponding event (origin=system)
  3. Adjustment events use root pointer (ref_id → root, not chain)
  4. Unit prices come from edge/person data (grep for hardcoded rates → zero)
  5. All AI classification uses cheap tier (check logs or mock)
  6. `pnpm tsc --noEmit` → exits 0
  7. `pnpm test` → all tests pass
```

### Git

```
git add -A && git commit -m "chore: phase 2 complete — messaging and field interaction verified"
git push
```

### Report

When done, report:
1. Total files created/modified
2. Deviations from this spec and why
3. Status of every VERIFY block
4. The message flow for one complete interaction:
   work order sent → time reported → corrected → photo → dashboard updated
5. Languages tested (sv, ar, pl minimum)
