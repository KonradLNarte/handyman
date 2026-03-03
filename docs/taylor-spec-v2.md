# Resonansia Agents: AI-Driven Sales & Booking Platform

**Gen 1 Specification — From Conversation to Structured Vision**
**Client:** Pettson (Erik) — Taylor Events / Mountain Cabins / Football Matches
**Authors:** Konrad + Claude (from recorded conversation 2026-03-02)
**Target reader:** An AI that will build this on the Resonansia platform

---

## 0. How To Read This Spec

### 0.1 Prerequisites

**Before reading this spec, load these files in order:**

1. `docs/CONTEXT-INDEX.md` — navigation map for all project knowledge (READ FIRST)
2. `CLAUDE.md` — project-level rules (always loaded)
3. `.claude/skills/data-model/SKILL.md` — when working with schemas
4. `.claude/skills/ai-pipeline/SKILL.md` — when working with AI tiers/context
5. `.claude/skills/integrations/SKILL.md` — when working with external services
6. `.claude/skills/event-system/SKILL.md` — when working with events

This spec defines ONLY what is **new and unique** to the Taylor Events vertical. Platform architecture, axioms, patterns, and constraints are documented in the files above and are NOT repeated here.

### 0.2 Modals (RFC 2119)

| Modal | Meaning |
|-------|---------|
| **MUST** | Obligatory for MVP. Non-negotiable. |
| **SHOULD** | Strongly recommended. Deferrable only with written justification. |
| **MAY** | Optional enhancement. Valuable but not blocking. |

### 0.3 Provenance Tags

Every requirement is tagged with its origin to prevent certainty inflation:

| Tag | Meaning |
|-----|---------|
| `[domain-expert]` | Pettson or Erik stated this explicitly in the conversation |
| `[domain-inferred]` | Implied by domain context but not stated |
| `[architect-decision]` | Technical/architectural choice made by the spec author |
| `[market-research]` | Based on industry research, not the conversation |

### 0.4 Platform Constraints (inherited, non-negotiable)

> **-> CONTEXT-INDEX.md#2 (Axioms A1-A10)** for full list with rationale.

The 10 axioms apply without exception. Most relevant for this vertical:
- **A3:** AI proposes, human decides — content drafts and conversation configs are transient until approved
- **A4:** AI never does arithmetic — agent says "4 biljetter a 350 kr", system computes 1400 kr
- **A9:** Transparency — AI agent conversations are fully logged as events, auditable

### 0.5 CODEBASE_STATE (what already exists)

> **-> CONTEXT-INDEX.md#12** for full file structure.

**Available infrastructure to reuse:**

| What | Where | Notes |
|------|-------|-------|
| WhatsApp adapter | `packages/integrations/src/whatsapp/` | Send/receive, template support |
| SMS adapter (46elks) | `packages/integrations/src/sms/` | Send/receive |
| Email adapter (Resend) | `packages/integrations/src/email/` | Send, webhook for inbound |
| AI client (3 tiers) | `packages/core/src/ai/client.ts` | cheap/medium/expensive with `generateObject()` |
| AI context builder | `packages/core/src/ai/context.ts` | Hierarchical, token-budgeted |
| Message classification | `packages/core/src/ai/classify-message.ts` | Zod structured output |
| Translation + glossary | `packages/core/src/ai/translate.ts` | Multi-language with trade terms |
| Transient proposals | `packages/core/src/proposals/` | Store, approve pattern |
| Digital twin server | `packages/twins/src/server.ts` | Port 9999, 7 services mocked |
| Node/Edge/Event CRUD | `packages/core/src/` | Full CRUD with Zod validation |
| Label system | `packages/core/src/labels.ts` | Cached, domain+code lookup |
| PDF generation | `packages/pdf/src/` | @react-pdf/renderer |
| Active event resolution | `packages/db/src/queries/` | SQL window functions |

**Drizzle traps to avoid:**
> **-> CONTEXT-INDEX.md#7** — `db.execute()` returns array directly, use `sql.join` for arrays, edge columns are `source_id`/`target_id`.

---

## 1. Domain Insights Companion

> **This section preserves domain expertise from the conversation that must survive all future spec transformations. It is never compressed or abstracted. It travels unchanged through Gen 2, Gen 3, and Gen 4.**

### 1.1 Who Is Pettson?

Pettson (everyone calls him Pettson -- real name likely Erik or a nickname holder) is a serial entrepreneur based in Stockholm. Background in IT and travel/events spanning decades. He has run a mine in Zimbabwe, always maintained an event company and a travel agency. He describes himself as a "datatrollkarl" (data wizard) with deep experience in business intelligence.

> `[domain-expert]` "Jag har hallit pa med resor och event sen [unclear]... Men jag har alltid haft en event och en resebyra som har rullat."
> *Translation: "I've been doing travel and events since [unclear]... But I've always had an event company and a travel agency running."*

**Key character traits:**
- Impatient. Wants to start immediately. `[domain-expert]` "Jag vill bara komma igang." (I just want to get started.)
- Burned by over-engineering. Previous developer (Mariano, Costa Rica) built advanced automations that produced zero results.
- Not a coder. No one on his team codes. They use Lovable, Excel, paper. `[domain-expert]` "Det ar ingen av oss som ar kodare."
- Risk-tolerant and cash-available. (Bjorn post-call: "Pettson sitter ju pa cash.")
- Values simplicity for his office team above all. `[domain-expert]` "Det far inte vara for krangligt for dem."

### 1.2 The Business Portfolio

| # | Business | Description | Status | Source |
|---|----------|-------------|--------|--------|
| 1 | **N-Tech Platforms / Hudinavian** | B2B platform for real estate transactions -- used by agents, property companies, developers | Existing, operational | `[domain-expert]` |
| 2 | **Mountain Cabin Company** | Sells and rents fjallbostader (mountain cabins) -- Are, Salen, etc. | Operational or launching | `[domain-expert]` |
| 3 | **Taylor Events** | Travel and ticket booking -- sports events, corporate travel, flights, hotels, football World Cup tickets | Existing, dated HTML website | `[domain-expert]` |
| 4 | **Football Matches (Aug 1 & 8)** | ~100,000 tickets for two matches featuring "world's most famous teams" in Stockholm and Gothenburg | Pre-launch, **deadline April 1** | `[domain-expert]` |
| 5 | **Additional travel ventures** | "Ett par verksamheter till i reserummet... lite spetiga" (niche travel businesses) | Unspecified | `[domain-expert]` |

### 1.3 The Mariano Lesson (What Failed Before)

Pettson hired a developer in Costa Rica named Mariano who built "x antal outreach, agenter och sa vidare. Bland annat uppringningar och han har satt upp Venus [likely Vapi]."

> `[domain-expert]` "Det har inte hant ett skit egentligen, praktiskt sett."
> *Translation: "Nothing has happened really, practically speaking."*

> `[domain-expert]` "Jag har lart mig ungefar hur man inte ska gora. Han har byggt javligt mycket avancerade automationer."
> *Translation: "I've learned roughly how NOT to do it. He has built extremely advanced automations."*

**The lesson is cardinal:** Technical sophistication without practical results is worthless. Pettson will judge us on outcomes (tickets sold, bookings made, revenue generated), not on architectural elegance. Every feature must demonstrate tangible value.

### 1.4 The Office Constraint

Pettson's office is run by his ex-wife and Dova. They are not tech-savvy:

> `[domain-expert]` "De ar kvar pa fast alder. Kommer du ihag nar det fanns Max?"
> *Translation: "They're stuck in the stone age. Do you remember when there was Max?" (referring to an old computer era)*

> `[domain-expert]` "De anvander bavra papper och Excel Sheet fortfarande."
> *Translation: "They still use paper and Excel sheets."*

**This means:** Any admin interface must be simple enough for someone who is comfortable with Excel but nothing more. No developer tools, no complex configuration. If it requires more than 3 clicks to do a common task, it's too complicated.

### 1.5 Existing Platforms (Do Not Replace)

Pettson has already purchased and will continue using:

1. **A travel booking platform** -- used by ~100 large travel agencies, has API consolidation for bookings, "pretty good UX." Anton starts working with it immediately. `[domain-expert]`
2. **A Stenbeck/Kinnevik hotel platform** -- "helt fantastisk" (absolutely fantastic), has owner portals, packaging capabilities. `[domain-expert]`

> `[domain-expert]` "Jag har inga problem att anvanda de har plattformarna. Sen vill jag lagga det har lagret pa med. Med kund-ackvisition, med content, med var lite smartare an alla andra."
> *Translation: "I have no problems using these platforms. Then I want to add this layer on top. With customer acquisition, with content, with being a little smarter than everyone else."*

**This means:** We are NOT building a booking platform. We are building the **intelligence layer** that sits on top of existing booking platforms and makes the sales process smarter, faster, and cheaper. The booking transaction happens on their platforms. We drive the leads there.

### 1.6 Pettson's Mental Model of AI Agents

Pettson thinks of AI agents as **conversational sales representatives** that handle the entire journey from first contact to booking:

> `[domain-expert]` "Kommunikationssattet ar en AI-agent som pratar om bokningar. En stuga i fjallen, da kommer man till den har vagen och sager att jag vill boka en stuga. Vi ar fyra stycken. Var vill ni vara? Ar det Are? Ytterligare Salen?"
> *Translation: "The communication method is an AI agent that talks about bookings. A cabin in the mountains, you come this way and say I want to book a cabin. We're four people. Where do you want to be? Are? Or Salen?"*

And upselling:

> `[domain-expert]` "I forlangningen kanske om man vill boka allt fran liftkort till skidhyra, till restaurangen."
> *Translation: "In the long run, maybe booking everything from lift passes to ski rentals, to the restaurant."*

### 1.7 The Shared Platform Vision

Both Pettson/Erik and Konrad independently arrived at the same insight -- a common core serving multiple verticals:

> `[domain-expert]` (Erik, line 29): "Finns det en gemensam take pa det har, dar man kan bygga... som uppfyller behoven i hela verksamheten. Men med olika separata delar som ar unika for de olika verksamheterna."
> *Translation: "Is there a common take on this, where you can build... that meets the needs of the whole business. But with different separate parts unique to each business."*

> `[domain-expert]` (Konrad, line 243): "Som ett trad. Om vi har en massa olika projekt sa ska vi inte ha tio olika losningar... den forsta grenen kanske ar det har till april och i den grenen sa anvander man bara som A, B och C. Och den andra grenen... anvander man B, C, D och F."
> *Translation: "Like a tree. If we have many different projects we shouldn't have ten different solutions... the first branch might be this thing for April and in that branch you use A, B and C. And the other branch uses B, C, D and F."*

### 1.8 The April 1 Deadline

> `[domain-expert]` "Vi kommer behova vara uppe till forsta april ungefar med ett gang med en AI-agentstack."

> `[domain-expert]` "Det ar sjalva contentet som vi ser bra ut som vi behover hitta. Vi behover hitta det billigaste sattet att fa in ackvisition."
> *Translation: "It's the content that makes us look good that we need to find. We need to find the cheapest way to get customer acquisition."*

**April 1 is hard.** The football matches are August 1 and 8. The sales machine must be running 4 months before the events. This is the first branch of the tree.

### 1.9 Post-Call Intelligence (Konrad + Bjorn)

After Pettson hung up, Konrad and Bjorn discussed:

> `[domain-expert]` (Bjorn): "Fan, inget javla snack om vad du kan gora billigt alltsa. De dar ar ju -- Pettson sitter ju pa cash."
> *Translation: "Damn, no f***ing talk about what you can do cheaply. Those guys -- Pettson is sitting on cash."*

> `[domain-expert]` (Bjorn): "Kom ihag att det ar guldruschen och folk vet inte om det."
> *Translation: "Remember that it's the gold rush and people don't know about it."*

> `[domain-expert]` (Bjorn): "Om det ar forsta april som galler, forsok ta nasta mote sa fort som mojligt... sa vi prioriterar att skaka hand pa nagonting sa vi kan borja jobba."
> *Translation: "If April 1 is the deadline, try to take the next meeting as soon as possible... so we prioritize shaking hands on something so we can start working."*

**Pricing strategy:** Value-based, not cost-based. Do not undersell. Do not mention low salaries or cheapness. Pettson has money and wants results.

### 1.10 What Was NOT Asked (Knowledge Gaps)

These questions remain unanswered and should be explored in the next meeting:

| Gap | Why It Matters |
|-----|---------------|
| Budget range | Defines scope of MVP vs. full platform |
| Current customer lists/databases | Determines initial outreach volume |
| CRM in use (if any) | Integration requirements |
| Team size across businesses | Number of admin users |
| Current conversion rates | Baseline for success measurement |
| The football matches -- who are the teams? Who holds the rights? | Legal/compliance for ticket sales |
| Legal structure for ticket resale | EU Package Travel Directive may apply to bundled packages |
| Payment processing (Klarna? Stripe? Swish?) | Checkout integration |
| Anton's role and technical capability | Who is the daily contact? |
| Lisa? (Pettson mentioned an "ex-wife and Dova" -- who handles what?) | Admin user personas |
| What data exists in the Stenbeck/Kinnevik platform? | API integration scope |
| What exactly did Mariano build? What tools? | Avoid same mistakes |

---

## 2. Personas

### P-01: Pettson -- Business Owner & Strategist `[domain-expert]`
- **Role:** Owner of multiple businesses. Makes strategic decisions. Wants visibility into all verticals.
- **Tech comfort:** IT background, uses Lovable, understands data structures. Not a coder.
- **Primary interface:** Dashboard showing performance across all business units. WhatsApp for alerts.
- **Key need:** "Vara lite smartare an alla andra" -- competitive edge through AI.
- **Frustration:** Paying for technology that doesn't produce results.

### P-02: The Office Team (Ex-wife + Dova) -- Operators `[domain-expert]`
- **Role:** Day-to-day operations. Handle bookings, customer inquiries, logistics.
- **Tech comfort:** Paper and Excel. "De ar kvar pa fast alder."
- **Primary interface:** Simple web UI. Must feel like a spreadsheet, not a developer tool.
- **Key need:** See incoming leads, monitor conversations, manually intervene when needed.
- **Frustration:** Complicated software. They stopped using previous systems.

### P-03: Anton -- Operational Lead `[domain-inferred]`
- **Role:** Operationally involved. Starts working with new platforms immediately.
- **Tech comfort:** Higher than office team, lower than Pettson.
- **Primary interface:** Campaign management, agent configuration.
- **Key need:** Set up and monitor outreach campaigns.

### P-04: The Prospect -- Ticket/Travel Buyer `[domain-inferred]`
- **Role:** Potential customer. Wants to buy football tickets, book cabins, arrange corporate travel.
- **Tech comfort:** Varies. From tech-savvy millennials to families planning vacations.
- **Primary interface:** Receives outreach via email/WhatsApp. Interacts with AI agent. Gets booking link.
- **Key need:** Quick answers, good recommendations, easy booking process.

### P-05: The Corporate Buyer `[domain-inferred]`
- **Role:** Buys group packages (10+ tickets + hotel) for corporate events.
- **Tech comfort:** Professional, expects polished communication.
- **Primary interface:** Email for initial contact, possibly phone for closing.
- **Key need:** Custom packages, invoicing, group logistics.
- **Note:** This persona SHOULD involve human handoff for closing -- the deal size justifies personal attention.

---

## 3. System Vision

### 3.1 What We Are Building

An **AI-powered intelligence layer** that sits on top of Pettson's existing booking platforms and drives customer acquisition, sales conversations, and conversion through autonomous AI agents.

**The system IS:**
- An AI sales force that conducts outreach, holds conversations, and drives prospects to booking
- A content engine that generates marketing material across channels
- An analytics platform that shows what's working and what isn't
- A multi-tenant platform where each business unit has its own agents, campaigns, and data

**The system is NOT:**
- NOT a booking platform (existing platforms handle transactions)
- NOT a CRM replacement (though it may eventually subsume CRM functions)
- NOT a customer support tool (AI agents sell, not support)
- NOT a voice call center (Phase 3 at earliest)

### 3.2 The Tree Architecture `[domain-expert]` + `[architect-decision]`

```
                    Resonansia Platform (trunk)
                    +-----------------------+
                    |  7-table data model   |
                    |  Event sourcing       |
                    |  AI pipeline          |
                    |  Multi-tenant RLS     |
                    |  Federation           |
                    +----------+------------+
                               |
              +----------------+----------------+
              |                |                |
         Branch 1         Branch 2         Branch 3
    +-------------+  +-------------+  +-------------+
    |  Football   |  |  Mountain   |  |  Taylor     |
    |  Tickets    |  |  Cabins     |  |  Events     |
    |  (Apr 1)    |  |  (Phase 2)  |  |  (Phase 3)  |
    +-------------+  +-------------+  +-------------+
    Agent: Bansen     Agent: Stugan    Agent: Taylor
    Channel: Email    Channel: Web     Channel: Multi
    + WhatsApp        + WhatsApp       + Voice
    Products: Tix     Products: Cabins Products: Packages
    + Hotel pkgs      + Ski + Dining   + Corporate
```

Each branch is a **tenant** in the Resonansia model. Cross-selling between branches uses **federation edges** with consent-based data sharing.

### 3.3 Design Principles

| ID | Principle | Source |
|----|-----------|--------|
| DP-01 | **Results over architecture.** Every feature must demonstrate tangible business value. No "advanced automations" that produce nothing. | `[domain-expert]` (Mariano lesson) |
| DP-02 | **Layer, don't replace.** We add intelligence on top of existing platforms, not rebuild what works. | `[domain-expert]` |
| DP-03 | **Simple enough for Dova.** The office team must be able to use the admin UI without training. If they can't, it's a bug. | `[domain-expert]` |
| DP-04 | **Shared trunk, different branches.** Common infrastructure, vertical-specific configuration. Build once, deploy many. | `[domain-expert]` + `[architect-decision]` |
| DP-05 | **AI agents are team members, not features.** Each agent has a name, personality, and goals. They represent the brand. | `[domain-inferred]` |
| DP-06 | **The cheapest acquisition wins.** Optimize for cost-per-lead and cost-per-conversion, not vanity metrics. | `[domain-expert]` |
| DP-07 | **Smartare an alla andra.** The competitive edge is intelligence: better personalization, faster response, smarter follow-up. | `[domain-expert]` |

---

## 4. Core Capabilities

### CAP-01: AI Agent Configuration `[architect-decision]`

The system MUST allow non-technical users to configure AI agents through a simple admin interface.

An agent has:
- **Name and personality** -- tone (formal/friendly/casual/enthusiastic), language, bio
- **Knowledge base** -- product catalog (static or API-connected), FAQ, brand guidelines
- **Goals** -- primary objective (sell tickets, book travel, generate leads), conversion action
- **Constraints** -- max conversation length, escalation triggers, operating hours, blocked topics
- **Channels** -- which channels this agent operates on (email, WhatsApp, web chat, SMS)

Configuration MUST feel like filling out a form, not writing code. The agent's personality is described in natural language ("Du ar en entusiastisk biljettforsaljare som alskar fotboll och alltid foreslar VIP-uppgraderingar").

**SCHEMA: NodeData_Agent** `[architect-decision]`

```typescript
const nodeDataAgentSchema = z.object({
  name: z.string(),                          // "Biljett-Bansen"
  personality: z.string(),                    // Natural language personality description
  tone: z.enum(['formal', 'friendly', 'casual', 'enthusiastic']),
  language: z.string().default('sv'),         // Primary language
  bio: z.string().optional(),                 // Short public-facing description
  goals: z.array(z.string()),                 // ["sell football tickets", "upsell VIP packages"]
  conversion_action: z.string(),              // "send_booking_link"
  knowledge_base: z.object({
    catalog_mode: z.enum(['static', 'api']),
    catalog_id: z.string().optional(),        // Node ID of product catalog node
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    brand_guidelines: z.string().optional(),
  }),
  constraints: z.object({
    max_turns: z.number().default(20),
    confidence_threshold: z.number().default(0.4),
    blocked_topics: z.array(z.string()).default([]),
    operating_hours: z.object({
      start: z.string().default('08:00'),     // HH:MM
      end: z.string().default('22:00'),
    }).optional(),
  }),
  channels: z.array(z.enum(['email', 'whatsapp', 'sms', 'web_chat'])),
});
```

### CAP-02: Outreach Campaigns `[domain-expert]`

The system MUST support automated outreach campaigns that reach prospects via email and WhatsApp.

**SCHEMA: NodeData_Campaign** `[architect-decision]`

```typescript
const nodeDataCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  agent_id: z.string(),                      // Node ID of the agent handling replies
  schedule: z.object({
    start_date: z.string(),                   // ISO date
    end_date: z.string().optional(),
    send_time: z.string().default('09:00'),   // HH:MM, local time
    timezone: z.string().default('Europe/Stockholm'),
  }),
  channels: z.array(z.enum(['email', 'whatsapp', 'sms'])),
  templates: z.array(z.object({
    step: z.number(),                         // 1 = initial, 2+ = follow-ups
    channel: z.enum(['email', 'whatsapp', 'sms']),
    subject: z.string().optional(),           // Email only
    body: z.string(),                         // Supports {{name}}, {{company}} placeholders
    delay_hours: z.number().default(0),       // Hours after previous step
    variant: z.string().optional(),           // A/B variant identifier
  })),
  rate_limits: z.object({
    email_per_hour: z.number().default(50),
    email_per_day: z.number().default(200),
    whatsapp_per_hour: z.number().default(30),
    whatsapp_per_day: z.number().default(250),
    sms_per_hour: z.number().default(20),
    sms_per_day: z.number().default(100),
  }),
  consent_basis: z.enum(['legitimate_interest', 'explicit_consent', 'existing_customer']),
});
```

Campaign workflow:
1. Admin creates campaign, imports leads, selects templates
2. System sends personalized outreach at scheduled rate
3. Prospect replies -> AI agent takes over the conversation
4. Prospect doesn't reply -> follow-up sequence triggers
5. Conversation leads to booking link or human handoff
6. Analytics show sent, opened, replied, converted

### CAP-03: AI Sales Conversations `[domain-expert]`

The system MUST conduct multi-turn sales conversations through AI agents that guide prospects from initial interest to booking.

**SCHEMA: NodeData_Conversation** `[architect-decision]`

```typescript
const nodeDataConversationSchema = z.object({
  agent_id: z.string(),                      // Node ID of handling agent
  customer_id: z.string(),                   // Node ID of the lead/prospect
  campaign_id: z.string().optional(),        // Originating campaign (attribution)
  channel: z.enum(['email', 'whatsapp', 'sms', 'web_chat']),
  state: z.enum([
    'initial_contact',
    'qualifying',
    'presenting_options',
    'negotiating',
    'closing',
    'post_sale',
    'escalated',
    'abandoned',
    'completed',
  ]),
  turn_count: z.number().default(0),
  escalation_reason: z.string().optional(),
  handoff_summary: z.string().optional(),    // AI-generated 3-sentence recap
  products_discussed: z.array(z.string()),   // Node IDs of products
  last_activity: z.string(),                 // ISO datetime
  context_summary: z.string().optional(),    // Rolling summary for long conversations
});
```

**Conversation state machine:**

```
initial_contact -> qualifying -> presenting_options -> negotiating -> closing -> post_sale
                                                                                    |
Any state -> escalated (human takes over)                                      completed
Any state -> abandoned (72h no response)
```

**The AI agent MUST:**
- Understand what the prospect wants (qualify needs)
- Present relevant products/packages from the catalog
- Answer questions about pricing, availability, logistics
- Guide toward a booking action (send booking link)
- Escalate to a human when encountering blocked topics, complaints, or low confidence

**The AI agent MUST NOT:**
- Calculate totals, taxes, or discounts (system computes) `[architect-decision]`
- Make promises about specific availability without checking `[domain-inferred]`
- Share internal pricing, margins, or business strategy `[architect-decision]`
- Continue beyond the configured message limit without escalation `[architect-decision]`

### CAP-04: Multi-Channel Communication `[domain-expert]`

| Channel | MVP | Phase 2 | Notes |
|---------|-----|---------|-------|
| Email | MUST | -- | Outbound campaigns + reply handling |
| WhatsApp | MUST | -- | Real-time conversations, template-based outreach |
| Web Chat | -- | SHOULD | Embedded widget on business websites |
| SMS | MAY | -- | Fallback channel only |
| Voice (phone) | -- | -- | Phase 3+, requires voice AI platform |
| Social DMs | -- | -- | Phase 3+, Instagram/Facebook Messenger |

**WhatsApp constraint:** First-contact outreach requires pre-approved template messages (Meta 24-hour rule). Freeform messaging only after the prospect responds. `[market-research]`

**Email constraint:** New sending domains need 2+ weeks warmup for deliverability. Domain setup MUST begin immediately. `[market-research]`

### CAP-05: Product Catalog Integration `[domain-expert]` + `[architect-decision]`

Two modes:
1. **Static catalog** -- Products defined manually (MVP for football tickets)
2. **API catalog** -- Products fetched from external platforms via CatalogAdapter (Phase 2)

**INTERFACE: CatalogAdapter** `[architect-decision]`

```typescript
interface CatalogAdapter {
  getProducts(filters: ProductFilters): Promise<Product[]>;
  checkAvailability(productId: string, date: string, qty: number): Promise<AvailabilityResult>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;         // "ticket", "cabin", "package"
  price: number;            // Unit price in SEK (system computes totals, never AI)
  currency: string;
  availability: 'available' | 'limited' | 'sold_out' | 'unknown';
  metadata: Record<string, unknown>;  // Venue, dates, amenities, etc.
}

interface AvailabilityResult {
  available: boolean;
  remaining: number | null;
  alternatives: Product[];  // If unavailable, suggest similar
}
```

**The booking transaction happens on the external platform.** The agent's job is to guide the prospect and send a booking link -- not to process payments. `[architect-decision]`

### CAP-06: Human Handoff `[domain-inferred]`

Escalation triggers:
- Prospect explicitly asks for a human
- Blocked topics (refund, complaint, legal)
- AI confidence below threshold (0.4)
- Conversation exceeds max turns (20)
- Booking API failure
- Corporate/bulk inquiry (deal size justifies personal attention)

When escalation occurs:
1. AI generates a **handoff summary** -- 3-sentence recap + key points + products discussed
2. Human receives notification (in-app + email, optionally WhatsApp)
3. Human takes over the conversation in the admin UI
4. Human MAY hand back to AI when the issue is resolved

**SCHEMA: EventData_AgentEscalation** `[architect-decision]`

```typescript
const eventDataAgentEscalationSchema = z.object({
  reason: z.enum([
    'human_requested',
    'blocked_topic',
    'low_confidence',
    'max_turns_exceeded',
    'booking_failure',
    'bulk_inquiry',
  ]),
  confidence_score: z.number().optional(),
  summary: z.string(),                       // 3-sentence handoff
  products_discussed: z.array(z.string()),   // Product node IDs
  customer_sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
});
```

### CAP-07: Content Generation `[domain-expert]`

The system MUST generate marketing content to support acquisition campaigns.

Content types: marketing emails, social media posts, SMS messages, WhatsApp templates.

Content generation follows the AI transient proposal pattern: AI generates draft -> human reviews -> approves -> used in campaigns. `[architect-decision]`

Content MUST respect brand voice configured per agent/business unit. `[architect-decision]`

### CAP-08: Analytics Dashboard `[domain-expert]`

The dashboard MUST show:

- **Funnel view:** leads -> contacted -> replied -> qualified -> booked -> revenue
- **Campaign performance:** sent, delivered, opened, replied, converted per campaign
- **Agent performance:** conversations, escalation rate, conversion rate, avg turns to close
- **A/B test results:** which variants are winning
- **Revenue attribution:** which campaigns/agents drove which bookings
- **Cost tracking:** AI API costs per conversation, cost per acquisition

All metrics MUST be derived from events (single source of truth). `[architect-decision]`

The dashboard MUST be understandable by Pettson without explanation. If it needs a legend, simplify it. `[domain-expert]` (DP-03)

**UI: Dashboard Component Tree** `[architect-decision]`

```
DashboardPage (RSC)
  +-- KpiRow
  |     +-- KpiCard (Total leads)
  |     +-- KpiCard (Active conversations)
  |     +-- KpiCard (Bookings this period)
  |     +-- KpiCard (Revenue attributed)
  +-- FunnelChart (leads -> contacted -> replied -> qualified -> booked)
  +-- CampaignTable (DataTable: sortable by sent/opened/replied/converted)
  |     +-- each row: CampaignRow
  |           +-- StatusBadge (draft/active/completed/paused)
  |           +-- SparklineChart (daily sends)
  +-- AgentPerformanceCards
  |     +-- AgentCard (per agent: conversations, escalation %, conversion %)
  +-- RecentConversations (Timeline: latest 10 conversations with status)
```

### CAP-09: Lead Management `[domain-inferred]`

A lead is a **node** (type: `customer` with state `lead`). `[architect-decision]`

**SCHEMA: NodeData_Customer (extended for leads)** `[architect-decision]`

```typescript
// Extends existing NodeData_Customer from construction domain
const nodeDataCustomerLeadExtension = z.object({
  // ... existing fields (name, address, contact, etc.)
  source: z.enum(['csv_import', 'organic', 'referral', 'campaign']).optional(),
  score: z.number().optional(),              // 0-100, hybrid AI + deterministic
  tags: z.array(z.string()).default([]),      // ["football", "corporate", "vip"]
  consent_basis: z.enum(['legitimate_interest', 'explicit_consent', 'existing_customer']).optional(),
  unsubscribed: z.boolean().default(false),
  unsubscribed_at: z.string().optional(),
});
```

Lead import: CSV upload (name, email, phone columns), manual entry. Future: API import from CRM, enrichment via Clay/Apollo.

Lead scoring MUST be hybrid: engagement metrics (opens, clicks, replies) computed deterministically; fit and intent assessed by AI. Final score computed by system, not AI. `[architect-decision]`

### CAP-10: Multi-Tenant / Multi-Business `[domain-expert]`

| Entity | Tenant Strategy |
|--------|----------------|
| Football Matches (Aug events) | Tenant: `taylor-football` |
| Mountain Cabins | Tenant: `mountain-cabins` |
| Taylor Events (general) | Tenant: `taylor-events` |
| Pettson Holding (overview) | Tenant: `pettson-holding` + federation edges to all |

Pettson sees aggregate performance across all tenants via federation. Each business unit's data is isolated by RLS. Cross-selling uses federation edges with explicit consent. `[architect-decision]`

---

## 5. Data Model Mapping

> **Zero new database tables.** All extensions are new label codes and new Node.data schemas.
> **-> CONTEXT-INDEX.md#6 ("How do I add a new business domain?")** for the pattern.

### 5.1 New Label Codes

**Node types:**

| Code | Name | Schema |
|------|------|--------|
| `agent` | AI Agent | `NodeData_Agent` (see CAP-01) |
| `conversation` | Conversation | `NodeData_Conversation` (see CAP-03) |
| `campaign` | Campaign | `NodeData_Campaign` (see CAP-02) |
| `content` | Content | `NodeData_Content` |
| `sequence` | Sequence | `NodeData_Sequence` |
| `booking` | Booking | `NodeData_Booking` |

Existing types reused: `org`, `customer` (leads), `product` (tickets/cabins), `person`, `location`.

**Edge types:**

| Code | From -> To | Purpose |
|------|-----------|---------|
| `targets` | Campaign -> Customer | Lead targeted by campaign |
| `handled_by` | Conversation -> Agent | Agent running conversation |
| `belongs_to` | Conversation -> Customer | Lead in conversation |
| `serves` | Agent -> Org | Agent represents business unit |
| `includes_product` | Booking -> Product | Booking contains product |
| `originated_from` | Booking -> Campaign | Revenue attribution |
| `uses_sequence` | Campaign -> Sequence | Follow-up sequence |
| `subsidiary_of` | Org -> Org | Business unit hierarchy |

**Event types:**

| Code | Node | Purpose |
|------|------|---------|
| `conversation_message` | Conversation | Each message (inbound/outbound) |
| `outreach_sent` | Campaign | Outreach sent to lead |
| `outreach_opened` | Campaign | Email opened (tracking pixel) |
| `outreach_responded` | Campaign | Lead replied |
| `lead_scored` | Customer | AI + system scored a lead |
| `booking_initiated` | Booking | Booking process started |
| `booking_confirmed` | Booking | External platform callback |
| `agent_escalation` | Conversation | AI escalated to human |
| `content_published` | Content | Content published to channel |
| `inventory_change` | Product | Stock/availability change |
| `external_sync` | Booking/Product | Sync with external platform |

**Node states (additional):**

| Code | Applies To |
|------|-----------|
| `lead` | Customer |
| `qualified` | Customer |
| `converted` | Customer |
| `nurturing` | Customer |
| `pending_payment` | Booking |
| `confirmed` | Booking |
| `published` | Content |

### 5.2 Additional Schemas

**SCHEMA: NodeData_Booking** `[architect-decision]`

```typescript
const nodeDataBookingSchema = z.object({
  external_id: z.string().optional(),        // ID on external booking platform
  external_platform: z.string().optional(),  // "travel_platform" | "kinnevik_hotels"
  booking_url: z.string().optional(),        // Link to external booking
  total_amount: z.number().optional(),       // System-computed, never AI
  currency: z.string().default('SEK'),
  guest_count: z.number().optional(),
  check_in: z.string().optional(),           // ISO date
  check_out: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    qty: z.number(),
    unit_price: z.number(),
    // total is ALWAYS computed by system: qty * unit_price
  })),
});
```

**SCHEMA: NodeData_Content** `[architect-decision]`

```typescript
const nodeDataContentSchema = z.object({
  content_type: z.enum(['email', 'social_post', 'sms', 'whatsapp_template']),
  title: z.string(),
  body: z.string(),
  channel_metadata: z.record(z.unknown()).optional(), // Platform-specific (subject line, hashtags)
  brand_voice: z.string().optional(),        // Reference to agent personality
  variant: z.string().optional(),            // A/B variant ID
  approved: z.boolean().default(false),
  approved_by: z.string().optional(),        // Person node ID
});
```

**SCHEMA: EventData_ConversationMessage** `[architect-decision]`

```typescript
const eventDataConversationMessageSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['email', 'whatsapp', 'sms', 'web_chat']),
  text: z.string(),
  sender_type: z.enum(['prospect', 'agent', 'human_operator']),
  ai_model: z.string().optional(),           // Which model generated the response
  ai_confidence: z.number().optional(),      // 0-1 confidence in response quality
  tokens_used: z.number().optional(),        // For cost tracking
  external_id: z.string().optional(),        // WhatsApp/email message ID
});
```

**SCHEMA: EventData_OutreachSent** `[architect-decision]`

```typescript
const eventDataOutreachSentSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'sms']),
  template_step: z.number(),                 // Which step in the sequence
  variant: z.string().optional(),            // A/B variant
  subject: z.string().optional(),            // Email subject
  external_id: z.string().optional(),        // Resend/WhatsApp message ID
  personalization: z.record(z.string()),     // Resolved {{placeholders}}
});
```

---

## 6. AI Architecture

### 6.1 Model Tier Usage

> **-> ai-pipeline/SKILL.md** for full tier config and platform patterns.

**Taylor-specific tier assignments:**

| Task | Tier | Model | Latency | Notes |
|------|------|-------|---------|-------|
| Classify inbound message | Cheap | gpt-4o-mini | < 2s | Intent + sentiment |
| Score a lead | Cheap | gpt-4o-mini | < 3s | Fit + intent assessment |
| **Conduct sales conversation** | **Medium** | **claude-haiku-4-5** | **< 5s** | Core differentiator |
| Generate marketing content | Expensive | claude-sonnet-4-5 | < 15s | Brand-critical |
| Summarize conversation (compression) | Cheap | gpt-4o-mini | < 3s | Rolling context |
| Personalize outreach message | Cheap | gpt-4o-mini | < 2s | Template fill |

### 6.2 Context Protocol for Conversations

Adapted from platform's 5-level protocol:

| Level | Content | Tokens | When |
|-------|---------|--------|------|
| 0 -- Platform | Product types, channels, system constraints | ~100 | Always |
| 1 -- Agent | Personality, brand guidelines, goals, constraints | ~800 | Always |
| 2 -- Conversation | Summary of older turns, lead profile, campaign source | ~600 | If > 10 turns |
| 3 -- Products | Relevant products with pricing and availability | ~1200 | When presenting/closing |
| 4 -- Recent Messages | Last 6-10 messages verbatim | ~2400 | Always |

**Total budget: ~5100 tokens.** Fits all tiers with response reserve.

When conversations exceed 10 turns, older messages are compressed into a rolling summary (Level 2) using the cheap tier.

---

## 7. User Journeys

### UJ-01: Football Ticket Outreach (MVP, April 1) `[domain-expert]`

**Preconditions:** Agent "Biljett-Bansen" configured. Campaign with 5,000 imported leads. Follow-up sequence: 3 steps over 9 days.

```
1. System sends personalized email:
   "Hej {{namn}}, VM:s mest kanda lag spelar i Stockholm den 1 augusti
    -- och vi har exklusiva biljettpaket. Vill du veta mer?"
2. 48h later, no reply -> Follow-up #1: Different angle, mention hotel packages
3. Prospect replies: "Vad kostar det med hotell?"
4. Agent "Biljett-Bansen" takes over: presents ticket + hotel packages
5. Prospect: "Vi ar 6 personer, har ni grupppris?"
6. Agent: "Absolut! Har ar vara alternativ for 6 personer: ..."
   (system computes group pricing from catalog)
7. Prospect: "Later bra, hur bokar jag?"
8. Agent sends booking link to external ticket platform
9. Booking confirmed -> event logged -> state: converted
10. Post-sale: "Tack for din bokning! Har ar info om pre-match-eventet..."
```

**VERIFY (test vector):**
- Import 5 leads via CSV -> 5 customer nodes with state=lead
- Start campaign -> 5 outreach_sent events (respecting rate limits)
- Simulate 2 email opens -> 2 outreach_opened events
- Simulate 1 reply -> 1 conversation node created, 1 outreach_responded event
- AI agent responds -> 1 conversation_message event (direction=outbound)
- Simulate booking confirmation -> 1 booking_confirmed event, customer state=converted
- Verify: all events queryable, funnel metrics correct

### UJ-02: Corporate Group Inquiry -> Human Handoff `[domain-inferred]`

```
1. Corporate buyer replies: "Vi ar intresserade av 50 biljetter + VIP-paket
   for var foretagsevent. Behover faktura."
2. Agent classifies: high-value, bulk order -> triggers escalation
3. Agent responds: "Fantastiskt! For gruppbestallningar av den har storleken
   kopplar jag er direkt till vart eventteam."
4. System creates handoff: agent_escalation event with reason=bulk_inquiry
5. Pettson/Anton receives notification with context
6. Human takes over conversation, closes deal personally
```

**VERIFY:**
- Simulate corporate inquiry message -> agent_escalation event created
- Escalation reason = bulk_inquiry
- Handoff summary contains: "50 VIP biljetter", "behover faktura", "foretagskund"
- Notification sent to configured operators

### UJ-03: Mountain Cabin Booking via WhatsApp (Phase 2) `[domain-expert]`

```
1. Prospect WhatsApp: "Hej, jag vill boka stuga i Are vecka 8. Vi ar 4 personer."
2. Agent "Stugan": "Hej! Are vecka 8, 4 personer -- jag kollar vad som finns..."
3. Agent queries CatalogAdapter: checkAvailability("are", "2027-02-13", 4)
4. Agent presents 3 options with photos
5. Prospect: "Vad ingar i luxury?"
6. Agent describes amenities + upsell: "Vi kan ocksa ordna liftkort och skidhyra!"
7. Prospect: "Ja tack, luxury + 4 liftkort"
8. Agent sends booking link -> completed on external platform
9. Confirmation -> post-sale: "Vill du boka middag pa Fjallgarden ocksa?"
```

### UJ-04: Pettson Views Cross-Business Performance `[domain-inferred]`

```
1. Pettson opens dashboard on pettson-holding tenant
2. Sees aggregate: all 3 business units via federation
3. Drills into Football: "500 emails sent, 23% reply rate, 12 bookings"
4. Compares with Cabins: "50 WhatsApp convos, 40% conversion, avg 4 turns"
5. Sees cross-sell: "8 football buyers also searched for cabin rentals"
6. Creates cross-sell campaign: football buyers -> cabin offer (federation)
```

---

## 8. Integration Architecture

### 8.1 Required Integrations (MVP)

> **-> integrations/SKILL.md** for adapter interface patterns and twin architecture.

| # | Integration | Purpose | Reuses existing? |
|---|-------------|---------|-----------------|
| INT-01 | **Resend** (email) | Outbound campaigns + inbound reply webhooks | YES -- EmailAdapter |
| INT-02 | **WhatsApp Business API** | Send/receive, template management | YES -- MessagingAdapter |
| INT-03 | **46elks** (SMS) | Fallback channel | YES -- MessagingAdapter |

### 8.2 Phase 2 Integrations

| # | Integration | Purpose |
|---|-------------|---------|
| INT-04 | **Pettson's travel platform API** | CatalogAdapter for real-time product/availability |
| INT-05 | **Stenbeck/Kinnevik hotel API** | Hotel availability and packaging |
| INT-06 | **Supabase Realtime** | Web chat widget via WebSocket |
| INT-07 | **Payment gateway** (Stripe/Klarna/Swish) | Booking confirmation webhooks |

### 8.3 Phase 3+ Integrations

| # | Integration | Purpose |
|---|-------------|---------|
| INT-08 | Instagram Graph API | Social DM conversations |
| INT-09 | Facebook Messenger | Social DM conversations |
| INT-10 | Voice AI (Vapi/Synthflow) | Phone-based sales |
| INT-11 | Clay/Apollo | Lead enrichment |
| INT-12 | HubSpot/Pipedrive | CRM sync |

### 8.4 New Digital Twins Required

Extend existing twin server (port 9999) with:

| Twin | Behavior |
|------|----------|
| Email inbound | Simulates Resend inbound webhook (prospect replies to outreach) |
| Catalog API | Returns static product data, simulates availability changes |
| Booking callback | Simulates external platform booking confirmation webhook |

---

## 9. Business Rules

### BR-01: Rate Limiting `[market-research]`

| Channel | Per Hour | Per Day | Notes |
|---------|---------|---------|-------|
| Email | 50 | 200 | Warm up new domains over 2 weeks |
| WhatsApp | 30 | 250 | Meta tier-dependent; template-only first contact |
| SMS | 20 | 100 | 46elks pricing makes scale expensive |

### BR-02: GDPR Compliance `[market-research]`

- Every outreach MUST include unsubscribe mechanism
- Opt-outs MUST be honored within 24 hours
- Every contact MUST have recorded consent basis
- Right-to-erasure uses platform's crypto-shred capability
- All data processing documented per GDPR Article 30

### BR-03: Conversation Limits `[architect-decision]`

- Max 20 messages before suggesting escalation
- Max 72h inactivity before marking abandoned
- Escalation MUST happen for: refunds, complaints, legal, bulk orders, booking failures
- AI confidence below 0.4 MUST trigger escalation

### BR-04: Content Approval `[architect-decision]`

- Campaign templates MUST be human-approved before sending
- AI-generated content is always draft until approved
- Social media posts SHOULD be approved before publishing
- Conversational responses do NOT require per-message approval

### BR-05: Pricing Display `[architect-decision]`

- All prices MUST come from product catalog (static or API)
- System computes all totals, taxes, discounts -- never AI
- AI MUST NOT negotiate below configured price floor
- Group discounts SHOULD trigger human handoff unless pre-configured

### BR-06: Package Travel Directive `[market-research]`

- If selling ticket + hotel + transport bundles: Directive 2015/2302 MAY apply
- Requires: clear pricing breakdown, cancellation rights, organizer liability
- Legal review SHOULD be conducted before selling bundled packages

---

## 10. Phasing

### Phase 1: Football Ticket MVP (Target: April 1, 2026) -- MUST

**Scope:** Single tenant (taylor-football). Email + WhatsApp. AI agent. Static catalog. Basic analytics.

**Delivers:**
- Agent configuration UI
- CSV lead import
- Email outreach campaigns with personalization
- Email reply handling -> AI conversation
- WhatsApp conversation support
- Follow-up sequences (3 steps)
- A/B testing for email templates
- Human escalation with handoff summary
- Analytics dashboard (funnel, campaign performance)
- GDPR compliance (unsubscribe, consent tracking)

**Success criteria:**
- [ ] 1,000+ emails sent with < 5% bounce rate
- [ ] AI agent handles 50+ conversations with < 10% escalation
- [ ] At least 5 bookings attributed to AI outreach
- [ ] Admin UI usable by non-technical operator (Dova test)
- [ ] Full conversation audit trail in events

**UI: Admin Component Tree** `[architect-decision]`

```
AdminLayout (RSC)
  +-- Sidebar
  |     +-- NavItem (Dashboard)
  |     +-- NavItem (Campaigns)
  |     +-- NavItem (Conversations)
  |     +-- NavItem (Leads)
  |     +-- NavItem (Agents)
  |     +-- NavItem (Products)
  +-- Content area
       +-- varies by route (see component trees per page)

AgentConfigPage (RSC -> Client Component for form)
  +-- AgentForm
  |     +-- TextInput (Name)
  |     +-- TextArea (Personality description)
  |     +-- Select (Tone)
  |     +-- MultiSelect (Channels)
  |     +-- ProductCatalogPicker (select catalog node)
  |     +-- ConstraintSection
  |     |     +-- NumberInput (Max turns)
  |     |     +-- NumberInput (Confidence threshold)
  |     |     +-- TagInput (Blocked topics)
  |     +-- SubmitButton ("Save Agent")

CampaignPage (RSC)
  +-- CampaignHeader (name, status, date range)
  +-- KpiRow
  |     +-- KpiCard (Sent) +-- KpiCard (Opened) +-- KpiCard (Replied) +-- KpiCard (Converted)
  +-- TemplateEditor (step-by-step sequence with A/B variants)
  +-- LeadList (DataTable: name, email, status, score)
  +-- SendButton (with rate limit warning if applicable)

ConversationView (RSC -> Client Component for real-time)
  +-- ConversationHeader (customer name, agent name, state badge)
  +-- MessageThread (WhatsApp-style bubbles)
  |     +-- each: MessageBubble (inbound=left, outbound=right)
  |     +-- AiConfidenceBadge (on agent messages)
  +-- EscalationBanner (if state=escalated, show handoff summary)
  +-- ReplyInput (for human operator, hidden if AI is handling)
  +-- TakeOverButton / HandBackButton
```

### Phase 2: Multi-Vertical + Live Catalog (Target: May 2026) -- SHOULD

**Delivers:**
- CatalogAdapter for real-time product/availability
- Web chat widget (Supabase Realtime)
- Mountain cabin agent with destination-aware recommendations
- Cross-tenant federation (Pettson sees all businesses)
- Lead scoring (hybrid AI + deterministic)
- Content generation engine
- Enhanced analytics (cross-business, attribution)

### Phase 3: Full Platform (Target: July 2026) -- MAY

**Delivers:**
- Instagram/Facebook Messenger integration
- Voice AI exploration (Vapi/Synthflow)
- Package builder (ticket + hotel + experience bundles)
- CRM integration (HubSpot/Pipedrive)
- Lead enrichment (Clay/Apollo)
- SEO content generation
- Dynamic pricing recommendations

---

## 11. Metrics & Success Criteria

### 11.1 North Star Metric `[architect-decision]`

**Revenue generated through AI agent conversations per month.**

### 11.2 Phase 1 KPIs

| Metric | Target | Measurement (from events) |
|--------|--------|---------------------------|
| Email delivery rate | > 95% | outreach_sent - bounces |
| Email reply rate | > 15% | outreach_responded / outreach_sent |
| Conversation -> booking | > 5% | booking_confirmed / conversations |
| AI resolution rate | > 85% | conversations completed without escalation |
| Avg turns to conversion | < 8 | conversation_message count per completed |
| Cost per conversation | < 2 SEK | tokens_used * price_per_token |
| Cost per acquisition | < 50 SEK | total costs / booking_confirmed |
| Pettson satisfaction | Qualitative | "Is this better than Mariano?" |
| Dova usability | Qualitative | "Can she use it without help?" |

### 11.3 Anti-Metrics (do NOT optimize for)

- Number of messages sent (vanity -- quality over quantity)
- Conversation length (shorter is better if it converts)
- AI sophistication (Mariano lesson -- results only)

---

## 12. Scope Exclusions

1. **NOT a booking/payment platform.** Bookings happen on existing platforms.
2. **NOT an accounting system.** No invoicing, no bookkeeping, no VAT.
3. **NOT customer support.** AI agents sell. Post-booking support is out of scope.
4. **NOT social media management.** We generate content; publishing is separate.
5. **NOT a voice call center.** Phone = Phase 3 at earliest.
6. **NOT a website builder.** Landing pages MAY be generated; hosting is separate.

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Agent** | AI-powered conversational sales representative configured per business unit |
| **Campaign** | Automated outreach initiative targeting leads via email/WhatsApp |
| **Conversation** | Multi-turn interaction between agent and prospect |
| **Escalation** | Transfer from AI to human operator |
| **Handoff** | Structured transfer of conversation context AI -> human |
| **Lead** | Prospect not yet engaged or qualified |
| **Sequence** | Multi-step follow-up plan triggered by time/conditions |
| **Static Catalog** | Product data entered manually (vs. API-fetched) |
| **CatalogAdapter** | Interface for querying external product/availability systems |

---

## 14. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| April 1 deadline missed | Medium | High | Start email warmup immediately. Parallel agent config + outreach. |
| Email deliverability issues | Medium | High | Warm up 5-10 domains over 2 weeks. |
| WhatsApp template rejection | Medium | Medium | Submit early. Email fallback. |
| Mariano effect (over-engineering) | Low | Critical | Weekly demo showing tangible progress. |
| Office team can't use UI | Medium | High | Dova test every sprint. |
| External platform API unavailable | Low | Medium | Static catalog fallback. |
| GDPR complaint | Low | High | Consent tracking from day 1. |
| AI hallucination (false availability) | Medium | High | Agent MUST query catalog. Never hallucinate. |
| Football matches cancelled | Low | Critical | Business risk, not tech. Platform still valuable. |

---

## 15. Build Instructions

### 15.1 Phase Spec Requirements

When writing buildable phase specs from this document:

**MUST include GATE blocks** after every build section:
```
GATE: pnpm tsc --noEmit && pnpm build
```
Lesson: Phase 3 deferred type-checking caused 78 fix cycles.

**MUST include numerical test vectors** (see VERIFY blocks in UJ-01 and UJ-02).

**MUST use component trees** for UI sections (see Section 10 admin component trees), not prose descriptions. Lesson: Phase 3 prose UI specs scored 5/10 buildability.

**MUST document CODEBASE_STATE** at the top (see Section 0.5). Lesson: undocumented patterns caused cascading bugs.

### 15.2 Preserve Absolutely

1. **Section 1 (Domain Insights Companion)** -- carry forward unchanged
2. **Provenance tags** -- maintain `[domain-expert]` vs `[architect-decision]` distinction
3. **DP-01 "Results over architecture"** -- loudest axiom in every phase
4. **DP-03 "Simple enough for Dova"** -- inform every UI decision
5. **The tree metaphor** -- this is how Pettson thinks about the system

### 15.3 Resolve These Gaps Before Building

1. Follow-up interview with Pettson to fill Section 1.10 gaps
2. Determine football teams and legal structure for ticket sales
3. Get API docs for Pettson's travel platform
4. Define WhatsApp template messages for Meta approval
5. Decide email infrastructure: Instantly/Smartlead vs custom on Resend

---

*This specification was generated from a 331-line voice recording, cross-referenced with the Resonansia platform architecture. Four parallel research agents contributed. The most important insight: Pettson has been burned by technically impressive but practically useless automations. Every feature must produce results -- tickets sold, bookings made, revenue generated. Results over architecture.*
