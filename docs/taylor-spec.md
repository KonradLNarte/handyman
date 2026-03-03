# Resonansia Agents: AI-Driven Sales & Booking Platform

**Gen 1 Specification — From Conversation to Structured Vision**
**Client:** Pettson (Erik) — Taylor Events / Mountain Cabins / Football Matches
**Authors:** Konrad + Claude (from recorded conversation 2026-03-02)
**Target reader:** An AI that will refine this into a buildable Gen 2 technical specification

---

## 0. How To Read This Spec

### 0.1 Purpose

This is a **Gen 1 specification** — the first structured transformation of a raw customer conversation into a product vision. It is written for another AI to refine into a Gen 2 technical specification (with AXIOM/INTERFACE/SCHEMA/INVARIANT/BEHAVIOR blocks) and eventually into buildable phase specs.

This document defines **what** and **why**. The next generation defines **how**.

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

### 0.4 Constraints From Parent Platform

This system is built on the **Resonansia platform** — an event-sourced, graph-based, multi-tenant ERP. The following constraints are inherited and non-negotiable:

1. **7 tables only** — tenants, labels, nodes, edges, events, blobs, dicts (+ federation_edges)
2. **Events are append-only** — corrections via root pointer, never update/delete
3. **AI proposes, human decides** — AI suggestions are transient until approved
4. **AI never does arithmetic** — AI returns structured data, system computes totals
5. **RLS on every table** — federation via `has_federation_access()`, never bypass
6. **Event resolution in SQL** — window functions (ROW_NUMBER), never in JavaScript
7. **Bitemporality** — `id` = transaction time (UUIDv7), `occurred_at` = valid time
8. **Label-based extensibility** — new entity types are data operations, not code changes

See `docs/resonansia-spec.md` for the full platform specification.

---

## 1. Domain Insights Companion

> **This section preserves domain expertise from the conversation that must survive all future spec transformations. It is never compressed or abstracted. It travels unchanged through Gen 2, Gen 3, and Gen 4.**

### 1.1 Who Is Pettson?

Pettson (everyone calls him Pettson — real name likely Erik or a nickname holder) is a serial entrepreneur based in Stockholm. Background in IT and travel/events spanning decades. He has run a mine in Zimbabwe, always maintained an event company and a travel agency. He describes himself as a "datatrollkarl" (data wizard) with deep experience in business intelligence.

> `[domain-expert]` "Jag har hållit på med resor och event sen [unclear]... Men jag har alltid haft en event och en resebyrå som har rullat."
> *Translation: "I've been doing travel and events since [unclear]... But I've always had an event company and a travel agency running."*

**Key character traits:**
- Impatient. Wants to start immediately. `[domain-expert]` "Jag vill bara komma igång." (I just want to get started.)
- Burned by over-engineering. Previous developer (Mariano, Costa Rica) built advanced automations that produced zero results.
- Not a coder. No one on his team codes. They use Lovable, Excel, paper. `[domain-expert]` "Det är ingen av oss som är kodare."
- Risk-tolerant and cash-available. (Björn post-call: "Pettson sitter ju på cash.")
- Values simplicity for his office team above all. `[domain-expert]` "Det får inte vara för krångligt för dem."

### 1.2 The Business Portfolio

| # | Business | Description | Status | Source |
|---|----------|-------------|--------|--------|
| 1 | **N-Tech Platforms / Hudinavian** | B2B platform for real estate transactions — used by agents, property companies, developers | Existing, operational | `[domain-expert]` |
| 2 | **Mountain Cabin Company** | Sells and rents fjällbostäder (mountain cabins) — Åre, Sälen, etc. | Operational or launching | `[domain-expert]` |
| 3 | **Taylor Events** | Travel and ticket booking — sports events, corporate travel, flights, hotels, football World Cup tickets | Existing, dated HTML website | `[domain-expert]` |
| 4 | **Football Matches (Aug 1 & 8)** | ~100,000 tickets for two matches featuring "world's most famous teams" in Stockholm and Gothenburg | Pre-launch, **deadline April 1** | `[domain-expert]` |
| 5 | **Additional travel ventures** | "Ett par verksamheter till i reserummet... lite spetiga" (niche travel businesses) | Unspecified | `[domain-expert]` |

### 1.3 The Mariano Lesson (What Failed Before)

Pettson hired a developer in Costa Rica named Mariano who built "x antal outreach, agenter och så vidare. Bland annat uppringningar och han har satt upp Venus [likely Vapi]."

> `[domain-expert]` "Det har inte hänt ett skit egentligen, praktiskt sett."
> *Translation: "Nothing has happened really, practically speaking."*

> `[domain-expert]` "Jag har lärt mig ungefär hur man inte ska göra. Han har byggt jävligt mycket avancerade automationer."
> *Translation: "I've learned roughly how NOT to do it. He has built extremely advanced automations."*

**The lesson is cardinal:** Technical sophistication without practical results is worthless. Pettson will judge us on outcomes (tickets sold, bookings made, revenue generated), not on architectural elegance. Every feature must demonstrate tangible value.

### 1.4 The Office Constraint

Pettson's office is run by his ex-wife and Dova. They are not tech-savvy:

> `[domain-expert]` "De är kvar på fast ålder. Kommer du ihåg när det fanns Max?"
> *Translation: "They're stuck in the stone age. Do you remember when there was Max?" (referring to an old computer era)*

> `[domain-expert]` "De använder bävra papper och Excel Sheet fortfarande."
> *Translation: "They still use paper and Excel sheets."*

**This means:** Any admin interface must be simple enough for someone who is comfortable with Excel but nothing more. No developer tools, no complex configuration. If it requires more than 3 clicks to do a common task, it's too complicated.

### 1.5 Existing Platforms (Do Not Replace)

Pettson has already purchased and will continue using:

1. **A travel booking platform** — used by ~100 large travel agencies, has API consolidation for bookings, "pretty good UX." Anton starts working with it immediately. `[domain-expert]`
2. **A Stenbeck/Kinnevik hotel platform** — "helt fantastisk" (absolutely fantastic), has owner portals, packaging capabilities. `[domain-expert]`

> `[domain-expert]` "Jag har inga problem att använda de här plattformarna. Sen vill jag lägga det här lagret på med. Med kund-ackvisition, med content, med var lite smartare än alla andra."
> *Translation: "I have no problems using these platforms. Then I want to add this layer on top. With customer acquisition, with content, with being a little smarter than everyone else."*

**This means:** We are NOT building a booking platform. We are building the **intelligence layer** that sits on top of existing booking platforms and makes the sales process smarter, faster, and cheaper. The booking transaction happens on their platforms. We drive the leads there.

### 1.6 Pettson's Mental Model of AI Agents

Pettson thinks of AI agents as **conversational sales representatives** that handle the entire journey from first contact to booking:

> `[domain-expert]` "Kommunikationssättet är en AI-agent som pratar om bokningar. En stuga i fjällen, då kommer man till den här vägen och säger att jag vill boka en stuga. Vi är fyra stycken. Var vill ni vara? Är det Åre? Ytterligare Sälen?"
> *Translation: "The communication method is an AI agent that talks about bookings. A cabin in the mountains, you come this way and say I want to book a cabin. We're four people. Where do you want to be? Åre? Or Sälen?"*

And upselling:

> `[domain-expert]` "I förlängningen kanske om man vill boka allt från liftkort till skidhyra, till restaurangen."
> *Translation: "In the long run, maybe booking everything from lift passes to ski rentals, to the restaurant."*

### 1.7 The Shared Platform Vision

Both Pettson/Erik and Konrad independently arrived at the same insight — a common core serving multiple verticals:

> `[domain-expert]` (Erik, line 29): "Finns det en gemensam take på det här, där man kan bygga... som uppfyller behoven i hela verksamheten. Men med olika separata delar som är unika för de olika verksamheterna."
> *Translation: "Is there a common take on this, where you can build... that meets the needs of the whole business. But with different separate parts unique to each business."*

> `[domain-expert]` (Konrad, line 243): "Som ett träd. Om vi har en massa olika projekt så ska vi inte ha tio olika lösningar... den första grenen kanske är det här till april och i den grenen så använder man bara som A, B och C. Och den andra grenen... använder man B, C, D och F."
> *Translation: "Like a tree. If we have many different projects we shouldn't have ten different solutions... the first branch might be this thing for April and in that branch you use A, B and C. And the other branch uses B, C, D and F."*

### 1.8 The April 1 Deadline

> `[domain-expert]` "Vi kommer behöva vara uppe till första april ungefär med ett gäng med en AI-agentstack."

> `[domain-expert]` "Det är själva contentet som vi ser bra ut som vi behöver hitta. Vi behöver hitta det billigaste sättet att få in ackvisition."
> *Translation: "It's the content that makes us look good that we need to find. We need to find the cheapest way to get customer acquisition."*

**April 1 is hard.** The football matches are August 1 and 8. The sales machine must be running 4 months before the events. This is the first branch of the tree.

### 1.9 Post-Call Intelligence (Konrad + Björn)

After Pettson hung up, Konrad and Björn discussed:

> `[domain-expert]` (Björn): "Fan, inget jävla snack om vad du kan göra billigt alltså. De där är ju — Pettson sitter ju på cash."
> *Translation: "Damn, no f***ing talk about what you can do cheaply. Those guys — Pettson is sitting on cash."*

> `[domain-expert]` (Björn): "Kom ihåg att det är guldruschen och folk vet inte om det."
> *Translation: "Remember that it's the gold rush and people don't know about it."*

> `[domain-expert]` (Björn): "Om det är första april som gäller, försök ta nästa möte så fort som möjligt... så vi prioriterar att skaka hand på någonting så vi kan börja jobba."
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
| The football matches — who are the teams? Who holds the rights? | Legal/compliance for ticket sales |
| Legal structure for ticket resale | EU Package Travel Directive may apply to bundled packages |
| Payment processing (Klarna? Stripe? Swish?) | Checkout integration |
| Anton's role and technical capability | Who is the daily contact? |
| Lisa? (Pettson mentioned an "ex-wife and Dova" — who handles what?) | Admin user personas |
| What data exists in the Stenbeck/Kinnevik platform? | API integration scope |
| What exactly did Mariano build? What tools? | Avoid same mistakes |

---

## 2. Personas

### P-01: Pettson — Business Owner & Strategist `[domain-expert]`
- **Role:** Owner of multiple businesses. Makes strategic decisions. Wants visibility into all verticals.
- **Tech comfort:** IT background, uses Lovable, understands data structures. Not a coder.
- **Primary interface:** Dashboard showing performance across all business units. WhatsApp for alerts.
- **Key need:** "Vara lite smartare än alla andra" — competitive edge through AI.
- **Frustration:** Paying for technology that doesn't produce results.

### P-02: The Office Team (Ex-wife + Dova) — Operators `[domain-expert]`
- **Role:** Day-to-day operations. Handle bookings, customer inquiries, logistics.
- **Tech comfort:** Paper and Excel. "De är kvar på fast ålder."
- **Primary interface:** Simple web UI. Must feel like a spreadsheet, not a developer tool.
- **Key need:** See incoming leads, monitor conversations, manually intervene when needed.
- **Frustration:** Complicated software. They stopped using previous systems.

### P-03: Anton — Operational Lead `[domain-inferred]`
- **Role:** Operationally involved. Starts working with new platforms immediately. Connected to Skogshave and Erik Lass X ventures.
- **Tech comfort:** Higher than office team, lower than Pettson.
- **Primary interface:** Campaign management, agent configuration.
- **Key need:** Set up and monitor outreach campaigns.

### P-04: The Prospect — Ticket/Travel Buyer `[domain-inferred]`
- **Role:** Potential customer. Wants to buy football tickets, book cabins, arrange corporate travel.
- **Tech comfort:** Varies. From tech-savvy millennials to families planning vacations.
- **Primary interface:** Receives outreach via email/WhatsApp. Interacts with AI agent. Gets booking link.
- **Key need:** Quick answers, good recommendations, easy booking process.

### P-05: The Corporate Buyer `[domain-inferred]`
- **Role:** Buys group packages (10+ tickets + hotel) for corporate events.
- **Tech comfort:** Professional, expects polished communication.
- **Primary interface:** Email for initial contact, possibly phone for closing.
- **Key need:** Custom packages, invoicing, group logistics.
- **Note:** This persona SHOULD involve human handoff for closing — the deal size justifies personal attention.

---

## 3. System Vision

### 3.1 What We Are Building

An **AI-powered intelligence layer** that sits on top of Pettson's existing booking platforms and drives customer acquisition, sales conversations, and conversion through autonomous AI agents.

The system is NOT:
- NOT a booking platform (existing platforms handle transactions)
- NOT a CRM replacement (though it may eventually subsume CRM functions)
- NOT a content management system (though it generates content)
- NOT a customer support chatbot (though it handles inquiries)

The system IS:
- An AI sales force that conducts outreach, holds conversations, and drives prospects to booking
- A content engine that generates marketing material across channels
- An analytics platform that shows what's working and what isn't
- A multi-tenant platform where each business unit has its own agents, campaigns, and data

### 3.2 The Tree Architecture `[domain-expert]` + `[architect-decision]`

```
                    Resonansia Platform (trunk)
                    ┌─────────────────────┐
                    │  7-table data model  │
                    │  Event sourcing      │
                    │  AI pipeline         │
                    │  Multi-tenant RLS    │
                    │  Federation          │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         Branch 1         Branch 2         Branch 3
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Football    │  │  Mountain   │  │  Taylor     │
    │  Tickets     │  │  Cabins     │  │  Events     │
    │  (Apr 1)     │  │  (Phase 2)  │  │  (Phase 3)  │
    └─────────────┘  └─────────────┘  └─────────────┘
    Agent: Bansen     Agent: Stugan    Agent: Taylor
    Channel: Email    Channel: Web     Channel: Multi
    + WhatsApp        + WhatsApp       + Voice
    Products: Tix     Products: Cabins Products: Packages
    + Hotel pkgs      + Ski + Dining   + Corporate
```

Each branch is a **tenant** in the Resonansia model, with its own agents, campaigns, products, and customer data. Cross-selling between branches uses **federation edges** — a football ticket buyer can be recommended a cabin trip, with consent-based data sharing.

### 3.3 Design Principles

| ID | Principle | Source |
|----|-----------|--------|
| DP-01 | **Results over architecture.** Every feature must demonstrate tangible business value. No "advanced automations" that produce nothing. | `[domain-expert]` (Mariano lesson) |
| DP-02 | **Layer, don't replace.** We add intelligence on top of existing platforms, not rebuild what works. | `[domain-expert]` |
| DP-03 | **Simple enough for Dova.** The office team must be able to use the admin UI without training. If they can't, it's a bug. | `[domain-expert]` |
| DP-04 | **Shared trunk, different branches.** Common infrastructure, vertical-specific configuration. Build once, deploy many. | `[domain-expert]` + `[architect-decision]` |
| DP-05 | **AI agents are team members, not features.** Each agent has a name, personality, and goals. They represent the brand. | `[domain-inferred]` |
| DP-06 | **The cheapest acquisition wins.** Optimize for cost-per-lead and cost-per-conversion, not vanity metrics. | `[domain-expert]` |
| DP-07 | **Smartare än alla andra.** The competitive edge is intelligence: better personalization, faster response, smarter follow-up. | `[domain-expert]` |

---

## 4. Core Capabilities

### CAP-01: AI Agent Configuration `[architect-decision]`

The system MUST allow non-technical users to configure AI agents through a simple admin interface.

An agent has:
- **Name and personality** — tone (formal/friendly/casual/enthusiastic), language, bio
- **Knowledge base** — product catalog (static or API-connected), FAQ, brand guidelines
- **Goals** — primary objective (sell tickets, book travel, generate leads), conversion action
- **Constraints** — max conversation length, escalation triggers, operating hours, blocked topics
- **Channels** — which channels this agent operates on (email, WhatsApp, web chat, SMS)

Configuration MUST feel like filling out a form, not writing code. The agent's personality is described in natural language ("Du är en entusiastisk biljettförsäljare som älskar fotboll och alltid föreslår VIP-uppgraderingar").

An agent is a **node** in the data model (type: `agent`). `[architect-decision]`

### CAP-02: Outreach Campaigns `[domain-expert]`

The system MUST support automated outreach campaigns that reach prospects via email and WhatsApp.

A campaign consists of:
- **Target audience** — imported as a CSV or selected from existing leads
- **Agent** — which AI agent handles responses
- **Templates** — message templates with `{{placeholders}}` for personalization
- **Schedule** — when to send, rate limits, timezone
- **Follow-up sequence** — automatic follow-ups if no response (up to 4 steps)
- **A/B variants** — test different subject lines, messages, approaches

Campaign workflow:
1. Admin creates campaign, imports leads, selects templates
2. System sends personalized outreach at scheduled rate
3. Prospect replies → AI agent takes over the conversation
4. Prospect doesn't reply → follow-up sequence triggers
5. Conversation leads to booking link or human handoff
6. Analytics show sent, opened, replied, converted

Campaigns MUST respect rate limits to protect email deliverability. `[market-research]`
Campaigns MUST include an unsubscribe mechanism (GDPR). `[market-research]`
Campaigns SHOULD support A/B testing with automatic winner selection. `[market-research]`

### CAP-03: AI Sales Conversations `[domain-expert]`

The system MUST conduct multi-turn sales conversations through AI agents that guide prospects from initial interest to booking.

A conversation is a **node** (type: `conversation`). Every message is an **event** on that node. `[architect-decision]`

Conversation state machine:

```
initial_contact → qualifying → presenting_options → negotiating → closing → post_sale
                                                                              ↓
Any state → escalated (human takes over)                                 completed
Any state → abandoned (72h no response)
```

The AI agent MUST:
- Understand what the prospect wants (qualify needs)
- Present relevant products/packages from the catalog
- Answer questions about pricing, availability, logistics
- Guide toward a booking action (send booking link)
- Escalate to a human when encountering blocked topics, complaints, or low confidence

The AI agent MUST NOT:
- Calculate totals, taxes, or discounts (system computes) `[architect-decision]`
- Make promises about specific availability without checking `[domain-inferred]`
- Share internal pricing, margins, or business strategy `[architect-decision]`
- Continue beyond the configured message limit without escalation `[architect-decision]`

### CAP-04: Multi-Channel Communication `[domain-expert]`

The system MUST support at minimum email and WhatsApp for the April 1 MVP.

| Channel | MVP | Phase 2 | Notes |
|---------|-----|---------|-------|
| Email | MUST | — | Outbound campaigns + reply handling |
| WhatsApp | MUST | — | Real-time conversations, template-based outreach |
| Web Chat | — | SHOULD | Embedded widget on business websites |
| SMS | MAY | — | Fallback channel only |
| Voice (phone) | — | — | Phase 3+, requires voice AI platform |
| Social DMs | — | — | Phase 3+, Instagram/Facebook Messenger |

**WhatsApp constraint:** First-contact outreach requires pre-approved template messages (Meta 24-hour rule). Freeform messaging only after the prospect responds. `[market-research]`

**Email constraint:** New sending domains need 2+ weeks warmup for deliverability. Domain setup MUST begin immediately. `[market-research]`

### CAP-05: Product Catalog Integration `[domain-expert]` + `[architect-decision]`

The system MUST connect to external product/inventory sources so agents can present real products.

Two modes:
1. **Static catalog** — Products defined manually in the admin UI (MVP for football tickets)
2. **API catalog** — Products fetched from external booking platforms via adapter (Phase 2)

The system follows the **CatalogAdapter** pattern:

```
getProducts(filters) → Product[]
checkAvailability(productId, date, qty) → AvailabilityResult
```

For MVP, static catalog is sufficient: the admin enters ticket categories (Ståplats 350 SEK, Sittplats 550 SEK, VIP 1200 SEK) and the agent uses this data.

For Phase 2, the CatalogAdapter connects to Pettson's travel platform API and the Stenbeck/Kinnevik hotel platform to query real-time availability.

**The booking transaction happens on the external platform.** The agent's job is to guide the prospect and send a booking link — not to process payments. `[architect-decision]`

### CAP-06: Human Handoff `[domain-inferred]`

The system MUST support seamless escalation from AI agent to human.

Escalation triggers:
- Prospect explicitly asks for a human
- Blocked topics (refund, complaint, legal)
- AI confidence below threshold
- Conversation exceeds max turns
- Booking API failure
- Corporate/bulk inquiry (deal size justifies personal attention)

When escalation occurs:
1. AI generates a **handoff summary** — 3-sentence recap + key points + products discussed
2. Human receives notification (in-app + email, optionally WhatsApp)
3. Human takes over the conversation in the admin UI
4. Human MAY hand back to AI when the issue is resolved

### CAP-07: Content Generation `[domain-expert]`

The system MUST generate marketing content to support acquisition campaigns.

Content types:
- **Marketing emails** — personalized outreach with compelling copy
- **Social media posts** — platform-optimized (Instagram, Facebook, LinkedIn)
- **SMS messages** — short, action-oriented
- **WhatsApp templates** — structured messages for Meta approval

Content generation follows the AI transient proposal pattern: AI generates a draft, human reviews and approves, then the content is used in campaigns. `[architect-decision]`

Content MUST respect brand voice configured per agent/business unit. `[architect-decision]`

### CAP-08: Analytics Dashboard `[domain-expert]`

The system MUST provide a dashboard showing:

- **Funnel view:** leads → contacted → replied → qualified → booked → revenue
- **Campaign performance:** sent, delivered, opened, replied, converted per campaign
- **Agent performance:** conversations, escalation rate, conversion rate, avg turns to close
- **A/B test results:** which variants are winning
- **Revenue attribution:** which campaigns/agents drove which bookings
- **Cost tracking:** AI API costs per conversation, cost per acquisition

All metrics MUST be derived from events (the single source of truth). No separate analytics tables. `[architect-decision]`

The dashboard MUST be understandable by Pettson without explanation. If it needs a legend, simplify it. `[domain-expert]` (DP-03)

### CAP-09: Lead Management `[domain-inferred]`

The system MUST track leads (prospects) as they move through the funnel.

A lead is a **node** (type: `customer` with state `lead`). `[architect-decision]`

Lead data:
- Name, email, phone
- Source (which campaign, organic, referral)
- Score (AI-computed engagement + fit + intent)
- Tags (interests: football, ski, corporate)
- State: lead → qualified → converted → nurturing

Lead import:
- CSV upload (name, email, phone columns)
- Manual entry
- Future: API import from CRM, enrichment via Clay/Apollo

Lead scoring MUST be hybrid: engagement metrics (opens, clicks, replies) computed deterministically; fit and intent assessed by AI. The final score is computed by the system, not AI. `[architect-decision]`

### CAP-10: Multi-Tenant / Multi-Business `[domain-expert]`

The system MUST support Pettson's multiple businesses as separate tenants with shared visibility.

Architecture:

| Entity | Tenant Strategy |
|--------|----------------|
| Football Matches (Aug events) | Tenant: `taylor-football` |
| Mountain Cabins | Tenant: `mountain-cabins` |
| Taylor Events (general) | Tenant: `taylor-events` |
| Pettson Holding (overview) | Tenant: `pettson-holding` + federation edges to all |

Pettson sees aggregate performance across all tenants via federation. Each business unit's data is isolated by RLS. Cross-selling (football buyer → cabin recommendation) uses federation edges with explicit consent. `[architect-decision]`

---

## 5. Data Model Mapping

> This section maps every domain concept to the existing Resonansia 7-table model. **Zero new database tables are needed.** All extensions are new label codes (data operations) and new Node.data schemas (Zod validation).

### 5.1 New Node Types (Labels)

| Code | Name | Purpose |
|------|------|---------|
| `agent` | AI Agent | Configured sales agent with personality, knowledge, goals |
| `conversation` | Conversation | Multi-turn interaction between agent and prospect |
| `campaign` | Campaign | Outreach campaign targeting a set of leads |
| `content` | Content | Marketing content piece (email, social post, etc.) |
| `sequence` | Sequence | Multi-step follow-up sequence |
| `booking` | Booking | Booking record (mirrors external platform booking) |

Existing node types reused: `org` (business units), `customer` (leads/prospects), `product` (tickets, cabins, packages), `person` (team members), `location` (venues, destinations).

### 5.2 New Edge Types (Labels)

| Code | From → To | Purpose |
|------|-----------|---------|
| `targets` | Campaign → Customer | Lead is targeted by campaign |
| `handled_by` | Conversation → Agent | Agent running the conversation |
| `belongs_to` | Conversation → Customer | Lead in the conversation |
| `serves` | Agent → Org | Agent represents this business unit |
| `includes_product` | Booking → Product | Booking contains this product |
| `originated_from` | Booking → Campaign | Attribution: which campaign drove the booking |
| `uses_sequence` | Campaign → Sequence | Campaign uses this follow-up sequence |
| `subsidiary_of` | Org → Org | Business unit hierarchy |

### 5.3 New Event Types (Labels)

| Code | Node | Purpose |
|------|------|---------|
| `conversation_message` | Conversation | Each message (inbound/outbound) in a conversation |
| `outreach_sent` | Campaign | Outreach message sent to a lead |
| `outreach_opened` | Campaign | Email opened (tracking pixel) |
| `outreach_responded` | Campaign | Lead replied to outreach |
| `lead_scored` | Customer | AI + system scored a lead |
| `booking_initiated` | Booking | Booking process started |
| `booking_confirmed` | Booking | Booking confirmed (external platform callback) |
| `agent_escalation` | Conversation | AI escalated to human |
| `content_published` | Content | Content piece published to a channel |
| `inventory_change` | Product | Stock/availability change |
| `external_sync` | Booking/Product | Sync event with external platform |

### 5.4 New Node States (Labels)

| Code | Applies To | Purpose |
|------|-----------|---------|
| `lead` | Customer | Prospect not yet engaged |
| `qualified` | Customer | Lead scored and engaged |
| `converted` | Customer | Lead became a booking customer |
| `nurturing` | Customer | Long-term follow-up |
| `pending_payment` | Booking | Awaiting payment |
| `confirmed` | Booking | Booking paid and confirmed |
| `published` | Content | Content live on channel |

### 5.5 What the Model Gives for Free

| Existing Capability | How It Applies |
|---|---|
| **Event sourcing (append-only)** | Full conversation audit trail. Every message permanently recorded. Dispute resolution: "the AI promised X" is provable. |
| **Bitemporality** | Retroactive corrections. Campaign metrics recalculated when late delivery reports arrive. |
| **Federation** | Cross-business visibility. Pettson sees all tenants. Cross-selling between branches with consent. |
| **Graph structure** | Natural funnel analysis: campaign → targets → outreach → response → conversation → booking. No custom tables. |
| **Label extensibility** | New product categories, campaign types, agent configurations are data operations, not deployments. |
| **WhatsApp/SMS adapters** | Already built for the construction domain. Same infrastructure for sales agents. |
| **AI pipeline (3 tiers)** | Cheap tier for classification, medium for conversations, expensive for content generation. |
| **Anomaly shield** | Flags abnormal patterns (sudden score jumps, unusual conversion rates) before action. |

---

## 6. AI Architecture

### 6.1 Model Tier Usage

| Task | Tier | Model | Latency Target |
|------|------|-------|---------------|
| Classify inbound message (intent, sentiment) | Cheap | gpt-4o-mini | < 2s |
| Score a lead (fit + intent assessment) | Cheap | gpt-4o-mini | < 3s |
| Conduct sales conversation (respond to prospect) | Medium | claude-haiku-4-5 | < 5s |
| Generate marketing content (email, social post) | Expensive | claude-sonnet-4-5 | < 15s |
| Generate conversation summary (context compression) | Cheap | gpt-4o-mini | < 3s |
| Personalize outreach message | Cheap | gpt-4o-mini | < 2s |

### 6.2 Context Protocol for Conversations

Adapted from the platform's 5-level context protocol:

| Level | Content | Token Budget | When |
|-------|---------|-------------|------|
| 0 — Platform | Available product types, channels, system constraints | ~100 | Always |
| 1 — Agent | Personality, brand guidelines, goals, constraints | ~800 | Always |
| 2 — Conversation | Summary of older turns, lead profile, campaign source | ~600 | If > 10 turns |
| 3 — Products | Relevant products with pricing and availability | ~1200 | When presenting/closing |
| 4 — Recent Messages | Last 6-10 messages verbatim | ~2400 | Always |

**Total budget: ~5100 tokens** (fits comfortably in all tiers with response reserve).

When conversations exceed 10 turns, older messages are compressed into a rolling summary (Level 2) using the cheap tier. This prevents context window overflow while preserving conversation coherence.

### 6.3 The Sacred Boundaries

These AI boundaries are inherited from the platform and non-negotiable:

1. **AI never does arithmetic.** The agent says "4 biljetter á 350 kr" but the system computes the total (1400 kr). If the AI returns a total, it is ignored and recomputed. `[architect-decision]`

2. **AI proposes, human decides.** Generated content is a draft until human approval. Conversations are autonomous within configured constraints, but escalation is always available. `[architect-decision]`

3. **AI never promises without checking.** When the agent says "tickets are available," it must have queried the catalog (static or API). Hallucinated availability is a critical bug. `[architect-decision]`

4. **No internal data leaks.** The agent never reveals internal pricing strategy, margins, cost structure, or competitive intelligence to prospects. `[architect-decision]`

---

## 7. User Journeys

### UJ-01: Football Ticket Outreach (MVP, April 1) `[domain-expert]`

**Preconditions:** Agent "Biljett-Bansen" configured with football ticket catalog. Campaign created with 5,000 imported email leads. Follow-up sequence: 3 steps over 9 days.

1. System sends personalized email: "Hej {{namn}}, VM:s mest kända lag spelar i Stockholm den 1 augusti — och vi har exklusiva biljettpaket. Vill du veta mer?"
2. 48h later, no reply → Follow-up #1: Different angle, mention hotel packages
3. Prospect replies: "Vad kostar det med hotell?"
4. Agent "Biljett-Bansen" takes over: presents ticket + hotel packages from static catalog
5. Prospect: "Vi är 6 personer, har ni grupppris?"
6. Agent: "Absolut! Här är våra alternativ för 6 personer: ..." (system computes group pricing)
7. Prospect: "Låter bra, hur bokar jag?"
8. Agent: sends booking link to the external ticket platform
9. Booking confirmed → event logged → prospect state: `converted`
10. Post-sale: "Tack för din bokning! Här är info om pre-match-eventet..."

**Expected system behavior:** Complete flow from outreach to booking with < 5 AI turns, zero human involvement for standard requests.

### UJ-02: Corporate Group Inquiry → Human Handoff `[domain-inferred]`

**Preconditions:** Same campaign. Corporate buyer responds.

1. Corporate buyer replies: "Vi är intresserade av 50 biljetter + VIP-paket för vår företagsevent. Behöver faktura."
2. Agent classifies: high-value, bulk order → triggers escalation
3. Agent responds: "Fantastiskt! För gruppbeställningar av den här storleken kopplar jag er direkt till vårt eventteam. De hör av sig inom en timme."
4. System creates handoff package with full conversation summary
5. Pettson/Anton receives notification with context: "50 VIP biljetter, behöver faktura, företagskund"
6. Human takes over conversation, closes deal personally

### UJ-03: Mountain Cabin Booking via WhatsApp (Phase 2) `[domain-expert]`

**Preconditions:** Agent "Stugan" configured with cabin catalog API. Prospect finds WhatsApp number on website.

1. Prospect sends WhatsApp message: "Hej, jag vill boka stuga i Åre vecka 8. Vi är 4 personer."
2. Agent "Stugan" responds: "Hej! Åre vecka 8, 4 personer — jag kollar vad som finns..."
3. Agent queries CatalogAdapter: `checkAvailability("are", "2027-02-13", 4)`
4. Agent presents 3 options with photos: cozy 2BR, family 3BR, luxury 4BR
5. Prospect: "Vad ingår i luxury?"
6. Agent: describes amenities, mentions upsell: "Vi kan också ordna liftkort och skidhyra!"
7. Prospect: "Ja tack, luxury + 4 liftkort"
8. Agent sends booking link. Prospect completes on external platform.
9. Confirmation flows back → event logged → post-sale upsell: "Vill du boka middag på Fjällgården också?"

### UJ-04: Pettson Views Cross-Business Performance `[domain-inferred]`

1. Pettson opens dashboard on `pettson-holding` tenant
2. Sees aggregate view: all 3 business units, total leads, conversations, bookings, revenue
3. Drills into Football: "500 emails sent, 23% reply rate, 12 bookings, 3 escalations"
4. Compares with Mountain Cabins: "50 WhatsApp conversations, 40% conversion, avg 4 turns to booking"
5. Sees cross-sell opportunity: "8 football buyers also searched for cabin rentals"
6. Decides to create a cross-sell campaign: football buyers → cabin offer (via federation)

---

## 8. Integration Architecture

### 8.1 Required Integrations (MVP)

| # | Integration | Purpose | Adapter Pattern |
|---|-------------|---------|----------------|
| INT-01 | **Resend** (email) | Send outreach emails, receive inbound replies via webhook | EmailAdapter (exists) |
| INT-02 | **WhatsApp Business API** | Send/receive WhatsApp messages, template management | MessagingAdapter (exists) |
| INT-03 | **46elks** (SMS) | Fallback SMS channel | MessagingAdapter (exists) |

### 8.2 Phase 2 Integrations

| # | Integration | Purpose |
|---|-------------|---------|
| INT-04 | **Pettson's travel platform API** | Real-time product/availability queries via CatalogAdapter |
| INT-05 | **Stenbeck/Kinnevik hotel API** | Hotel availability and packaging |
| INT-06 | **Supabase Realtime** | Web chat widget via WebSocket |
| INT-07 | **Payment gateway** (Stripe/Klarna/Swish) | Payment status webhooks for booking confirmation |

### 8.3 Phase 3+ Integrations

| # | Integration | Purpose |
|---|-------------|---------|
| INT-08 | **Instagram Graph API** | Social DM conversations |
| INT-09 | **Facebook Messenger** | Social DM conversations |
| INT-10 | **Voice AI** (Vapi/Synthflow) | Phone-based sales conversations |
| INT-11 | **Clay/Apollo** | Lead enrichment |
| INT-12 | **HubSpot/Pipedrive** | CRM sync |

### 8.4 Digital Twin Strategy

Following the platform's existing twin architecture, every external integration gets a digital twin for testing:

| Service | Twin Behavior |
|---------|--------------|
| Email (Resend) | Logs sent emails, simulates open/click webhooks |
| WhatsApp | Logs messages, simulates inbound replies |
| SMS (46elks) | Logs messages, simulates delivery reports |
| Catalog API | Returns static product data, simulates availability changes |

All twins run on a single Express server (port 9999), reusing the existing twin infrastructure from the construction domain. `[architect-decision]`

---

## 9. Business Rules

### BR-01: Rate Limiting `[market-research]`

| Channel | Per Hour | Per Day | Notes |
|---------|---------|---------|-------|
| Email | 50 | 200 | Respect Resend limits; warm up new domains over 2 weeks |
| WhatsApp | 30 | 250 | Meta tier-dependent; template-only for first contact |
| SMS | 20 | 100 | 46elks pricing makes this expensive at scale |

### BR-02: GDPR Compliance `[market-research]`

- Every outreach MUST include an unsubscribe mechanism
- Opt-outs MUST be honored within 24 hours
- Every contact MUST have a recorded consent basis: `legitimate_interest`, `explicit_consent`, or `existing_customer`
- Right-to-erasure requests MUST delete all conversation data (using platform's crypto-shred capability)
- All data processing MUST be documented per GDPR Article 30

### BR-03: Conversation Limits `[architect-decision]`

- Max 20 messages per conversation before suggesting escalation
- Max 72 hours of inactivity before marking conversation as abandoned
- Escalation MUST happen for: refunds, complaints, legal questions, bulk orders, booking failures
- AI confidence below 0.4 MUST trigger escalation

### BR-04: Content Approval `[architect-decision]`

- Outreach campaign templates MUST be approved by a human before sending
- AI-generated content is always a draft until approved
- Social media posts SHOULD be approved before publishing
- Conversational responses do NOT require per-message approval (that would break real-time)

### BR-05: Pricing Display `[architect-decision]`

- All prices shown to prospects MUST come from the product catalog (static or API)
- The system computes all totals, taxes, and discounts — never the AI
- The AI MUST NOT negotiate prices below the configured floor
- Group discounts SHOULD trigger human handoff unless pre-configured

### BR-06: Package Travel Directive `[market-research]`

If selling ticket + hotel + transport bundles within the EU:
- The Package Travel Directive (2015/2302) MAY apply
- Requires: clear pricing breakdown, cancellation rights, organizer liability
- Legal review SHOULD be conducted before selling bundled packages
- The system SHOULD support itemized pricing in booking confirmations

---

## 10. Phasing

### Phase 1: Football Ticket MVP (Target: April 1, 2026) — MUST

**Scope:** Single tenant (taylor-football). Email + WhatsApp outreach. AI agent for ticket conversations. Static product catalog. Basic analytics.

**Delivers:**
- Agent configuration UI (name, personality, catalog, constraints)
- CSV lead import
- Email outreach campaigns with personalization
- Email reply handling → AI conversation
- WhatsApp conversation support
- Follow-up sequences (3 steps)
- A/B testing for email templates
- Human escalation with handoff summary
- Analytics dashboard (funnel, campaign performance)
- GDPR compliance (unsubscribe, consent tracking)

**Success criteria:**
- [ ] Campaign of 1,000+ emails sent with < 5% bounce rate
- [ ] AI agent handles 50+ conversations with < 10% escalation rate
- [ ] At least 5 bookings attributed to AI outreach
- [ ] Admin UI usable by non-technical operator (Dova test)
- [ ] Full conversation audit trail in events

### Phase 2: Multi-Vertical + Live Catalog (Target: May 2026) — SHOULD

**Scope:** Add mountain cabins tenant. Connect to external booking platform API. Web chat widget.

**Delivers:**
- CatalogAdapter for real-time product/availability queries
- Web chat widget (Supabase Realtime)
- Mountain cabin agent with destination-aware recommendations
- Cross-tenant federation (Pettson sees all businesses)
- Lead scoring (hybrid AI + deterministic)
- Content generation engine (marketing emails, social posts)
- Enhanced analytics (cross-business, attribution)

### Phase 3: Full Platform (Target: July 2026) — MAY

**Scope:** Taylor Events general travel. Social DMs. Voice AI exploration. Advanced content.

**Delivers:**
- Instagram/Facebook Messenger integration
- Voice AI exploration (Vapi/Synthflow for qualification calls)
- Package builder (ticket + hotel + experience bundles)
- CRM integration (HubSpot/Pipedrive sync)
- Lead enrichment (Clay/Apollo)
- SEO content generation
- Dynamic pricing recommendations
- Advanced A/B testing with auto-optimization

---

## 11. Metrics & Success Criteria

### 11.1 North Star Metric `[architect-decision]`

**Revenue generated through AI agent conversations per month.**

This is the single metric that proves the system's value. Everything else supports it.

### 11.2 Phase 1 KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email delivery rate | > 95% | outreach_sent events vs bounces |
| Email reply rate | > 15% | outreach_responded / outreach_sent |
| Conversation → booking rate | > 5% | bookings / conversations |
| AI resolution rate | > 85% | conversations completed without escalation |
| Avg turns to conversion | < 8 | conversation_message events per completed conversation |
| Cost per conversation | < 2 SEK | AI API tokens * price per token |
| Cost per acquisition | < 50 SEK | total AI + sending costs / bookings |
| Pettson satisfaction | Qualitative | "Is this better than Mariano?" |
| Dova usability | Qualitative | "Can she use it without help?" |

### 11.3 Anti-Metrics (What We Do NOT Optimize For)

- Number of messages sent (vanity metric — quality over quantity)
- Conversation length (shorter is better if it converts)
- AI sophistication (Mariano lesson — results only)

---

## 12. Scope Exclusions

The system is NOT:

1. **NOT a booking/payment platform.** Bookings happen on existing platforms. We drive leads there.
2. **NOT an accounting system.** No invoicing, no bookkeeping, no VAT calculation (unless Phase 3 corporate requires it).
3. **NOT a customer support tool.** The AI agents sell. Customer support after booking is out of scope.
4. **NOT a social media management tool.** We generate content; publishing and community management are separate.
5. **NOT a voice call center.** Phone integration is Phase 3 at earliest.
6. **NOT a website builder.** Landing pages MAY be generated but hosting/deployment is separate.

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Agent** | An AI-powered conversational sales representative configured per business unit |
| **Campaign** | An automated outreach initiative targeting a set of leads via email/WhatsApp |
| **Conversation** | A multi-turn interaction between an agent and a prospect |
| **Escalation** | Transfer of a conversation from AI to a human operator |
| **Federation** | Cross-tenant data access with consent (Resonansia platform feature) |
| **Handoff** | The structured transfer of conversation context from AI to human |
| **Lead** | A prospect who has not yet been engaged or qualified |
| **Sequence** | A multi-step follow-up plan triggered by time and conditions |
| **Static Catalog** | Product data entered manually (vs. fetched from API) |
| **CatalogAdapter** | Interface for querying external product/availability systems |
| **Tenant** | An isolated business unit in the multi-tenant platform |
| **Twin** | A digital mock of an external service for testing |
| **Fjällbostad** | Mountain cabin (Swedish) |

---

## 14. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| April 1 deadline missed | Medium | High | Start email domain warmup immediately. Parallel-track agent config + outreach engine. |
| Email deliverability issues | Medium | High | Warm up 5-10 domains over 2 weeks. Use Instantly/Smartlead for infrastructure. |
| WhatsApp template rejection by Meta | Medium | Medium | Submit templates early. Have email fallback. |
| Mariano effect (over-engineering, no results) | Low | Critical | Weekly demo to Pettson showing tangible progress. Results over architecture. |
| Office team can't use admin UI | Medium | High | Dova test every sprint. If she can't use it, redesign. |
| External platform API unavailable | Low | Medium | Static catalog fallback. Booking links always work. |
| GDPR complaint from outreach | Low | High | Consent tracking from day 1. Unsubscribe in every message. |
| AI hallucination (false availability) | Medium | High | Agent MUST query catalog before stating availability. Never hallucinate. |
| The football matches don't happen | Low | Critical | Business risk, not tech risk. Platform still valuable for other verticals. |

---

## 15. For the Next Generation (Gen 2 Instructions)

This section tells the AI refining this spec what to do next.

### 15.1 Transform This Into

A Gen 2 technical specification using the Resonansia spec pattern:
- **AXIOM** blocks for design philosophy (7 tables, AI boundaries, results over architecture)
- **INTERFACE** blocks for all node data schemas, edge data schemas, event data schemas
- **INVARIANT** blocks for every constraint (AI arithmetic boundary, escalation rules, rate limits)
- **BEHAVIOR** blocks for every workflow (outreach → reply → conversation → booking)
- **RULE** blocks for business rules (GDPR, pricing, rate limiting)
- **SCHEMA** blocks for all data shapes with TypeScript types

### 15.2 Preserve These Absolutely

1. **The Domain Insights Companion (Section 1)** — do not compress, abstract, or summarize. Carry it forward unchanged.
2. **Provenance tags** — maintain `[domain-expert]` vs `[architect-decision]` distinction through all transformations.
3. **The Mariano lesson** — DP-01 "Results over architecture" must be the loudest axiom in the technical spec.
4. **The Dova constraint** — DP-03 "Simple enough for Dova" must inform every UI specification.
5. **The tree metaphor** — this is how Pettson thinks about the system. Keep it.

### 15.3 Resolve These Gaps

1. Conduct a follow-up interview with Pettson using the Domain Expert Interview Protocol to fill the gaps in Section 1.10.
2. Determine the specific football teams and legal structure for ticket sales.
3. Get API documentation for the travel platform Pettson purchased.
4. Define exact WhatsApp template messages for Meta approval.
5. Decide between Instantly/Smartlead for email infrastructure or build custom on Resend.

### 15.4 Add These Technical Details

1. Full TypeScript schemas for all node data types (agent, conversation, campaign, content, sequence, booking)
2. Full conversation state machine with formal transitions and conditions
3. The escalation rule engine with exact thresholds
4. Token budget calculations for the context protocol
5. CatalogAdapter interface with concrete type signatures
6. Campaign scheduler architecture (cron job vs event-driven)
7. The handoff package schema
8. The analytics query patterns (SQL with window functions)
9. Twin server extensions for email inbound, catalog queries

### 15.5 Phase Spec Guidance

When writing Gen 4 phase specs from this:
- **Phase 1 MUST include numerical test vectors** — e.g., "Send 5 test emails → 5 outreach_sent events. Simulate 2 replies → 2 conversations created. One reply = 'unsubscribe' → lead state changes."
- **Phase 1 MUST include GATE blocks** after every build section (lesson from Phase 3 research report: deferred type-checking caused 78 fix cycles)
- **Phase 1 UI sections MUST use component trees**, not prose descriptions (lesson from Phase 3: prose UI specs scored 5/10)
- **Phase 1 MUST document the CODEBASE_STATE** — db.execute() return shape, edge column names, adapter constructor signatures (lesson from Phase 3: undocumented patterns caused cascading bugs)

---

*This specification was generated by analyzing a 331-line voice recording transcription, cross-referencing with the existing Resonansia platform architecture (7-table model, event sourcing, AI pipeline, federation), and incorporating market research on AI sales agents, ticket sales, and travel technology. Four parallel research agents contributed: domain knowledge extraction, AI landscape research, data model mapping, and agent architecture design.*

*The most important insight from the conversation that must survive all future transformations: Pettson has been burned by technically impressive but practically useless AI automations. Every feature in this system must demonstrate tangible business value — tickets sold, bookings made, revenue generated. Results over architecture.*
