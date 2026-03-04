# Research Transcripts

This document contains the exact prompts sent to, and responses received from,
all research agents used in the Resonansia spec evolution research and Taylor Events
specification creation sessions (March 1-2, 2026).

---

## Part 1: Spec Evolution Research (March 1, 2026)

Four parallel research agents were launched to analyze how specifications
evolve from voice recordings to buildable blueprints in the Resonansia project.

### Agent 1: Read Gen 0-1: voice recording and alpha spec
**Type:** general-purpose

#### Prompt
````
You are a research analyst. Read these two documents COMPLETELY and provide a detailed analysis:

1. `docs/voice_recording.txt` — The raw voice recording transcription (Swedish). This is the origin point: a conversation between Konrad (developer) and Kimmo (painting company owner).

2. `docs/spec alpha 0.1.md` — The first formal spec generated from that conversation.

For each document, provide:

A) VOICE RECORDING ANALYSIS:
- Complete summary of all topics discussed (in order of appearance)
- Key business insights Kimmo shares (his domain expertise about painting, BRF, ROT, pricing, customers, field logistics, subcontractors, seasonal cycles)
- Moments where Kimmo explains something that only a domain expert would know
- Emotional emphasis — things Kimmo seems particularly passionate or concerned about
- Implicit knowledge — things assumed but never explained
- Tangents, interruptions, and conversational dynamics
- Any hesitations or disagreements between Konrad and Kimmo
- Specific quotes (in Swedish with English translation) that capture critical insights
- Things that were mentioned but glossed over / not fully explored

B) ALPHA SPEC ANALYSIS:
- Structure and organization
- How RFC 2119 modals (SKALL/BÖR/KAN) are used
- Requirement ID system
- What from the conversation made it in, and what was left out
- Any additions that weren't in the conversation (Claude's own additions)

C) GEN 0 → GEN 1 TRANSFORMATION:
- Specific examples of information that survived the transformation faithfully
- Specific examples of information that was distorted or reinterpreted
- Specific examples of information that was lost entirely
- Specific examples of things Claude ADDED that weren't in the conversation
- How conversational nuance (tone, emphasis, negotiation) was handled

Be thorough. Quote specific passages. This analysis will feed into a larger research report.
````

#### Response

Now I have read both documents in their entirety. Let me compile the full analysis.

---

# GEN 0 to GEN 1 TRANSFORMATION ANALYSIS

## A) VOICE RECORDING ANALYSIS

### Complete Summary of Topics Discussed (in order of appearance)

1. **Opening & framing** (lines 1-9): Konrad and Kimmo agree the session will lay the foundation for version 1, an MVP for a painting company called "Vi Malar Sverige."

2. **Customer acquisition funnel** (lines 10-15): Kimmo describes how customers find them through Google, read reviews, and make contact via chat, email, forms, or phone. He mentions their chat service costs 1800 SEK/month plus 175 SEK per lead.

3. **Customer types** (lines 17-23): Primarily private customers and BRF (housing cooperatives). Companies are an exception. BRF is described as a private person procuring on behalf of the cooperative.

4. **The quote process and speed** (lines 51-57): Kimmo emphasizes being fast with quotes is critical -- competitors take 1.5 weeks. They are in the premium price segment. He says "Vi ar absolut inte billigast utan vi ligger i dyrutsegmentet."

5. **Fixed price vs. estimates and surprises** (lines 55-77): Discussion about when prices deviate from quotes, especially with outdoor painting where rot in wood is discovered only during work. Material costs can spiral -- 10-liter paint buckets cost 3800 SEK each, and if a job requires 5 different colors, costs add up quickly. Painters pick up 10-liter buckets at the store because they don't want to come back.

6. **Fixed price for labor, estimate for material** (lines 79-85): Kimmo clarifies they do a fixed price on labor but always estimate material. Exterior painting is particularly hard to estimate because wood absorption varies and color codes may not be known in advance.

7. **Kimmo vs. Lisa's quoting accuracy** (lines 86-97): Kimmo admits he makes more errors than Lisa who is meticulous. He says material costs are typically 30-35% of labor costs, which he discovered by checking past orders recently.

8. **Material costs breakdown** (lines 99-107): Includes paint, rollers, tape, wash, filler, trim paint. Trim paint (snickerifarg) is extremely expensive -- a 3-liter can costs over 2000 SEK. Konrad offers to look into Chinese-sourced paint alternatives.

9. **Delivery notes and the Flygel reference system** (lines 109): Material pickup generates a "foljesedel" (delivery note). Currently painters pick up materials with a project number, and Kimmo wants these to automatically attach to projects.

10. **Scheduling and subcontractors** (lines 111-126): Customers want work done quickly. Kimmo describes wanting a subcontractor portal where UEs can see work descriptions, accept company policies, order branded clothing, and receive work orders. Translation is needed since subcontractors are rarely Swedish-speaking.

11. **Sub-subcontracting risk** (lines 117-121): The risk of UEs hiring their own UEs, leading to disputes about fixed vs. hourly pay and quality control.

12. **Customer-facing painter profiles** (lines 125-126): Kimmo's dream: communicate to the customer exactly who will perform their job, creating trust.

13. **Photo reporting and quality assurance** (lines 127-137): Konrad suggests mandatory photo check-in for job completion. Kimmo enthusiastically agrees -- painters should do self-inspection. Customer portal for transparency.

14. **Customer portal and transparency** (lines 147-155): Kimmo is passionate about transparency reducing disputes. "Den storsta utmaningen inom hantverkaryrket...det ar kommunikationen" (The biggest challenge in the trades is communication). Konrad introduces the idea of 360-degree cameras for room documentation.

15. **User roles identified** (lines 161-219): Site inspector/quoter, customer, project leader/UE, painter, BRF board/individual residents.

16. **BRF project structure** (lines 207-241): BRF jobs involve entering all apartments, managing schedules over weeks during summer/holiday season. Trust and communication are paramount -- the BRF chairman values keeping schedules because they know "Berit i lagenhet langst ner" (Berit in the bottom apartment) will call about every little thing.

17. **Upselling opportunities** (lines 251-303): Currently Kimmo does not do much upselling. Discussion about painters being able to report additional work needed (e.g., trim painting), which goes to backoffice for pricing, then to customer for approval. Permission levels discussed. Provision/commission for painters who upsell. Wallpaper has worst margins.

18. **Project hierarchy** (lines 305-368): Work orders, projects vs. tasks. BRF project with 21 facades over 6 weeks. Different color codes per facade. Konrad thinks of project + work orders structure. Discussion about configurability -- not all clients need the same level of granularity.

19. **Time reporting and daily reporting** (lines 369-389): Photo documentation, incident reporting, WhatsApp-based time reporting per project.

20. **Invoicing flow** (lines 391-445): Customer approval triggers invoicing. 10-day payment terms for private customers. Milestone billing for larger projects (e.g., 20% after two weeks). Invoice should reflect the quote clearly with transparent deviations. Delivery notes from Flygel should auto-attach to projects by work order number.

21. **Bookkeeping system** (lines 483-505): Currently using Bygglet as business system and Fortnox for bookkeeping. Konrad proposes building their own bookkeeping capability as a "shadow system" that eventually replaces Fortnox. Mentions saving customers the ~800 SEK/month license cost.

22. **CRM and communication logging** (lines 507-519): All communication (SMS, WhatsApp, email) should be logged. Recording customer site visits. Using recordings as basis for AI-generated quotes.

23. **Measurement tools** (lines 519-528): Laser measuring, iPhone LiDAR (iPhone 13 Pro+), per-square-meter calculation.

24. **ROT/RUT integration** (lines 533-610): Currently handled via Fortnox. ROT requires hour-by-hour breakdown. Automating the Skatteverket submission. Risk of incorrect ROT claims being hard to reverse. Customer responsibility for checking remaining ROT allowance. BankID integration for customer authentication. Skatteverket may be opening APIs.

25. **Payment solutions** (lines 549-565): Currently 10-day invoice. Discussion about card payments for immediate cash flow. Multiple payment options.

26. **BankID for authentication** (lines 567-583): Customer login via BankID. Quote approval via BankID for legal security. Currently using email acceptance which is legally sufficient but less polished.

27. **Post-project customer journey** (lines 613-634): Google Review requests, customer satisfaction surveys, follow-up templates, loyalty offers (e.g., 30% material discount for return customers).

28. **Article/product management in quotes** (lines 635-643): Integration with supplier price lists for real-time margin visibility per project. Kimmo: "ju mer vi kan artikelstyra, sa kan man ocksa fa projektekonomi i det" (the more we can control by article, the more we get project economics).

29. **Subcontractor portal and network effects** (lines 645-700): Discussion about UEs being able to use the same system for their own businesses. Aziz (a named UE) could become both a UE for Vi Malar Sverige and have his own customers. Multi-level federation. Competitive dynamics. Scale through booking automation -- "Lisa kan bara sitta och tokboka moten" (Lisa can just sit and book meetings like crazy).

30. **Simplicity and AI-first** (lines 709-728): Kimmo emphasizes the system MUST be simple. References Lisa preferring pen and paper. AI-first approach -- Aziz may never need to open a website; he gets WhatsApp messages. Konrad proposes starting with the core: quote, project management, portal, customer, painter.

### Key Business Insights from Kimmo (Domain Expertise)

1. **Material cost ratio**: 30-35% of labor cost, slightly different for indoor vs. outdoor work (line 97).

2. **Paint pricing reality**: 10-liter bucket = ~3800 SEK; 3-liter trim paint = ~2000+ SEK. Prices have risen dramatically over 10 years (lines 77, 101-105).

3. **Pricing psychology**: Fixed price carries more margin because they "take the risk." Running account (lopande rakning) is actually cheaper for the customer but requires trust. Almost no first-time customer accepts running account (lines 183-197).

4. **BRF sales dynamics**: They are rarely the cheapest bidder but win most BRF jobs because the chairman values reliability, communication, and schedule adherence over price (lines 201-208).

5. **Wallpaper economics**: Worst margins in the business. Example: Djursholm villa, 1-meter-wide wallpaper at 4500 SEK/roll, had to redo twice (20,000 SEK each time) before finding the correct adhesive (lines 291-293).

6. **Subcontractor motivations**: "Ingen vill egentligen vara underentreprenoer" (Nobody actually wants to be a subcontractor) -- they do it because they can't acquire their own customers or get on the right procurement lists (lines 651-653).

7. **Delivery note workflow**: Painters pick up materials at Flygel using a project number (e.g., P2901). Flygel sends delivery notes by email. Currently these must be manually matched to projects (lines 420-447).

8. **Seasonal patterns**: Summer is BRF facade season. Scheduling is tight. Projects span weeks during vacation periods (lines 207, 329).

### Moments of Pure Domain Expertise

- **Wood rot discovery** (line 57): "Man kanske inte ser det om man gor utomhusmalnning i ruttet tecken. Det ser man nar man gar igenom och petar." (You might not see it with outdoor painting on rotten wood. You see it when you go through and poke.) -- This is knowledge that only comes from physically doing the work.

- **Paint bucket economics** (line 77): Painters always take 10-liter buckets because returning to the store is more expensive than wasting paint. This creates systematic material waste that is baked into the business model.

- **Customer expectation gap** (lines 75-77): Customers expect a certain finish quality without understanding that spackling and underwork are separate services. "Kunden har en forvantning av att det ska bli ett resultat som de inte betalar for." (The customer has an expectation of a result they are not paying for.)

- **BRF chairman psychology** (line 207): "De vet, Berit i lagenheten langst ner. Nej, det ar bra. Hon ringer for minsta lilla deg." (They know Berit in the bottom apartment. She calls about every little thing.) -- This shows deep understanding of stakeholder dynamics in cooperative housing.

- **Trim paint cost explosion** (lines 101-105): "En tre liters snickerifargsburk kostar strax over tva tusen. Det ar sa javla mycket. Alltsa nar jag borjade sa kostade det liksom tio liter fasadfarg. For tio ar sedan." (A three-liter can of trim paint costs just over two thousand. It's so damn much. When I started it cost that for ten liters of facade paint. Ten years ago.)

### Emotional Emphasis -- Passion and Concern

1. **Passionate about trust and professionalism**: Kimmo repeatedly returns to "fortroende" (trust). It is the cornerstone of his business model. The entire customer journey is about building and maintaining trust.

2. **Frustrated by pricing errors**: He knows he makes more mistakes than Lisa and explicitly wants system support to prevent this. "Ju mer systemstod vi kan fa, desto...det minimerar varda risk av att rakna fel." (The more system support we can get, the more it minimizes the risk of calculating wrong.)

3. **Concerned about communication as root cause of disputes**: "Den storsta utmaningen inom hantverkaryrket...det ar kommunikationen. Vad har jag lovat? Vad ar det som gors? Och vad ar det som inte gors?" (The biggest challenge in the trades is communication. What did I promise? What is being done? And what is not being done?) -- Lines 149-153.

4. **Excited about customer portal**: "Dar vill vi ha nar det ar klart, sa vill vi att det ska vara klart, liksom." (When it's done, we want it to be done.) -- He is frustrated by unfinished work requiring callbacks.

5. **Worried about system complexity**: "Det maste vara enkelt. Jag kommer ihag att jag testade en massa olika system forut. Till slut sa slutade de med att anvanda det." (It must be simple. I remember testing lots of different systems before. Eventually they stopped using them.) -- Line 709.

6. **Enthusiastic about AI-first approach**: Lines 711-727 show real excitement about WhatsApp-based interactions for non-technical users.

### Implicit Knowledge (Assumed, Never Explained)

- **Bygglet**: Mentioned as their current business system but never explained. Assumed Konrad knows it.
- **Flygel/Colorama**: Paint suppliers, mentioned without explanation of their business model or delivery note systems.
- **ROT/RUT mechanics**: The 30%/50% deduction system is referenced but not explained from scratch.
- **BRF governance structure**: "ordforande" (chairman), "styrelse" (board), "boende" (residents) -- the whole cooperative housing governance model is assumed knowledge.
- **UV (underentreprenoer)**: Used interchangeably with UE, no explanation of the legal relationship.
- **Fortnox**: Assumed to be known as Sweden's dominant bookkeeping platform.
- **NCS color system**: Referenced as "NCS S0502-Y" type codes without explanation.
- **Lopande rakning**: Running account billing -- assumed to be understood.

### Tangents, Interruptions, and Conversational Dynamics

- **Konrad's Chinese paint tangent** (line 107): Konrad suggests importing paint from China. Kimmo politely deflects: "Fargen ar ju lite specifik." This idea never resurfaces and was clearly not taken seriously.

- **Konrad's 360-degree camera idea** (lines 155-159): Konrad gets excited about using AI cameras for room scanning and color selection. Kimmo says "Ja, exakt" but the idea is more Konrad's vision than Kimmo's request.

- **Konrad's insurance idea** (lines 191-195): Konrad proposes selling a "pricing insurance" where customers pay 2000 SEK for a price guarantee. Kimmo acknowledges it but says "lite komplicerat" (a bit complicated) and steers back to trust-based selling.

- **Phone call interruption** (line 161): Konrad's daughter calls. Brief interruption.

- **Personal tangent about podcasts** (lines 397-403): Brief sidebar about Alex Schulman and Sigge Eklund, completely unrelated to the product.

- **Gloria interruption** (lines 489-493): Someone named Gloria arrives. Brief social interruption.

### Hesitations and Disagreements

- **Konrad pushes running account pricing** (lines 183-189): Konrad advocates for running account billing (his brother does landscaping this way). Kimmo pushes back, explaining that customers are suspicious and fixed pricing is psychologically more effective for closing deals.

- **Bookkeeping system scope** (lines 483-505): Konrad wants to build bookkeeping into the system. Kimmo seems cautious but agrees to a shadow system approach.

- **Sub-subcontracting and system access** (lines 657-694): Konrad pushes hard on the network effect of UEs using the same system independently. Kimmo agrees but with visible hesitation about competitive risk -- "Det ar klart att da kan de konkurrera med er." (Of course then they can compete with you.)

### Critical Quotes

1. **"Den storsta utmaningen inom hantverkaryrket...det ar kommunikationen."** (The biggest challenge in the trades is communication.) -- Line 149

2. **"Ju mer systemstod vi kan fa, desto...det minimerar varda risk av att rakna fel."** (The more system support we can get, the more it minimizes our risk of miscalculation.) -- Line 57

3. **"Det maste vara enkelt. Jag kommer ihag att jag testade en massa olika system forut. Till slut sa slutade de med att anvanda det."** (It must be simple. I remember testing lots of different systems before. Eventually they stopped using them.) -- Line 709

4. **"Vi ar absolut inte billigast utan vi ligger i dyrutsegmentet."** (We are absolutely not the cheapest; we are in the premium segment.) -- Line 53

5. **"Ingen vill egentligen vara underentreprenoer."** (Nobody actually wants to be a subcontractor.) -- Line 651

6. **"Kunden har en forvantning av att det ska bli ett resultat som de inte betalar for."** (The customer has an expectation of a result they are not paying for.) -- Line 75

### Topics Mentioned But Not Fully Explored

- **Chat service provider details** (1800 SEK/month + 175 SEK/lead) -- mentioned once, never discussed whether to replace or integrate.
- **Seasonal cash flow cycles** -- implied by summer BRF work but never explicitly discussed.
- **Employee vs. UE legal/tax implications** -- alluded to but not explored.
- **Warranty/guarantee handling** ("garantiarende") -- mentioned at line 615 but immediately moved past.
- **Multiple quote comparison** -- Kimmo mentions customers getting 5 quotes; no discussion of how to compete on that.
- **Lisa's actual workflow** -- referenced repeatedly as the gold standard but never mapped in detail.
- **Existing Bygglet system limitations** -- mentioned but never catalogued.

---

## B) ALPHA SPEC ANALYSIS

### Structure and Organization

The spec is organized into 14 sections:

0. How to read (meta-section with RFC 2119 modal definitions)
1. Vision & Design Principles
2. Personas & User Journeys (6 detailed user journeys)
3. Conceptual Data Model (7+1 entities)
4. System Capabilities (9 capability areas with requirement tables)
5. Interaction Modes (Messaging, App, Broadcasts)
6. AI Behavior (principles, capabilities, context protocol)
7. Business Rules (ROT/RUT, VAT, pricing, data ownership)
8. Integrations (mandatory, important, future)
9. Scaling Requirements (capacity, performance, availability)
10. Security & Compliance
11. Metrics & Success Criteria
12. Glossary
13. Scope Exclusions (what Resonansia is NOT)
14. Appendices (technical recommendations, market context, risk matrix)

This is a remarkably complete enterprise-grade spec for a document generated from a casual conversation. The structure follows a logical progression from vision through implementation concerns.

### RFC 2119 Modals (SKALL/BOR/KAN)

The spec defines three levels mapped to RFC 2119:
- **SKALL** (MUST) -- obligatory
- **BOR** (SHOULD) -- strongly recommended, deferrable with justification
- **KAN** (MAY) -- optional

Usage is generally disciplined. Counting approximate occurrences:
- SKALL appears extensively in sections 3-10 (data model rules, capability requirements, security)
- BOR is used for things like offline support (INT-APP-07), economic dashboards (CAP-EKO-04), BankID authentication (SEC-02)
- KAN appears less frequently, mainly for tenant-specific customizations

Some questionable classifications:
- **CAP-UE-07** "UE SKALL kunna bli en egen tenant med ett klick" is marked MUST. In the conversation, this was Konrad's enthusiasm more than Kimmo's requirement. This seems over-prioritized.
- **CAP-DOK-03** "PDF:er SKALL stodja hoger-till-vanster-text (arabiska)" is marked MUST. Arabic RTL for PDFs is a significant engineering investment for an MVP. In the conversation, Arabic was mentioned only in the context of work order translation for Aziz.

### Requirement ID System

The system uses a hierarchical prefix scheme:
- **DP-** = Design Principles (01-06)
- **P-** = Personas (01-05)
- **UJ-** = User Journeys (01-06)
- **R-TEN/LAB/NOD/EDG/FED/EVT/BLO/DIC-** = Data model rules
- **CAP-PRJ/OFR/TID/MAT/FAK/KOM/UE/EKO/DOK-** = Capability requirements
- **INT-MSG/APP/UTS-** = Interaction mode requirements
- **AI-P/CAP/DICT-** = AI behavior
- **BR-ROT/VAT/PRI/DATA-** = Business rules
- **INT-** = Integration requirements
- **PERF/AVAIL/SEC/GDPR-** = Non-functional requirements

This is well-organized and provides good traceability. Each requirement can be referenced individually.

### What from the Conversation Made It In

Almost every major topic from the conversation found its way into the spec:
- Customer acquisition via Google Reviews
- Quote-to-project flow
- Fixed price labor + material estimate
- BRF vs. private customer distinction
- Subcontractor portal with WhatsApp
- Language translation for UEs
- Photo documentation and daily reporting
- Customer portal with transparency
- Delivery note tracking from Flygel
- ROT/RUT handling and Skatteverket integration
- BankID authentication
- Fortnox integration
- Upselling/additional work orders
- Post-project Google Review requests
- Multiple payment options
- Margin visibility and project economics

### What Was Left Out

1. **Kimmo's specific pricing benchmarks**: The 60 sqm apartment = 40,000-110,000 SEK range, and the 30-35% material cost ratio. These concrete numbers from domain expertise did not become formal business rules in the spec, though they inform the system's design.

2. **Paint supplier specifics** (Flygel, Colorama): Named once in an appendix example (INT-11) but the detailed workflow of project-numbered delivery notes via email was abstracted away.

3. **Lisa's pen-and-paper preference**: Mentioned in the conversation as a UX challenge but not addressed as a specific design constraint in the spec.

4. **Kimmo's personal quoting style** vs. Lisa's methodical approach: The spec treats quoting as a uniform process, losing the interesting distinction between intuitive/experienced vs. systematic quoting styles.

5. **The BRF chairman's psychology** ("Berit i lagenheten langst ner"): This rich behavioral insight about BRF stakeholder management was not captured.

6. **Wallpaper-specific challenges**: Mentioned as worst margins, the Djursholm anecdote -- not reflected anywhere in the spec.

7. **The chat service cost structure** (1800 SEK/month + 175 SEK/lead): Not captured.

8. **The "glabjekalkyl" (overly optimistic quoting)** dynamic between Kimmo and Lisa: Lost.

9. **Konrad's Chinese paint sourcing tangent**: Appropriately omitted.

10. **The insurance pricing idea**: Appropriately omitted as undeveloped.

### Claude's Own Additions (Not in the Conversation)

1. **The entire 7-table data model** (Section 3): The conversation never discussed database architecture. The node-edge-event model, labels, blobs, dicts -- all of this is Claude's architectural invention. The conversation discussed business processes; Claude translated these into a graph-based, event-sourced data model.

2. **AI Context Protocol** (Section 6.3): The five-level context hierarchy (Platform -> Tenant -> Project -> Detail -> History) with token budgeting is pure Claude invention. Kimmo never discussed AI architecture.

3. **Federation model** (Section 3.6): While the conversation touched on UEs becoming independent operators, the formal federation-edge concept with consent flows and cross-tenant data architecture is Claude's formalization.

4. **Scaling requirements** (Section 9): The 4-phase scaling strategy from 50 to 1M+ orgs, hash partitioning, quarterly event partitions -- none of this was discussed. The "dream" scaling target of 100B+ events is Claude's extrapolation.

5. **GDPR compliance** (Section 10.3): Crypto-shredding, DPA requirements, Record of Processing Activities -- none of this appeared in the conversation.

6. **Pricing tiers** (Section 7.3): Free/Pro/Business/Enterprise at specific price points (0/499/1499/99 per user) -- entirely Claude's invention.

7. **Market context appendix** (Bilaga B): Statistics on Swedish/European tradesperson numbers, ROT market size, ServiceTitan valuation, Bygglet customer base -- all Claude's research.

8. **Risk matrix** (Bilaga C): Seven identified risks with likelihood/impact/mitigation -- Claude's addition.

9. **Persona P-04 (Erik & Maria Eriksson)**: The conversation discussed "kunden" generically. Claude created named personas with specific attributes.

10. **User Journey UJ-05 (AI-insikt som forhindrar forlust)**: The conversation mentioned wanting margin visibility, but the specific anomaly detection scenario ("Eriksson-projektet: materialkostnad 15% hogre an liknande projekt i historiken") is Claude's dramatization.

11. **User Journey UJ-06 (UE blir egen kund)**: While discussed in the conversation, the specific "one-click onboarding" mechanic with federation-edge preservation is Claude's formalization.

12. **e-faktura / Peppol** (INT-10, CAP-FAK-06): Never mentioned in the conversation.

13. **ID06 integration** (INT-12): Swedish construction site ID cards -- never mentioned.

14. **North Star Metric** (Section 11.3): "Antal framgangsrikt levererade AI-insikter per dag som leder till en anvandaratgard" -- purely Claude's product strategy recommendation.

15. **Offline capability** (INT-APP-07): Not discussed in the conversation.

---

## C) GEN 0 to GEN 1 TRANSFORMATION

### Information That Survived Faithfully

1. **WhatsApp as primary UE channel**: Kimmo said UEs are "valdigt sallan svensktalande" and need translation. The spec's WhatsApp-based interaction model for UEs (UJ-02, CAP-UE-01 through UE-06) faithfully represents this.

2. **BankID for quote signing**: Kimmo explicitly said "via BankID" (line 569) and described it as looking "proffsigt" (professional). The spec captures this in CAP-OFR-05 and SEC-02.

3. **Delivery note auto-association**: Kimmo described painters using project numbers at Flygel with delivery notes arriving by email. The spec's CAP-MAT-02 and CAP-MAT-03 capture this workflow.

4. **Photo documentation requirements**: The daily photo reporting idea that both Konrad and Kimmo were enthusiastic about is well-preserved in UJ-03 and CAP-KOM-05.

5. **Customer transparency / portal**: Kimmo's passion for "transparens i projektet" is preserved in UJ-03, CAP-KOM-04, and the broadcast interaction mode.

6. **Additional work approval flow**: The three-way approval (painter proposes, backoffice prices, customer approves) from lines 257-273 is captured in the capability requirements.

7. **ROT/RUT complexity**: The need for automation, the risk of incorrect claims, customer responsibility for checking allowance -- all preserved in BR-ROT-01 through BR-ROT-06 and UJ-04.

8. **Fortnox as shadow/integration target**: The dual-running approach from lines 497-505 is reflected in INT-01 and the "not a bookkeeping system" scope exclusion (#1, Section 13).

### Information That Was Distorted or Reinterpreted

1. **"AI-first" became something much larger than discussed**: In the conversation, "AI-first" meant WhatsApp-based interactions so users don't need to learn new interfaces (lines 711-727). In the spec, AI-first became an entire architecture: 6 AI principles, 8 AI capabilities, a 5-level context protocol, model tiering, branschordlista management. The conversational intent (simplicity through natural interaction) was inflated into an AI platform architecture.

2. **Customer portal vs. no-login model**: In the conversation, Kimmo described a customer portal where customers log in (lines 147-155, with BankID login at line 569). The spec reinterprets this as a *no-login* model for customers (P-04: "Inget konto, ingen inloggning") using broadcast links. This is a philosophical choice Claude made -- arguably more modern, but it contradicts Kimmo's explicit mention of "kundportalen" with BankID login.

3. **Kimmo's company size**: The spec says "3 anstallda + 2 underentreprenorar" (P-01). In the conversation, Kimmo never gives exact numbers. He refers to "vara egna" (our own people) and "underentreprenorar" in plural, and mentions various painters, but the specific "3+2" appears to be Claude's interpolation.

4. **Fixed price vs. running account**: In the conversation, this was a nuanced negotiation topic -- Kimmo explained the psychology of both approaches, when running account works (repeat customers), and why fixed price wins for new customers. The spec simplifies this into just supporting both models without capturing the strategic insight about when to use which.

5. **The "seven tables" architectural constraint**: The spec's subtitle is "Sju tabeller. Tusen yrken. En plattform." The 7-table architecture is presented as a fundamental design principle, but this was never discussed in the conversation. It is Claude's architectural decision presented as if it were a shared vision.

6. **Multi-tenant federation concept**: The conversation discussed UEs potentially using the same system independently (lines 645-694). Claude transformed this into a formal federation architecture with consent flows, cross-tenant edges, and data isolation -- a significant architectural formalization of what was a casual business discussion.

### Information That Was Lost Entirely

1. **The 30-35% material-to-labor ratio**: This is arguably one of the most valuable quantitative insights Kimmo shared, and it does not appear anywhere in the spec as a business rule or AI training data point.

2. **The "Berit i lagenheten langst ner" insight**: This behavioral knowledge about BRF stakeholder management -- that the chairman will pay premium for reliable communication because they dread dealing with complainers -- is completely lost.

3. **Wallpaper as worst-margin work**: The entire wallpaper discussion including the 4500 SEK/roll Djursholm disaster is lost. This matters for AI-assisted quoting.

4. **Lisa vs. Kimmo quoting styles**: The spec treats quoting as a uniform process. The insight that there are systematic vs. intuitive quoters, and that the intuitive ones make more errors, is lost.

5. **Paint cost inflation over 10 years**: Kimmo's personal experience of dramatic cost increases is lost.

6. **"Glabjekalkyl" risk**: Kimmo's self-awareness about overly optimistic quoting is not captured.

7. **The chat service provider cost structure** (1800 SEK/month + 175/lead): Not captured.

8. **Customer acquisition cost/process**: The Google Reviews strategy, the specific conversion funnel described in lines 10-15, is mentioned in passing but not formalized.

9. **Kimmo's competitive positioning**: "We win on trust, not price" -- this strategic insight is implied in the personas but not made explicit as a business strategy the system should support.

10. **Seasonality**: Summer = BRF facade season, scheduling around vacation periods, the rhythm of the painting business through the year.

11. **The commission/provision idea for painters** (line 281): Kimmo suggested painters could earn commission on upselling. This incentive structure is absent from the spec.

12. **Repeat customer dynamics**: Kimmo described how third-time customers willingly switch to running account because trust has been established. This lifecycle insight is lost.

13. **The estetisk radgivare (aesthetic advisor) role** (line 283-285): Painters functioning as color/design consultants is mentioned but not captured in the spec's personas or user journeys.

### How Conversational Nuance Was Handled

**Tone flattening**: The conversation is warm, informal, full of laughter and half-finished sentences. Kimmo uses "javla" (damn) when discussing paint prices, sighs about Berit, and lights up about transparency. The spec is uniformly professional and bureaucratic. All emotional texture is stripped.

**Negotiation dynamics erased**: In the conversation, there is genuine back-and-forth. Konrad pushes ideas (Chinese paint, insurance pricing, 360-degree cameras) and Kimmo gently deflects or redirects. This negotiation -- which reveals what Kimmo actually values vs. what sounds interesting -- is collapsed into a flat requirement list where everything has equal footing.

**Emphasis inversion**: In the conversation, Kimmo's #1 concern is communication/transparency (he returns to it repeatedly). In the spec, communication is one of nine capability areas (Section 4.6), given equal weight to document generation (Section 4.9). The spec does not convey that communication is the *primary* pain point.

**Certainty inflation**: Kimmo often says things tentatively -- "det skulle vara bra kanske" (it would maybe be good), "vi far se hur vi landar" (we'll see how we land). The spec converts these into SKALL (MUST) requirements. Conversational exploration became mandatory functionality.

**Konrad's ideas elevated**: Several ideas that were clearly Konrad's enthusiasm (360-degree cameras, network-effect federation, AI anomaly detection) appear in the spec with the same authority as Kimmo's core needs (quote accuracy, communication logging, delivery note tracking). The spec does not distinguish between the domain expert's requirements and the developer's architectural ambitions.

**The "we'll figure it out later" moments lost**: Multiple times in the conversation, both parties explicitly defer decisions: "Det dar kan vi titta pa senare" (We can look at that later) at line 335, or "Vi far se hur vi landar" (We'll see how we land) at line 243. The spec does not preserve this uncertainty -- everything is presented as decided.

---

## Summary Assessment

The transformation from voice recording (Gen 0) to alpha spec (Gen 1) is simultaneously impressive and problematic. The spec captures the *scope* of what was discussed with high fidelity and adds enormous structural and architectural rigor. However, it:

1. **Over-architects** -- adding a complete data model, scaling strategy, and AI framework that were never discussed
2. **Under-captures domain expertise** -- losing the quantitative benchmarks, behavioral insights, and competitive strategy that make Kimmo's knowledge uniquely valuable
3. **Equalizes everything** -- treating Konrad's speculative ideas with the same weight as Kimmo's core business needs
4. **Strips emotional signal** -- removing the passion, frustration, and emphasis that reveal what actually matters most
5. **Inflates certainty** -- converting tentative exploration into mandatory requirements
6. **Invents a customer persona model** (no-login broadcasts) that partially contradicts the conversation's explicit discussion of a customer portal with BankID login

The spec is a good *starting point* for building software, but a poor *record* of what was actually discussed and decided. It would benefit from a separate "conversation insights" document that preserves the domain knowledge, competitive strategy, and emotional priorities that the formal spec structure discards.

---

### Agent 2: Read Gen 2: tech spec and companions
**Type:** general-purpose

#### Prompt
````
You are a research analyst studying specification evolution. Read these Generation 2 documents COMPLETELY and provide detailed analysis:

1. `docs/resonansia-spec.md` (~1766 lines) — The master technical specification
2. `docs/tech-decisions.md` (~334 lines) — Stack lock companion
3. `docs/design-system.md` (~317 lines) — UI primitives
4. `docs/integration-twins.md` (~481 lines) — External API contracts
5. `docs/resonansia-scenarios.md` (~657 lines) — User scenarios for validation

For your analysis, provide:

A) MASTER TECH SPEC ANALYSIS:
- Complete structural breakdown (sections, block types like AXIOM/INTERFACE/BEHAVIOR/SCHEMA/RULE)
- The 7-table architecture — how is it defined?
- Event sourcing and bitemporality — how is it specified?
- AI boundaries — what rules constrain AI behavior?
- RLS and federation — how is security specified?
- Swedish construction domain terms — how are they handled in the English spec?
- What structural patterns does this spec use that make it "buildable"?

B) COMPANION DOCUMENTS:
- What does each companion document add that the master spec doesn't cover?
- How do they relate to each other?
- Are there contradictions between documents?

C) GEN 1 → GEN 2 TRANSFORMATION (you may not have Gen 1, but analyze):
- How did a tech-agnostic product spec become a specific technical architecture?
- What technical decisions are made (7 tables, event sourcing, bitemporality)?
- What formality patterns emerged (AXIOM/INTERFACE/SCHEMA/RULE)?
- How is the Swedish → English transition handled? Are domain terms preserved?
- What is the "formality level" of this generation compared to a typical tech spec?

D) PATTERN CATALOG:
- List every structural pattern used in these documents (block types, naming conventions, cross-references, constraint formats)
- How do these patterns support machine-readability?
- Which patterns would be most useful for an AI coding agent?

Be thorough. Quote specific passages. This feeds into a larger research report on spec evolution.
````

#### Response

I now have complete access to all five documents. Let me compile the comprehensive analysis.

---

# Generation 2 Specification Analysis: Resonansia NLSpec v2.0 and Companion Documents

## A) MASTER TECH SPEC ANALYSIS (`docs/resonansia-spec.md`, 1767 lines)

### A.1 Complete Structural Breakdown

The spec is organized into 13 sections (numbered 0-12), each serving a distinct architectural concern:

| Section | Title | Lines | Focus |
|---------|-------|-------|-------|
| 0 | How To Read This Spec | 1-41 | Meta-specification: block type definitions, conventions, companion doc registry |
| 1 | System Identity | 44-103 | Axioms, anti-patterns ("What Resonansia Is NOT") |
| 2 | Data Model | 106-791 | The 7+1 table architecture, all SCHEMA/INTERFACE/INVARIANT definitions |
| 3 | Interaction Modes | 795-925 | Conversation, Application, Broadcasts |
| 4 | Core Capabilities | 929-1148 | Project mgmt, quoting, time, materials, invoicing, subcontractors, comms, docs |
| 5 | AI Behavior | 1151-1342 | Principles, capabilities, context protocol, anomaly shield, blind spots, glossary |
| 6 | Business Rules | 1346-1437 | ROT/RUT, VAT, pricing tiers, data ownership |
| 7 | Integrations | 1441-1514 | Required and recommended integration interfaces |
| 8 | Security & Compliance | 1518-1627 | Auth, RLS, GDPR, data protection |
| 9 | Performance & Scaling | 1631-1689 | Capacity targets, latency SLAs, scaling phases |
| 10 | Success Metrics | 1693-1723 | North Star metric, product and technical KPIs |
| 11 | Technical Recommendations | 1726-1741 | Non-binding guidance table |
| 12 | Glossary | 1744-1767 | Domain term definitions |

**Block Types Used:**

The spec defines six formal block types in Section 0 (lines 25-29):

1. **INTERFACE** -- Contracts with typed fields. Example from line 173: `INTERFACE Tenant: id: Uuid7, status: TenantStatus...`
2. **INVARIANT** -- Properties that must always hold. These are the hard constraints. Example from line 186: `INVARIANT tenant_column: tenant_id MUST exist as a column in every data table except tenant and label.`
3. **BEHAVIOR** -- Observable system behavior specifications. Example from line 806: `BEHAVIOR message_receive: WHEN an incoming message arrives via WhatsApp or SMS THEN the system MUST...`
4. **RULE** -- Business rules with deterministic logic. Example from line 1351: `RULE rot_calculation: rot_deduction = SUM(labor_events.total) x 0.30`
5. **SCHEMA** -- Strict data shapes. Example from line 143: `SCHEMA Address: street: String, street2: String | null...`
6. **ENUM** -- Enumerated value types. Example from line 179: `ENUM TenantStatus: active | suspended | deleted`

Additionally, the spec uses two meta-block types not listed in Section 0:
- **AXIOM** -- Design-level constraints that are philosophical rather than implementational (lines 59-91, seven total: AXIOM-01 through AXIOM-07)
- **NOT** -- Anti-pattern declarations (lines 96-102, six total: NOT-01 through NOT-06)

**Block Count Summary (approximate):**

| Block Type | Count | Primary Location |
|-----------|-------|-----------------|
| AXIOM | 7 | Section 1.1 |
| NOT | 6 | Section 1.2 |
| INTERFACE | 16 | Sections 2, 5, 7 |
| SCHEMA | 25+ | Sections 2.2, 2.5.1, 2.6.1, 2.7.1, 2.8.5, 2.9 |
| INVARIANT | 55+ | Throughout Sections 2, 5, 7, 8, 9 |
| BEHAVIOR | 35+ | Sections 2, 3, 4, 5 |
| RULE | 12 | Section 6 |
| ENUM | 4 | Sections 2.3, 2.7, 2.8 |

### A.2 The 7-Table Architecture

The architecture is codified as AXIOM-03 (line 69): `"Seven tables, nothing more. All business logic is represented in seven conceptual entities. Complexity is handled through composition, not new tables."`

The seven tables plus one cross-tenant relation are defined in Section 2.1 with an ASCII entity diagram (lines 114-135):

1. **TENANT** (Section 2.3) -- Physical isolation boundary. Fields: id, status, region, created_at. Four invariants enforce region assignment, column presence, isolation, and soft-delete behavior.

2. **LABEL** (Section 2.4) -- The system's type system. This is perhaps the most architecturally distinctive choice. Rather than creating separate tables for project types, event types, units, currencies, and locales, all classification is done through labels with a `domain` and `code`. Line 200: `"Types are data-defined, not code-defined. Adding a new business entity type MUST be a data operation (INSERT into label), NOT a code change."` Eight required domains are specified at launch (node_type, edge_type, event_type, node_state, unit, currency, locale, blob_kind).

3. **NODE** (Section 2.5) -- Universal entity container. Everything that "exists" (organizations, persons, customers, projects, products, locations, suppliers) is a node. The `type_id` references a label, and the `data` field contains a JSON payload validated against type-specific schemas (NodeData_Org, NodeData_Person, NodeData_Customer, NodeData_Project, NodeData_Product, NodeData_Location, NodeData_Supplier -- seven node data schemas total).

4. **EDGE** (Section 2.6) -- Directed typed relationships between nodes within the same tenant. Seven edge data schemas defined (MemberOf, AssignedTo, SubcontractorOf, CustomerOf, LocatedAt, SupplierOf, UsesProduct).

5. **EVENT** (Section 2.8) -- The core of the system. Everything that "happens." Append-only, bitemporally tracked, with ten event data schemas. This entity receives the most specification attention (~300 lines including all sub-sections).

6. **BLOB** (Section 2.9) -- Binary content metadata. No actual binary data in the database -- only URLs and metadata.

7. **DICT** (Section 2.10) -- Translations, configuration, and semantic data. Supports platform-global and tenant-specific values.

8. **FEDERATION EDGE** (Section 2.7) -- The "+1" table. Cross-tenant consent-based relations with projection scopes. Lines 407-466 define the entity, its invariants, and the critical restriction that `"Custom Projection Scopes MAY ONLY restrict data further than the platform defaults. A custom projection MUST NEVER expand visibility beyond its base template."` (line 455).

The architecture is notable for its radical normalization -- everything is flattened into generic containers (nodes, edges, events) with the type system pushed into the LABEL table. This is a graph database pattern implemented on a relational database.

### A.3 Event Sourcing and Bitemporality

This is specified in Sections 2.8 through 2.8.5, comprising roughly 300 lines of specification.

**Bitemporality** (Section 2.8.1, lines 553-570):

The spec defines two time axes explicitly:

- **Transaction Time** = embedded in `id` (UUIDv7). Line 558: `"Embedded in id (UUIDv7). Monotonically increasing, immutable. Defines WHEN the system learned about the event."`
- **Valid Time** = stored as `occurred_at`. Line 561: `"Defines WHEN the event happened in the real world. Can be clock-skewed or retroactively set."`

The spec then makes two critical distinctions:
- State resolution uses Transaction Time (line 563): `"State resolution (which adjustment is 'current') MUST use Transaction Time (id), NOT Valid Time (occurred_at)."`
- Reporting uses Valid Time (line 567): `"Business logic and reporting (e.g., 'Hours worked in March') MUST group by Valid Time (occurred_at)."`

**Append-Only & Corrections** (Section 2.8.2, lines 572-591):

The correction model uses a "root pointer" pattern rather than a chain. Line 578: `"An adjustment event MUST always point its ref_id to the ORIGINAL root event."` This avoids recursive chain resolution and is explicitly paired with a SQL resolution pattern.

Line 586-590 provides a concrete example: `"If Event A (qty=8) is corrected by Event B (qty=6, ref_id=A), and later corrected by Event C (qty=7, ref_id=A): The active quantity is 7 (Event C has the highest id)."` This is unambiguous enough for direct implementation.

**Economic Aggregation** (Section 2.8.3, lines 593-665):

This section includes a full SQL query pattern using window functions (lines 628-648):

```sql
WITH ranked AS (
  SELECT
    COALESCE(e.ref_id, e.id) AS root_id,
    ...
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(e.ref_id, e.id)
      ORDER BY e.id DESC
    ) AS rn
  FROM events e
  ...
)
SELECT * FROM ranked WHERE rn = 1
```

The spec explicitly forbids alternatives (lines 661-664): `"The agent MUST NOT: Load all events into JavaScript and filter/sort in memory. Use recursive CTEs for adjustment chain resolution. Skip the window function approach in favor of multiple queries."`

### A.4 AI Boundaries

AI constraints are distributed across multiple sections but converge on a single philosophy: AI proposes, humans decide, and the system computes.

**AXIOM-02** (line 63): `"AI as intermediary, never as decision-maker. AI interprets, suggests, generates, translates. AI never decides on behalf of the user."`

**The arithmetic prohibition** is specified as INVARIANT ai_no_arithmetic (lines 1171-1178): `"AI MUST NEVER perform arithmetic directly. Calculations (sums, margins, VAT, totals) MUST always be done by deterministic code. Specifically: when AI extracts data (OCR, quote generation, message parsing), it MUST output only qty and unit_price (or raw extracted values). The system MUST compute total = qty x unit_price AFTER AI returns. If AI returns a 'total' field, it MUST be ignored and recomputed."`

**The transient proposal pattern** (Section 2.8.4, lines 667-683): `"AI-generated proposals (quotes, invoice drafts) MUST NOT be written as Events until explicitly approved by a human."` The lifecycle is specified: AI output is held as JSON in the application layer, only becoming events when the user clicks "Approve," at which point each event gets `origin=ai_generated`.

**AI tiering** (INVARIANT ai_tiering, line 1167): `"System MUST use cost-effective model per task: cheap model for classification, expensive for complex generation."` This is further detailed in the INTERFACE AiCapability block (lines 1189-1240), where each capability specifies its model tier and latency target.

**The context protocol** (Section 5.3) defines five levels of context (0-4) with explicit token budgets and a degradation strategy. Lines 1273-1285 specify dynamic resolution and truncation transparency -- an unusual level of detail for a product spec.

**The anomaly shield** (Section 5.4, lines 1290-1308) specifies a two-phase statistical filtering system that annotates outlier events rather than excluding them. Line 1304: `"Flagged events are NOT excluded silently. They are annotated in the AI prompt."`

### A.5 RLS and Federation

Security is specified through a layered approach:

**Layer 1: Database RLS** (INVARIANT auth_rls, line 1537): `"Every database query MUST be filtered on tenant_id (Row Level Security)."` The JWT must contain tenant_id (INVARIANT auth_jwt_tenant, line 1531).

**Layer 2: Federation via SECURITY DEFINER** (lines 1539-1574): The `has_federation_access()` function is specified in detail, including its SQL signature, the bidirectional check against federation_edges, and performance requirements (must be index-backed). The spec includes three explicit prohibitions (lines 1567-1569): never disable RLS for federation, never use service_role key, never create bypass functions.

**Layer 3: Application-layer projection masking** (lines 1562-1565): `"has_federation_access() grants ROW-LEVEL access only. The Projection Scope masking (which COLUMNS/FIELDS are visible) is STILL enforced in the application layer via Zod schemas. The database lets you SEE the row; the app layer controls WHAT you see in it."`

This three-layer model is architecturally distinctive: the database handles row-level access, but column/field visibility is delegated to the application layer, using three predefined projection schemas (SubcontractorProjectionView, ClientProjectionView, SupplierProjectionView at lines 479-501).

### A.6 Swedish Construction Domain Terms

The spec is written in English but preserves Swedish domain terms in specific contexts:

- **ROT/RUT** -- Tax deduction terms used throughout without translation, defined in the Glossary (lines 1765-1766): `"ROT: Renovation tax deduction -- 30% on labor cost in Sweden. RUT: Cleaning/maintenance tax deduction -- 50% on labor cost in Sweden."`
- **UE** -- Glossary line 1764: `"Subcontractor (Swedish: underentreprenoer)."`
- **Personnummer** -- Used in NodeData_Customer.rot_rut_person_number and in scenarios
- Product names preserved in Swedish: `"Alcro Besta Vaggfarg Helmatt Vit 10L"` (line 330)
- Currency formatting specified in Swedish style: `"45 000,00 kr"` (in design-system.md)
- PDF layout uses bilingual headers: `"OFFERT / QUOTE"`, `"Till / To:"` (in design-system.md)

The approach is pragmatic: the spec is English-first for agent consumption, but all user-facing content, regulatory terms, and industry vocabulary retain their Swedish originals. The AI Industry Glossary (Section 5.6) explicitly requires trade term preservation per language.

### A.7 Structural Patterns That Make This Spec "Buildable"

Several patterns distinguish this from a typical product requirements document:

1. **Typed block structure** -- Every specification statement is categorized (INVARIANT, BEHAVIOR, RULE, SCHEMA, INTERFACE), making it parseable by an agent that can distinguish "what must always be true" from "what the system should do" from "what shape data takes."

2. **Concrete SQL patterns** -- The spec includes actual SQL (the active event resolution query at lines 628-648, the RLS policy pattern), not just descriptions.

3. **Negative constraints ("MUST NOT")** -- Throughout the spec, forbidden patterns are explicitly listed. The most notable are the "agent MUST NOT" blocks at lines 661-664 and 1567-1569. These prevent common implementation mistakes.

4. **Priority order specifications** -- For example, time pricing (lines 1008-1011) specifies a three-level lookup priority: project-specific rate > person default rate > manual input.

5. **Lifecycle specifications** -- State machines are specified as text transitions: `"draft -> active -> in_progress -> completed -> archived"` (line 935).

6. **Sequence diagrams in ASCII** -- The WhatsApp time report flow (lines 849-863) uses ASCII art to show the exact message exchange.

7. **Companion document separation** -- The spec explicitly declares what it covers and what belongs elsewhere (line 333: `"What This File Does NOT Cover"` is in tech-decisions.md, referring back to the master spec).

---

## B) COMPANION DOCUMENTS ANALYSIS

### B.1 `docs/tech-decisions.md` (334 lines) -- Stack Lock

**What it adds:** This document answers the question the master spec deliberately leaves open: "what technologies do we use?" The master spec is described as "technology-agnostic by design" (line 14 of tech-decisions.md), and this document locks choices for V1.

**Key additions not in the master spec:**

1. **Complete technology stack table** (lines 20-42): 20 specific technology choices with rationales, from TypeScript to 46elks SMS.

2. **Drizzle-specific gotchas** (lines 44-51): `"db.execute() result: result as unknown as T[], WRONG: result.rows as T[]"` -- This is implementation-level knowledge specific to the postgres-js driver that no agent could infer from the master spec.

3. **Next.js architecture rules** (lines 56-101): Four RULE blocks (nextjs_data_fetching, nextjs_mutations, nextjs_route_handlers, nextjs_client_components) with CORRECT/INCORRECT examples. These constrain a known source of architectural confusion in Next.js App Router development.

4. **Project directory structure** (lines 107-139): Explicit package layout mapping spec concepts to code locations (packages/db, packages/core, packages/shared, etc.).

5. **Database conventions** (lines 144-156): Column naming, partitioning strategy, index minimums.

6. **AI model configuration** (lines 285-306): Specific model names (gpt-4o-mini, claude-haiku-4-5, claude-sonnet-4-5) and max token limits per tier.

7. **Token counting rule** (lines 309-326): `"The agent MUST NOT estimate tokens via string.length / 4 or similar heuristics."` -- A specific anti-pattern prevention.

**Relationship to master spec:** The tech-decisions file is explicitly subordinate. It implements the master spec's technology-agnostic interfaces with specific choices. The master spec refers to it via `"See tech-decisions.md for binding stack choices"` (line 1728).

### B.2 `docs/design-system.md` (317 lines) -- UI Primitives

**What it adds:**

1. **Design philosophy** (lines 12-21): Five principles written for the target user persona: `"A painter who has never used business software should understand the dashboard in 10 seconds."` The master spec says nothing about UX philosophy.

2. **Color system** (lines 38-51): Specific hex values and Tailwind classes. Notably, the AI content palette (`violet-50`, `violet-700`, `violet-200`) is mapped to AXIOM-05 compliance: `"All AI-generated content uses this palette to satisfy AXIOM-05"`.

3. **Typography** (lines 57-70): Font choices (Inter, Noto Sans Arabic), sizes, and number formatting rules: `"ALWAYS right-aligned, monospace font, locale-formatted. Swedish: '45 000,00 kr'"`.

4. **Layout patterns** (lines 76-160): ASCII wireframes for Dashboard (desktop and mobile) and Project Detail views.

5. **Component taxonomy** (lines 164-201): 16 named components organized into Data Display, AI Content, Forms & Input, and Communication categories.

6. **PDF document templates** (lines 272-307): Detailed ASCII layout for quote PDFs with bilingual Swedish/English headers and ROT deduction breakdown.

**Relationship to master spec:** The design system operationalizes the master spec's BEHAVIOR blocks into visual components. For example, BEHAVIOR app_dashboard (master spec line 871) specifies what must be shown; the design system specifies how it looks.

### B.3 `docs/integration-twins.md` (481 lines) -- Digital Twin Contracts

**What it adds:**

1. **Seven complete API contracts** -- Request/response schemas for WhatsApp, SMS (46elks), Fortnox, BankID, Email (Resend), Skatteverket ROT/RUT, and Supabase Storage. Each includes exact JSON payloads.

2. **Twin behavior specifications** -- For each service, specific simulation rules: rate limit thresholds (WhatsApp: 429 after 80 msg/s), auto-incrementing IDs, state management, failure simulation endpoints.

3. **Swedish-specific APIs** -- The Skatteverket ROT/RUT twin (lines 349-389) specifies request fields in Swedish (`utforare_orgnr`, `mottagare_personnr`, `avdrag_typ`) and response statuses (`mottagen`, `avvisad`, `MAX_OVERSKRIDEN`). BankID (lines 234-294) specifies the Swedish digital signing flow including `personalNumber` format validation and auto-start tokens.

4. **Infrastructure** (lines 430-473): Single Express.js server on port 9999 with path-based routing and environment variable configuration for test/production switching.

5. **Control endpoints** (lines 449-454): `POST /twin/reset`, `GET /twin/inspect/{service}`, `POST /twin/simulate-incoming`, `POST /twin/fail-next/{service}`.

**Relationship to master spec:** The master spec defines INTERFACE blocks for integrations (Section 7.1-7.2) at an abstract level. The twins document provides the concrete HTTP contracts these interfaces must implement against. The master spec says `"send_sms(to: PhoneNumber, text: String) -> MessageId"` -- the twins doc says exactly what JSON that means against the 46elks API.

### B.4 `docs/resonansia-scenarios.md` (657 lines) -- Holdout Validation Set

**What it adds:**

1. **Five named personas** (lines 30-39): Kimmo (business owner), Aziz (subcontractor, Arabic-speaking), Lisa (office admin), Erik & Maria Eriksson (homeowner customers), Johan (BRF chairman). Each with role, primary interface, and language.

2. **14 end-to-end scenarios** (S-01 through S-14): Each structured as Preconditions -> Steps -> Expected System Behavior -> Satisfaction Criteria (checkboxes).

3. **Validation methodology** (lines 617-657): Probabilistic validation (N >= 20 runs, >95% satisfaction target), LLM-as-judge for quality assessment, and seven "key invariants to verify across ALL scenarios" (lines 649-657).

4. **Domain richness** -- The scenarios embed Swedish construction domain knowledge that the master spec only hints at. Example from S-01 (line 55): `"3 rum, 85 kvm, 2 lager, tak och vaggar, NCS S0502-Y"` -- this is a real painter's scope description including NCS color codes.

**Relationship to master spec:** This document is explicitly declared as a "holdout set" (line 8): `"This file is a holdout set. It should NOT be stored in the codebase where coding agents can see it during implementation."` It validates the master spec's BEHAVIOR and INVARIANT blocks through concrete scenarios. The irony is noted: it IS in the codebase (in docs/), though the intent is for it to be excluded from agent context during implementation.

### B.5 Contradictions Between Documents

I found no outright contradictions, but several notable tensions:

1. **AI Model Names** -- tech-decisions.md (line 299) specifies `claude-haiku-4-5` for the medium tier and `claude-sonnet-4-5` for the expensive tier. The master spec is model-agnostic (INVARIANT ai_model_agnostic at line 1163). This is by design (tech-decisions explicitly says it constrains what the spec leaves open), but if the spec were validated against a different stack, these model names would need to change.

2. **Scenarios visibility** -- The master spec declares scenarios as `"Hidden from coding agent"` (line 37), yet the file is tracked in the repository. The scenarios document reinforces this (line 8), but it is contradicted by its physical presence. This is a process tension, not a content contradiction.

3. **Offline capability** -- AXIOM-06 (line 83) says `"V1 is strictly online-first"` and marks offline as `"MAY (Phase 2)"`. This is consistent across documents, but the scenarios never test offline behavior, which confirms the deferral.

---

## C) GEN 1 TO GEN 2 TRANSFORMATION ANALYSIS

While I do not have access to the Gen 1 document, I can reconstruct the transformation by analyzing internal evidence within the Gen 2 documents.

### C.1 From Tech-Agnostic Product Spec to Technical Architecture

The master spec explicitly declares itself as an "NLSpec" -- a Natural Language Specification. Its header (lines 2-5) states: `"Natural Language Specification for non-interactive agent implementation. This document is the seed: sufficient for a coding agent to implement and for a validation harness to verify."`

The version number ("v2.0") and the note `"incorporates architecture decisions from deep analysis"` (line 7) confirm this is a second generation. The authorship `"Snack & Verkstad + Claude + Gemini"` (line 9) indicates a human-AI collaborative specification process.

The transformation involved several key decisions:

1. **The 7-table constraint** was elevated to an AXIOM (AXIOM-03), meaning it was a design decision that became a philosophical commitment. The generic graph model (nodes + edges + events) was likely derived from analyzing the domain entities in a Gen 1 product spec and recognizing that all business entities could be unified into a single polymorphic container.

2. **Event sourcing** was chosen as the persistence model, likely driven by the business requirement for auditability, correction history, and economic integrity. The append-only invariant (line 576) and the root-pointer correction pattern (line 578) are specific architectural patterns that would not appear in a product spec.

3. **Bitemporality** was introduced to handle a real-world problem: construction workers report time retroactively, and events need both "when did this happen" and "when did we learn about it." This is a technical solution to a domain problem.

### C.2 Technical Decisions Made

The major architectural decisions crystallized in Gen 2:

- **7 tables** -- radical normalization of a domain that typically requires 20-50 tables
- **Event sourcing with root-pointer corrections** -- instead of CQRS or traditional CRUD
- **Bitemporality via UUIDv7** -- encoding transaction time in the primary key itself, a clever trick that avoids a separate column
- **Labels as type system** -- making the schema extensible without code changes
- **Federation via RLS + SECURITY DEFINER** -- cross-tenant access without disabling security
- **AI boundaries** -- the "no arithmetic" rule and "transient proposals" pattern
- **Projection scopes** -- three-level visibility masking (row via DB, field via app, data via Zod)

### C.3 Formality Patterns

The formal block types (AXIOM, INTERFACE, INVARIANT, BEHAVIOR, RULE, SCHEMA, ENUM, NOT) represent a domain-specific language for specification. This is not standard software engineering practice -- it is closer to formal methods (like Z notation or TLA+) but expressed in natural language.

The hierarchy of formality:
- **AXIOM** -- Design philosophy (most abstract)
- **INVARIANT** -- Must always be true (formal property)
- **RULE** -- Deterministic business logic (algorithmic)
- **BEHAVIOR** -- Observable system behavior (testable)
- **INTERFACE** -- Contract signatures (implementable)
- **SCHEMA** -- Data shapes (validatable)
- **ENUM** -- Value domains (finite)
- **NOT** -- Anti-patterns (eliminatory)

### C.4 Swedish-English Transition

Domain terms are handled through a bilingual glossary approach:
- The Glossary (Section 12) defines Swedish terms in English: ROT, RUT, UE
- Product names and scope descriptions remain in Swedish (`"Alcro Besta Vaggfarg"`, `"3 rum, 85 kvm, 2 lager"`)
- The API fields for Skatteverket use Swedish (`utforare_orgnr`, `avdrag_typ`)
- PDF templates use bilingual headers (`"OFFERT / QUOTE"`)
- The AI Glossary capability (Section 5.6) explicitly handles per-language trade terms

This is a pragmatic "lossless" translation: the English spec preserves enough Swedish context that the implemented system will produce culturally correct Swedish output.

### C.5 Formality Level Assessment

Compared to typical tech specs, this document is significantly more formal in some dimensions and less formal in others:

**More formal than typical:**
- Explicit block typing of every statement
- MUST/SHOULD/MAY RFC 2119-style modality
- Negative constraints ("MUST NOT") with prohibited implementation patterns
- Concrete SQL patterns and sequence diagrams
- Explicit anti-patterns (NOT blocks, "agent MUST NOT" blocks)
- Cross-referencing between sections (e.g., `"per 2.8.4"`)

**Less formal than academic specs:**
- No formal grammar or BNF
- No mathematical proof obligations
- No formal state machine definitions (transitions are described textually)
- No precondition/postcondition contracts (Hoare-style)

The formality level is calibrated for an AI coding agent -- precise enough to implement unambiguously, readable enough to process without a parser, and constrained enough to prevent common implementation errors.

---

## D) PATTERN CATALOG

### D.1 Structural Patterns

| # | Pattern | Example | Location | Purpose |
|---|---------|---------|----------|---------|
| 1 | **Typed Block Declaration** | `INVARIANT tenant_isolation:` followed by body text | Throughout | Categorize spec statements by kind |
| 2 | **RFC 2119 Modality** | MUST, SHOULD, MAY with specific definitions | Section 0, lines 22-24 | Distinguish mandatory vs. optional |
| 3 | **Anti-Pattern Declaration** | `NOT-01: Not an accounting system.` | Section 1.2 | Eliminate scope confusion |
| 4 | **Negative Implementation Constraint** | `The agent MUST NOT: Load all events into JavaScript...` | Lines 661-664, 1567-1569 | Prevent known bad patterns |
| 5 | **Schema Block with Type Annotations** | `street: String`, `street2: String \| null` | Section 2.2+ | Define data shapes precisely |
| 6 | **Priority-Ordered Lookup** | `1. Project rate 2. Person rate 3. Manual input` | Lines 1008-1011 | Disambiguate resolution order |
| 7 | **ASCII Diagram** | Entity relationship diagram, sequence diagrams, wireframes | Sections 2.1, 3.1, design-system.md | Visual specification without external tools |
| 8 | **Companion Document Registry** | Table with File/Purpose/Agent Visibility | Section 0, lines 33-40 | Define document ecosystem |
| 9 | **Agent Visibility Control** | `Visible to coding agent` / `Hidden from coding agent` | Section 0 | Control information flow to AI |
| 10 | **Section Cross-Reference** | `"per 2.8.4"`, `"see section 6.1"` | Throughout | Internal linking without hyperlinks |
| 11 | **CORRECT/INCORRECT Examples** | Next.js data fetching patterns | tech-decisions.md lines 66-73 | Show right vs. wrong implementation |
| 12 | **WHEN/THEN Behavioral Spec** | `WHEN an incoming message arrives THEN the system MUST:` | Section 3.1 | Trigger-action specification |
| 13 | **Enumerated Step Sequence** | Numbered steps within BEHAVIOR blocks | Throughout | Define processing order |
| 14 | **Concrete SQL Pattern** | Window function query for active events | Lines 628-648 | Provide reference implementation |
| 15 | **Satisfaction Criteria Checkboxes** | `- [ ] ROT deduction correct: 30% of labor lines` | resonansia-scenarios.md | Testable acceptance criteria |
| 16 | **Capacity Target Table** | Horizons with numeric targets | Section 9.1 | Performance budgeting |
| 17 | **Glossary with Domain Preservation** | `ROT: Renovation tax deduction -- 30% on labor cost in Sweden` | Section 12 | Bilingual domain term definitions |
| 18 | **Phase Annotation** | `AXIOM-06: ... Phase 2` and `MAY = optional enhancement (Phase 2+)` | Throughout | Scope control per release |
| 19 | **Domain-Code Label System** | `domain: node_type, code: project` | Section 2.4 | Namespace-qualified type system |
| 20 | **Token Budget Specification** | `Level 0 -- Platform (~100 tokens, always included)` | Section 5.3 | Resource-constrained AI context |
| 21 | **Statistical Threshold Rule** | `Phase 1: Flag if value > 5x platform median` | Section 5.4 | Anomaly detection parameters |
| 22 | **Degradation Strategy** | `If > 10 projects, degrade to Level 1.5 (topline metrics only)` | Lines 1273-1279 | Graceful failure specification |
| 23 | **Non-Binding Section** | `Section 11: Technical Recommendations (Non-Binding)` | Section 11 | Separate advice from requirements |
| 24 | **Environment Variable Contract** | `WHATSAPP_API_URL=http://localhost:9999/whatsapp` | integration-twins.md lines 458-472 | Configuration specification |
| 25 | **Twin Simulation Endpoint** | `POST /twin/simulate-incoming` | integration-twins.md | Test infrastructure contract |

### D.2 Machine-Readability Support

These patterns support machine (agent) consumption in specific ways:

1. **Block typing** allows an agent to filter by category. An agent implementing the database layer can scan for all SCHEMA and INTERFACE blocks. An agent writing tests can scan for all INVARIANT and BEHAVIOR blocks.

2. **RFC 2119 modality** creates a clear priority system. MUST-statements are non-negotiable; SHOULD-statements allow agent judgment; MAY-statements can be deferred.

3. **Negative constraints** prevent the most common failure mode of AI coding agents: implementing a plausible but incorrect pattern. The "agent MUST NOT" blocks are essentially guard rails.

4. **Concrete SQL and code patterns** eliminate ambiguity in the most critical sections. An agent does not need to infer the window function pattern -- it is provided.

5. **Cross-references** (`"per 2.8.4"`) enable an agent to resolve dependencies between specification sections without losing context.

6. **SCHEMA blocks with type annotations** map directly to Zod schemas (as specified in tech-decisions.md lines 172-195), creating a 1:1 correspondence between spec and code.

### D.3 Patterns Most Useful for an AI Coding Agent

Ranked by implementation value:

1. **SCHEMA blocks** -- These translate directly to Zod schemas and Drizzle table definitions. An agent can generate `packages/shared/schemas/*.ts` directly from these blocks.

2. **Concrete SQL patterns** -- The window function query (lines 628-648) is copy-paste-implementable. The RLS policy pattern (tech-decisions.md lines 206-246) is similarly direct.

3. **CORRECT/INCORRECT examples** -- The Next.js architecture rules (tech-decisions.md lines 61-101) prevent paradigm confusion that is extremely common with App Router.

4. **Negative constraints** -- `"MUST NOT load events into JavaScript"`, `"MUST NOT estimate tokens via string.length / 4"`, `"MUST NOT disable RLS for federation queries"` -- these prevent the most damaging mistakes an agent might make.

5. **Priority-ordered lookups** -- Time pricing priority (lines 1008-1011) eliminates decision ambiguity.

6. **BEHAVIOR blocks with WHEN/THEN** -- These map directly to test cases and server action implementations.

7. **Project directory structure** -- tech-decisions.md lines 107-139 tell the agent exactly where to put code.

8. **Twin API contracts** -- integration-twins.md provides complete request/response schemas, enabling test-driven development against deterministic mocks.

---

## Summary Assessment

The Generation 2 specification suite represents a mature, agent-oriented specification methodology. Its key innovations are:

1. **Separation of concerns across documents** -- The master spec is technology-agnostic; tech-decisions locks the stack; design-system handles UI; integration-twins handles external contracts; scenarios handle validation. This allows different agents to receive different document subsets.

2. **Block typing as a specification DSL** -- The AXIOM/INTERFACE/INVARIANT/BEHAVIOR/RULE/SCHEMA/ENUM/NOT taxonomy creates a lightweight formal language that is simultaneously human-readable and agent-parseable.

3. **Negative specification** -- The systematic use of "MUST NOT" and "NOT" blocks is unusual in product specs but critical for AI coding agents, which tend toward plausible but incorrect implementations.

4. **Bilingual domain preservation** -- Swedish domain terms are preserved in an English specification, creating a lossless encoding of domain knowledge.

5. **Holdout validation** -- The scenarios document borrows the machine learning concept of a holdout set, preventing the coding agent from over-fitting to acceptance criteria while still providing a validation mechanism.

The formality level sits in a productive middle ground: more rigorous than a product requirements document, less formal than academic specifications, and precisely calibrated for the capabilities and failure modes of AI coding agents.

---

### Agent 3: Read Gen 3-4: bootstrap and phase specs
**Type:** general-purpose

#### Prompt
````
You are a research analyst studying specification evolution. Read these Generation 3 and 4 documents COMPLETELY and provide detailed analysis:

Generation 3:
1. `bootstrap-spec.md` (~694 lines) — The bootstrap instruction set that created the codebase from zero

Generation 4 (Phase Specs):
2. `docs/phase-1-spec.md` (~815 lines) — Database bootstrap, event system, seed data
3. `docs/phase-2-spec.md` (~877 lines) — Messaging, webhooks, notifications  
4. `docs/phase-3-spec.md` (~1206 lines) — Quoting & invoicing (recently built)
5. `docs/phase-4-spec.md` (~963 lines) — Communication & reporting (not yet built)

Also read the post-mortem:
6. `docs/phase-3-research-report.md` (~385 lines) — Quality audit after Phase 3 build

For your analysis, provide:

A) BOOTSTRAP SPEC ANALYSIS:
- Structure and organization
- The ARTIFACT/INVARIANT/VERIFY/GIT pattern — how does it work?
- How does it differ from a traditional "setup guide"?
- What makes it executable by an AI agent?
- How are the 7 phases structured?

B) PHASE SPEC EVOLUTION (compare Phase 1, 2, 3, 4):
- How does the structural pattern evolve across phases?
- What conventions were added in later phases that weren't in earlier ones?
- What mistakes or patterns were repeated?
- How specific are they? (Do they specify type signatures, function names, file paths?)
- How do they reference existing code vs. the master spec?
- Which phase spec is the "best" and why?
- Phase 3 is the most recent — what innovations does it introduce?
- Phase 4 is not yet built — how does it build on lessons from Phase 3?

C) RESEARCH REPORT ANALYSIS:
- What were the section-by-section scores for Phase 3?
- What were the main friction points?
- What are the "Three Laws of Spec Compilation"?
- What concrete recommendations does it make?
- What data does it provide about spec quality → code quality?

D) GEN 2 → GEN 3 → GEN 4 TRANSFORMATION:
- How did the master spec become a bootstrap instruction?
- How did it become individual phase specs?
- What's the relationship between the master spec and each phase spec?
- Do phase specs contradict each other or the master spec?
- What's the "formality level" of each generation?

E) PATTERN CATALOG:
- List every structural pattern used across these documents
- Track which patterns appear in which documents
- Identify patterns that were tried and abandoned
- Identify the most effective patterns for AI agent execution

Be thorough. Quote specific passages. This feeds into a larger research report.
````

#### Response

Now I have all the necessary material. Here is the complete analysis.

---

# Specification Evolution Analysis: Bootstrap through Phase 4

## A) BOOTSTRAP SPEC ANALYSIS

### Structure and Organization

The bootstrap spec (`C:\Development\handyman\bootstrap-spec.md`, 694 lines) is organized into 8 discrete sections numbered 0 through 7:

- **Section 0: Conventions** -- Establishes the metalanguage and execution model
- **Sections 1-6: Build phases** -- Each produces specific artifacts with verification
- **Section 7: Final Assembly** -- Cross-cutting verification and push

The document opens with a remarkable preamble: instructions to the human operator written in Swedish, telling "Konrad" the exact bash commands to run before feeding the spec to Claude Code:

```
> **TILL KONRAD:** Innan du matar in detta till Claude Code:
> ```bash
> mkdir resonansia && cd resonansia
> git init
> ```
```

This is a "boot loader for a boot loader" -- the human performs the minimal irreducible setup (creating a directory, initializing git, copying reference documents), then hands off entirely.

### The ARTIFACT/INVARIANT/VERIFY/GIT Pattern

This is the core structural grammar of the specification system. Each section contains four block types:

1. **ARTIFACT** -- Declarative description of what must exist after the phase. Specifies file paths, directory structures, and content requirements. Example from Section 1:
   ```
   ARTIFACT monorepo_root:
     A Turborepo monorepo with pnpm workspaces.
     CRITICAL ORDER: pnpm-workspace.yaml and root package.json MUST be
     created BEFORE running create-next-app.
   ```

2. **INVARIANT** -- Properties that must hold universally, not just within a section. These are constraints that span the entire system lifetime. Example:
   ```
   INVARIANT no_laziness:
     You MUST write complete files. DO NOT use placeholders like
     "// ... rest of code", "// TODO: implement"
   ```

3. **VERIFY** -- Concrete checks the agent must execute and confirm pass. These are the closest thing to a test suite. Example:
   ```
   VERIFY monorepo:
     1. `pnpm install` exits 0
     2. `pnpm tsc --version` prints TypeScript version
     3. apps/web/package.json exists and has next as dependency
   ```

4. **GIT** -- Exact commit commands. Every phase ends with a specific commit message following conventional commit format:
   ```
   git add -A && git commit -m "chore: initialize monorepo"
   ```

This pattern creates a **state machine for the agent**: execute artifacts, check invariants, run verification, commit. The git commits serve as checkpoints -- if something fails, the agent can reason about which phase produced the problem.

### How It Differs from a Traditional Setup Guide

A traditional setup guide describes steps for a human to follow sequentially. The bootstrap spec differs in several fundamental ways:

1. **Declarative over imperative**: Artifacts describe the *end state*, not the steps. The preamble says explicitly: "Describes the desired end state. The agent decides how to get there." However, when the agent's path-finding might fail, it provides imperative hints like `CRITICAL ORDER: pnpm-workspace.yaml and root package.json MUST be created BEFORE running create-next-app`.

2. **Anti-hang protection**: The `non_interactive_commands` invariant is specifically an AI-agent concern. Humans can respond to prompts; agents cannot:
   ```
   INVARIANT non_interactive_commands:
     All CLI tools MUST be run with flags that disable interactive prompts.
     If a tool asks for user input, the agent will hang.
   ```

3. **Context management**: The `one_phase_at_a_time` invariant acknowledges the agent's limited context window:
   ```
   INVARIANT one_phase_at_a_time:
     Do not try to hold all phases in context simultaneously.
     Read the relevant docs/ section for the current phase,
     execute it, verify, commit, then move to the next phase.
   ```

4. **Deferred delegation**: Rather than embedding the full spec content, the bootstrap points to reference documents: "docs/resonansia-spec.md -- System spec. Read relevant sections on demand." This is a form of lazy loading for context windows.

5. **Self-verification**: The agent must both build and test its own work. There is no separate QA step.

### What Makes It Executable by an AI Agent

Several design choices make this spec specifically consumable by an LLM-based coding agent:

1. **Exact CLI commands** with flags: `pnpm dlx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*" --use-pnpm --yes`

2. **Autonomous execution instruction**: "Do not pause to ask me for confirmation between phases unless an error occurs that you absolutely cannot resolve yourself."

3. **Explicit persona assignment**: "You are an autonomous execution agent, not an advisor."

4. **Structured output requirements**: The SKILL.md files must have YAML frontmatter with specific fields, specific line count limits, specific section contents.

5. **Greppable verification**: Many VERIFY steps can be checked with shell commands (`pnpm install exits 0`, `apps/web/package.json exists`).

6. **Semantic trigger words**: Skill descriptions include "Trigger words" lists for semantic matching, which is specifically an LLM retrieval mechanism.

### How the 7 Phases Are Structured

The bootstrap has a deliberate dependency ordering:

| Phase | Content | Dependency |
|-------|---------|------------|
| 1 | Monorepo Foundation | None (first) |
| 2 | CLAUDE.md | Phase 1 (needs project structure) |
| 3 | Skills | Phase 2 (skills complement CLAUDE.md) |
| 4 | Shared Schemas | Phase 3 (schemas referenced by skills) |
| 5 | Database Layer | Phase 4 (uses shared schemas) |
| 6 | Digital Twins & Integrations | Phase 5 (needs DB schema for contracts) |
| 7 | Final Assembly | All above (cross-cutting verification) |

This ordering follows a "foundation up" approach: infrastructure first, then knowledge layer (CLAUDE.md + skills), then data definitions, then database, then external interfaces. Each phase's verify step only tests its own outputs, while Phase 7 re-verifies everything.

---

## B) PHASE SPEC EVOLUTION

### Structural Pattern Evolution

All four phase specs (Phase 1 through Phase 4) share the bootstrap's core grammar but evolve significantly:

**Phase 1** (815 lines, 10 sections) closely mirrors the bootstrap's style. It introduces one new convention:
```
INVARIANT spec_is_source_of_truth:
  When in doubt, read the relevant section of docs/resonansia-spec.md.
```

**Phase 2** (877 lines, 9 sections) adds scenario references and dependency declarations in the header:
```
> **Validates scenarios:** S-02, S-09
> **Depends on:** Phase 1 (auth, tenants, nodes, edges, events, economics, UI)
```

This was absent from Phase 1. It also introduces phase-specific invariants like `messaging_creates_events` and `test_against_twins`.

**Phase 3** (1206 lines, 12 sections) is the largest spec and introduces several structural innovations:
- A **conditional dependency clause**: "If Phase 2 is not complete, delivery falls back to email-only"
- The `ai_arithmetic_boundary` invariant elevated to section 0 (conventions), signaling it is a cardinal rule
- A **build-order rationale** in section 1: "Build this first -- it's a pure calculation module with no AI or UI dependencies. Everything else in this phase depends on it."
- **Design decision delegation with options**: "Two valid storage strategies (choose one)"
- **Numerical test vectors** with exact expected outputs in VERIFY blocks

**Phase 4** (963 lines, 9 sections) is the most mature structurally. It introduces:
- The `drizzle_raw_sql` convention, which is a **lesson learned** from Phase 3:
  ```
  INVARIANT drizzle_raw_sql:
    db.execute() returns rows directly as array — never use .rows
    Array parameters: use IN (sql.join(...)), never ANY().
    See .claude/skills/data-model/SKILL.md "Drizzle Raw SQL Traps".
  ```
- The `cost_details_never_leak` invariant, which is a **business-critical constraint** given P0 severity:
  ```
  Leaking internal economics to a customer is a business-critical bug —
  treat violations as severity P0.
  ```
- A recommended build order in the research report appendix (not in Phase 4 itself, but designed to feed Phase 4 execution)

### Conventions Added in Later Phases

| Convention | First Appeared | Purpose |
|-----------|----------------|---------|
| `no_laziness` | Bootstrap | Prevent placeholder code |
| `non_interactive_commands` | Bootstrap | Prevent agent hangs |
| `spec_is_source_of_truth` | Phase 1 | Hierarchy when docs conflict |
| `test_against_real_db` | Phase 1 | Require running infrastructure |
| `test_against_twins` | Phase 2 | Digital twin integration testing |
| `messaging_creates_events` | Phase 2 | Domain-specific audit rule |
| `ai_arithmetic_boundary` | Phase 3 | Sacred boundary for AI scope |
| `drizzle_raw_sql` | Phase 4 | Lessons learned from Phase 3 bugs |
| `cost_details_never_leak` | Phase 4 | Business-critical data boundary |

The trend is clear: later phases accumulate lessons and encode them as invariants in section 0. Phase 4 is the first to include a convention that directly references a skill file (`.claude/skills/data-model/SKILL.md "Drizzle Raw SQL Traps"`), creating a cross-referencing pattern.

### Mistakes and Repeated Patterns

Several patterns recur as problems:

1. **File path ambiguity**: Phase 1 specifies `apps/web/app/(auth)/login/page.tsx` but the actual codebase uses `apps/web/src/app/...` (the `--src-dir` flag in create-next-app). This is identified in the research report as friction point F3: "Spec wrote `apps/web/app/` but actual path is `apps/web/src/app/`." Phases 2, 3, and 4 do not correct this -- they continue using the incorrect path pattern.

2. **Deferred type checking**: Every phase ends with `pnpm tsc --noEmit` in the final verification section, but no intermediate checks exist. The research report calls this out explicitly: "Section 12 consumed 78 tool calls (more than all building sections combined) because all integration bugs surfaced at the end when tsc was finally run." Phase 4 still does not include per-section GATE blocks.

3. **UI sections underspecified**: Phase 1 Section 9 (dashboard), Phase 2 Section 8 (messaging UI), Phase 3 Section 11 (quote/invoice UI), and Phase 4 Section 8 (communication UI) all follow the same pattern: prose descriptions of what should appear, without component hierarchies, state management details, or data fetching patterns. The research report scores Phase 3 Section 11 lowest (5-6/10 across metrics).

4. **"Choose one" delegation**: Phase 1 offers options for JWT claim implementation ("A. Supabase custom claims" or "B. A Postgres function"). Phase 3 offers options for proposal storage ("Option A -- Database table" or "Option B -- In-memory/session"). The research report identifies this as friction point F6: "Spec offered options instead of making the product decision."

### Specificity Level

The specs vary dramatically in specificity between sections:

**Highly specific** (type signatures, function names, file paths):
- Phase 3 Section 1 (ROT/RUT): Full type definitions (`RotRutConfig`, `RotRutResult`), exact function signatures, numerical test cases
- Phase 2 Section 2 (AI Classification): Complete Zod discriminated union schema, exact intent types
- Phase 1 Section 7 (Events): `createEvent(input: CreateEventInput) -> Event`, `correctEvent(originalEventId: string, newValues: CorrectionInput) -> Event`

**Moderately specific** (function names and behavior, but missing details):
- Phase 3 Section 5 (PDF): Layout description with bullet points, but no pixel-level specifications
- Phase 2 Section 6 (Outbound): Function signatures present, but adapter constructor arguments missing

**Underspecified** (prose descriptions):
- Phase 3 Section 11 (UI): "Inline editing: click cell -> edit qty, unitPrice, description" without state management approach
- Phase 4 Section 8 (Communication UI): "Toggle: Send automatic status updates" without form validation rules

### Reference Patterns: Existing Code vs Master Spec

Phase specs reference the master spec (`docs/resonansia-spec.md`) primarily in invariants and conventions:
```
INVARIANT spec_is_source_of_truth:
  docs/resonansia-spec.md wins over skills if they conflict.
```

Phase 2 references scenarios by ID: "Validates scenarios: S-02, S-09". Phase 3 references them too: "S-01, S-04, S-10". Phase 4: "S-03, S-08". These scenario IDs come from `docs/resonansia-scenarios.md`, which is notably marked as "Hidden from coding agent" in the master spec's companion document table.

Later phases increasingly reference *earlier phase code* rather than the master spec:
- Phase 2 Section 4 says "Creates state_change event" (defined in Phase 1)
- Phase 3 Section 3 says "Uses getActiveEvents query from packages/db/queries/active-events.ts (created during bootstrap)"
- Phase 4 says "Extends the message handler from Phase 2"

This creates a dependency chain: Phase 4 depends on Phase 2 which depends on Phase 1 which depends on Bootstrap.

### Which Phase Spec Is Best and Why

**Phase 3 is the best overall spec**, though with caveats:

Phase 3 excels because:
1. Its Section 1 (ROT/RUT) achieved the research report's highest score: 9-10/10 across all metrics. The pattern -- pure functions, exact types, numerical test vectors -- is cited as "the gold standard."
2. It introduces the `ai_arithmetic_boundary` invariant as a section 0 convention, making the most critical architectural boundary explicit at the highest level.
3. It provides build-order rationale: "Build this first -- it's a pure calculation module."
4. Its ARTIFACT blocks are the most consistently detailed, with full type definitions and flow descriptions.

Phase 3's weaknesses (per the research report):
- UI sections (11, 12) were underspecified
- Missing dependency cross-references between sections
- Narrative VERIFY steps that require AI model execution are untestable
- Never specified adapter constructor signatures

**Phase 4 is the most architecturally mature** but unproven (not yet built). It incorporates lessons learned from Phase 3 via the `drizzle_raw_sql` and `cost_details_never_leak` conventions. It is the only phase spec that references a skill file directly from its conventions.

**Phase 1 is the most complete relative to its scope** because its domain (CRUD, auth, events) is more tractable than Phases 2-4.

### Phase 3 Innovations

Phase 3 introduces several innovations not present in earlier phases:

1. **Conditional dependency clause**: "If Phase 2 is not complete, delivery falls back to email-only." This is the first time a phase spec acknowledges partial prior completion.

2. **Sacred boundary declaration**: The `ai_arithmetic_boundary` invariant uses language like "This boundary is sacred -- violating it is a critical bug." No prior phase uses such severity language in conventions.

3. **Transient proposal architecture**: Section 3 introduces the concept of data that exists outside the event log until approval. This is architecturally novel and carefully delineated:
   ```
   INVARIANT proposals_not_events:
     While status = 'draft', ZERO events exist for this proposal.
     The events table MUST NOT contain any reference to the proposal.
   ```

4. **Design decision delegation with explicit options**: Section 3 presents "Option A -- Database table (recommended for multi-device)" vs "Option B -- In-memory/session only", letting the agent choose but recommending one.

5. **End-to-end scenario verification**: Sections 12 includes two full business scenarios (S-01 and S-04) with 10+ sequential steps each, more complex than Phase 1's scenarios.

### Phase 4 Building on Phase 3 Lessons

Phase 4 incorporates Phase 3 lessons in several ways:

1. **Drizzle pattern documentation**: The `drizzle_raw_sql` invariant directly addresses the Phase 3 friction point F1 (22 fix edits for the `.rows` trap).

2. **Build order prescribed in research report**: The research report's "Recommended Build Order" section provides a 10-step sequence for Phase 4, based on dependency analysis. Phase 4 itself numbers sections 1-8 in a similar order.

3. **Explicit codebase state awareness**: Phase 4 acknowledges missing pieces from prior phases: "No web app frontend exists -- spec references project pages, tabs, dashboard that don't exist" (from the research report's pre-flight analysis).

4. **Cost leak as P0**: The `cost_details_never_leak` invariant is the most strongly worded constraint in any phase spec, reflecting learned caution about data boundaries.

5. **Schema extension pattern**: Phase 4 Section 1 extends `nodeDataProjectSchema` with `auto_status` configuration, showing a pattern for incremental schema evolution within the 7-table constraint.

---

## C) RESEARCH REPORT ANALYSIS

### Section-by-Section Scores

The research report (`C:\Development\handyman\docs\phase-3-research-report.md`) provides a four-dimensional scorecard for each of Phase 3's 13 sections:

| Section | Precision | Completeness | Buildability | Verify Quality |
|---------|:---------:|:------------:|:------------:|:--------------:|
| 0 - Conventions | 9 | 8 | 9 | N/A |
| 1 - ROT/RUT Engine | 9 | 9 | **10** | 9 |
| 2 - AI Abstraction | 7 | 5 | 5 | 4 |
| 3 - Proposal System | 8 | 7 | 7 | 7 |
| 4 - AI Quote Gen | 7 | 6 | 6 | 5 |
| 5 - PDF Generation | 8 | 7 | 6 | 6 |
| 6 - BankID Signing | 8 | 7 | 7 | 6 |
| 7 - Quote Delivery | 7 | 5 | 5 | 5 |
| 8 - Invoice Gen | 8 | 7 | 7 | 7 |
| 9 - Skatteverket | 7 | 6 | 7 | 6 |
| 10 - Material OCR | 7 | 5 | 7 | 4 |
| 11 - Quote/Invoice UI | 6 | 5 | 5 | 4 |
| 12 - Final Verify | 6 | 7 | 4 | 5 |
| **Average** | **7.3** | **6.3** | **6.5** | **5.6** |

The report identifies Section 1 (ROT/RUT) as the "Gold Standard" with zero friction during build, while Section 11 (UI) and Section 12 (Final Verification) are the worst performers.

### Main Friction Points

The report identifies seven specific friction points with measured impact:

1. **F1: Drizzle `.rows` trap** -- 22 fix edits. The spec did not document that `postgres-js` returns arrays directly, not wrapped in a `.rows` property.

2. **F2: Adapter constructor signatures** -- Multiple fixes. The spec referenced adapters from Phase 2/bootstrap without documenting their constructor argument shapes.

3. **F3: Wrong file paths** -- Recreated files. The spec wrote `apps/web/app/` but the actual project uses `apps/web/src/app/` (because `create-next-app` was run with `--src-dir`).

4. **F4: Monorepo TSX compilation** -- Multiple config changes. Cross-package JSX requires specific `tsconfig.json` changes that the spec never mentioned.

5. **F5: Missing `package.json` dependencies** -- Discovered during `tsc`. The spec never listed which packages need which dependencies.

6. **F6: "Choose one" decisions** -- Agent guessed. The spec offered options (e.g., proposal storage strategy) instead of making the product decision.

7. **F7: Narrative VERIFY steps** -- Not executable. Steps like "Generate quote for '3 rum'" require running an AI model, which is non-deterministic and may fail for infrastructure reasons.

### The Three Laws of Spec Compilation

The research report proposes three laws that govern spec-driven development:

1. **"The Spec Determines the Ceiling."** -- "No agent sophistication compensates for a bad spec." This asserts that the quality of the output is fundamentally bounded by the quality of the input specification, regardless of how capable the AI agent is.

2. **"Context is the Bottleneck."** -- "The constraint is attention, not compute. Context rot begins immediately." This references Chroma Research's finding that LLM performance degrades at every context length increment, not just near the limit.

3. **"Verification Must Be Co-Designed with Specification."** -- "An ARTIFACT without a VERIFY is a function without a return type." This mandates that every specification element must have a corresponding testable verification.

### Concrete Recommendations

The report makes 15 recommendations in three tiers:

**Must-Have (R1-R4):**
- R1: Add type check GATE blocks after every section (would have eliminated 78 tool calls)
- R2: Replace narrative VERIFYs with executable test skeletons (`Assert: result.deductionAmount === 9000`)
- R3: Include dependency cross-reference table per section (listing adapter signatures, function imports)
- R4: Add "Codebase State" section documenting patterns like `db.execute()` return format and edge column names

**Should-Have (R5-R10):**
- R5: Standardize the spec grammar as a formal BNF-like definition
- R6: Structure VERIFY in three tiers (compiles, works, correct)
- R7: Add explicit "Why" rationale to each ARTIFACT
- R8: Run phase validation in a separate agent session (fresh context, no implementation memory)
- R9: Move scenario files to holdout location (prevent reward-hacking)
- R10: Add a lessons-learned file that compounds across phases

**Nice-to-Have (R11-R15):**
- R11: Property-based tests with `fast-check`
- R12: Formal state machine definitions for node state transitions
- R13: TLA+ model for bitemporal event resolution
- R14: Spec linter for ambiguity detection
- R15: Convergence criteria (quantitative "done" definition)

### Spec Quality to Code Quality Data

The report provides several data points correlating spec quality with code quality:

1. **Section 1 (ROT/RUT)** scored 9-10/10 and produced "zero friction during build." This is the most direct evidence that high spec precision yields clean code.

2. **Section 11 (UI)** scored 5-6/10 and was "the most underspecified" with "abstract prose."

3. **Section 12 (Final Verification)** consumed "78 tool calls (more than all building sections combined)" because bugs accumulated from all prior sections and surfaced simultaneously during type checking.

4. **The Drizzle `.rows` trap** required "22 fix edits" across the codebase -- a single omission in the spec caused cascading fixes.

5. **Architecture compliance scores** show that well-specified invariants were well-followed: "AI arithmetic boundary: 10/10", "SQL window function resolution: 10/10", "Integration adapter patterns: 10/10". Poorly specified areas scored lower: "Label system consistency: 5/10" (hardcoded maps in 6 files), "Import/export conventions: 6/10" (deep imports).

6. **P0 bugs** -- The report identifies three P0 severity bugs in the Phase 3 code:
   - Edge column name mismatch (`from_id`/`to_id` vs `source_id`/`target_id`) -- a spec omission
   - Hardcoded HMAC secret fallback -- a security oversight not caught by spec
   - `recomputeProposal` dead code bug -- mathematical error that produces always-zero result

---

## D) GEN 2 -> GEN 3 -> GEN 4 TRANSFORMATION

### How the Master Spec Became a Bootstrap Instruction

The master spec (`docs/resonansia-spec.md`, NLSpec v2.0) is a comprehensive system specification. Its opening describes itself:

```
This is an NLSpec (Natural Language Spec) — a human-readable specification
designed to be directly consumed by coding agents. It defines interfaces,
data structures, behavioral contracts, and invariants at a level of precision
sufficient for implementation without human code review.
```

The bootstrap spec (`bootstrap-spec.md`) transformed this comprehensive spec into an *installation script*. Rather than describing the system's full behavior, it describes the minimum artifacts needed to begin implementing the system. The transformation follows this pattern:

1. **Master spec section 2 (Data Model)** -> Bootstrap section 4 (Shared Schemas) + section 5 (Database Layer)
2. **Master spec section 5 (AI)** -> Bootstrap section 3 (ai-pipeline skill)
3. **Master spec section 2.7 (Federation)** -> Bootstrap section 3 (federation skill)

The bootstrap does not attempt to *implement* the master spec. It creates the scaffolding and knowledge base (skills) that will enable future implementation phases. The bootstrap spec's artifacts are infrastructure (monorepo, database schema, twin server) and knowledge documents (CLAUDE.md, skills), not business logic.

### How the Master Spec Became Individual Phase Specs

The master spec describes the complete system. The phase specs carve it into implementable slices organized by business capability:

| Master Spec Area | Phase |
|-----------------|-------|
| Tables, RLS, events, auth | Phase 1 |
| Messaging, WhatsApp, SMS, classification | Phase 2 |
| Quoting, invoicing, PDF, ROT/RUT, BankID | Phase 3 |
| Auto-status, BRF reports, scheduling | Phase 4 |
| Federation, GDPR | Phase 5 (not yet written) |

Each phase spec re-derives its content from the master spec for its specific domain, adding implementation-level details (file paths, function signatures, UI layout descriptions) that the master spec does not contain.

### Relationship Between Master Spec and Each Phase Spec

The master spec is referenced but not duplicated. Each phase spec's section 0 includes:
```
INVARIANT spec_is_source_of_truth:
  docs/resonansia-spec.md wins over skills if they conflict.
```

This establishes a clear hierarchy: master spec > skills > phase spec for *what* the system should do. Phase specs add the *how* -- file paths, function names, implementation sequences, verification steps.

However, phase specs also introduce requirements *not in the master spec*:
- Phase 2's `active_project_disambiguation` feature (numbered project selection for workers on multiple projects)
- Phase 3's transient proposal storage mechanism (the proposals table, or Option B in-memory approach)
- Phase 4's `job_runs` table and job locking mechanism

These additions are implementation necessities that emerge during detailed design.

### Contradictions

There are several inconsistencies:

1. **File paths**: The bootstrap spec and Phase 1 use `apps/web/app/...` while the actual codebase uses `apps/web/src/app/...`. This persists across all four phase specs.

2. **The "7 tables only" rule**: The master spec and bootstrap declare AXIOM-03: "Seven tables, nothing more." However:
   - Phase 2 introduces a `notifications` table
   - Phase 4 introduces a `job_runs` table
   - Phase 3 may introduce a `proposals` table
   The research report notes this: "job_runs table needs migration + schema (3rd extra table beyond '7 tables' rule)."

3. **Edge column names**: The bootstrap spec and database migration use `source_id`/`target_id`, but Phase 3 code uses `from_id`/`to_id`. This contradiction was caught by the research report as a P0 bug.

4. **Adapter signatures**: Phase 2 defines adapter interfaces (`MessagingAdapter`, etc.) but never documents constructor arguments. Phase 3 uses adapters without knowing their signatures. Phase 4 still does not fix this, though the research report's appendix finally provides the full constructor signature table.

### Formality Level of Each Generation

The documents progress along a formality spectrum:

**Master Spec (Gen 2)** -- The most formal. Uses `INTERFACE`, `INVARIANT`, `BEHAVIOR`, `RULE`, `SCHEMA` blocks with precise semantics. Defines data structures with field-level type annotations. Contains 7 design axioms expressed as formal principles.

**Bootstrap Spec (Gen 3)** -- Semi-formal. Uses `ARTIFACT`, `INVARIANT`, `VERIFY`, `GIT` blocks. Less concerned with data structures, more concerned with file existence and tool configurations. Includes procedural instructions (exact CLI commands) alongside declarative descriptions.

**Phase Specs (Gen 4)** -- Mixed formality. The most formal sections (Phase 3 Section 1) have exact type definitions, function signatures, and numerical test vectors. The least formal sections (Phase 3 Section 11, Phase 4 Section 8) use prose descriptions of UI behavior. The research report's average scores (Precision 7.3, Completeness 6.3) quantify this inconsistency.

**Research Report (meta-document)** -- The most analytically formal. Uses scoring rubrics, frequency tables, compiler analogies, and formal grammar proposals (BNF-like spec syntax). It is the only document that explicitly evaluates the effectiveness of the specification system itself.

---

## E) PATTERN CATALOG

### Structural Patterns Across Documents

| Pattern | Bootstrap | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Research Report |
|---------|:---------:|:-------:|:-------:|:-------:|:-------:|:---------------:|
| ARTIFACT block | Yes | Yes | Yes | Yes | Yes | No |
| INVARIANT block | Yes | Yes | Yes | Yes | Yes | No |
| VERIFY block | Yes | Yes | Yes | Yes | Yes | No |
| GIT commit command | Yes | Yes | Yes | Yes | Yes | No |
| Section 0 Conventions | Yes | Yes | Yes | Yes | Yes | No |
| Report section at end | Yes | Yes | Yes | Yes | Yes | No |
| Scenario reference (S-XX) | No | No | Yes | Yes | Yes | No |
| Depends-on header | No | No | Yes | Yes | Yes | No |
| Build-order rationale | No | No | No | Yes | No | Yes (prescribed) |
| Conditional dependency | No | No | No | Yes | No | No |
| Numerical test vectors | No | No | No | Yes | No | No |
| Design decision delegation | No | Yes | No | Yes | No | No |
| Sacred boundary language | No | No | No | Yes | Yes | No |
| Lessons-learned invariant | No | No | No | No | Yes | Yes (recommended) |
| GATE block | No | No | No | No | No | Yes (recommended) |
| DEPENDS_ON block | No | No | No | No | No | Yes (recommended) |
| CODEBASE_STATE block | No | No | No | No | No | Yes (recommended) |
| Scorecard table | No | No | No | No | No | Yes |
| Friction point taxonomy | No | No | No | No | No | Yes |
| Spec smell taxonomy | No | No | No | No | No | Yes |
| Compiler analogy | No | No | No | No | No | Yes |

### Patterns Tried and Abandoned

1. **"Read relevant sections on demand"** (Bootstrap, Section 0): The bootstrap instructs the agent to read docs/ sections as needed. By Phase 3, this pattern is effectively abandoned -- phase specs are self-contained and include all necessary types and logic inline rather than delegating to the master spec. The research report validates this: cross-referencing the master spec during build caused friction.

2. **Exact line count limits** (Bootstrap, CLAUDE.md): `INVARIANT claude_md_length: CLAUDE.md MUST be under 150 lines.` This numeric constraint appears only in the bootstrap. Phase specs do not impose line limits on any artifact.

3. **Skill trigger words** (Bootstrap, Section 3): Each skill has "Trigger words in description: table, schema, RLS, Drizzle..." This semantic matching pattern is specified in the bootstrap but never referenced or used by any phase spec. Phase specs directly reference functions and files rather than relying on skill discovery.

4. **"Functional, not beautiful"** (Phase 1, Section 9): `INVARIANT auth_pages_minimal: Auth pages are functional, not beautiful. Phase 7 handles polish.` This deferred-quality pattern appears in Phase 1 but is not repeated in later phases, which describe UI with more ambition (editable tables, inline editing, violet backgrounds).

### Most Effective Patterns for AI Agent Execution

Based on the research report's scores and friction analysis, the most effective patterns are:

1. **Pure function with numerical test vectors** (Phase 3, Section 1 -- ROT/RUT). Scored 10/10 buildability. Pattern:
   - Full input/output types defined
   - Pure function (no side effects, no database)
   - 5 concrete numerical test cases with expected results
   - Deterministic (same inputs, same outputs)

2. **Exact CLI commands with flags** (Bootstrap, all phases). Zero friction reported for tool invocations when exact commands were provided.

3. **Zod discriminated union schemas** (Phase 2, Section 2 -- message classification). Providing the exact Zod schema as code in the spec produces type-safe output with minimal agent interpretation:
   ```
   messageIntentSchema = z.discriminatedUnion('type', [
     z.object({ type: z.literal('time_report'), hours: z.number().positive().max(24) }),
     ...
   ])
   ```

4. **Invariants as universal constraints** (all documents). The best invariants are those that can be verified by grep, e.g.:
   ```
   grep -r "UPDATE.*events" in packages/ and apps/ → zero results
   ```
   These are both unambiguous and mechanically verifiable.

5. **GIT commit after every section** (all documents). This creates a clean audit trail and provides rollback points. The research report validates this pattern implicitly -- it can trace bugs to specific phases.

6. **"Flow:" numbered step lists** (Phase 2 Section 4, Phase 3 Section 8). When an ARTIFACT includes a "Flow:" section with numbered steps, the agent produces code that follows the exact sequence. This is more effective than prose descriptions of behavior.

### Least Effective Patterns

1. **Prose UI descriptions** without component hierarchy or state management details. Consistently the lowest-scoring sections.

2. **"Choose one" design decisions** -- The agent guesses, and guesses incorrectly in some cases.

3. **Deferred verification** (all phases, final sections) -- Accumulating all type checking to the end causes massive rework.

4. **Cross-document references** without inlining the referenced content -- The agent may not load referenced documents, leading to inconsistencies.

---

## Summary

The Resonansia specification system represents a four-generation evolution of specification engineering:

- **Gen 2** (master spec): Comprehensive, formal, domain-complete, but not directly executable
- **Gen 3** (bootstrap): Executable instruction set that creates the scaffolding for implementation
- **Gen 4** (phase specs): Domain-sliced implementation specs with increasing structural maturity

The key finding from the research report is that **spec quality directly determines code quality**, with the best-specified section (ROT/RUT, scoring 10/10 buildability) producing zero-friction code, while underspecified sections (UI, scoring 5/10) and deferred verification produced 78+ fix cycles.

The most important innovations across the corpus are: the ARTIFACT/INVARIANT/VERIFY/GIT state machine pattern, the elevation of critical constraints to "sacred boundary" status, numerical test vectors in VERIFY blocks, and the emerging patterns proposed by the research report (GATE blocks, CODEBASE_STATE sections, three-tier verification). Phase 4, if built, will be the first spec to benefit from systematic post-mortem analysis -- making the specification process itself iterative and self-improving.

---

### Agent 4: Read meta docs: CLAUDE.md and skills
**Type:** general-purpose

#### Prompt
````
You are a research analyst studying specification evolution. Read ALL of these meta-level documents that provide context and constraints to the AI coding agent:

1. `CLAUDE.md` — Project-level instructions for the coding agent
2. `.claude/skills/data-model/SKILL.md` — Data model domain knowledge
3. `.claude/skills/event-system/SKILL.md` — Event system domain knowledge
4. `.claude/skills/ai-pipeline/SKILL.md` — AI pipeline domain knowledge
5. `.claude/skills/integrations/SKILL.md` — Integrations domain knowledge
6. `.claude/skills/ui/SKILL.md` — UI domain knowledge
7. `.claude/skills/federation/SKILL.md` — Federation domain knowledge

For your analysis, provide:

A) CLAUDE.MD ANALYSIS:
- What constraints does it impose?
- How does it relate to the master spec?
- Is it a compression of the spec or something different?
- What patterns does it use to communicate rules to an AI?

B) SKILLS ANALYSIS (for each skill file):
- Structure and organization
- What domain knowledge does it encode?
- How is it compressed compared to the master spec?
- What patterns does it use (rules, schemas, examples)?
- How does it relate to the corresponding section of the master spec?
- Is there information in the skills that ISN'T in the spec?
- Is there information in the spec that ISN'T in the skills?

C) THE META-SPEC RELATIONSHIP:
- How do CLAUDE.md + skills relate to the spec documents?
- Are they a separate "channel" of specification?
- Do they contradict or supplement the specs?
- How do they evolve over time (if you can tell)?
- What role do they play in the spec → code pipeline?

D) COMPRESSION PATTERNS:
- How is complex domain knowledge compressed for agent consumption?
- What formatting/structural choices make skills effective?
- What's the relationship between skill files and the phase specs?
- If you had to design the optimal "agent context" system, what would you change?

Be thorough. Quote specific passages. This feeds into a larger research report.
````

#### Response

I now have comprehensive material to produce the analysis. Let me compose the full research report.

---

# Meta-Specification Analysis: CLAUDE.md, Skills, and Their Relationship to the Master Spec

## A) CLAUDE.MD ANALYSIS

### Constraints Imposed

CLAUDE.md imposes 8 numbered architecture rules, each compressed to a single bolded phrase plus a dash-separated elaboration:

1. **"7 tables only"** -- a hard structural constraint that prevents the agent from ever creating new database tables
2. **"Events are append-only"** -- blocks any UPDATE/DELETE on the events table
3. **"AI proposes, human decides"** -- enforces AXIOM-02 from the spec
4. **"AI never does arithmetic"** -- a bright-line rule separating AI from computation
5. **"RLS on every table"** -- security invariant
6. **"Next.js patterns"** -- constrains where data fetching and mutations may occur
7. **"Event resolution in SQL"** -- blocks JavaScript-side event aggregation
8. **"Bitemporality"** -- defines the dual-timeline interpretation of `id` and `occurred_at`

It also constrains the technology stack (TypeScript strict, Next.js 15, Supabase, Drizzle, Vercel AI SDK, shadcn/ui, Tailwind, @react-pdf/renderer, Turborepo + pnpm), the project structure (monorepo layout with specific package boundaries), the Git conventions (branch prefixes and Conventional Commits), and provides runnable commands (`pnpm dev`, `pnpm build`, etc.).

### Relationship to the Master Spec

CLAUDE.md is **not** a compression of the master spec. It is a separate document with a different purpose: it is an **entry point directive** for the AI agent. The master spec (`docs/resonansia-spec.md`) is 1500+ lines of formal specification with `INTERFACE`, `INVARIANT`, `BEHAVIOR`, `SCHEMA`, and `RULE` blocks using RFC 2119-style modal verbs (`MUST`, `SHOULD`, `MAY`). CLAUDE.md is ~70 lines of terse instructions that tell the agent *what it is working on*, *where things are*, and *what it must never violate*.

Critically, CLAUDE.md explicitly defers to the spec: `"See docs/resonansia-spec.md for complete system specification."` It also enumerates the skills and points to them. It functions as a **routing document** -- a table of contents for the agent's working memory.

### Pattern Analysis: How It Communicates Rules to an AI

CLAUDE.md uses several deliberate patterns:

1. **Bold phrase + em dash + elaboration**: `**7 tables only** -- tenants, labels, nodes, edges, events, blobs, dicts (+ federation_edges)`. This creates a scannable mnemonic. The bold text is the "headline constraint"; the text after the dash provides just enough detail to disambiguate.

2. **Numbered rules**: The 8 rules are numbered, creating an implicit ordering (though they are more categorical than sequential). This makes it easy for an agent to reference "rule 4" in its reasoning.

3. **Fenced code blocks for commands**: The `Commands` section uses code blocks, making them unambiguously executable.

4. **Structural map**: The `Project Structure` section uses a tree with inline comments, giving the agent a spatial model of the codebase.

5. **Skills as an index**: The skills section provides 6 named domains with terse descriptions, functioning as a dispatch table the agent can use to decide which skill file to consult.

6. **No justification**: Unlike the spec, which includes rationale blocks (e.g., `AXIOM-06: "due to extreme complexity of sync/conflict resolution"`), CLAUDE.md provides zero justification. Rules are declarative and absolute. This is appropriate for agent consumption -- agents do not need to understand *why*, only *what*.

---

## B) SKILLS ANALYSIS

### B.1 Data Model Skill (`/C:/Development/handyman/.claude/skills/data-model/SKILL.md`)

**Structure and Organization**: YAML frontmatter with `name` and `description`, then Markdown sections: Tables (7+1 table summary), Node Data Schemas, Edge Data Schemas, Event Data Schemas, RLS Policy Pattern, Label Domains, UUIDv7 Generation, Anti-Patterns, and the recently added "Drizzle Raw SQL Traps" section.

**Domain Knowledge Encoded**: Complete schema inventory for all node, edge, and event data types. The RLS policy pattern with the actual SQL for `has_federation_access()`. The label domain taxonomy. UUIDv7 generation in application layer. Two critical Drizzle ORM traps (the `db.execute()` return shape and the SQL array parameter issue).

**Compression Ratio**: The master spec devotes sections 2.1 through 2.10 (~400 lines) to the data model. The skill compresses this to ~180 lines. The compression strategy is:
- **Tables become a 8-row table** instead of individual `INTERFACE` blocks with invariants.
- **Schemas become compact field lists** like `NodeData_Org: name, org_number?, address?, contact, logo_url?, ...` instead of the spec's multi-line `SCHEMA` blocks with comments and types.
- **Invariants become Anti-Patterns** -- reframed as "NEVER do X" instead of "MUST do Y".

**Unique to the Skill (not in the spec)**:
- The "Drizzle Raw SQL Traps" section (lines 140-180) is entirely absent from the master spec. This is **implementation-derived knowledge** -- bugs discovered during actual coding that were added to prevent recurrence. The spec is technology-agnostic enough not to mention Drizzle driver behavior, but this practical knowledge is critical for the agent.
- The trap about `result.rows` vs treating result as a direct array, and the `ANY()` vs `IN (sql.join(...))` pattern -- these are experience-encoded, not spec-derived.

**In the spec but NOT in the skill**:
- `SCHEMA Address`, `SCHEMA ContactInfo`, `SCHEMA MoneyAmount`, `SCHEMA DateRange`, `SCHEMA Locale` (shared data schemas from spec section 2.2)
- `INTERFACE Node` and `INTERFACE Edge` field-level definitions with types
- `INVARIANT node_search_sync`, `INVARIANT edge_not_bidirectional`
- `SCHEMA BlobMetadata` details
- `INTERFACE Dict` details
- Partitioning strategy for events table (hash by tenant_id, sub-partition by quarter)
- `INVARIANT blob_signed_urls`, `INVARIANT blob_auto_association`

**Patterns Used**:
- Tables (Markdown tables for structured data)
- Code fences for SQL and TypeScript
- Compact schema notation with `?` suffix for optional fields
- "Anti-Patterns" section as a negative constraint list using bold `NEVER`

### B.2 Event System Skill (`/C:/Development/handyman/.claude/skills/event-system/SKILL.md`)

**Structure**: YAML frontmatter, then sections: Bitemporality, Event Interface, Root Pointer Correction Pattern, Active Event Resolution SQL, Transient AI Proposals, EventOrigin Enum, Project Economics, Cache Reconciliation, Anti-Patterns.

**Domain Knowledge Encoded**: The two timelines (transaction time vs valid time), the Event interface as a compact field list, the correction chain pattern with a concrete 3-event example, the full SQL query for active event resolution, the transient proposal lifecycle (3 phases), the economics formulas, and the cache reconciliation algorithm.

**Compression**: The spec devotes sections 2.8 through 2.8.5 (~200 lines) plus section 4.1 (project economics). The skill is ~128 lines. Key compression techniques:
- The correction chain example is identical to the spec's `BEHAVIOR event_compensation_resolution` but presented as a simple ASCII diagram rather than a prose block.
- The SQL query is reproduced verbatim (it is the same SQL pattern from spec section 2.8.3's `active_event_resolution_sql`).
- Economics formulas are shown as one-line equations: `quote_total = SUM(active quote_line events .total)`.

**Unique to the Skill**:
- The explicit statement `"RULE: ref_id of an adjustment MUST always point to the ORIGINAL root event, never to another adjustment."` is more prominent here than in the spec. The spec states it as `INVARIANT event_correction_root_pointer`, but the skill makes it a standalone bolded rule within the correction section, with an explanatory example showing that Event C points to Event A, "NOT B".
- The `data` field in the Event interface listing is present here but more compressed.

**In the spec but NOT in the skill**:
- All `EventData_*` schemas (Time, Material, Photo, Message, QuoteLine, InvoiceLine, Adjustment, StateChange, Payment, Note) -- the data-model skill covers these instead, creating a cross-reference dependency.
- `INVARIANT event_bitemporality` formal block
- `INVARIANT event_time_partitioned`
- `INVARIANT event_realtime`
- The detailed transient proposal mechanism (spec section 2.8.4) is summarized in 3 numbered steps vs the spec's full `BEHAVIOR ai_transient_proposals` block.

**Patterns Used**:
- Compact field lists with type and description separated by em dashes
- ASCII diagram for the correction chain
- Full SQL code block as a reference implementation
- "Anti-Patterns" as negative constraints

### B.3 AI Pipeline Skill (`/C:/Development/handyman/.claude/skills/ai-pipeline/SKILL.md`)

**Structure**: YAML frontmatter, then: AI Capabilities & Model Tiers (table), Context Protocol (5 Levels), Dynamic Resolution Degradation, Truncation Transparency, Anomaly Shield (Phase 1 and 2), Blind Spot Prevention, Scope Similarity, Token Counting, Anti-Patterns.

**Domain Knowledge Encoded**: The 3-tier model system with specific model names and latency targets. The 5-level context protocol with token budgets. Degradation strategies. Anomaly detection with two phases based on tenant event count. Scope similarity evaluation. Token counting requirements.

**Compression**: This skill corresponds to spec section 5 (AI Capabilities). The spec version is roughly 300 lines; the skill is ~110 lines. Notable compression:
- The capability table is condensed from individual `CAPABILITY` blocks in the spec to a single 8-row Markdown table.
- The context protocol is presented as a 5-row table with Level, Name, Budget, and When Included columns.
- Anomaly shield phases are bullet-pointed rather than formal `BEHAVIOR` blocks.

**Unique to the Skill**:
- The specific config code block `export const AI_TIERS = { ... }` with exact TypeScript types appears here but is actually from `tech-decisions.md`, not the main spec. The skill synthesizes information from two spec documents.
- The `countTokens` import from `@anthropic-ai/tokenizer` with the `MUST use` instruction consolidates what `tech-decisions.md` says about token counting.

**In the spec but NOT in the skill**:
- Full `CAPABILITY` block definitions with structured input/output schemas
- `BEHAVIOR ai_context_protocol` narrative description
- Detailed anomaly detection prompt templates
- `INVARIANT ai_confidence_scoring`
- The full scope similarity algorithm

### B.4 Integrations Skill (`/C:/Development/handyman/.claude/skills/integrations/SKILL.md`)

**Structure**: YAML frontmatter, then: 7 Integrations Summary (numbered subsections), Twin Architecture, Control Endpoints, Environment Config Pattern, Adapter Interface Pattern, Anti-Patterns.

**Domain Knowledge Encoded**: HTTP contracts for all 7 external services (WhatsApp, SMS, Fortnox, BankID, Email, Skatteverket, Object Storage). The twin server architecture with route mapping. Control endpoints for testing. The adapter pattern with TypeScript interface examples.

**Compression**: This skill corresponds to `docs/integration-twins.md` (referenced but not the main spec). The skill provides **API-level precision** -- actual HTTP methods, paths, request/response shapes -- in a highly compressed format using code fences. Each integration is summarized in 4-6 lines.

**Unique to the Skill**:
- The Adapter Interface Pattern section with `MessagingAdapter` and `AccountingAdapter` TypeScript interfaces is not in the spec -- it is an architectural pattern for the implementation layer.
- The Environment Config Pattern showing how to swap between twins and real APIs.

**In the spec but NOT in the skill**:
- Detailed webhook signature validation procedures
- OAuth flow details for Fortnox
- BankID certificate handling
- Email template structure
- Detailed Skatteverket submission validation rules

**Patterns Used**:
- Code blocks within numbered subsections (one per integration)
- Arrow notation (`→`) for endpoint descriptions
- Interface code blocks for the adapter pattern
- Path-based route table for the twin server

### B.5 UI Skill (`/C:/Development/handyman/.claude/skills/ui/SKILL.md`)

**Structure**: YAML frontmatter, then: Color Palette, Typography, Layout (Dashboard Desktop, Dashboard Mobile, Project Detail), Component Taxonomy (Data Display, AI Content, Forms & Input, Communication), AI Content Visual Rules, RTL Support, PDF Layout (Quote), Next.js Architecture Rules, Anti-Patterns.

**Domain Knowledge Encoded**: Complete color system with hex values. Typography scale with pixel sizes and font weights. ASCII wireframe layouts for desktop, mobile, and project detail. Component catalog organized by category. The 5 AI content visual rules. RTL support requirements. PDF quote layout as an ASCII wireframe.

**Compression**: This corresponds to `docs/design-system.md`. The skill is ~165 lines. Key compression:
- Colors are presented as a compact list with name, Tailwind class, hex, and usage.
- Layouts use ASCII art wireframes instead of description prose.
- Components are listed with one-line descriptions rather than full interface definitions.

**Unique to the Skill**:
- The Next.js Architecture Rules section (RSC for data, Server Actions for mutations, Route Handlers only for webhooks, Client Components only for interactive UI) is pulled from `tech-decisions.md`, not from the design system doc. The skill synthesizes across documents.
- The specific Tailwind classes (`bg-violet-50`, `border-violet-200`, `text-violet-600`) for AI content styling.

**In the spec/design-system but NOT in the skill**:
- Animation and transition specifications
- Responsive breakpoint definitions
- Accessibility requirements beyond color-pair
- Form validation UX patterns
- Loading states and skeleton screens
- Invoice PDF layout (only quote PDF is shown)

### B.6 Federation Skill (`/C:/Development/handyman/.claude/skills/federation/SKILL.md`)

**Structure**: YAML frontmatter, then: FederationEdge Interface, FederationStatus Enum, ProjectionScope Enum, Masking Schemas (Subcontractor, Client, Supplier), Strict Restriction Rule, Consent Flow, Revocation Behavior, has_federation_access() SQL, RLS for Federation Edges, Anti-Patterns.

**Domain Knowledge Encoded**: The complete federation data model. The three projection views with explicit EXCLUDED lists. The consent flow as a numbered narrative. The revocation + GDPR crypto-shred behavior. The SQL function with full implementation. Federation-specific RLS policy.

**Compression**: This corresponds to spec sections 2.7 through 2.7.2 (~100 lines in spec). The skill is ~129 lines -- actually *slightly longer* than the spec section. This is because the skill adds:
- The `has_federation_access()` SQL is reproduced in full (it also appears in the data-model skill, creating intentional redundancy).
- The masking schemas include explicit `EXCLUDED` lists that are more detailed than the spec's comments.
- The consent flow narrative is nearly verbatim from the spec's `BEHAVIOR federation_consent_flow`.

**Unique to the Skill**:
- The "Strict Restriction Rule" gets its own section with a concrete example: `"custom subcontractor view can hide project address, but can NEVER expose project margin."` This example is in the spec as part of `INVARIANT federation_strict_restriction` but is elevated to a standalone section in the skill.
- The `SECURITY DEFINER` explanation: `"MUST be SECURITY DEFINER -- runs with elevated privileges to read federation_edges regardless of the caller's tenant."` This operational detail is implicit in the spec's SQL but called out explicitly in the skill.

**In the spec but NOT in the skill**:
- `INVARIANT federation_consent` formal block
- `INVARIANT federation_no_copy` (mentioned only in Anti-Patterns)
- `INVARIANT federation_partitioning`
- `INTERFACE FederationProjection` with `allowed_event_types` and `node_mask`

---

## C) THE META-SPEC RELATIONSHIP

### How CLAUDE.md + Skills Relate to the Spec Documents

The relationship forms a three-tier hierarchy:

```
Tier 1: CLAUDE.md          (~70 lines)    Entry point / routing document
Tier 2: .claude/skills/    (~900 lines)   Domain-specific reference cards
Tier 3: docs/*.md          (~3500+ lines) Full specifications
```

CLAUDE.md is the **always-loaded** context. It is injected into every agent conversation (as evidenced by the `system-reminder` in this conversation). Skills are **loaded on demand** -- the agent or user invokes a skill when working in that domain. The full specs are **consulted by reference** -- the skills explicitly say `"See docs/resonansia-spec.md section X for full..."`.

### A Separate "Channel" of Specification?

Yes, CLAUDE.md + skills constitute a **parallel specification channel** that is distinct from the primary spec documents. The primary channel (resonansia-spec.md + phase specs) is written for *comprehension and correctness verification*. The skills channel is written for *operational guidance during implementation*.

Key evidence:
- The spec uses formal semantic blocks (`INTERFACE`, `INVARIANT`, `BEHAVIOR`, `RULE`, `SCHEMA`) with RFC 2119 modal verbs. The skills use informal sections, tables, code blocks, and "Anti-Patterns" lists.
- The spec does not mention Drizzle, Next.js patterns, or specific Tailwind classes. The skills do.
- The phase specs (phase-1-spec through phase-4-spec) use `ARTIFACT`, `VERIFY`, and `Git` blocks -- an imperative execution format. The skills are declarative reference material.

This creates a three-layer architecture:
1. **resonansia-spec.md**: What the system IS (declarative, technology-agnostic)
2. **phase-N-spec.md**: What the agent DOES in order (imperative, step-by-step)
3. **CLAUDE.md + skills**: What the agent KNOWS while doing it (reference, technology-specific)

### Contradictions or Supplements?

There are no outright contradictions. Phase 1's conventions explicitly establish the priority: `"INVARIANT spec_is_source_of_truth: When in doubt, read the relevant section of docs/resonansia-spec.md. The skills in .claude/skills/ are compressed summaries. If they conflict with docs/resonansia-spec.md, the spec wins."`

The skills **supplement** the spec in several important ways:
1. The "Drizzle Raw SQL Traps" in the data-model skill encode implementation-time discoveries that are not part of the spec.
2. The UI skill's Next.js Architecture Rules synthesize material from `tech-decisions.md`, making it accessible during frontend work without loading the full tech-decisions document.
3. The integrations skill provides a condensed HTTP contract reference that is more compact than the full `integration-twins.md`.
4. Anti-Pattern sections provide negative-space constraints -- "NEVER do X" -- that are more operationally useful to an agent than the spec's positive "MUST do Y" framing.

### Evolution Over Time

The git history provides strong evidence of evolution:
- The most recent commit that touched `.claude/skills/data-model/SKILL.md` is visible in the git status as modified (`M .claude/skills/data-model/SKILL.md`). The Drizzle Raw SQL Traps section was likely added after encountering those bugs during Phase 1 or 2 implementation.
- The phase specs show clear progressive dependency: Phase 2 depends on Phase 1, Phase 3 on Phase 2, Phase 4 on Phase 3. Each phase spec repeats and augments the conventions section.
- The master spec is labeled "v2.0 (incorporates architecture decisions from deep analysis)" and dated 2026-02-28, suggesting it was revised after initial analysis, possibly incorporating feedback from early implementation phases.
- Phase 4 introduces a new convention: `"INVARIANT drizzle_raw_sql: db.execute() returns rows directly as array -- never use .rows"`, which was promoted from a skill-level trap to a phase-level invariant, showing knowledge flowing from skills back into specs.

### Role in the Spec-to-Code Pipeline

The pipeline appears to be:

```
resonansia-spec.md  -->  phase-N-spec.md  -->  agent executes with CLAUDE.md + skills loaded
     (what)                  (when/how)              (reference while doing)
```

Skills serve as **working memory aids** for the agent during execution. The phase specs provide the sequential task list. The master spec is the ground truth consulted when ambiguity arises. CLAUDE.md is the bootstrap that tells the agent where everything is.

---

## D) COMPRESSION PATTERNS

### How Complex Domain Knowledge is Compressed

1. **Schema-to-one-liner compression**: Full `SCHEMA` blocks with types, comments, and invariants become single lines like `NodeData_Org: name, org_number?, address?, contact, logo_url?, ...`. The `?` suffix replaces `| null` or "optional" annotations. This achieves roughly 5:1 compression.

2. **Invariant-to-anti-pattern inversion**: Positive invariants (`"Events MUST be append-only"`) become negative anti-patterns (`"NEVER UPDATE or DELETE events"`). The anti-pattern framing is arguably more useful for an agent because it directly describes the error to avoid, rather than the property to maintain.

3. **SQL as specification**: The `has_federation_access()` function and the active event resolution query appear as full SQL code blocks in both the spec and the skills. Code is already maximally compressed -- it is both specification and implementation simultaneously.

4. **Tables for categorical data**: Model tiers, context levels, label domains, and color palettes all use Markdown tables. Tables are extremely token-efficient for structured data compared to prose.

5. **ASCII wireframes**: Layout specifications use ASCII art boxes rather than description prose. `"The dashboard has a sidebar on the left with navigation..."` becomes a visual diagram that conveys spatial relationships directly.

6. **Example-as-specification**: The correction chain is specified by a concrete 3-event example (`Event A: qty=8, Event B: ref_id=A, qty=6, Event C: ref_id=A, qty=7`) rather than a formal rule. This is more effective for agents because it provides a pattern to match against.

### Structural Choices That Make Skills Effective

1. **YAML frontmatter**: The `name` and `description` fields in the frontmatter serve as a skill card that the agent system can index without reading the full file. The description field is a comma-separated list of keywords (e.g., `"Database tables, schemas, RLS policies, Drizzle ORM, Zod validation, migrations..."`) that functions as a search-friendly summary.

2. **Consistent terminal section**: Every skill ends with "Anti-Patterns" followed by `"See docs/... for full..."`. This consistent structure means the agent knows where to find the guardrails and the escape hatch to more detail.

3. **Redundancy at boundaries**: The `has_federation_access()` SQL appears in both the data-model skill and the federation skill. This intentional redundancy ensures the agent has it available regardless of which skill is loaded. Cross-skill dependencies are minimized.

4. **Code block dominance**: Skills are roughly 60% code/schema content and 40% prose. This is effective because code blocks are unambiguous and directly usable, while prose requires interpretation.

### Relationship Between Skills and Phase Specs

Skills are **orthogonal** to phase specs. Phase specs are sequential (do this, then this, then verify). Skills are thematic (everything about data models, everything about federation). A phase spec may reference knowledge from multiple skills: Phase 3 (quoting/invoicing) needs the data-model skill (for schema validation), the event-system skill (for transient proposals), the AI-pipeline skill (for model tiering), the integrations skill (for Fortnox/BankID/Skatteverket), and the UI skill (for the proposal editor and PDF layout).

The phase specs even include their own skill-like knowledge through `INVARIANT` blocks in their conventions sections. Phase 4 adds `"INVARIANT drizzle_raw_sql"` and `"INVARIANT cost_details_never_leak"` -- these are phase-specific constraints that supplement but do not replace the skill-level knowledge.

### What Would an Optimal Agent Context System Change?

1. **Explicit cross-references**: Skills reference the spec with `"See docs/resonansia-spec.md section X"` but do not cross-reference each other. A skill should be able to say `"See also: @skill/event-system#correction-pattern"` to create a navigable knowledge graph.

2. **Version/phase annotations**: Skills do not indicate which phase introduced which knowledge. The Drizzle Raw SQL Traps were clearly added post-Phase-1, but this is not marked. Annotating knowledge with its provenance (e.g., `[Added: Phase 2, learned from bug #47]`) would help the agent understand the maturity and criticality of each constraint.

3. **Graduated detail**: Skills are currently flat -- all information is at the same level of detail. A more effective structure would use progressive disclosure: a 3-line summary, then a 20-line reference card, then the full detail. The agent could choose its resolution based on the task.

4. **Machine-readable constraints**: Anti-patterns are prose ("NEVER use service_role key in API handlers"). These could be expressed as grep-testable assertions: `ASSERT: grep -r "service_role" apps/web/app/actions/ == 0`. Several phase specs already do this in their `VERIFY invariants` blocks, but the skills do not.

5. **Negative examples alongside positive ones**: The Drizzle traps section is the only place that shows both wrong and right code side-by-side. This pattern is extremely effective and should be used throughout -- for example, showing both wrong (fetch own API from client component) and right (RSC data fetching) patterns in the UI skill's Next.js section.

6. **Skill dependency declarations**: The frontmatter should declare dependencies: `depends: [data-model, event-system]` for the federation skill, since it references concepts from both. This would allow the agent framework to auto-load prerequisite skills.

7. **Delta tracking**: When the master spec is updated, skills should flag which sections are potentially stale. Currently, the relationship between spec sections and skill sections is implicit. A mapping table (`spec section 2.7 -> federation skill, last synced: v2.0`) would prevent drift.

---

## Summary

CLAUDE.md and the 6 skill files form a **parallel specification channel** optimized for agent consumption. They compress the ~3500-line master spec and its companions into ~970 lines of operational reference material, using tables, code blocks, anti-pattern lists, ASCII wireframes, and concrete examples. They supplement the spec with implementation-derived knowledge (Drizzle traps, Tailwind classes, adapter patterns) that the technology-agnostic spec intentionally omits. The phase specs serve as the imperative execution plan, while CLAUDE.md + skills serve as the declarative reference loaded into working memory during execution. The system is well-designed but could benefit from explicit cross-referencing, version annotations, progressive disclosure, and machine-readable constraint assertions.

---

## Part 2: Taylor Events Specification Research (March 2, 2026)

Four parallel research agents were launched to extract domain knowledge,
research the AI sales agent landscape, map to the Resonansia data model,
and design the conversation architecture.

### Agent 1: Extract domain knowledge from recording
**Type:** general-purpose

#### Prompt
````
You are a domain knowledge extraction specialist. You have access to a conversation recording between a development team (Konrad, Björn) and a potential customer (Pettson/Erik) plus his colleague Anton.

Read `docs/Recording.txt` carefully and extract ALL domain knowledge, business context, and implicit information. This is a Swedish conversation transcription.

Produce:

## 1. STAKEHOLDER MAP
- Who is Pettson? What businesses does he run? What's his background?
- Who is Anton? Erik? What roles do they play?
- Who runs the office (ex-wife, Dova)? What are their tech capabilities?
- Who is Mariano (Costa Rica)? What did he build and why did it fail?

## 2. BUSINESS PORTFOLIO (each business unit)
For each of Pettson's businesses:
- Name, description, current status
- Existing platforms/tools in use
- Revenue model
- Current pain points
- Where AI could help

The businesses mentioned: N-Tech Platforms/Hudinavian, the mountain cabin company, Taylor Events, the football matches, others

## 3. THE BURNING PROBLEM (deadline April 1)
- What exactly needs to happen by April 1?
- 100,000 tickets for matches August 1 and 8 - what are these matches?
- What does "AI agent stack" mean in Pettson's context?
- What existing platforms will be used? What needs to be built NEW?

## 4. PETTSON'S MENTAL MODEL
- How does he think about AI agents? What metaphors does he use?
- What has he tried before (Mariano)? Why did it fail?
- What does "layers on top of e-commerce" mean to him?
- What does he mean by "customer acquisition, content, being smarter than everyone"?
- What platforms has he already purchased?

## 5. EMOTIONAL SIGNALS
- What is Pettson passionate about?
- What frustrates him?
- What has he explicitly said doesn't work?
- "Jag vill bara komma igång" - what does this urgency tell us?
- What's his risk tolerance? ("He sits on cash" - post-call discussion)

## 6. IMPLICIT KNOWLEDGE (things assumed but not explained)
- The Stenbeck/Kinnevik hotel platform - what is this likely? (Strawberry/Nordic Choice?)
- The travel platform with ~100 agencies and API consolidation - what could this be?
- The football matches - "world's most famous teams" in Stockholm and Gothenburg August 1 and 8 - what event is this likely?
- What does "owner portals" mean in the hotel context?

## 7. POST-CALL INSIGHTS (Konrad + Björn internal discussion)
- "Pettson sitter på cash" - financial assessment
- "inget jävla snack om vad du kan göra billigt" - pricing strategy
- The tree metaphor - shared trunk, different branches
- Gloria's role in the connection
- The urgency around physical meeting

## 8. WHAT WAS NOT ASKED (gaps in the conversation)
- What budget does Pettson have?
- What's the current customer acquisition process for each business?
- What CRM do they use currently?
- How many people work across all businesses?
- What are the actual conversion rates?
- Legal/compliance for ticket resale?
- Data they already have (customer lists, email lists, etc.)

Quote specific Swedish passages with English translations for key insights.
````

#### Response

This is the voice_recording.txt file which appears to be a different conversation (about the painting company). Let me continue reading the Recording.txt file more carefully and now produce the comprehensive extraction. I have all the content I need from `docs/Recording.txt` (lines 1-331). Let me now produce the full extraction.

---

# Domain Knowledge Extraction: Recording.txt

## 1. STAKEHOLDER MAP

### Pettson (also called Erik)
Pettson is a nickname (he says "alla sager Pettson" -- "everyone calls me Pettson"). His actual name appears to be Erik, which is how the call is introduced in line 1: *"Vi kan borja lite Erik, innan man kommer"* ("We can start a bit Erik, before he arrives"). He is a serial entrepreneur with a long career in travel and events. He describes himself:

> *"Jag har hallit pa med resor och event sen [garbled]"* (line 47)
> **Translation:** "I've been doing travel and events since [unclear year]."

> *"Jag har haft grundgruva i Zimbabwe"* (line 51)
> **Translation:** "I've had a mine in Zimbabwe."

> *"Jag har gjort allt jag har gjort. Som har funnits."* (line 53)
> **Translation:** "I've done everything I've done. Everything that has existed."

> *"Men jag har alltid haft en event och en resebyraa som har rullat."* (line 57)
> **Translation:** "But I've always had an event company and a travel agency running."

He has an IT background but has worn many other business hats in recent years:
> *"jag har en IT-bakgrund i botten, jag har pa mig mycket annan business har under de senaste aren"* (line 235)
> **Translation:** "I have an IT background at the core, but I've put on a lot of other business on top in recent years."

He is not a coder and neither is his team -- they rely on tools like Lovable and AI:
> *"det ar ingen av oss som ar kodare"* (line 219)
> **Translation:** "None of us are coders."

### Anton
Anton is referenced as a colleague/collaborator of Pettson. He appears to be operationally involved -- he is tasked with starting to work with the new travel platform the next day:

> *"Anton ska fa borja prata med dem imorgon"* (line 113)
> **Translation:** "Anton will start talking to them tomorrow."

At the very end of the recording, after the call, Konrad and Bjorn mention:
> *"den dar Anton som ar, han ar med i Skogshave, han ar med i den har Erik Lass X"* (line 331)
> **Translation:** "That Anton, he is in Skogshave, he is in this Erik Lass X."

This suggests Anton is connected to at least two ventures/networks: "Skogshave" and "Erik Lass X" (possibly a proper name or company).

### Erik
Erik appears to be the person on the call who spoke first (lines 1-29) before Pettson joined, laying out the portfolio of businesses. It is possible that "Erik" and "Pettson" are the same person (Pettson is the nickname), with Erik being introduced at the start and Pettson joining as his own persona/nickname. The call structure suggests Erik opens, then Pettson interrupts with "Hej, det ar Pettson har bara" (line 33). This could mean Pettson joined late as a separate person, or that he re-introduced himself by his nickname. Given line 1 says "Vi kan borja lite Erik, innan man kommer" ("Let's start a bit Erik, before he arrives"), this implies Erik and Pettson are two different people -- Erik started the call, and Pettson joined later. Erik appears to be a business partner or associate who helps manage the portfolio.

### The Office Team (ex-wife and Dova)
Pettson describes his office:
> *"Jag har ett kontor som drivs av min exfru och Dova."* (line 81)
> **Translation:** "I have an office run by my ex-wife and Dova."

Their technical capabilities are described as extremely basic:
> *"De ar kvar pa fast alder. Kommer du ihag nar det fanns Max?"* (line 83)
> **Translation:** "They're stuck in the stone age. Do you remember when there was Max?" (referring to an old computer era)

> *"De anvander bavra papper och Excel Sheet fortfarande"* (line 79)
> **Translation:** "They still use paper and Excel sheets."

This is a critical constraint: any solution MUST be usable by non-technical people. Pettson explicitly states:
> *"Det far inte vara for krangligt for dem."* (line 109)
> **Translation:** "It must not be too complicated for them."

### Mariano (Costa Rica)
Mariano is a developer/consultant based in Costa Rica who Pettson hired previously. He built automation tools:
> *"Jag har hallit pa med en kille som heter Mariano och han har byggt x antal outreach, agenter och sa vidare. Bland annat uppringningar och han har satt upp Venus och liksom."* (line 33)
> **Translation:** "I've been working with a guy named Mariano and he has built numerous outreach agents and so on. Including phone calls and he has set up Venus [likely Vapi or similar] and such."

The outcome was a failure:
> *"Det har inte hant ett skit egentligen, praktiskt sett."* (line 35)
> **Translation:** "Nothing has happened really, practically speaking."

> *"Men jag har hallit pa med alla tva totalt meningslosa fragor."* (line 37)
> **Translation:** "But I've been dealing with all kinds of totally meaningless questions."

> *"Jag har lart mig ungefar hur man inte ska gora. Han har byggt javligt mycket avancerade automationer."* (line 39)
> **Translation:** "I've learned roughly how NOT to do it. He has built extremely advanced automations."

The lesson learned: technically complex automations without practical results are useless. Pettson values tangible outcomes over technical sophistication.

His description of Mariano:
> *"Det ar en costarican som far djurkort av mig."* (line 45)
> **Translation:** "It's a Costa Rican who gets [money/gift cards] from me."

### Konrad
Konrad is one of the hosts (part of the development team). He describes himself as "Uppfinnar-Jocke" (Inventor-Jocke, a Swedish archetype of a creative tinkerer) who has worked with data for 25 years. He leads a team of 9 people, took a loan in January to go all-in on AI, and is building what he calls a "software factory." He is based in Sickla, Nacka (Stockholm area).

### Bjorn
Bjorn is Konrad's colleague/partner. He has run an event company for 15 years and recently had a breakthrough building a DMX lighting control system overnight using Claude Code. He represents the hands-on technical builder in the team.

### Gloria
Gloria is the person who made the connection between the parties:
> *"Det ar faktiskt Gloria som fixade det!"* (line 331)
> **Translation:** "It's actually Gloria who arranged this!"

---

## 2. BUSINESS PORTFOLIO

### Business 1: N-Tech Platforms / Hudinavian
- **Description:** A B2B platform for real estate transactions. Used by real estate agents (maklare), real estate companies, and property developers.
- **Quote:** *"Hudinavian, som ar en B2B plattform for fastighetstransaktioner, maklare, fastighetsbolag, fastighetsutvecklare"* (line 9)
- **Current status:** Existing, operational
- **Tools in use:** Not specified
- **Revenue model:** Likely B2B SaaS or transaction-based fees
- **Pain points:** Needs customer acquisition, content strategy, and AI-driven sales
- **Where AI could help:** Lead generation, content marketing, customer acquisition funnel

### Business 2: Mountain Cabin Company (Fjallbostader)
- **Description:** A real estate company that sells and rents out mountain cabins/lodges
- **Quote:** *"Vi har ett fastighetsbolag som ska salja och hyra ut fjallbostader"* (line 9)
- **Current status:** Operational or being set up
- **Revenue model:** Property sales and rentals (likely vacation/ski resort properties in Are, Salen, etc.)
- **Pain points:** Booking management, customer-facing AI for cabin selection and upselling
- **Where AI could help:** Pettson explicitly describes an AI agent for this:
  > *"en AI-agent som pratar om bokningar. En stuga i fjallen, da kommer man till den har vagen och sager att jag vill boka en stuga. Vi ar fyra stycken. Var vill ni vara? Ar det Are? Ytterligare Salen? Vart vill ni aka?"* (lines 21-23)
  > **Translation:** "An AI agent that talks about bookings. A cabin in the mountains, then you come this way and say I want to book a cabin. We are four people. Where do you want to be? Is it Are? Or Salen? Where do you want to go?"
  
  And upselling:
  > *"I forlangningen kanske om man vill boka allt fran. Liftkort till skidhyra, till restaurangen"* (line 25)
  > **Translation:** "In the long run, maybe if you want to book everything from lift passes to ski rentals, to the restaurant."

### Business 3: Taylor Events
- **Description:** A travel and ticket booking company handling sports events, corporate travel, flights, hotel bookings, and tickets to events like the Football World Cup.
- **Quote:** *"Vi har en verksamhet som haller pa med, som heter Taylor events, som ar ju da en resa och biljettbokningslada. Sportevent, foretagsresor, allt mojligt. allt fran flyg hotellbokningar biljett till fotbolls-vm"* (line 15)
- **Current status:** Existing but with a dated website
  > *"Taylor event heter den, du kan titta pa den sajten. Den ar byggd i HTML eller nagonting sant."* (lines 99-101)
  > **Translation:** "Taylor event is what it's called, you can look at the site. It's built in HTML or something like that."
- **Revenue model:** Commission on bookings and ticket sales; packaging travel + events
- **Pain points:** Old website, needs modern platform, needs AI-powered sales funnel
- **Where AI could help:** Customer acquisition, packaging (hotel + ticket + experiences), outreach automation

### Business 4: The Football Matches (August 1 and 8)
- **Description:** A specific commercial venture: selling approximately 100,000 tickets for two football matches featuring "the world's most famous teams" in Stockholm and Gothenburg on August 1 and 8.
- **Quote:** *"Vi har ungefar 100 000 biljetter som ska saljas i tva matcher den 1 och 8 augusti. [...] Se om varldens mest kanda lag har spelat fotbollsmatcher i Stockholm och Goteborg"* (lines 137-141)
- **Current status:** Pre-launch, deadline April 1 to have sales infrastructure ready
- **Revenue model:** Ticket sales, packaged with hotels and "pre-game" experiences
  > *"Med hotell, med biljett, hotell, med biljett, hotell, free game, med biljett, hotell, free game"* (line 147) -- "free game" here likely means "pre-game" events
- **Pain points:** Massive scale (100,000 tickets), tight timeline (must be ready by April 1 for August events)
- **Where AI could help:** Outreach agents, content marketing, cheap customer acquisition at scale

### Business 5: Additional Travel Businesses
- **Quote:** *"sen har vi ett par verksamheter till i reserummet och de ar ju lite spetiga"* (line 15)
- **Translation:** "Then we have a couple more businesses in the travel space and they are a bit niche."
- **Details not specified** -- described as niche travel-related ventures

### The Purchased Travel Platform
- **Description:** Pettson has purchased an existing travel platform used by approximately 100 large travel agencies, with API consolidation for bookings.
- **Quote:** *"Jag har kopt plattformen for en reseplattform. Som det ar ett hundratal stora resebyraer som anvander den. Som har API och konsoliderar API till bokning."* (lines 71-75)
- **UX:** *"Den har ett ganska bra UX utifran att till och med de pa kontoret kan anvanda dem"* (line 77) -- "It has a pretty good UX in that even the people in the office can use it."
- **Status:** Being started up, Anton will begin working with it the next day

### The Stenbeck/Kinnevik Hotel Platform
- **Description:** A hotel booking platform owned by the Stenbeck/Kinnevik sphere.
- **Quote:** *"Da finns det ytterligare en plattform som ags av Stenbeck och Kinnevik. De har en hotellbokningssajt som ar helt fantastisk. Och den paketerar da for urtidning. Och den har agarportaler och allting sant."* (lines 117-123)
- **Translation:** "Then there is another platform owned by Stenbeck and Kinnevik. They have a hotel booking site that is absolutely fantastic. And it packages for [something]. And it has owner portals and everything."
- **Features:** Owner portals, packaging capabilities

---

## 3. THE BURNING PROBLEM (Deadline April 1)

### What needs to happen by April 1:
An AI agent stack must be operational to begin selling approximately 100,000 tickets for two major football matches on August 1 and 8. The infrastructure needs to handle:

1. **Outreach/customer acquisition** -- reaching potential ticket buyers cheaply and at scale
2. **Content creation** -- professional marketing content
3. **Sales funnel** -- from awareness to purchase, potentially fully automated for simple ticket purchases
4. **Package sales** -- bundling tickets with hotel bookings and pre-game experiences

> *"Vi kommer behova vara uppe till forsta april ungefar med ett gang med en AI-agentstack."* (line 155)
> **Translation:** "We will need to be up and running by approximately April 1 with a team with an AI agent stack."

> *"Det ar sjalva contentet som vi ser bra ut som vi behover hitta. Vi behover hitta det billigaste sattet att fa in acceptition."* (line 161)
> **Translation:** "It's the content that makes us look good that we need to find. We need to find the cheapest way to get in [customer] acquisition."

### The matches:
"The world's most famous teams" playing football in Stockholm and Gothenburg on August 1 and 8. This is most likely a pre-season friendly tour or exhibition match series. Given the scale (100,000 tickets across two matches) and the description "world's most famous teams," this could be a tour featuring clubs like Real Madrid, Barcelona, Manchester United, or similar mega-clubs. These types of pre-season tours in Scandinavia are common (e.g., the International Champions Cup or similar exhibition events).

### What "AI agent stack" means to Pettson:
Pettson envisions AI agents as conversational interfaces that:
1. Handle outreach and customer acquisition (replacing Mariano's failed automations)
2. Act as on-platform assistants (chatbots that represent the business)
3. Drive sales funnels -- from first contact to completed purchase
4. Are layered ON TOP of existing e-commerce platforms (not replacing them)

> *"Att lagret over en produkt, over en e-commerce, lagren runt e-commerce grejen"* (line 171)
> **Translation:** "The layer on top of a product, on top of e-commerce, the layers around the e-commerce thing."

### Existing platforms to be used:
1. The purchased travel platform (with API consolidation, ~100 agencies)
2. The Stenbeck/Kinnevik hotel booking platform (with owner portals)
3. Taylor Events website (to be replaced/upgraded)

### What needs to be built NEW:
1. AI agents for outreach/customer acquisition
2. Content generation pipeline
3. CRM integration with AI
4. On-platform conversational agents
5. The "layer" on top of existing e-commerce that makes everything smarter

---

## 4. PETTSON'S MENTAL MODEL

### How he thinks about AI agents:
Pettson thinks of AI agents as **conversational sales representatives** that sit between the customer and the underlying transactional systems. His metaphor is a helpful person who:
- Asks questions to understand needs
- Recommends the right products
- Handles the booking process
- Upsells additional services

> *"Kommunikationssattet ar en AI-agent som pratar om bokningar"* (line 21)
> **Translation:** "The communication method is an AI agent that talks about bookings."

He does NOT want to build new platforms from scratch. He wants intelligence layered ON TOP of existing, proven platforms:
> *"Jag har inga problem att anvanda de har plattformarna. Sen vill jag lagga det har lagret pa med. Med kump-ackvisition, med content, med var lite smartare an alla andra"* (lines 125-127)
> **Translation:** "I have no problems using these platforms. Then I want to add this layer on top. With customer acquisition, with content, with being a little smarter than everyone else."

### What has he tried (Mariano) and why it failed:
Mariano built "extremely advanced automations" including outreach agents and automated phone calls ("uppringningar"), and set up tools like "Venus" (possibly Vapi, a voice AI platform). The failure was practical: nothing actually happened. The automations were technically impressive but produced no business results. Pettson's takeaway:

> *"Jag har lart mig ungefar hur man inte ska gora"* (line 39)
> **Translation:** "I've learned roughly how NOT to do it."

The implication: Pettson is skeptical of over-engineering and wants pragmatic, results-oriented solutions.

### "Layers on top of e-commerce":
This means using existing proven transactional platforms (the travel booking platform, the hotel platform) for the actual commerce/booking/payment, but building an intelligent layer around them that handles:
- Customer discovery and acquisition
- Conversational product selection
- Content marketing
- CRM and relationship management
- Analytics and being "smarter than everyone else"

### "Customer acquisition, content, being smarter than everyone":
This is Pettson's three-pillar strategy:
1. **Customer acquisition** -- finding and attracting buyers cheaply (the "cheapest way to get acquisition")
2. **Content** -- producing marketing content that makes them "look good"
3. **Intelligence** -- using AI to be faster, more personalized, and more effective than competitors

### Platforms already purchased:
1. A travel booking platform (with ~100 agency users and API consolidation)
2. Access to the Stenbeck/Kinnevik hotel platform (with owner portals)

---

## 5. EMOTIONAL SIGNALS

### What Pettson is passionate about:
- **Getting things done fast.** He is deeply frustrated by inaction and wants to move immediately:
  > *"Jag vill bara komma igang."* (line 69)
  > **Translation:** "I just want to get started."

- **Being the smartest in the room** -- having an edge through technology:
  > *"var lite smartare an alla andra"* (line 127)
  > **Translation:** "be a little smarter than everyone else"

- **Multiple verticals** -- he loves running many businesses and sees the opportunity to apply one solution across all of them

### What frustrates him:
- **Mariano's failure** -- paying for technically advanced but practically useless automations
- **His office team's limitations** -- they still use paper and Excel, and any solution must be simple enough for them
- **Being asked irrelevant questions:**
  > *"Men jag har hallit pa med alla tva totalt meningslosa fragor"* (line 37)
  > **Translation:** "But I've been dealing with completely meaningless questions."

### What he says does NOT work:
- Complex automations that don't produce results (Mariano)
- Building platforms from scratch when good ones already exist
- Systems that are too complicated for non-technical office staff

### "Jag vill bara komma igang" -- urgency analysis:
This urgency tells us:
1. He has been stuck in analysis/development paralysis (with Mariano) for some time
2. He has a hard deadline (April 1) bearing down
3. He has the money and the intent but lacks execution capability
4. He is ready to commit quickly if he finds the right partner
5. He is a decision-maker who acts on gut feeling and chemistry ("Du verkar vara crazy pa ett satt, sa vi kommer nog funka ihop")

### Risk tolerance:
High. Pettson is comfortable with risk:
- He has run a mine in Zimbabwe
- He runs multiple businesses simultaneously
- He has already purchased platforms speculatively
- He is sitting on cash (per post-call discussion)
- He jumped into the Mariano relationship and is ready to jump into a new one

---

## 6. IMPLICIT KNOWLEDGE

### The Stenbeck/Kinnevik hotel platform:
The Stenbeck family and Kinnevik (their investment vehicle) have extensive holdings in the Nordic hospitality sector. The most likely platform is connected to **Strawberry Hotels** (formerly Nordic Choice Hotels / Scandic), or possibly a platform within their digital portfolio. The mention of "owner portals" (agarportaler) suggests this may be a platform for hotel property owners to manage their listings and bookings -- possibly a white-label or B2B hotel distribution system. Stenbeck/Kinnevik have historically invested in digital platforms (e.g., Millicom, Tele2, Zalando-style marketplaces), so this could be a hotel marketplace or booking aggregator within their portfolio.

### The travel platform with ~100 agencies and API consolidation:
This is likely a Global Distribution System (GDS) frontend or a travel middleware platform -- something like TravelPort, Amadeus, or more likely a Nordic-specific platform like **Travellink**, **BCD Travel**, or possibly **Travelize** or similar. The key feature is API consolidation: it connects to multiple booking APIs (flights, hotels, etc.) through a single interface. The fact that ~100 large travel agencies use it suggests an established mid-market product.

### The football matches:
"The world's most famous teams" playing in Stockholm and Gothenburg on August 1 and 8, with 100,000 tickets total (roughly 50,000 per match). Given the timeline (2026), this could be:
- **Pre-season friendly tour** featuring clubs like Real Madrid, FC Barcelona, Manchester United, PSG, etc.
- Potentially related to the growing trend of international exhibition matches in Scandinavia
- The venues would be Friends Arena (Stockholm, capacity ~50,000) and Ullevi (Gothenburg, capacity ~43,000), which together could approach 100,000 tickets
- The commercial model (ticket + hotel + pre-game packages) is typical of premium exhibition match organizers

### "Owner portals" in the hotel context:
"Agarportaler" (owner portals) in the hotel/property context typically refers to interfaces where property owners (who may own hotel rooms/apartments as investments) can:
- View booking rates and occupancy
- See revenue and financial reporting
- Set availability windows
- Manage their property listing details
This is common in condo-hotel or fractional ownership models, where individual investors own hotel units managed by a hotel chain.

---

## 7. POST-CALL INSIGHTS (Konrad + Bjorn internal discussion)

### "Pettson sitter pa cash" -- financial assessment:
> *"Fan, inget javla snack om vad du kan gora billigt alltsa. De dar ar ju Pettson sitter ju pa Cash."* (line 289)
> **Translation:** "Damn, no f***ing talk about what you can do cheaply. Those guys are -- Pettson is sitting on cash."

Bjorn is warning Konrad: do NOT undersell. Do not position this as a cheap solution. Pettson has money and the pricing should reflect the value delivered, not be a race to the bottom.

### "Inget javla snack om vad du kan gora billigt" -- pricing strategy:
This is a direct instruction from Bjorn to Konrad: do not mention low prices, low salaries, or cheapness. During the call, Konrad had mentioned:
> *"vi alla har ganska laga loner"* (line 193)
> **Translation:** "We all have pretty low salaries."

Bjorn is correcting this approach post-call. The pitch should be about value and capability, not cost.

### The tree metaphor:
Konrad used this metaphor during the call to explain the shared-platform approach:
> *"som ett trad. Om vi har en massa olika projekt sa ska vi inte ha tio olika losningar, utan man ska forsoka ha sa likt som mojligt och se, kan vi ateranvanda nagot? [...] aven om vi har trad da liksom det ar olika grenar ut sa den forsta grenen kanske ar det har till april"* (lines 243-247)
> **Translation:** "Like a tree. If we have many different projects we shouldn't have ten different solutions, but try to have them as similar as possible and see, can we reuse something? [...] even if we have a tree with different branches, the first branch might be this thing for April."

This maps directly to Resonansia's architecture: a shared data model (7 tables) with different use cases branching off the same trunk. Each business vertical gets its own "branch" but shares the core event-sourced infrastructure.

### Gloria's role:
Gloria made the introduction between the parties. The nature of her relationship is not specified but she clearly has social/business connections to both sides. She is mentioned at line 489 during the voice recording as well.

### Urgency around physical meeting:
Both during the call and after, the need for an in-person meeting is emphasized:
> *"Vi ska ta ett fysiskt mote nasta gang, sa blir det lite lattare."* (line 265)
> **Translation:** "We'll take a physical meeting next time, so it'll be a bit easier."

After the call, Bjorn pushes:
> *"Om det ar forsta april som galler, forsok ta nasta mote sa fort som mojligt."* (line 279)
> **Translation:** "If April 1 is the deadline, try to take the next meeting as soon as possible."

And Bjorn's strategic framing:
> *"sa vi prioriterar att skaka hand pa nagonting sa vi kan borja jobba."* (line 279)
> **Translation:** "So we prioritize shaking hands on something so we can start working."

### The "gold rush" insight:
> *"Kom ihag att det ar guldruschen och folk vet inte om det."* (line 313)
> **Translation:** "Remember that it's the gold rush and people don't know it."

Bjorn sees the current AI moment as a gold rush. They should position themselves as the ones who understand this and can help clients capitalize, while others don't yet see it.

### Long-term strategy:
> *"For att det har ar ju ocksa, man hor ju, de har kommer ju fortsatta. Sa far vi en bra grund for de har sa kan det har forhoppningsvis bli en [Miriam/stor] grej."* (lines 305-311)
> **Translation:** "Because this is also, you can hear it, these [projects] will continue. So if we get a good foundation for these, this can hopefully become a [big] thing."

They see Pettson as a potential long-term client with multiple ongoing projects, not just a one-off engagement.

### Counter-argument about being too cheap/replaceable:
Bjorn raises concern about Konrad's earlier comment about clients being able to do things themselves:
> *"Det har med att ni kommer att losa det har sjalva. [...] Vi loser det sa latt att det handlar mer om att vi lyckas gora nagonting grymt an att vi snart runt hornet vem som helst kan gora det. Att vi har laga loner och allt sant dar."* (line 317)
> **Translation:** "This thing about you'll be able to solve this yourselves. [...] We solve it so easily that it's more about us succeeding in making something great than that soon around the corner anyone can do it. That we have low salaries and all that."

Bjorn is saying: do NOT say "anyone can do this" or "you can do it yourselves soon." Position the value in expertise and results, not in the commoditized tooling.

---

## 8. WHAT WAS NOT ASKED (Gaps in the conversation)

### Budget
No concrete numbers were discussed. We know Pettson "sits on cash" (Bjorn's assessment) and has already purchased at least two platforms, but no budget range for the AI agent stack was established.

### Current customer acquisition process for each business
While Pettson mentions the need for customer acquisition broadly, the specific current methods (paid ads, organic, referrals, partnerships) for each business unit were not explored.

### CRM
Pettson mentions wanting to "connect AI with the CRM" (*"klyka ihop AI med CRM-et"*, line 129) but never specifies what CRM they currently use, if any. The office team uses paper and Excel, so there may not be a formal CRM at all.

### Team size across all businesses
We know about the ex-wife, Dova, and Anton. But the total headcount across all businesses, any in-house marketing people, sales team size, etc. were not discussed.

### Actual conversion rates
No metrics were shared about current sales performance: website traffic, conversion rates, average order value, customer lifetime value, etc.

### Legal/compliance for ticket resale
Selling 100,000 football tickets raises questions about:
- Are they the primary ticket seller or a reseller?
- What licensing/authorization do they have?
- Consumer protection regulations for event tickets in Sweden
- Package travel regulations (EU Package Travel Directive applies to ticket+hotel bundles)

### Existing customer data
No discussion of:
- Email lists or customer databases
- Past customer purchase history
- Social media following/audience size
- Existing digital marketing channels or ad spend

### Technical integrations
While platforms were mentioned, no discussion of:
- Payment processing (Klarna, Stripe, Swish?)
- Email marketing tools
- Analytics platforms
- Social media management

### Competitive landscape
No discussion of who the competitors are in each vertical, what they do well, or where the differentiation opportunity lies.

### Revenue numbers
No revenue figures, margins, or financial targets were shared for any of the businesses.

### The Lovable question
Pettson asks *"Hur mycket anvander ni lovable nu?"* (line 217) -- "How much do you use Lovable now?" This reveals he is familiar with Lovable (an AI web app builder) and possibly uses it himself. This was not followed up on -- understanding his current tech stack and what he's already built/tried with Lovable would be valuable.

### What specifically happened with Mariano's tools
Beyond "nothing happened practically," the specific tools, the budget spent, what was built, and why it failed to produce results were not explored in detail. Understanding this failure is critical to avoiding the same mistakes.

---

## Summary Assessment

Pettson is a cash-rich, impatient, serial entrepreneur with a portfolio of 5+ businesses all needing the same thing: AI-powered customer acquisition and sales automation layered on top of existing e-commerce platforms. His most urgent need is selling 100,000 football tickets by August, with the sales infrastructure required by April 1. He has been burned by a Costa Rica-based developer who built impressive but useless automations. His office team is non-technical (paper and Excel). He values speed, practical results, and simplicity over technical sophistication. The shared-trunk/different-branches architecture (the tree metaphor) that Konrad pitched aligns perfectly with Resonansia's 7-table, event-sourced data model. Bjorn's post-call guidance is clear: price for value, move fast to a physical meeting, and close quickly.

---

### Agent 2: Research AI sales agent landscape
**Type:** general-purpose

#### Prompt
````
You are a technology researcher. Research the current landscape for AI-powered sales agents and outreach systems, specifically for the travel/events industry. This will inform a specification for building an AI agent platform.

Research:

## 1. AI OUTREACH AGENT PLATFORMS (2025-2026)
- What are the leading AI sales/outreach agent platforms? (e.g., 11x.ai, Relevance AI, Clay, Apollo with AI)
- What can they do? Cold email, cold calling, social outreach, content generation?
- What are their limitations?
- Pricing models?
- What would it cost to use off-the-shelf vs. building custom?

## 2. CONVERSATIONAL AI FOR BOOKING/SALES
- Current state of conversational AI for travel booking
- WhatsApp Business API for sales conversations
- Voice AI agents (for phone sales)
- Chat agents on websites
- Key players: Intercom, Drift, Tidio, custom solutions

## 3. THE TICKET SALES PROBLEM SPECIFICALLY
- How are large-scale sports event tickets sold today?
- What role can AI play in ticket + hotel + experience package sales?
- Dynamic pricing considerations
- Multi-channel outreach for ticket sales (email, social, ads, WhatsApp)
- Legal considerations for ticket sales in Sweden/EU

## 4. CONTENT + ACQUISITION STACK
- AI content generation for marketing (travel/events vertical)
- SEO content automation
- Social media content automation
- Landing page generation
- Lead magnet creation
- What can be automated vs. needs human touch?

## 5. CRM + AI INTEGRATION PATTERNS
- How do modern AI agents integrate with CRMs?
- Lead scoring with AI
- Automated follow-up sequences
- Multi-channel attribution
- The "AI layer on top of existing platforms" pattern

## 6. WHAT CAN BE BUILT IN 4 WEEKS (by April 1)?
Given a team that knows AI well, what's realistic to build in ~4 weeks?
- Minimum viable AI outreach system
- What to build vs. what to buy
- Quick wins vs. long-term platform play

Provide specific product names, pricing, and capabilities where possible.
````

#### Response

Now let me compile all of this research into a comprehensive report.

---

# AI-Powered Sales Agents & Outreach Systems for Travel/Events Industry
## Research Report -- March 2026

---

## 1. AI OUTREACH AGENT PLATFORMS (2025-2026)

### Tier 1: Fully Autonomous AI SDR Agents

These platforms replace or supplement human SDRs entirely, operating autonomously.

**[11x.ai](https://www.11x.ai/)** -- The market leader in fully autonomous AI SDRs.
- **Alice** (AI SDR): Identifies prospects, enriches data, writes personalized emails, manages sequences, handles replies, and books meetings. Works across email and LinkedIn. Multi-language.
- **Julian** (AI Phone Agent): Makes outbound calls, qualifies leads, routes hot leads to humans. Struggles with accents and complex objections.
- **Pricing**: ~$5,000/month with annual commitment (~$50K-60K/year for 3,000 contacts). Locked into rigid annual contracts. Some users report difficulty exiting contracts.
- **Limitations**: Personalization quality inconsistent; reply handling for complex objections is weak; expensive; inflexible contracts.

**[AiSDR](https://aisdr.com/)** -- Mid-market alternative.
- Explore plan at $900/month. Cheaper than 11x but less autonomous.

**[Artisan (Ava)](https://www.artisan.co/)** -- AI employee platform.
- ~$1,500+/month. Full SDR replacement with B2B database.

**[Reply.io (Jason AI)](https://reply.io/)** -- Starter at $500/month billed annually.
- AI SDR that handles prospecting, email writing, follow-ups.

**[Agent Frank by Salesforge](https://www.salesforge.ai/)** -- Budget option at ~$499/month.

### Tier 2: Data Enrichment + Workflow Platforms

**[Clay](https://www.clay.com/)** -- The "Swiss Army knife" of outbound data.
- Waterfall enrichment: queries multiple data providers sequentially for maximum match rates.
- Pricing: Free (100 credits), Starter $149/mo (2,000 credits), Explorer $349/mo (10,000 credits), Pro $720/mo (CRM integrations required).
- Real cost: $449-$1,200+/month once you account for credit burn (25-30% waste on failed lookups), top-up premiums, and required tool stack.
- Enrichment costs: Basic contact = 14 credits, full contact + company = 75 credits per lead.
- Strength: Programmable workflows, 100+ data providers, real-time triggers.
- Weakness: Steep learning curve, credit consumption scales fast.

**[Apollo.io](https://www.apollo.io/)** -- All-in-one prospecting + outreach.
- 210M+ contacts database, built-in sequencing, analytics.
- Free tier available; paid plans from $49/user/month.
- Good value for teams that want prospecting + outreach in one tool.

### Tier 3: Cold Email Infrastructure

**[Instantly.ai](https://instantly.ai/)** -- Growth tier at $47/month (1,000 contacts, 5,000 emails).
- Unlimited inboxes, fast warmup, clean UI. Leads database sold separately.

**[Smartlead](https://www.smartlead.ai/)** -- Basic $39/month, Pro ~$94/month.
- Unlimited email accounts, superior deliverability (randomized sending volumes). Best for agencies.

**[Saleshandy](https://www.saleshandy.com/)** -- Starting at $25/month.
- 830M+ B2B database, built-in CRM, unlimited accounts. Best value for high-volume senders.

**[Lemlist](https://www.lemlist.com/)** -- Multi-channel (email + LinkedIn + calls).
- Built-in B2B lead database, good for multi-channel sequences.

### Cost Comparison: Build vs. Buy

| Approach | Annual Cost | Time to Value |
|----------|------------|---------------|
| Human SDR (fully loaded) | $98,000-$173,000 | 3-6 months ramp |
| Premium AI SDR (11x.ai) | $50,000-$60,000 | 2-4 weeks |
| Mid-market AI SDR (AiSDR) | $10,800-$18,000 | 1-2 weeks |
| Budget AI SDR (Reply.io/Salesforge) | $6,000-$12,000 | 1 week |
| DIY stack (Clay + Instantly + AI) | $3,600-$8,400 | 2-4 weeks setup |
| Custom-built platform | $25,000-$95,000 upfront + hosting | 4-8 weeks |

**Recommendation for your use case**: A DIY stack of Clay (data enrichment) + Instantly or Smartlead (email delivery) + custom AI layer (for personalization and travel-specific context) would give the best ROI for a travel/events vertical. Off-the-shelf AI SDRs are generalist and will not understand ticket packaging, hotel bundles, or event-specific selling.

---

## 2. CONVERSATIONAL AI FOR BOOKING/SALES

### WhatsApp Business API

WhatsApp is the dominant channel for conversational commerce, especially in Europe and Latin America. The commercial messaging market is projected to reach $28 billion globally by 2026.

**Pricing (as of January 2026)**:
- Meta shifted from conversation-based to per-message pricing.
- Marketing messages: $0.0109-$0.1323 per message (varies by country).
- Utility messages: $0.0008-$0.0456 per message.
- Service messages (responding within 24h): **FREE**.
- Leads from Facebook/Instagram ads: **Free for 72 hours**.

**Critical policy change**: As of January 15, 2026, Meta prohibits general-purpose AI chatbots on WhatsApp Business API. However, purpose-built business chatbots (e.g., a travel company managing bookings) are explicitly preserved and allowed. This means a travel booking bot is compliant; a generic ChatGPT wrapper is not.

**Key WhatsApp platforms**:
- [Haptik](https://www.haptik.ai/) -- Enterprise WhatsApp commerce
- [AiSensy](https://aisensy.com/) -- WhatsApp API specifically for travel & tourism
- [respond.io](https://respond.io/) -- Multi-channel messaging with WhatsApp focus
- [Chatarmin](https://chatarmin.com/) -- WhatsApp marketing automation

### Website Chat Agents

**[Intercom](https://www.intercom.com/)** -- $74+/seat + $0.99/AI resolution.
- Best for customer support with AI (Fin AI agent). Strong product integrations. Enterprise-grade. Expensive at scale due to per-resolution pricing.

**[Drift](https://www.drift.com/) (now Salesloft)** -- Starting at $2,500/month.
- Sales-focused conversational AI. Routes warm leads to reps. Premium pricing.

**[Tidio](https://www.tidio.com/)** -- Base plan + Lyro AI add-on at $39/month.
- Budget-friendly. Lyro resolves up to 67% of repetitive queries. Good for SMBs. E-commerce integrations.

**[Voiceflow](https://www.voiceflow.com/)** -- No-code agent builder.
- Can build custom AI sales agents without code. Claims 5-minute setup for basic agents.

### Voice AI Agents (Phone Sales)

**[Bland.ai](https://www.bland.ai/)** -- ~$0.09/minute + subscription.
- Enterprise-grade. Dynamic, human-like conversations. Context-aware using NLP and conversation history. Extra charges for short/failed calls.

**[Vapi](https://vapi.ai/)** -- $0.05/minute. Developer-focused, API-first.
- Highly customizable. Best for technical teams that want full control. Supports high concurrent call volumes.

**[Synthflow](https://synthflow.ai/)** -- No-code voice AI.
- Pro: $375/month (2,000 minutes, 25 concurrent calls).
- Growth: $900/month (4,000 minutes, 50 concurrent calls).
- Agency: $1,400/month (6,000 minutes, unlimited subaccounts).
- Sub-100ms audio routing, carrier-grade uptime. Best for non-technical teams.

**[Retell AI](https://www.retellai.com/)** -- Developer-friendly voice agent platform.

**Key insight for travel/events**: Voice AI is promising for outbound ticket sales ("Hi, I'm calling about exclusive packages for the 2026 World Cup in Stockholm...") but still struggles with complex negotiations, accents, and objection handling. Best used for qualification and warm lead routing, not closing.

---

## 3. THE TICKET SALES PROBLEM SPECIFICALLY

### How Large-Scale Sports Event Tickets Are Sold Today

The online event ticketing market reached $85.35 billion in 2025, projected to $102.79 billion by 2030. Current distribution:

1. **Primary market**: Official ticketing partners (Ticketmaster, AXS, XTIX) handle initial sales. Allocation-based with tiered pricing.
2. **Package sales**: Tour operators and hospitality companies bundle tickets + hotel + transfers + experiences (e.g., MATCH Hospitality for FIFA events, Thomas Cook Sport).
3. **Corporate/B2B sales**: Direct outreach to corporations for hospitality packages, VIP suites, group tickets.
4. **Secondary market**: Resale platforms (StubHub, Viagogo, fanSALE). Heavily regulated in EU.
5. **Direct-to-consumer marketing**: Email campaigns, social media ads, influencer marketing.

### Where AI Can Play in Ticket + Hotel + Experience Packages

1. **Dynamic pricing**: AI adjusts package prices based on demand, competitor pricing, time-to-event, and inventory levels. Venues report **34% revenue increases** using ML-based dynamic pricing.
2. **Personalization**: AI recommends package tiers based on customer profile, past purchases, and browsing behavior.
3. **Lead qualification**: AI scores leads and routes high-value prospects (corporate buyers, group organizers) to human sales reps.
4. **Automated outreach**: AI sends personalized emails/WhatsApp messages to segmented audiences (e.g., "Fans who attended the 2024 event but haven't booked for 2026").
5. **Booking assistance**: Conversational AI handles FAQ, availability checks, and simple bookings 24/7.
6. **Upselling/cross-selling**: AI suggests upgrades (better seats, VIP experiences, extended hotel stays) during the booking flow.

### Dynamic Pricing Considerations

AI-powered dynamic pricing for events considers:
- Historical demand patterns, time until event, competitor pricing, weather forecasts, team/artist performance, social media sentiment, remaining inventory, day of week, and macroeconomic indicators.
- Real-time ADR (Average Daily Rate) improvements of 10-15% for hotel components.
- Every seat, space, and experience can now be independently dynamically priced.

### Multi-Channel Outreach for Ticket Sales

| Channel | Best For | AI Automation Level |
|---------|----------|-------------------|
| Email | Initial outreach, nurture sequences | High (fully automatable) |
| WhatsApp | Warm leads, booking assistance, updates | High (conversational AI) |
| Phone | High-value B2B packages, corporate sales | Medium (qualification, not closing) |
| Social media | Awareness, retargeting, community | High (content + ads) |
| Website chat | On-site conversion, FAQ | High (chatbot) |
| LinkedIn | B2B corporate hospitality outreach | Medium (connection + messaging) |

### Legal Considerations for Ticket Sales in Sweden/EU

**Sweden specifically**:
- No law criminalizing ticket resale. Regulation relies on consumer protection law and organizer terms of service.
- No rules on price markups for resold tickets.
- As of December 2022, second-hand tickets must honor cancellation policies (ARN decision).
- Authorized resellers (fanSALE, Ticketmaster Resale) limit markups: fanSALE prohibits above-face-value; Ticketmaster allows up to 20%.

**EU-wide**:
- Digital Services Act (DSA) applies to all online platforms including ticket resale.
- GDPR applies to all customer data collection and outreach.
- EU Regulation 2017/2394 covers cross-border consumer protection for event tickets.
- The EU live events industry is actively lobbying for stricter resale regulation via the Digital Fairness Act (expected 2026-2027).
- Consumer rights: 14-day cooling-off period for online purchases may apply to ticket sales depending on exemptions.

**Key compliance requirement**: Any AI outreach system must comply with GDPR for data collection, consent management, and right-to-erasure. Cold email in the EU requires legitimate interest or consent basis.

---

## 4. CONTENT + ACQUISITION STACK

### AI Content Generation for Travel/Events

**What can be automated (high confidence)**:
- Blog posts about destinations, events, travel tips (with human editing for brand voice)
- SEO-optimized landing pages for specific events/packages
- Email sequences and newsletter content
- Social media posts, captions, hashtags
- Product descriptions for packages
- FAQ content
- Translation and localization (50+ languages)

**What needs human touch**:
- Brand storytelling and emotional narrative
- Expert commentary and genuine travel experience reviews
- Photography and video (AI can edit/optimize, not replace)
- Crisis communications
- Influencer relationship management
- Final approval on all public-facing content

### SEO Content Automation (2026 Reality)

The SEO landscape has shifted significantly:
- Search engines now interpret user intent at a granular level using AI -- keyword stuffing is dead.
- **LLM optimization** is emerging alongside traditional SEO. Visibility is now measured not just by Google results but by responses from ChatGPT, Gemini, and Perplexity.
- 74% of new websites now feature AI-supported content.
- 85% of marketers actively use AI tools in content creation.
- Enterprise SEO requires automation to scale -- AI for insights, creation, optimization, and distribution.

### Social Media Automation

Key platforms for 2026:
- **[quso.ai](https://quso.ai/)** -- End-to-end AI content platform. Converts long-form video to social posts.
- **[Hootsuite](https://www.hootsuite.com/)** -- Enterprise scheduling with AI features.
- **[Buffer](https://buffer.com/)** -- Straightforward multi-platform scheduling.
- **[SocialBee](https://socialbee.com/)** -- Category-based content automation.
- **[FeedHive](https://www.feedhive.com/)** -- AI-powered content creation at scale.

Marketers using AI tools report **70% reduction in content creation time** and **10-15 hours saved per week**.

### Landing Page Generation

- **[involve.me](https://www.involve.me/)** -- AI agent generates complete landing pages with forms, no coding.
- **[Leadpages](https://www.leadpages.com/)** -- Established landing page builder with AI features.
- **[Magnetly.co](https://www.magnetly.co/)** -- AI lead magnet generation in under 2 minutes (96% faster than manual).

AI-generated lead magnets achieve **27-34% higher opt-in rates** compared to manually designed versions.

---

## 5. CRM + AI INTEGRATION PATTERNS

### The "AI Layer on Top of Existing Platforms" Pattern

The dominant architecture in 2026 is not replacing CRMs but adding an AI orchestration layer:

```
[Data Sources] --> [AI Enrichment Layer] --> [CRM] --> [AI Action Layer] --> [Channels]
     |                    |                    |              |                  |
  Website visits     Clay/Apollo           HubSpot/      Sequencing         Email
  Social signals     enrichment           Salesforce      engine          WhatsApp
  Intent data        Lead scoring          Pipedrive     AI writer          Phone
  Event triggers     Company data                       Scheduling        LinkedIn
```

### AI Lead Scoring

Modern AI lead scoring aggregates signals from:
- Email engagement (opens, clicks, replies)
- Website behavior (pages visited, time on site, return visits)
- Social media interactions
- CRM history and deal patterns
- Intent signals (job changes, funding rounds, company growth)
- Conversation sentiment analysis

Scores update continuously in real-time, not on scheduled intervals. The AI learns from your specific win/loss patterns, not generic models.

### Automated Follow-Up Sequences

The state of the art in 2026:
- **Trigger-based**: Actions fire based on prospect behavior (opened email, visited pricing page, downloaded content).
- **AI-written**: Each follow-up is dynamically generated based on prospect context, not templated.
- **Multi-channel**: Sequences span email, LinkedIn, WhatsApp, phone -- with channel selection optimized by AI based on prospect preferences.
- **Self-optimizing**: AI A/B tests subject lines, send times, channel mix, and message content automatically.

### Multi-Channel Attribution

AI models now track the full customer journey across channels, attributing revenue to touchpoints using ML models rather than simplistic last-click or first-click attribution. This is critical for travel/events where the buying journey spans multiple weeks and channels.

---

## 6. WHAT CAN BE BUILT IN 4 WEEKS (By April 1)

### The Realistic 4-Week Plan

Based on industry benchmarks (AI MVPs typically take 4-8 weeks; simpler products 2-4 weeks), here is what a capable team can deliver:

### Week 1: Foundation + Data Pipeline
**Build:**
- Lead database schema and import pipeline (scrape/import target audiences)
- Integration with Clay or Apollo for data enrichment
- Basic CRM (or integrate with existing -- HubSpot free tier, Pipedrive)
- Email infrastructure setup (domain warming with Instantly or Smartlead -- note: domains need 2+ weeks warmup)

**Buy:**
- Instantly.ai or Smartlead ($39-47/month) for email infrastructure
- Clay Starter ($149/month) for data enrichment
- Email domains (5-10 domains for sending rotation, ~$10-15 each)

### Week 2: AI Outreach Engine
**Build:**
- AI email writer using Claude/GPT-4 API with travel/events-specific prompts and context
- Personalization engine that pulls prospect data and generates custom messaging
- Sequence logic (initial outreach, follow-up cadence, reply detection)
- Basic analytics dashboard (open rates, reply rates, meetings booked)

**Buy:**
- Anthropic Claude API or OpenAI API (~$50-200/month depending on volume)

### Week 3: Multi-Channel + Conversational AI
**Build:**
- WhatsApp Business API integration for warm lead conversations
- Simple website chat widget with AI booking assistant
- Landing page templates for specific event packages
- Lead scoring model (rule-based initially, ML later)

**Buy:**
- WhatsApp Business API (via respond.io or direct Meta Cloud API, ~$50-100/month + per-message costs)
- Landing page tool (involve.me or similar, ~$50/month)

### Week 4: Optimization + Launch
**Build:**
- A/B testing framework for email subject lines and messaging
- Reporting dashboard (conversion funnel, channel attribution)
- Content generation pipeline for social media posts
- Integration testing and hardening

**Buy:**
- Social media scheduler (Buffer free tier or SocialBee ~$29/month)

### What to Build vs. What to Buy

| Component | Build | Buy | Rationale |
|-----------|-------|-----|-----------|
| Email infrastructure | | Instantly/Smartlead | Deliverability is hard; don't reinvent |
| Data enrichment | | Clay/Apollo | 100+ data providers impossible to replicate |
| AI email personalization | X | | Travel/events vertical needs custom prompts |
| WhatsApp integration | X | | Custom booking flow needed |
| Website chat | Hybrid | | Use Tidio ($39/mo) + custom AI backend |
| Voice calling | | Synthflow/Vapi | Too complex for 4-week build |
| Landing pages | | involve.me/Leadpages | Focus on content, not page builders |
| CRM | | HubSpot Free/Pipedrive | Don't build CRM infrastructure |
| Lead scoring | X | | Domain-specific (ticket buyer signals) |
| Content generation | X | | Vertical-specific prompts and templates |
| Analytics | X | | Custom KPIs for ticket/package sales |

### Estimated Month-1 SaaS Costs

| Tool | Monthly Cost |
|------|-------------|
| Instantly.ai (email sending) | $47 |
| Clay Starter (enrichment) | $149 |
| Claude/OpenAI API | $100-200 |
| WhatsApp API (messaging) | $50-100 |
| Tidio (website chat) | $39 |
| Email domains (10x) | $15 (one-time) |
| Landing page tool | $50 |
| Social scheduler | $29 |
| **Total** | **~$480-630/month** |

### Quick Wins vs. Long-Term Platform

**Quick wins (Week 1-2, immediate ROI)**:
- AI-personalized cold email outreach to a curated list of corporate buyers and travel agencies
- Landing pages for specific event packages with lead capture
- Automated email sequences with AI-written follow-ups

**Medium-term (Week 3-4)**:
- WhatsApp booking assistant for warm leads
- Multi-channel sequences (email + LinkedIn + WhatsApp)
- Basic lead scoring to prioritize sales team time

**Long-term platform play (post-April 1)**:
- Voice AI for outbound calling
- Dynamic pricing engine for packages
- Full CRM with AI-powered deal management
- Content engine for SEO + social at scale
- Multi-tenant platform (if serving multiple event organizers)
- Predictive analytics (demand forecasting, churn prediction)

---

## KEY TAKEAWAYS

1. **Don't build what you can buy**: Email deliverability (Instantly), data enrichment (Clay), and voice AI (Synthflow) are solved problems. Build the AI brain and vertical-specific logic.

2. **The travel/events vertical is underserved**: Most AI SDR platforms are built for generic B2B SaaS sales. There is a real opportunity in building travel/events-specific AI agents that understand package selling, dynamic pricing, and multi-component bookings.

3. **WhatsApp is your secret weapon in Europe**: Free service messages, high open rates (98% vs. 20% for email), and Meta's explicit support for travel booking bots make it the highest-ROI channel for warm leads.

4. **Start with email, add channels**: Email infrastructure needs 2+ weeks for domain warmup anyway. Use that time to build the AI personalization engine, then layer on WhatsApp and chat.

5. **4 weeks is tight but achievable**: A focused team can ship an MVP AI outreach system (email + landing pages + basic WhatsApp) in 4 weeks. Voice AI and dynamic pricing are post-MVP.

6. **Legal compliance is manageable**: Sweden has minimal ticket resale restrictions. EU GDPR is the main compliance concern -- ensure consent-based outreach and data handling from day one.

7. **The cost advantage is massive**: A custom AI outreach stack at ~$500-600/month replaces what would cost $5,000-$15,000/month in enterprise AI SDR tools, with better vertical customization.

---

## Sources

- [11x.ai - AI SDR Platform](https://www.11x.ai/)
- [11x.ai Pricing Review (Reply.io)](https://reply.io/blog/11x-ai-review/)
- [11x.ai Pricing Breakdown (sdrx.ai)](https://www.sdrx.ai/blog/11x-ai-pricing/)
- [Clay Pricing Plans](https://www.clay.com/pricing)
- [Clay Pricing 2026 (LaGrowthMachine)](https://lagrowthmachine.com/clay-pricing/)
- [Instantly.ai](https://instantly.ai/)
- [Smartlead](https://www.smartlead.ai/)
- [Smartlead vs Instantly (Sparkle)](https://sparkle.io/blog/smartlead-vs-instantly/)
- [AI SDR Tools Comparison (Monday.com)](https://monday.com/blog/crm-and-sales/best-ai-sdr-tools/)
- [AI SDR vs Hiring SDR ROI (SurFox)](https://www.getsurfox.com/blog/ai-sdr-vs-hiring-sdr-roi-2026/)
- [WhatsApp Business API Pricing 2026](https://flowcall.co/blog/whatsapp-business-api-pricing-2026)
- [WhatsApp 2026 AI Policy (respond.io)](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)
- [WhatsApp API for Travel (respond.io)](https://respond.io/blog/whatsapp-api-for-travel-businesses)
- [WhatsApp Business 2025 Statistics](https://www.aurorainbox.com/en/2026/03/01/whatsapp-business-2025-statistics/)
- [Bland.ai](https://www.bland.ai/)
- [Synthflow AI vs Vapi AI](https://synthflow.ai/blog/bland-ai-vs-vapi-ai)
- [Voice AI Agent Platforms (Retell AI)](https://www.retellai.com/blog/best-voice-ai-agent-platforms)
- [AI Voice Agents Ranked (Lindy)](https://www.lindy.ai/blog/ai-voice-agents)
- [Intercom Review (Tidio)](https://www.tidio.com/blog/intercom-review/)
- [Chatbot Pricing Comparison 2026 (Tidio)](https://www.tidio.com/blog/chatbot-pricing/)
- [Drift vs Intercom (Tidio)](https://www.tidio.com/blog/drift-vs-intercom/)
- [AI Transforming Event Ticket Sales (XTIX)](https://xtix.ai/blog/how-ai-is-transforming-event-ticket-sales-in-2025)
- [AI Dynamic Pricing Strategies (Playbook Sports)](https://www.callplaybook.com/reports/top-5-ai-marketing-strategies-for-dynamic-ticket-pricing)
- [AI Transforming Ticketing 2026 (Softjourn)](https://softjourn.com/insights/how-ai-is-transforming-the-ticketing-industry)
- [Ticketing Industry Trends 2026 (Softjourn)](https://softjourn.com/insights/top-event-ticketing-industry-trends)
- [AI Dynamic Pricing Guide (TicketsOnline.AI)](https://ticketsonline.ai/blog/ai-dynamic-pricing-guide.html)
- [Sweden Ticket Resale Rules (The Local)](https://www.thelocal.se/20240710/the-rules-for-buying-and-selling-event-tickets-in-sweden-and-how-to-avoid-scams)
- [EU Ticket Resale Regulation (Festival Insights)](https://www.festivalinsights.com/2024/02/eu-online-ticket-resellers-regulation-force/)
- [EU Live Events Ticket Resale Call (Billboard)](https://www.billboard.com/pro/eu-ticket-resale-open-letter-2026-digital-fairness-act/)
- [Ticket Resale Laws by Country](https://ticketflipping.com/resources/ticket-resale-laws-by-country/)
- [EU Ticketing Regulations (XTIX)](https://xtix.ai/blog/how-european-regulations-are-changing-the-ticketing-game)
- [Relevance AI Pricing](https://relevanceai.com/pricing)
- [Relevance AI Review (Reply.io)](https://reply.io/blog/relevance-ai-review/)
- [AI Lead Scoring (Warmly)](https://www.warmly.ai/p/blog/ai-lead-scoring)
- [AI Lead Follow-Up (Monday.com)](https://monday.com/blog/crm-and-sales/ai-lead-follow-up/)
- [AI-Powered CRM (Monday.com)](https://monday.com/blog/crm-and-sales/crm-with-ai/)
- [SEO and Content Strategy 2026 (Robotic Marketer)](https://www.roboticmarketer.com/the-future-of-seo-content-strategy-in-the-age-of-ai-2026-edition/)
- [AI Content Marketing Data (Zeo)](https://zeo.org/resources/blog/how-ai-is-changing-content-marketing-2025-data-and-2026-predictions)
- [Content Automation Platforms 2026 (Sight AI)](https://www.trysight.ai/blog/best-content-automation-platforms)
- [AI Landing Page Generators 2026 (NxCode)](https://www.nxcode.io/resources/news/ai-landing-page-generator-2026)
- [Lead Magnet Tools 2026 (Magnetly)](https://www.magnetly.co/blog/best-lead-magnet-tools-2026)
- [Build AI Sales Agent Without Code (Voiceflow)](https://www.voiceflow.com/blog/ai-sales-agent)
- [AI MVP Development Guide](https://ai.tekrevol.com/blogs/mvp-development-guide/)
- [Best AI Social Media Schedulers 2026 (Sintra)](https://sintra.ai/blog/best-ai-social-media-scheduler)

---

### Agent 3: Map customer needs to Resonansia model
**Type:** general-purpose

#### Prompt
````
You are a data architect. You need to understand how an existing graph-based data model can be extended to serve a new use case: an AI sales agent platform for a multi-business customer in the travel/events space.

First, read these files to understand the existing Resonansia data model:
- `docs/resonansia-spec.md` (focus on Section 2: Data Model - the 7 tables)
- `.claude/skills/data-model/SKILL.md`
- `.claude/skills/event-system/SKILL.md`
- `.claude/skills/ai-pipeline/SKILL.md`

Then read the customer conversation:
- `docs/Recording.txt`

Now produce:

## 1. DATA MODEL MAPPING
How does each customer concept map to the existing 7-table model (tenants, labels, nodes, edges, events, blobs, dicts)?

Map these concepts:
- A "business unit" (Taylor Events, Mountain Cabins, Football Matches) -> ?
- A "lead" or "prospect" -> ?
- A "conversation" (AI agent talking to a prospect) -> ?
- A "campaign" (outreach campaign targeting X people) -> ?
- A "ticket/product" being sold -> ?
- A "booking" or "transaction" -> ?
- An "AI agent" (the configured agent for a specific purpose) -> ?
- A "content piece" (marketing email, social post, landing page) -> ?
- An "outreach sequence" (multi-step follow-up) -> ?
- An "integration" (connection to external booking platform) -> ?

## 2. NODE TYPES NEEDED
What new node types (labels) are needed? For each:
- node_type label code
- NodeData schema (fields, types, purpose)
- Example instance

## 3. EDGE TYPES NEEDED
What edges connect these nodes? For each:
- edge_type label code
- EdgeData schema
- Example: "lead --[responded_to]--> campaign"

## 4. EVENT TYPES NEEDED
What events occur in this domain? For each:
- event_type label code
- EventData schema
- Example

Think about: outreach_sent, response_received, conversation_message, booking_initiated, booking_confirmed, payment_received, content_published, lead_scored, agent_handoff_to_human, etc.

## 5. AI PIPELINE MAPPING
How does the existing AI pipeline (3 tiers, context protocol, anomaly shield) apply to:
- Generating outreach content
- Classifying inbound responses
- Running conversations (the AI agent talking to prospects)
- Lead scoring
- Content generation

## 6. MULTI-TENANT STRATEGY
Pettson has multiple businesses. How should this map to tenants?
- Option A: One tenant per business unit
- Option B: One tenant for Pettson, with project-level separation
- Option C: Hybrid

Which is best and why?

## 7. WHAT THE MODEL GIVES FOR FREE
What does the existing Resonansia model already provide that directly benefits this use case?
- Event sourcing = full conversation audit trail
- Bitemporality = retroactive corrections
- Federation = subcontractor/partner access
- Graph structure = relationship mapping between leads, campaigns, agents

## 8. WHAT NEEDS TO BE NEW
What cannot be modeled with the existing schema and needs extension?
- Real-time conversation state management?
- External API state (booking platform sync)?
- AI agent configuration/personality?

Be specific and concrete. Use the exact field names from the existing schema.
````

#### Response

Now I have a comprehensive understanding of the full data model, event system, AI pipeline, and the customer conversation. Let me produce the analysis.

---

## 1. DATA MODEL MAPPING

The customer ("Pettson") runs multiple businesses in travel/events and needs an AI sales agent platform. Here is how each concept maps to the existing 7-table Resonansia model:

### Business Unit (Taylor Events, Mountain Cabins, Football Matches)

**Maps to: Node (type_id = `org`)** with edges connecting them.

Each business unit is a Node of type `org`. The parent company (Pettson's holding) can be represented as a parent org node with `parent_id` linkage, or via edges of type `subsidiary_of`. The `NodeData_Org` schema already supports `name`, `contact`, `industry`, `default_currency_id`, and `logo_url` -- all relevant.

Alternatively, if hard tenant isolation is needed between business units, each maps to a separate **Tenant** (see Section 6 below).

### Lead / Prospect

**Maps to: Node (type_id = `customer`)** in state `draft` or a new state `lead`.

The existing `NodeData_Customer` schema has `name`, `contact` (email, phone), `is_company`, `preferred_channel` -- all directly applicable. A lead that has not yet converted is a customer node with `state_id` referencing a new `node_state` label `lead`. Upon conversion, a `state_change` event moves it to `active`.

Additional lead-specific data goes into `Node.data`:
- `source` (how they were acquired: campaign, organic, referral)
- `score` (AI-computed lead score)
- `tags` (interest areas: football, ski, corporate travel)

### Conversation (AI agent talking to a prospect)

**Maps to: Node (type_id = `conversation`)** + **Events (type_id = `conversation_message`)**.

A conversation is a new node type. Each message exchanged is an Event attached to that conversation node via `event.node_id`. The existing `EventData_Message` schema (`text`, `channel`, `direction`, `external_id`) maps directly. The `actor_id` on the event identifies whether it was the AI agent or the human prospect.

The conversation node is connected to the lead/customer via an Edge (`conversation` --[`belongs_to`]--> `customer`) and to the AI agent node via an Edge (`conversation` --[`handled_by`]--> `agent`).

### Campaign (outreach campaign targeting X people)

**Maps to: Node (type_id = `campaign`)**.

A campaign is a new node type with `NodeData_Campaign` in the `data` field. Edges connect it to target leads (`campaign` --[`targets`]--> `customer`). Events track campaign activity: `outreach_sent`, `outreach_opened`, `outreach_clicked`, `outreach_responded`.

### Ticket / Product being sold

**Maps to: Node (type_id = `product`)**.

The existing `NodeData_Product` schema supports `name`, `sku`, `unit_id`, `default_price`. For tickets and travel packages, the `data` field extends naturally:
- `event_date` (when the football match occurs)
- `venue` (stadium/location)
- `capacity` / `inventory_count`
- `category` (VIP, standard, package)

Linked to a location node via Edge (`product` --[`located_at`]--> `location`).

### Booking / Transaction

**Maps to: Node (type_id = `booking`)** + **Events**.

A booking is analogous to a "project" in the construction domain -- it is the central entity where economic events accumulate. Events of type `booking_line` (analogous to `quote_line` / `invoice_line`) track what was purchased. Events of type `payment` track payments. The existing economic aggregation pattern (SUM of active events) works identically.

### AI Agent (configured agent for a specific purpose)

**Maps to: Node (type_id = `agent`)**.

An AI agent is a new node type. Its `data` field stores the agent's configuration: personality prompt, knowledge base references, business rules, allowed actions, escalation thresholds. Connected to the business unit via Edge (`agent` --[`serves`]--> `org`).

### Content Piece (marketing email, social post, landing page)

**Maps to: Node (type_id = `content`)** + **Blob** for rendered assets.

A content piece is a node with `data` containing the content body, type (email, social_post, landing_page), status (draft, published), and metadata. Rendered HTML/images go into Blobs linked to the node. Events track publishing actions (`content_published`, `content_updated`).

### Outreach Sequence (multi-step follow-up)

**Maps to: Node (type_id = `sequence`)** with child nodes.

A sequence is a node whose children (`parent_id`) are individual step nodes. Each step defines: delay, channel, content template. The sequence node is connected to a campaign via Edge. Events track execution of each step per lead.

### Integration (connection to external booking platform)

**Maps to: Dict** entries for configuration + **Events** for sync logs.

Integration configuration (API keys, endpoints, mapping rules) lives in `Dict` entries with `scope = "integration.booking_platform"` and `tenant_id` set appropriately. Every sync action produces an Event with `origin = external_api`. This matches the existing pattern exactly.

---

## 2. NODE TYPES NEEDED

The following new labels in domain `node_type` are required:

### `campaign`
```
NodeData_Campaign:
  name:             String            # required -- "Summer Football 2026"
  description:      String | null     # optional -- campaign brief
  channel:          String            # required -- "email" | "sms" | "whatsapp" | "multi"
  target_count:     Int | null        # optional -- planned reach
  budget:           Decimal | null    # optional -- campaign budget in minor units
  dates:            DateRange | null  # optional -- scheduled start/end
  content_template: String | null     # optional -- default template reference
  tags:             List<String>      # optional -- ["football", "vip", "corporate"]

Example:
  id: 019508a1-...
  tenant_id: 019507ff-...
  type_id: <label_id for node_type.campaign>
  key: "CAMP-2026-001"
  state_id: <label_id for node_state.active>
  data: {
    "name": "VM Fotboll Stockholm Aug 2026",
    "channel": "multi",
    "target_count": 50000,
    "dates": { "start_date": "2026-04-01", "end_date": "2026-08-01" },
    "tags": ["football", "world-cup", "stockholm"]
  }
```

### `agent`
```
NodeData_Agent:
  name:             String            # required -- "Mountain Cabin Booking Agent"
  personality:      String            # required -- system prompt / persona description
  knowledge_refs:   List<Uuid7>       # optional -- references to content/product nodes
  allowed_actions:  List<String>      # required -- ["search_availability", "create_booking", "answer_faq"]
  escalation_rules: Json | null       # optional -- when to hand off to human
  model_tier:       String            # required -- "cheap" | "medium" | "expensive"
  language:         String            # required -- primary language: "sv", "en"
  max_turns:        Int               # optional -- max conversation turns before escalation
  active:           Boolean           # required -- whether agent is live

Example:
  id: 019508b2-...
  type_id: <label_id for node_type.agent>
  data: {
    "name": "Taylor Events Booking Agent",
    "personality": "You are a helpful booking assistant for Taylor Events, a Swedish travel and events company. You help customers find and book travel packages, event tickets, and corporate experiences. Be warm, professional, and proactive about upselling related products.",
    "allowed_actions": ["search_availability", "create_booking", "answer_faq", "collect_contact"],
    "escalation_rules": { "max_unanswered": 2, "keywords": ["complaint", "refund", "manager"] },
    "model_tier": "medium",
    "language": "sv",
    "max_turns": 20,
    "active": true
  }
```

### `conversation`
```
NodeData_Conversation:
  channel:          String            # required -- "web_chat" | "whatsapp" | "sms" | "email"
  started_at:       Timestamp         # required -- when conversation began
  summary:          String | null     # optional -- AI-generated conversation summary
  sentiment:        String | null     # optional -- "positive" | "neutral" | "negative"
  outcome:          String | null     # optional -- "booked" | "abandoned" | "escalated" | "nurturing"
  turn_count:       Int               # required -- number of messages exchanged
  last_message_at:  Timestamp | null  # optional -- for sorting/activity tracking

Example:
  id: 019508c3-...
  type_id: <label_id for node_type.conversation>
  state_id: <label_id for node_state.active>
  data: {
    "channel": "web_chat",
    "started_at": "2026-04-15T14:30:00Z",
    "summary": "Customer interested in 4-person ski cabin in Are, week 8. Checking availability.",
    "sentiment": "positive",
    "outcome": null,
    "turn_count": 6,
    "last_message_at": "2026-04-15T14:35:22Z"
  }
```

### `booking`
```
NodeData_Booking:
  name:             String            # required -- "Eriksson Family - Are Cabin w8"
  description:      String | null     # optional
  dates:            DateRange | null  # optional -- travel/event dates
  guest_count:      Int | null        # optional -- number of guests/attendees
  status_detail:    String | null     # optional -- "pending_payment" | "confirmed" | "checked_in"
  external_ref:     String | null     # optional -- booking reference in external platform
  notes:            String | null     # optional

Example:
  id: 019508d4-...
  type_id: <label_id for node_type.booking>
  key: "BK-2026-1542"
  state_id: <label_id for node_state.active>
  data: {
    "name": "Johansson Family - Are Cabin Week 8",
    "dates": { "start_date": "2026-02-14", "end_date": "2026-02-21" },
    "guest_count": 4,
    "status_detail": "confirmed",
    "external_ref": "PLATFORM-REF-88421"
  }
```

### `content`
```
NodeData_Content:
  title:            String            # required -- "Summer Football Blast - Email 1"
  content_type:     String            # required -- "email" | "sms" | "social_post" | "landing_page" | "ad"
  body:             String            # required -- the actual content (text/HTML)
  subject_line:     String | null     # optional -- for emails
  cta_url:          String | null     # optional -- call-to-action link
  language:         String            # required -- "sv", "en"
  version:          Int               # required -- for A/B testing
  performance:      Json | null       # optional -- { open_rate, click_rate, conversion_rate }

Example:
  id: 019508e5-...
  type_id: <label_id for node_type.content>
  state_id: <label_id for node_state.draft>
  data: {
    "title": "VM Fotboll - Early Bird Erbjudande",
    "content_type": "email",
    "body": "<html>...<p>Boka ditt VM-paket nu...</p>...</html>",
    "subject_line": "Tidigt pris pa VM-biljetter i Stockholm!",
    "cta_url": "https://taylorevents.se/vm-2026",
    "language": "sv",
    "version": 1
  }
```

### `sequence`
```
NodeData_Sequence:
  name:             String            # required -- "Football VIP 5-step drip"
  steps:            List<SequenceStep> # required -- ordered steps
  channel:          String            # required -- "email" | "sms" | "multi"
  active:           Boolean           # required -- whether sequence is live

SequenceStep:
  order:            Int               # position in sequence
  delay_hours:      Int               # hours after previous step (0 for first)
  content_ref:      Uuid7             # reference to content node
  channel:          String            # channel for this step
  condition:        String | null     # "if_no_response" | "if_opened" | "always"

Example:
  id: 019508f6-...
  type_id: <label_id for node_type.sequence>
  data: {
    "name": "VM Fotboll VIP Drip",
    "steps": [
      { "order": 1, "delay_hours": 0, "content_ref": "019508e5-...", "channel": "email", "condition": "always" },
      { "order": 2, "delay_hours": 48, "content_ref": "019508e6-...", "channel": "email", "condition": "if_no_response" },
      { "order": 3, "delay_hours": 72, "content_ref": "019508e7-...", "channel": "sms", "condition": "if_no_response" }
    ],
    "channel": "multi",
    "active": true
  }
```

### Additional `node_state` labels needed

| Code | Purpose |
|------|---------|
| `lead` | A prospect node not yet converted to customer |
| `qualified` | A lead that has been scored/qualified |
| `converted` | A lead that became a booking customer |
| `nurturing` | A lead in long-term nurture |
| `pending_payment` | A booking awaiting payment |
| `confirmed` | A booking that is paid/confirmed |
| `published` | A content piece that has been sent/published |

---

## 3. EDGE TYPES NEEDED

New labels in domain `edge_type`:

### `targets`
```
EdgeData_Targets:        # Campaign --> Customer/Lead
  added_at:    Date | null        # when lead was added to campaign
  segment:     String | null      # "vip" | "corporate" | "general"

Example: campaign(VM Fotboll) --[targets]--> customer(Eriksson)
```

### `belongs_to`
```
EdgeData_BelongsTo:      # Conversation --> Customer, Booking --> Customer
  (no additional fields)

Example: conversation(019508c3) --[belongs_to]--> customer(Eriksson)
```

### `handled_by`
```
EdgeData_HandledBy:      # Conversation --> Agent, or Conversation --> Person (after escalation)
  assigned_at:  Timestamp | null
  reason:       String | null     # "initial" | "escalation" | "transfer"

Example: conversation(019508c3) --[handled_by]--> agent(Taylor Booking Agent)
```

### `includes_product`
```
EdgeData_IncludesProduct: # Booking --> Product
  qty:          Int               # number of tickets/rooms
  unit_price:   Decimal | null    # price at time of booking
  notes:        String | null

Example: booking(BK-2026-1542) --[includes_product]--> product(Are Cabin Deluxe)
```

### `uses_sequence`
```
EdgeData_UsesSequence:   # Campaign --> Sequence
  (no additional fields)

Example: campaign(VM Fotboll) --[uses_sequence]--> sequence(VIP Drip)
```

### `uses_content`
```
EdgeData_UsesContent:    # Campaign --> Content, Sequence step references
  purpose:     String | null      # "primary_email" | "follow_up" | "landing_page"

Example: campaign(VM Fotboll) --[uses_content]--> content(Early Bird Email)
```

### `originated_from`
```
EdgeData_OriginatedFrom: # Booking --> Campaign (attribution)
  (no additional fields)

Example: booking(BK-2026-1542) --[originated_from]--> campaign(VM Fotboll)
```

### `serves`
```
EdgeData_Serves:         # Agent --> Org (which business unit the agent serves)
  scope:       String | null      # "all" | "bookings_only" | "support"

Example: agent(Taylor Booking Agent) --[serves]--> org(Taylor Events)
```

### `subsidiary_of`
```
EdgeData_SubsidiaryOf:   # Org --> Org (business unit hierarchy)
  ownership_pct: Decimal | null

Example: org(Taylor Events) --[subsidiary_of]--> org(Pettson Holding)
```

### `converted_to`
```
EdgeData_ConvertedTo:    # Customer(lead) --> Booking (lead conversion tracking)
  converted_at: Timestamp

Example: customer(Eriksson, state=converted) --[converted_to]--> booking(BK-2026-1542)
```

---

## 4. EVENT TYPES NEEDED

New labels in domain `event_type`:

### `outreach_sent`
```
EventData_OutreachSent:
  channel:        String          # "email" | "sms" | "whatsapp"
  content_ref:    Uuid7           # reference to content node used
  sequence_step:  Int | null      # which step in the sequence (1, 2, 3...)
  external_id:    String | null   # message ID from email/SMS provider

# event.node_id = campaign node
# event.ref_id = target customer/lead node
# event.actor_id = agent node or system

Example: outreach_sent on campaign(VM Fotboll), ref_id=customer(Eriksson),
  data: { channel: "email", content_ref: "019508e5-...", sequence_step: 1 }
```

### `outreach_delivered`
```
EventData_OutreachDelivered:
  channel:        String
  external_id:    String | null

# Tracks successful delivery (distinct from sent)
```

### `outreach_opened`
```
EventData_OutreachOpened:
  channel:        String
  opened_at:      Timestamp
  device:         String | null    # "mobile" | "desktop"

# Tracking pixel / read receipt triggered
```

### `outreach_clicked`
```
EventData_OutreachClicked:
  url:            String           # which link was clicked
  channel:        String

# Link tracking
```

### `outreach_responded`
```
EventData_OutreachResponded:
  response_text:  String           # the reply content
  channel:        String
  sentiment:      String | null    # AI-classified: "positive" | "neutral" | "negative"
  intent:         String | null    # AI-classified: "interested" | "not_interested" | "question" | "unsubscribe"
```

### `conversation_message`
```
EventData_ConversationMessage:
  text:           String           # message body
  role:           String           # "user" | "assistant" | "system"
  channel:        String           # "web_chat" | "whatsapp" | "sms" | "email"
  tokens_used:    Int | null       # LLM tokens consumed (for cost tracking)
  model_tier:     String | null    # which AI tier was used
  confidence:     Decimal | null   # AI confidence in its response
  tool_calls:     Json | null      # if AI invoked tools (search_availability, etc.)

# event.node_id = conversation node
# event.actor_id = customer node (if role=user) or agent node (if role=assistant)

Example:
  node_id: conversation(019508c3)
  actor_id: customer(Eriksson)  -- for user messages
  data: { text: "Vi ar fyra stycken som vill boka stuga i Are vecka 8", role: "user", channel: "web_chat" }
```

### `lead_scored`
```
EventData_LeadScored:
  score:          Decimal          # 0-100
  factors:        Json             # { "engagement": 40, "fit": 30, "intent": 25, "recency": 5 }
  previous_score: Decimal | null
  model_version:  String | null    # scoring model version

# event.node_id = customer/lead node
# event.origin = ai_generated
```

### `booking_initiated`
```
EventData_BookingInitiated:
  source:         String           # "ai_agent" | "web" | "phone" | "walk_in"
  conversation_ref: Uuid7 | null  # link to conversation that triggered booking
  items_summary:  String | null    # "2x VIP tickets + Hotel package"

# event.node_id = booking node
```

### `booking_confirmed`
```
EventData_BookingConfirmed:
  confirmation_ref: String | null  # external confirmation number
  confirmed_by:     String         # "system" | "human" | "payment_received"

# event.node_id = booking node
```

### `booking_line`
```
EventData_BookingLine:
  description:    String           # "VIP Ticket - VM Fotboll Stockholm Aug 1"
  product_ref:    Uuid7 | null     # reference to product node
  vat_rate:       Decimal          # 0.25, 0.06, etc.
  sort_order:     Int

# event.qty = number of tickets/rooms
# event.unit_price = price per unit
# event.total = qty * unit_price (computed)
# event.node_id = booking node

# Analogous to quote_line / invoice_line in construction domain
```

### `agent_escalation`
```
EventData_AgentEscalation:
  reason:         String           # "max_turns_exceeded" | "keyword_trigger" | "low_confidence" | "customer_request"
  context_summary: String          # AI summary of conversation so far
  assigned_to:    Uuid7 | null     # person node of human agent

# event.node_id = conversation node
```

### `content_published`
```
EventData_ContentPublished:
  platform:       String           # "email" | "instagram" | "facebook" | "website"
  url:            String | null    # published URL
  reach:          Int | null       # estimated reach at publish time

# event.node_id = content node
```

### `inventory_change`
```
EventData_InventoryChange:
  reason:         String           # "booking" | "hold" | "release" | "adjustment"
  previous_count: Int
  new_count:      Int
  booking_ref:    Uuid7 | null     # which booking caused the change

# event.node_id = product node
# event.qty = change amount (negative for bookings)
# Critical for 100,000 football tickets
```

### `external_sync`
```
EventData_ExternalSync:
  platform:       String           # "booking_platform" | "hotel_api" | "ticket_master"
  direction:      String           # "inbound" | "outbound"
  external_ref:   String           # ID in external system
  status:         String           # "success" | "failed" | "pending"
  payload_hash:   String | null    # for deduplication

# event.node_id = booking or product node
# event.origin = external_api
```

---

## 5. AI PIPELINE MAPPING

### Generating Outreach Content

**Tier: EXPENSIVE (claude-sonnet-4-5)**

Maps to a new AI capability:

```
generate_outreach(
  campaign: Node,
  target_segment: List<Node>,
  products: List<Node>,
  brand_voice: Dict,
  context: AiContext
) -> ContentDraft

# Context Protocol application:
# Level 0: Platform -- available content types, channels
# Level 1: Tenant -- brand name, industry (travel/events), tone
# Level 2: Campaign -- target audience, products, dates, budget
# Level 3: Detail -- product descriptions, pricing, past campaign performance
# Level 4: History -- which subject lines/CTAs performed best historically
```

The existing `ai_transient_proposals` pattern applies directly: generated content lives as a draft content node (`state_id = draft`) until human approval, then a `state_change` event records the publication.

The existing Anomaly Shield applies to performance metrics: if a content piece has abnormally low open/click rates compared to tenant or platform benchmarks, it flags the anomaly.

### Classifying Inbound Responses

**Tier: CHEAP (gpt-4o-mini)**

Maps directly to the existing `classify_message` capability:

```
classify_response(
  message: String,
  context: AiContext
) -> ResponseIntent

# ResponseIntent: interested | not_interested | question | booking_request |
#                 complaint | unsubscribe | out_of_office | spam

# Latency: < 2 seconds
# This is functionally identical to classify_message in construction
# (time_report -> interested, status_question -> question, etc.)
```

The classification result drives automation: `interested` triggers the next sequence step or starts a conversation; `booking_request` creates a conversation and assigns the agent; `unsubscribe` removes the lead from the campaign.

### Running Conversations (AI Agent)

**Tier: MEDIUM (claude-haiku-4-5) for routine turns, EXPENSIVE (claude-sonnet-4-5) for complex negotiation/booking**

This is a new capability but follows the existing context protocol:

```
agent_respond(
  conversation: Node,
  recent_messages: List<Event>,   # last N conversation_message events
  agent_config: Node,             # agent node with personality/rules
  available_products: List<Node>, # products the agent can sell
  context: AiContext
) -> AgentResponse

AgentResponse:
  text: String                    # response to send
  tool_calls: List<ToolCall>      # actions to take (search, book, etc.)
  confidence: Decimal             # 0-1, triggers escalation if below threshold
  should_escalate: Boolean        # true if human needed
```

Context protocol for conversations:
- Level 0: Platform labels (product types, channels)
- Level 1: Tenant (brand, business unit identity)
- Level 2: Conversation (summary, lead profile, sentiment, turn count)
- Level 3: Detail (full message history, product availability, pricing)
- Level 4: History (similar conversations that led to bookings, this lead's past interactions)

The `ai_no_arithmetic` invariant applies: the agent describes products and prices but all totals, taxes, and booking economics are computed by deterministic code after the AI returns structured data.

The `ai_transparency` invariant applies: when the agent quotes a price or availability, the source (which product node, which inventory check) must be traceable.

### Lead Scoring

**Tier: CHEAP (gpt-4o-mini)**

```
score_lead(
  lead: Node,
  interactions: List<Event>,      # all events related to this lead
  campaign_context: Node | null,
  context: AiContext
) -> LeadScore

# Scoring factors (deterministic + AI hybrid):
# - Engagement: open rate, click rate, response rate (DETERMINISTIC)
# - Fit: does the lead match target segment (AI evaluation)
# - Intent: language analysis of responses (AI)
# - Recency: time since last interaction (DETERMINISTIC)

# The AI evaluates fit and intent; the system computes the weighted score.
# This preserves ai_no_arithmetic: AI returns qualitative assessments,
# system applies weights and computes final score.
```

The Anomaly Shield applies: if a lead's score changes dramatically (for example, jumping from 10 to 95), the system flags it for review rather than auto-triggering expensive actions.

### Content Generation

**Tier: EXPENSIVE (claude-sonnet-4-5)**

Maps to a new capability but follows existing patterns:

```
generate_content(
  content_type: String,           # "email" | "sms" | "social_post"
  product_refs: List<Node>,       # products to promote
  audience: String,               # "corporate" | "families" | "football_fans"
  brand_voice: Dict,              # tone, language, style guidelines
  constraints: Json,              # max_length, required_elements, cta
  context: AiContext
) -> ContentDraft
```

This follows the `ai_transient_proposals` pattern: generated content is a draft node, not an event, until human approval.

---

## 6. MULTI-TENANT STRATEGY

### Recommendation: Option C -- Hybrid

**One tenant for each distinct business with independent branding and customer bases, connected via federation edges.**

Here is the reasoning:

**Why not Option A (one tenant per business unit, fully isolated):**
Option A would create Taylor Events, Mountain Cabins, and Football Matches as completely separate tenants. This provides maximum isolation but loses the ability to share leads across business units, share content templates, or have a unified view of Pettson's entire operation. Cross-business insights ("a football ticket buyer might also want a cabin trip") require federation, which adds complexity for what is fundamentally one organization.

**Why not Option B (one tenant, project-level separation):**
Option B puts everything in one tenant. The problem is that the businesses have distinct brands, distinct customer bases, distinct product catalogs, and potentially distinct staff. A customer booking a football ticket should not see cabin rental pricing in their communication. RLS operates at the tenant level, so there is no built-in way to restrict a Taylor Events employee from seeing Mountain Cabins data. You would need to build a sub-tenant isolation layer within the node graph, which fights the architecture.

**Why Option C (Hybrid) is best:**

1. **Pettson Holding** = one tenant (the parent). Contains the holding company org node, shared resources, group-level analytics.

2. **Taylor Events** = one tenant. Own customer base, products, agents, campaigns, branding.

3. **Mountain Cabins** = one tenant. Own customer base, products, agents, campaigns, branding.

4. **Football Matches** = one tenant (or could be a project/campaign within Taylor Events if the team is the same).

5. **Federation edges** connect them:
   - `federation_edge(source_tenant=Taylor, target_tenant=Pettson_Holding, scope=subsidiary_default)` -- Pettson sees aggregate performance across all units.
   - `federation_edge(source_tenant=Taylor, target_tenant=Mountain_Cabins, scope=cross_sell_default)` -- enables cross-selling: a Taylor Events customer gets Mountain Cabins recommendations.

6. **Shared resources** via federation:
   - Content templates can be shared via federation projections.
   - Lead data can be shared (with consent) for cross-business campaigns.
   - AI agent configurations can reference shared Dict entries for common brand guidelines.

This matches what Pettson described in the conversation: "a common core that serves all businesses, with separate parts unique to each." The federation layer is exactly that common core, while tenant isolation keeps each business's data cleanly separated.

**Specific mapping from the conversation:**
- "Taylor Events" = Tenant with its own agent nodes, products, campaigns
- "Mountain Cabins (fjallbostader)" = Tenant with cabin products, booking agent
- "Football matches (100,000 tickets)" = Could be a Tenant, or a time-bound campaign node within Taylor Events (since it seems to be a Taylor Events project rather than a permanent business unit)

---

## 7. WHAT THE MODEL GIVES FOR FREE

### Event Sourcing = Full Conversation Audit Trail

Every message in every conversation is an append-only Event. This means:

- **Complete history**: Every AI agent interaction is permanently recorded with `actor_id` (who said it), `occurred_at` (when), `origin` (ai_generated vs human), and the full message text in `data`.
- **Regulatory compliance**: For travel/events, consumer protection laws often require records of what was promised. The event log is an immutable proof.
- **AI training data**: The full conversation log is available for analyzing which conversation patterns lead to bookings, enabling continuous agent improvement.
- **Dispute resolution**: If a customer claims the AI promised a specific price, the exact event can be retrieved.

### Bitemporality = Retroactive Corrections

- A booking price can be corrected retroactively (correction event with `ref_id` to original), while preserving the original for audit.
- Campaign metrics can be recalculated when late-arriving delivery reports come in (an `outreach_delivered` event with `occurred_at` in the past).
- Financial reconciliation across periods works correctly because `occurred_at` (valid time) and `id` (transaction time) are independent.

### Federation = Partner and Cross-Business Access

- Mountain Cabins can grant Taylor Events a federation edge with a `cross_sell_default` projection scope, allowing Taylor Events' agents to recommend cabins to interested customers without giving Taylor Events access to Mountain Cabins' financial data.
- External partners (a local ski rental shop, a hotel chain) can be given federation access with a tightly scoped projection, enabling the AI agent to check availability across partners.
- The consent-based federation flow (Section 2.7.2) is exactly the pattern needed for GDPR-compliant lead sharing between business units.

### Graph Structure = Relationship Mapping

The nodes-and-edges model naturally represents the complex web of relationships in a sales pipeline:

- A lead is connected to multiple campaigns (via `targets` edges).
- A conversation is connected to a lead, an agent, and potentially a booking (via edges).
- A booking is connected to products, a campaign (attribution), and the customer.
- Campaign performance can be computed by traversing: campaign --> targets --> outreach_sent events --> outreach_responded events --> bookings.

This is exactly the kind of funnel analysis that traditional CRM systems build custom tables for. Here, it falls naturally out of the graph.

### Existing Message Infrastructure

The existing `EventData_Message` schema, WhatsApp/SMS integrations, and message classification pipeline (`classify_message` capability) translate directly to the sales agent use case. The infrastructure for receiving WhatsApp messages, classifying them, and responding -- already built for construction subcontractor communication -- is the same infrastructure needed for prospect conversations.

### Label-Based Extensibility

Adding new node types, edge types, and event types is a data operation (INSERT into labels), not a code change. This means Pettson's team can define new product categories, campaign types, or agent configurations without requiring a deployment. This is critical for the April 1st deadline -- the schema does not need to change as new business units or product types are added.

### Dict for Configuration and i18n

The Dict table handles:
- AI agent personality prompts per locale (Dict with `scope = "agent.personality"`)
- Brand voice guidelines per business unit (Dict with `scope = "brand.voice"`)
- Content templates in multiple languages
- Integration configuration per tenant

### Blob Infrastructure

Marketing content often includes images, PDFs (travel brochures), and other media. The Blob table with signed URLs, metadata tracking, and association to nodes is ready to handle this without any schema changes.

---

## 8. WHAT NEEDS TO BE NEW

### 8.1 Real-Time Conversation State Management

**The gap:** The existing model treats messages as discrete events on a project node. An AI sales agent conversation requires maintaining real-time state: the current context window, tool call results, pending user actions, and the agent's "working memory" between turns.

**What is needed:**

A conversation state management layer in the application, not the database. This aligns with the existing pattern where AI transient proposals live in the app layer until approved.

```typescript
// New: ConversationSession (application-layer, NOT a new table)
interface ConversationSession {
  conversation_id: Uuid7;           // node_id of the conversation node
  agent_id: Uuid7;                  // node_id of the agent node
  lead_id: Uuid7;                   // node_id of the customer/lead node
  messages: ConversationMessage[];  // rolling window of recent messages
  tool_state: Json;                 // results of availability checks, cart contents
  context_snapshot: AiContext;      // pre-built context for next AI call
  expires_at: Timestamp;            // session expiry (30 min inactivity)
}
```

This can live in Redis or an in-memory store. When the conversation ends or the session expires, the final summary is written back to the conversation node's `data.summary` field, and all messages are already persisted as events.

### 8.2 External API State Synchronization

**The gap:** The existing integration pattern logs sync events but does not model the concept of bidirectional state sync with booking platforms. When Pettson's booking platform has real-time inventory, the system needs to query it (not just log results), and handle conflicts (double-booking, price changes).

**What is needed:**

A new integration interface and a sync state tracking pattern:

```typescript
// New AiCapability for agent tool use
interface BookingPlatformIntegration {
  search_availability(
    product_type: String,     // "cabin" | "ticket" | "hotel"
    dates: DateRange,
    guest_count: Int,
    filters: Json             // location, category, price range
  ): AvailabilityResult[];

  create_hold(
    product_id: String,       // external product ID
    dates: DateRange,
    guest_count: Int,
    hold_duration_minutes: Int
  ): HoldResult;

  confirm_booking(
    hold_id: String,
    customer: CustomerData,
    payment_ref: String
  ): BookingConfirmation;

  cancel_booking(
    external_ref: String,
    reason: String
  ): CancellationResult;
}
```

Each call to this integration produces an `external_sync` event. But the critical new element is the **hold pattern**: the agent can place a temporary hold on inventory while the customer decides, and the system must track hold expiration and release inventory if the booking is not confirmed. This requires:

- A new `node_state` label: `held` (for product nodes with temporary reservations)
- A scheduled job that checks for expired holds and creates `inventory_change` events with `reason = "release"`
- This is a system-level behavior, not an AI behavior, so it fits the `origin = system` pattern

### 8.3 AI Agent Configuration and Personality

**The gap:** The existing AI pipeline has a fixed set of capabilities with fixed system prompts. An AI sales agent needs configurable personalities, knowledge bases, and behavioral rules per business unit and per agent.

**What is needed:**

The `NodeData_Agent` schema (defined in Section 2 above) handles configuration storage. But the AI pipeline needs a new pattern for constructing agent prompts:

```typescript
// New: AgentPromptBuilder (extends existing build_context)
interface AgentPromptBuilder {
  build_agent_prompt(
    agent: Node,              // agent node with personality config
    conversation: Node,       // conversation node with summary
    recent_events: Event[],   // recent conversation_message events
    available_tools: ToolDef[], // what the agent can do
    context: AiContext         // standard context protocol
  ): StructuredPrompt;
}
```

The agent's personality prompt (stored in `NodeData_Agent.personality`) is injected at Level 1 of the context protocol, replacing the generic tenant description. This is a behavioral extension, not a schema change.

Additionally, the agent needs **tool definitions** -- structured descriptions of actions it can take (search availability, create booking, escalate). These are stored as Dict entries (`scope = "agent.tools.{agent_id}"`) and compiled into the prompt as function schemas.

### 8.4 Inventory/Capacity Management

**The gap:** The construction domain has no concept of limited inventory. A painter can always take on another project. But Pettson has 100,000 football tickets and a finite number of cabins. The system needs real-time inventory tracking.

**What is needed:**

Inventory is tracked via events on product nodes. The current inventory count is computed from active `inventory_change` events (using the same window function resolution pattern as project economics):

```sql
-- Compute current inventory for a product
WITH ranked AS (
  SELECT
    COALESCE(e.ref_id, e.id) AS root_id,
    e.id,
    e.qty,  -- positive = restock, negative = booking
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(e.ref_id, e.id)
      ORDER BY e.id DESC
    ) AS rn
  FROM events e
  WHERE e.tenant_id = $1
    AND e.node_id = $2            -- product node
    AND e.type_id = <inventory_change_label_id>
)
SELECT SUM(qty) AS current_stock
FROM ranked WHERE rn = 1;
```

This reuses the existing event resolution pattern. No new tables needed. But a materialized cache for inventory (like `project_economics_cache`) would be needed for performance, especially for the football ticket scenario where availability must be checked in real-time during conversations.

### 8.5 Campaign Orchestration Engine

**The gap:** The existing system has no concept of scheduled, multi-step automated workflows. Outreach sequences need a scheduler that triggers steps based on time delays and response conditions.

**What is needed:**

A background job system (fits within the existing `system` origin pattern) that:

1. Periodically scans active sequence nodes
2. For each sequence, checks which leads are at which step
3. Evaluates conditions (time elapsed, response received)
4. Triggers the next step (creates `outreach_sent` events with `origin = system`)

This is analogous to the existing `cache_reconciliation` behavior -- a periodic system job that processes data and creates events. The implementation uses the same infrastructure (scheduled jobs, event creation), just with different logic.

### 8.6 Webhook Endpoints for External Platforms

**The gap:** The existing webhook infrastructure handles WhatsApp and SMS inbound. The sales agent platform needs webhooks for:
- Email delivery/open/click tracking
- Booking platform callbacks (booking confirmed/cancelled)
- Payment gateway notifications

**What is needed:**

New Route Handlers (following the existing pattern: "Route Handlers only for webhooks") that receive external callbacks and create events with `origin = external_api`. This is an extension of the existing integration pattern, not a new concept.

### Summary Table: New vs. Existing

| Concept | Uses Existing Schema? | What is New? |
|---------|----------------------|--------------|
| Business units | Yes (Node/Org + Tenant) | Federation scopes for cross-sell |
| Leads/Prospects | Yes (Node/Customer + state) | New `node_state` labels |
| Conversations | New node type + existing events | ConversationSession app-layer state |
| Campaigns | New node type | Campaign orchestration scheduler |
| Products/Tickets | Yes (Node/Product) | Inventory tracking via events |
| Bookings | New node type (analogous to Project) | Hold/release pattern |
| AI Agents | New node type | AgentPromptBuilder, tool definitions |
| Content | New node type | Content performance tracking |
| Sequences | New node type | Step execution engine |
| Integrations | Yes (Dict + Events) | Booking platform API adapter |
| Messages | Yes (existing Event schema) | No change needed |
| Lead scoring | New event type | Hybrid deterministic + AI scoring |
| Analytics/Funnel | Yes (graph traversal) | No change needed |

The fundamental point is that **zero new database tables** are needed. The 7+1 table model holds. All extensions are new label codes (data operations), new `Node.data` schemas (Zod validation in the application layer), and new application-layer behaviors (schedulers, session managers, prompt builders). This validates the architecture's core claim: "complexity is handled through composition, not new tables."

---

### Agent 4: Design agent conversation architecture
**Type:** general-purpose

#### Prompt
````
You are an AI systems architect. Design the architecture for an AI sales agent system that can:

1. Conduct outreach to prospects (email, WhatsApp, social)
2. Have multi-turn conversations about products (tickets, travel packages, bookings)
3. Handle booking flows (gathering requirements, presenting options, closing)
4. Hand off to humans when needed
5. Generate marketing content
6. Work across multiple business verticals with shared infrastructure

Read these files for the existing technical foundation:
- `CLAUDE.md` - Project constraints
- `docs/tech-decisions.md` - Technology stack
- `.claude/skills/ai-pipeline/SKILL.md` - AI pipeline architecture
- `.claude/skills/integrations/SKILL.md` - Integration patterns

Then design:

## 1. AGENT ARCHITECTURE
- How is an "AI agent" configured? (personality, knowledge base, goals, constraints)
- How does it maintain conversation state across turns?
- How does it access product/inventory data from external platforms?
- How does it decide when to escalate to a human?
- How does it handle multiple simultaneous conversations?

## 2. CONVERSATION FLOW ENGINE
- State machine for a typical sales conversation
- States: initial_contact, qualifying, presenting_options, negotiating, closing, post_sale
- Transitions and triggers
- How context is maintained (what the agent "remembers" across messages)
- Token budget management for long conversations

## 3. MULTI-CHANNEL STRATEGY
For each channel:
- Email: outbound campaigns, reply handling, sequence management
- WhatsApp Business: real-time conversations, media sharing
- Web chat: embedded on websites, widget vs. full-page
- Voice: phone call handling (is this realistic by April 1?)
- Social: DM automation on Instagram/Facebook

For each: what's the message format, latency requirement, API integration pattern?

## 4. OUTREACH ENGINE
- Campaign definition: target audience, message templates, scheduling
- Personalization: how does AI customize messages per lead?
- A/B testing: how to test different approaches
- Rate limiting and compliance (GDPR, anti-spam)
- Follow-up sequences: timing, conditions, branching

## 5. BOOKING INTEGRATION
- How does the agent query external booking platforms for availability?
- How does it present options to the user?
- How does it handle the actual booking transaction?
- Error handling: what if inventory changes mid-conversation?
- The "package" problem: ticket + hotel + experience bundle

## 6. HUMAN HANDOFF PROTOCOL
- When does AI escalate?
- How is context transferred to the human?
- Can the human "take over" mid-conversation and hand back?
- Notification system for human agents

## 7. CONTENT GENERATION ENGINE
- Marketing email generation
- Social media post generation
- Landing page content
- SEO content for organic acquisition
- How does brand voice/tone get configured per business unit?

## 8. ANALYTICS AND FEEDBACK LOOP
- What metrics matter? (conversion rate, response rate, time to close, etc.)
- How does the system learn from successful/failed conversations?
- How does it identify which outreach approaches work best?
- Dashboard for business owner visibility

## 9. APRIL 1 MVP SCOPE
What's the minimum that works for the football ticket sales use case?
- Channel: probably email + WhatsApp
- Functionality: outreach, conversation, booking link
- Integration: with their existing ticket platform
- Content: AI-generated marketing emails about the matches

Design for the platform but scope for the immediate need.
````

#### Response

Now I have a thorough understanding of the existing architecture. Let me produce the full design.

---

# AI Sales Agent System Architecture

## Design for a Multi-Vertical, Multi-Channel AI Sales Platform

Built on top of the Resonansia event-sourced infrastructure. This document describes how to extend the existing 7-table data model, AI pipeline, adapter-based integration layer, and multi-tenant RLS to support autonomous AI sales agents that conduct outreach, hold conversations, handle bookings, and generate marketing content -- scoped for an April 1 MVP around football ticket sales.

---

## 1. AGENT ARCHITECTURE

### 1.1 Agent Configuration Model

An AI agent is configured as a **node** in the existing data model (type: `agent`). This is consistent with the 7-table constraint -- agents are just another node type, with their personality, knowledge, and constraints stored in `data` (JSONB).

```typescript
// packages/shared/schemas/node-data.ts (extend)

export const nodeDataAgentSchema = z.object({
  name: z.string().min(1),                            // "Biljett-Bansen"
  persona: z.object({
    tone: z.enum(["formal", "friendly", "casual", "enthusiastic"]),
    language: z.string().default("sv"),                // primary language
    languages: z.array(z.string()).default(["sv", "en"]),
    bio: z.string().max(500),                          // personality description for system prompt
    avatar_url: z.string().url().nullable(),
    signature: z.string().nullable(),                  // email sign-off
  }),
  knowledge_base: z.object({
    product_source: z.enum(["api", "static", "hybrid"]),
    api_endpoint: z.string().url().nullable(),         // external inventory/ticket platform
    api_auth_method: z.enum(["bearer", "api_key", "oauth2"]).nullable(),
    static_catalog: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      price: z.number().nullable(),
      currency: z.string().default("SEK"),
      availability: z.enum(["available", "limited", "sold_out"]).nullable(),
      metadata: z.record(z.unknown()).default({}),
    })).default([]),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).default([]),
    brand_guidelines: z.string().nullable(),           // injected into all prompts
  }),
  goals: z.object({
    primary: z.enum(["sell_tickets", "book_travel", "generate_leads", "customer_support"]),
    conversion_action: z.string(),                     // "ticket_purchase", "booking_confirmed"
    max_discount_percent: z.number().default(0),       // ceiling for negotiation
    upsell_products: z.array(z.string()).default([]),   // product IDs to suggest
  }),
  constraints: z.object({
    max_messages_per_conversation: z.number().default(20),
    escalation_after_messages: z.number().default(10),  // suggest human after N
    operating_hours: z.object({
      start: z.string().default("08:00"),               // 24h format
      end: z.string().default("22:00"),
      timezone: z.string().default("Europe/Stockholm"),
    }),
    blocked_topics: z.array(z.string()).default([]),     // topics that trigger escalation
    require_human_for: z.array(z.enum([
      "refund", "complaint", "legal", "pricing_override", "bulk_order"
    ])).default(["refund", "complaint", "legal"]),
  }),
  channels: z.object({
    email: z.object({ enabled: z.boolean(), from_address: z.string().email().nullable() }).default({ enabled: false, from_address: null }),
    whatsapp: z.object({ enabled: z.boolean(), phone_number_id: z.string().nullable() }).default({ enabled: false, phone_number_id: null }),
    web_chat: z.object({ enabled: z.boolean(), widget_config: z.record(z.unknown()).default({}) }).default({ enabled: false }),
    sms: z.object({ enabled: z.boolean(), from_number: z.string().nullable() }).default({ enabled: false, from_number: null }),
  }),
});
```

### 1.2 Conversation State

Conversations are tracked as **nodes** (type: `conversation`) with their messages stored as **events** on that node. This reuses the existing event-sourced architecture entirely.

```typescript
export const nodeDataConversationSchema = z.object({
  agent_id: z.string().uuid(),           // the agent node running this conversation
  lead_id: z.string().uuid().nullable(), // the lead/prospect node
  channel: z.enum(["email", "whatsapp", "web_chat", "sms"]),
  state: z.enum([
    "initial_contact",
    "qualifying",
    "presenting_options",
    "negotiating",
    "closing",
    "post_sale",
    "escalated",
    "abandoned",
    "completed",
  ]),
  context_summary: z.string().nullable(),    // rolling AI-generated summary for token management
  turn_count: z.number().default(0),
  last_activity_at: z.string().datetime(),
  escalation_reason: z.string().nullable(),
  assigned_human: z.string().uuid().nullable(),
  campaign_id: z.string().uuid().nullable(),  // which outreach campaign started this
  metadata: z.record(z.unknown()).default({}),
});
```

Every message in the conversation is an **event** on the conversation node:

```typescript
// Event type: "agent_message" (direction: inbound/outbound)
// Event data:
{
  text: string;
  channel: "email" | "whatsapp" | "web_chat" | "sms";
  direction: "inbound" | "outbound";
  role: "agent" | "prospect" | "human_agent";
  media_urls?: string[];
  email_subject?: string;
  email_thread_id?: string;
  tokens_used?: number;           // track AI cost
}
```

### 1.3 How the Agent Accesses Product Data

The agent fetches product/inventory data through a new adapter interface. This follows the existing adapter pattern in `packages/integrations/src/types.ts`:

```typescript
// packages/integrations/src/types.ts (extend)

export interface CatalogAdapter {
  getProducts(filters?: ProductFilter): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  checkAvailability(productId: string, date?: string, quantity?: number): Promise<AvailabilityResult>;
  createBooking(booking: BookingRequest): Promise<BookingResult>;
  getBookingStatus(bookingId: string): Promise<BookingStatus>;
}

export interface ProductFilter {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  available?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: "available" | "limited" | "sold_out";
  date?: string;
  venue?: string;
  category?: string;
  image_url?: string;
  metadata: Record<string, unknown>;
}

export interface AvailabilityResult {
  available: boolean;
  remaining?: number;
  alternatives?: Product[];
}

export interface BookingRequest {
  productId: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  confirmationUrl?: string;
  error?: string;
}

export interface BookingStatus {
  id: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  product: Product;
  quantity: number;
}
```

For the April 1 MVP (football tickets), the first concrete implementation would be a `TicketPlatformCatalogAdapter` that wraps whatever API the ticket vendor exposes. For initial development, a static catalog embedded in the agent's `knowledge_base.static_catalog` is sufficient.

### 1.4 Escalation Decision Logic

The agent decides to escalate based on a deterministic rule engine augmented by AI classification:

```typescript
// packages/core/src/agents/escalation.ts

export type EscalationReason =
  | "explicit_request"        // prospect asked for a human
  | "blocked_topic"           // message matches a blocked topic
  | "max_turns_exceeded"      // conversation too long
  | "negative_sentiment"      // 3+ negative messages in a row
  | "booking_failure"         // booking API returned an error
  | "confidence_low"          // AI confidence below threshold
  | "outside_hours"           // message received outside operating hours
  | "policy_violation";       // request violates constraints (refund, legal, etc.)

export function shouldEscalate(input: {
  conversation: NodeDataConversation;
  agent: NodeDataAgent;
  latestMessage: string;
  aiClassification: { intent: string; confidence: number; sentiment: number };
}): { escalate: boolean; reason: EscalationReason | null } {
  const { conversation, agent, latestMessage, aiClassification } = input;
  const constraints = agent.constraints;

  // Rule 1: Explicit request
  if (/human|person|manager|speak to someone/i.test(latestMessage)) {
    return { escalate: true, reason: "explicit_request" };
  }

  // Rule 2: Blocked topics
  for (const topic of constraints.blocked_topics) {
    if (latestMessage.toLowerCase().includes(topic.toLowerCase())) {
      return { escalate: true, reason: "blocked_topic" };
    }
  }

  // Rule 3: Policy-required escalation
  for (const topic of constraints.require_human_for) {
    if (aiClassification.intent === topic) {
      return { escalate: true, reason: "policy_violation" };
    }
  }

  // Rule 4: Turn count
  if (conversation.turn_count >= constraints.max_messages_per_conversation) {
    return { escalate: true, reason: "max_turns_exceeded" };
  }

  // Rule 5: Low confidence
  if (aiClassification.confidence < 0.4) {
    return { escalate: true, reason: "confidence_low" };
  }

  // Rule 6: Negative sentiment trend (checked elsewhere with conversation history)

  return { escalate: false, reason: null };
}
```

### 1.5 Concurrent Conversations

Concurrency is handled naturally by the event-sourced architecture. Each conversation is an independent node with its own event stream. The agent "handles" a conversation by:

1. Loading the conversation node + its recent events (last N messages)
2. Loading the agent node (for personality/knowledge)
3. Building an AI prompt from conversation context + agent config + product data
4. Generating a response
5. Appending the response as a new event

There is no shared mutable state between conversations. The agent is stateless -- all state lives in the database as events. This means thousands of concurrent conversations are limited only by database throughput and AI API rate limits, not by application memory.

---

## 2. CONVERSATION FLOW ENGINE

### 2.1 State Machine

```
                                    ┌─────────────────┐
                                    │ initial_contact  │
                                    │  (outreach sent) │
                                    └────────┬────────┘
                                             │ prospect replies
                                             ▼
                                    ┌─────────────────┐
                                    │   qualifying     │
                                    │ (understanding   │
                                    │  needs)          │
                                    └────────┬────────┘
                                             │ needs understood
                                             ▼
                                    ┌─────────────────┐
                                    │ presenting_      │
                                    │ options          │
                                    │ (showing         │
                                    │  products)       │
                                    └────────┬────────┘
                                             │ prospect interested
                                             ▼
                                    ┌─────────────────┐
                                    │  negotiating     │──── discount/terms
                                    │  (pricing,       │     discussion
                                    │   objections)    │◄───┘
                                    └────────┬────────┘
                                             │ agreement reached
                                             ▼
                                    ┌─────────────────┐
                                    │    closing       │
                                    │  (booking link,  │
                                    │   payment)       │
                                    └────────┬────────┘
                                             │ transaction complete
                                             ▼
                                    ┌─────────────────┐
                                    │   post_sale      │
                                    │  (confirmation,  │
                                    │   upsell)        │
                                    └─────────────────┘

     Any state ──── escalation trigger ────► ┌──────────┐
                                             │ escalated │
                                             └──────────┘

     Any state ──── 72h no response ────►    ┌──────────┐
                                             │ abandoned │
                                             └──────────┘
```

### 2.2 State Transitions

```typescript
// packages/core/src/agents/state-machine.ts

export const CONVERSATION_TRANSITIONS: Record<ConversationState, TransitionRule[]> = {
  initial_contact: [
    { to: "qualifying", trigger: "prospect_replied", condition: "any_response" },
    { to: "abandoned", trigger: "timeout", condition: "no_response_72h" },
  ],
  qualifying: [
    { to: "presenting_options", trigger: "needs_identified", condition: "ai_has_product_match" },
    { to: "closing", trigger: "direct_purchase_intent", condition: "prospect_wants_specific_product" },
    { to: "escalated", trigger: "escalation", condition: "escalation_rules_met" },
    { to: "abandoned", trigger: "timeout", condition: "no_response_72h" },
  ],
  presenting_options: [
    { to: "negotiating", trigger: "price_objection", condition: "prospect_questions_price" },
    { to: "closing", trigger: "selection_made", condition: "prospect_chose_product" },
    { to: "qualifying", trigger: "needs_changed", condition: "prospect_wants_different_category" },
    { to: "escalated", trigger: "escalation", condition: "escalation_rules_met" },
    { to: "abandoned", trigger: "timeout", condition: "no_response_72h" },
  ],
  negotiating: [
    { to: "closing", trigger: "agreement_reached", condition: "terms_accepted" },
    { to: "presenting_options", trigger: "reconsider", condition: "prospect_wants_alternatives" },
    { to: "escalated", trigger: "escalation", condition: "discount_exceeds_max" },
    { to: "abandoned", trigger: "timeout", condition: "no_response_72h" },
  ],
  closing: [
    { to: "completed", trigger: "booking_confirmed", condition: "payment_received_or_booking_made" },
    { to: "negotiating", trigger: "last_objection", condition: "prospect_hesitates" },
    { to: "escalated", trigger: "booking_error", condition: "api_failure" },
    { to: "abandoned", trigger: "timeout", condition: "no_response_72h" },
  ],
  post_sale: [
    { to: "completed", trigger: "interaction_complete", condition: "no_further_action" },
    // Upsell could loop back to qualifying
    { to: "qualifying", trigger: "upsell_interest", condition: "prospect_interested_in_more" },
  ],
  escalated: [],    // terminal until human intervenes
  abandoned: [],    // terminal
  completed: [],    // terminal
};
```

### 2.3 Context Management and Token Budget

Long conversations will exceed token limits. The solution is a **rolling summary** approach that mirrors the existing Context Protocol (5 levels) from the AI pipeline skill:

```typescript
// packages/core/src/agents/context-builder.ts

export interface AgentContext {
  systemPrompt: string;       // agent persona + brand guidelines + constraints
  productContext: string;     // current relevant products/availability
  conversationHistory: string;// recent messages or summary + recent
  totalTokens: number;
}

const TOKEN_BUDGET = {
  system_prompt: 800,         // persona, guidelines, constraints
  product_context: 1200,      // available products, pricing
  conversation_summary: 600,  // compressed history of older turns
  recent_messages: 2400,      // last 6-10 messages verbatim
  response_reserve: 1000,     // tokens for the AI response
  // Total: ~6000 tokens -- fits comfortably in gpt-4o-mini or claude-haiku
};

export async function buildAgentContext(input: {
  agent: NodeDataAgent;
  conversation: NodeDataConversation;
  recentMessages: Array<{ role: string; text: string }>;
  products: Product[];
}): Promise<AgentContext> {
  const { agent, conversation, recentMessages, products } = input;

  // 1. System prompt (always included)
  const systemPrompt = buildSystemPrompt(agent, conversation.state);

  // 2. Product context (filtered to relevant products)
  const productContext = formatProducts(products, TOKEN_BUDGET.product_context);

  // 3. Conversation history
  // If we have > 10 messages, summarize older ones
  let conversationHistory: string;
  if (recentMessages.length <= 10) {
    conversationHistory = formatMessages(recentMessages);
  } else {
    // Use existing summary if available, or generate one
    const summary = conversation.context_summary
      ?? await generateConversationSummary(recentMessages.slice(0, -6));
    const recent = formatMessages(recentMessages.slice(-6));
    conversationHistory = `[Previous conversation summary: ${summary}]\n\n${recent}`;
  }

  return {
    systemPrompt,
    productContext,
    conversationHistory,
    totalTokens: countTokens(systemPrompt + productContext + conversationHistory),
  };
}
```

The `context_summary` field on the conversation node is updated every 10 turns using the `cheap` AI tier to compress the conversation history. This keeps the total context window manageable regardless of conversation length.

---

## 3. MULTI-CHANNEL STRATEGY

### 3.1 Channel Matrix

| Channel | Format | Latency | Integration | MVP Priority |
|---------|--------|---------|-------------|-------------|
| **Email** | HTML + plain text, subject line, threading | < 60s reply to inbound; scheduled for outbound | Resend (send) + webhook (receive) | YES |
| **WhatsApp** | Text, templates, images, buttons | < 10s | Meta Cloud API (existing adapter) | YES |
| **Web Chat** | JSON messages, typing indicators | < 5s | WebSocket or Supabase Realtime | Phase 2 |
| **SMS** | Plain text, 160 char segments | < 10s | 46elks (existing adapter) | Fallback only |
| **Voice** | N/A | N/A | Not realistic by April 1 | NO |
| **Social DMs** | Platform-specific formatting | < 30s | Instagram Graph API / Messenger | Phase 3 |

### 3.2 Email Channel

**Outbound campaigns:** Send via Resend adapter. Each email gets a unique `reply-to` address or uses email thread IDs to associate replies.

**Inbound handling:** Resend webhook at `/api/webhooks/email/inbound` receives replies. The handler:
1. Extracts `In-Reply-To` / `References` headers to find the conversation thread
2. Strips email signatures and quoted text
3. Passes clean text to the conversation engine
4. Generates AI response
5. Sends reply email (preserving thread)

```typescript
// packages/integrations/src/types.ts (extend EmailAdapter)

export interface EmailAdapter {
  sendEmail(params: EmailParams): Promise<{ id: string }>;
  // NEW: For inbound webhook processing
  parseInbound?(rawPayload: unknown): ParsedInboundEmail;
}

export interface ParsedInboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;       // plain text body (quotes stripped)
  html?: string;
  inReplyTo?: string; // Message-ID of the email being replied to
  references?: string[];
  attachments?: Array<{ filename: string; contentType: string; url: string }>;
}
```

**Latency:** Outbound campaigns are queued and rate-limited (see section 4). Replies to inbound should complete within 60 seconds -- the prospect expects some delay because it is email.

### 3.3 WhatsApp Channel

Already has a working adapter (`WhatsAppAdapter`). Extensions needed:

```typescript
// Extend MessagingAdapter with media and interactive messages
export interface MessagingAdapter {
  sendMessage(to: string, text: string): Promise<{ id: string }>;
  sendTemplate(to: string, template: string, params: Record<string, string>): Promise<{ id: string }>;
  // NEW:
  sendImage?(to: string, imageUrl: string, caption?: string): Promise<{ id: string }>;
  sendInteractive?(to: string, options: InteractiveMessage): Promise<{ id: string }>;
}

export interface InteractiveMessage {
  type: "button" | "list";
  header?: string;
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;           // max 3 for WhatsApp
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}
```

**Key constraint:** WhatsApp requires pre-approved **template messages** for first-contact outreach (24-hour rule). The agent cannot send freeform text to prospects who haven't messaged first. Templates must be registered with Meta.

**Latency:** < 10 seconds. WhatsApp users expect near-real-time responses.

### 3.4 Web Chat (Phase 2)

Embedded widget on business websites. Uses Supabase Realtime for bidirectional communication:

- Widget loads, creates an anonymous conversation node
- Messages are inserted as events
- Supabase Realtime `NOTIFY` triggers server-side AI processing
- Response event is pushed back via Realtime subscription

This channel has the tightest latency requirement (< 5 seconds perceived) but also the most control over UX (typing indicators, suggested replies, rich cards).

### 3.5 Voice (Not for April 1)

Phone-based AI conversations are technically possible with services like Vapi, Bland.ai, or Twilio's AI assistants, but they add significant complexity (real-time transcription, speech synthesis, turn-taking, interruption handling). Explicitly out of scope for April 1. Revisit in Q3 when the platform is stable.

### 3.6 Social DMs (Phase 3)

Instagram and Facebook Messenger DMs are handled through the same Meta platform as WhatsApp, using the Instagram Graph API and Messenger Platform API. The adapter pattern makes this a matter of implementing new `MessagingAdapter` instances.

---

## 4. OUTREACH ENGINE

### 4.1 Campaign Model

Campaigns are **nodes** (type: `campaign`):

```typescript
export const nodeDataCampaignSchema = z.object({
  name: z.string(),
  agent_id: z.string().uuid(),
  status: z.enum(["draft", "active", "paused", "completed"]),
  channels: z.array(z.enum(["email", "whatsapp", "sms"])),
  audience: z.object({
    source: z.enum(["csv_import", "crm_query", "manual"]),
    filters: z.record(z.unknown()).default({}),
    total_contacts: z.number().default(0),
  }),
  schedule: z.object({
    start_date: z.string(),       // ISO date
    end_date: z.string().nullable(),
    send_times: z.array(z.object({
      day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
      hour: z.number().min(0).max(23),
    })),
    timezone: z.string().default("Europe/Stockholm"),
    max_per_day: z.number().default(50),     // rate limit
    max_per_hour: z.number().default(20),
  }),
  templates: z.array(z.object({
    id: z.string(),
    channel: z.enum(["email", "whatsapp", "sms"]),
    variant: z.string(),                     // "A", "B" for A/B testing
    subject: z.string().nullable(),          // email only
    body_template: z.string(),               // with {{placeholders}}
    weight: z.number().default(50),          // A/B split percentage
  })),
  follow_up_sequence: z.array(z.object({
    delay_hours: z.number(),                 // hours after previous step
    condition: z.enum(["no_reply", "opened_not_replied", "always"]),
    template_id: z.string(),
  })).default([]),
  metrics: z.object({
    sent: z.number().default(0),
    delivered: z.number().default(0),
    opened: z.number().default(0),           // email only
    replied: z.number().default(0),
    converted: z.number().default(0),
    bounced: z.number().default(0),
    unsubscribed: z.number().default(0),
  }).default({}),
});
```

### 4.2 Personalization

AI personalizes each outreach message by:

1. Loading the prospect node (lead data: name, company, past interactions, interests)
2. Loading the message template with `{{placeholders}}`
3. Calling the `cheap` AI tier to fill in personalization fields:

```typescript
// packages/core/src/agents/personalize.ts

export async function personalizeMessage(input: {
  template: string;              // "Hi {{first_name}}, I noticed {{personalization}}..."
  prospect: LeadData;
  agent: NodeDataAgent;
  product: Product | null;
}): Promise<string> {
  // Deterministic substitutions first
  let message = input.template
    .replace("{{first_name}}", input.prospect.firstName)
    .replace("{{company}}", input.prospect.company ?? "")
    .replace("{{product_name}}", input.product?.name ?? "");

  // AI-generated personalization (if placeholder exists)
  if (message.includes("{{personalization}}")) {
    const snippet = await aiGenerateText({
      tier: "cheap",
      system: `You are a sales copywriter. Generate a 1-sentence personalization for an outreach message.
Tone: ${input.agent.persona.tone}. Language: ${input.agent.persona.language}.
Brand: ${input.agent.knowledge_base.brand_guidelines ?? "professional"}.
Do NOT hallucinate facts about the prospect. Only use provided data.`,
      prompt: `Prospect: ${input.prospect.firstName} ${input.prospect.lastName}
Company: ${input.prospect.company ?? "unknown"}
Industry: ${input.prospect.industry ?? "unknown"}
Product: ${input.product?.name ?? "our offerings"}
Generate a brief, genuine personalization line.`,
    });
    message = message.replace("{{personalization}}", snippet.trim());
  }

  return message;
}
```

### 4.3 A/B Testing

Templates have a `variant` field ("A", "B") and a `weight` (percentage split). The outreach engine randomly assigns each prospect a variant based on weights. The variant is recorded on the outreach event so analytics can compare:

- Open rate per variant (email)
- Reply rate per variant
- Conversion rate per variant

After N sends (configurable, default 100 per variant), the system can auto-select the winner or flag for human review.

### 4.4 Rate Limiting and Compliance

```typescript
// packages/core/src/agents/rate-limiter.ts

export const RATE_LIMITS = {
  email: {
    per_hour: 50,      // Resend free tier: 100/day, 10/second
    per_day: 200,
    cooldown_after_bounce: 24 * 60 * 60 * 1000, // 24h
  },
  whatsapp: {
    per_hour: 30,      // WhatsApp Business limits vary by tier
    per_day: 250,
    template_required_for_first_contact: true,
  },
  sms: {
    per_hour: 20,
    per_day: 100,
  },
};

// GDPR compliance
export const COMPLIANCE_RULES = {
  // Every outreach MUST include an unsubscribe mechanism
  unsubscribe_required: true,
  // Honor opt-out within 24 hours (EU regulation)
  opt_out_processing_hours: 24,
  // Record consent basis for every contact
  consent_basis_required: true,  // "legitimate_interest", "explicit_consent", "existing_customer"
  // Right to be forgotten: delete all conversation data on request
  data_deletion_supported: true,
};
```

The outreach engine checks these limits before every send. Exceeded limits cause the message to be queued for the next available window, not dropped.

### 4.5 Follow-Up Sequences

Follow-ups are defined as steps with delays and conditions:

```
Step 1: Initial outreach (Day 0)
  └─ condition: no_reply after 48h ──►
Step 2: Follow-up #1 (Day 2)
  └─ condition: no_reply after 72h ──►
Step 3: Follow-up #2 (Day 5) — different angle
  └─ condition: no_reply after 96h ──►
Step 4: Final attempt (Day 9)
  └─ condition: no_reply after 168h ──►
Mark as abandoned
```

Each step is processed by the scheduled job infrastructure (from Phase 4). The `auto-status` batch job pattern is reused: a `campaign-follow-up` job runs every hour, checks for conversations in `initial_contact` state where the delay has elapsed and the condition is met, then sends the next step.

---

## 5. BOOKING INTEGRATION

### 5.1 Availability Query Flow

```
Prospect: "I want 4 tickets for the March 15th game"
    │
    ▼
Agent parses intent (AI classification, cheap tier):
  { intent: "check_availability", product_hint: "march 15 game", quantity: 4 }
    │
    ▼
CatalogAdapter.getProducts({ dateFrom: "2026-03-15", dateTo: "2026-03-15" })
    │
    ▼
Returns: [
  { id: "game-0315", name: "AIK vs Djurgården", price: 350, availability: "available" },
  ...seat categories...
]
    │
    ▼
CatalogAdapter.checkAvailability("game-0315", "2026-03-15", 4)
    │
    ▼
Returns: { available: true, remaining: 847 }
    │
    ▼
Agent formats response:
  "Great news! AIK vs Djurgården on March 15th has plenty of
   availability. Tickets from 350 SEK. Would you like:
   1. Ståplats (350 SEK)
   2. Sittplats (550 SEK)
   3. VIP (1200 SEK)"
```

### 5.2 Option Presentation

The agent presents options using channel-appropriate formatting:

- **WhatsApp:** Interactive list message (`sendInteractive` with `type: "list"`)
- **Email:** HTML table with images and "Book Now" links
- **SMS:** Numbered list (1/2/3 reply)

**Critical rule (inheriting "AI never does arithmetic"):** The agent retrieves prices from the catalog adapter. It does NOT calculate totals. When showing "4 tickets x 350 SEK," the system computes 1400, not the AI.

```typescript
// packages/core/src/agents/format-options.ts

export function formatBookingOptions(input: {
  products: Product[];
  quantity: number;
  channel: "email" | "whatsapp" | "sms" | "web_chat";
}): { text: string; interactive?: InteractiveMessage } {
  const { products, quantity, channel } = input;

  if (channel === "whatsapp" && products.length <= 10) {
    return {
      text: "",
      interactive: {
        type: "list",
        body: `Found ${products.length} options for ${quantity} tickets:`,
        sections: [{
          title: "Available tickets",
          rows: products.map(p => ({
            id: p.id,
            title: p.name,
            // System computes total, not AI
            description: `${p.price} ${p.currency}/st — Total: ${computeTotal(quantity, p.price)} ${p.currency}`,
          })),
        }],
      },
    };
  }

  // Fallback: text format
  const lines = products.map((p, i) =>
    `${i + 1}. ${p.name} — ${p.price} ${p.currency}/st (Total: ${computeTotal(quantity, p.price)} ${p.currency})`
  );
  return { text: lines.join("\n") };
}
```

### 5.3 Booking Transaction

When the prospect confirms a selection:

1. Agent calls `CatalogAdapter.checkAvailability()` again (real-time check)
2. If still available: `CatalogAdapter.createBooking()` with prospect details
3. On success: log a `booking_confirmed` event, send confirmation with `bookingId` and `confirmationUrl`
4. On failure: inform prospect, suggest alternatives

```typescript
// packages/core/src/agents/booking.ts

export async function processBooking(input: {
  db: PgDatabase<any>;
  catalog: CatalogAdapter;
  tenantId: string;
  conversationId: string;
  productId: string;
  quantity: number;
  prospect: LeadData;
}): Promise<BookingAttemptResult> {
  // Re-check availability (inventory may have changed)
  const availability = await input.catalog.checkAvailability(
    input.productId, undefined, input.quantity
  );

  if (!availability.available) {
    return {
      success: false,
      error: "no_longer_available",
      alternatives: availability.alternatives ?? [],
    };
  }

  // Attempt booking
  const result = await input.catalog.createBooking({
    productId: input.productId,
    quantity: input.quantity,
    customerName: `${input.prospect.firstName} ${input.prospect.lastName}`,
    customerEmail: input.prospect.email,
    customerPhone: input.prospect.phone,
  });

  if (result.success) {
    // Log booking event
    await createEvent(input.db, input.tenantId, {
      nodeId: input.conversationId,
      typeCode: "booking",
      data: {
        booking_id: result.bookingId,
        product_id: input.productId,
        quantity: input.quantity,
        confirmation_url: result.confirmationUrl,
      },
      qty: input.quantity,
      origin: "system",
      occurredAt: new Date(),
    });
  }

  return {
    success: result.success,
    bookingId: result.bookingId,
    confirmationUrl: result.confirmationUrl,
    error: result.error,
  };
}
```

### 5.4 Inventory Change Mid-Conversation

If the agent presented options 5 minutes ago and the prospect now selects one that has sold out:

1. The `checkAvailability` call in step 1 of `processBooking` catches this
2. Agent responds: "I'm sorry, those seats just sold out. Here are alternatives: ..."
3. Conversation state moves back to `presenting_options` (not `escalated`)
4. If NO alternatives exist, escalate to human

### 5.5 Package Bundles (Post-MVP)

For travel packages (ticket + hotel + experience), the system needs to compose across multiple catalog adapters:

```typescript
export interface PackageBuilder {
  components: Array<{
    adapter: CatalogAdapter;
    category: string;        // "ticket", "hotel", "experience"
    required: boolean;
  }>;
  buildPackage(selections: Map<string, Product>): Package;
  calculateTotal(selections: Map<string, Product>): number; // system computes, not AI
}
```

This is out of scope for April 1 but the adapter pattern makes it extensible.

---

## 6. HUMAN HANDOFF PROTOCOL

### 6.1 When the AI Escalates

See section 1.4 for the full rule set. Summary:

| Trigger | Priority |
|---------|----------|
| Prospect explicitly asks for a human | HIGH |
| Refund request, complaint, legal question | HIGH |
| Booking API failure | HIGH |
| AI confidence below 0.4 | MEDIUM |
| 10+ messages without conversion | MEDIUM |
| Negative sentiment in 3 consecutive messages | MEDIUM |
| Discount request exceeding `max_discount_percent` | LOW |

### 6.2 Context Transfer

When escalation happens, the system creates a structured handoff package:

```typescript
export interface HandoffPackage {
  conversationId: string;
  escalationReason: EscalationReason;
  prospect: {
    name: string;
    email: string;
    phone: string;
    channel: string;
  };
  summary: string;              // AI-generated 3-sentence summary of the conversation
  key_points: string[];          // extracted: what they want, objections, budget
  last_5_messages: Array<{ role: string; text: string; timestamp: string }>;
  products_discussed: Product[];
  conversation_state: ConversationState;
  suggested_action: string;     // AI suggestion for the human: "Offer 10% group discount"
}
```

This package is delivered as a **notification** (using the existing notification system from Phase 4):

```typescript
await notify(db, tenantId, {
  recipientId: assignedHumanId ?? tenantOwnerId,
  type: "escalation",
  priority: "high",
  title: `Sales conversation needs attention: ${prospect.name}`,
  data: handoffPackage,
});
```

### 6.3 Bidirectional Handoff

The human agent can:

1. **Take over:** Conversation state becomes `escalated`, the AI stops responding. Human replies through the admin UI or directly via the channel.
2. **Hand back:** Human clicks "Resume AI" in the admin UI. The conversation state returns to its previous value. The AI picks up from where the human left off, with full context of the human's messages (they were logged as events with `origin: "human"`).
3. **Collaborate:** Human can inject a "coaching" message visible only to the AI (not to the prospect) that adjusts the agent's behavior for this specific conversation. For example: "Offer them a 15% discount, they're a VIP."

```typescript
// Event type: "agent_coaching" (internal, not sent to prospect)
{
  text: "Offer 15% discount, they are a VIP repeat customer",
  direction: "internal",
  role: "human_agent",
}
```

The agent's context builder includes coaching events in the system prompt.

### 6.4 Notification Channels for Human Agents

When an escalation occurs, the human agent is notified via:
- In-app notification (Supabase Realtime push to admin dashboard)
- Email notification with the handoff summary
- Optional: WhatsApp/SMS notification to the business owner's phone

---

## 7. CONTENT GENERATION ENGINE

### 7.1 Architecture

Content generation is a set of functions in `packages/core/src/agents/content/`, each using the AI pipeline with appropriate tiers:

```typescript
// packages/core/src/agents/content/types.ts

export interface ContentRequest {
  tenantId: string;
  agentId: string;               // agent node for brand voice
  type: ContentType;
  inputs: Record<string, unknown>;
  language: string;
  tone?: string;                  // override agent default
}

export type ContentType =
  | "marketing_email"
  | "social_post"
  | "landing_page_section"
  | "seo_article"
  | "ad_copy"
  | "event_announcement";

export interface ContentResult {
  content: string;
  subject?: string;              // for emails
  metadata: {
    tokens_used: number;
    model_used: string;
    generation_time_ms: number;
  };
}
```

### 7.2 Marketing Email Generation

```typescript
// packages/core/src/agents/content/email.ts

export async function generateMarketingEmail(input: {
  agent: NodeDataAgent;
  product: Product;
  audience: string;             // "football fans", "families", "corporate groups"
  urgency: "low" | "medium" | "high";
  language: string;
}): Promise<{ subject: string; html: string; plainText: string }> {
  const result = await aiGenerateObject({
    tier: "expensive",            // marketing copy needs quality
    system: `You are a marketing copywriter for ${agent.persona.bio}.
Brand guidelines: ${agent.knowledge_base.brand_guidelines ?? "professional, engaging"}.
Tone: ${agent.persona.tone}. Language: ${input.language}.
You write compelling email copy that drives action.
NEVER fabricate statistics, reviews, or testimonials.
NEVER make promises about availability — use "while supplies last" language.`,
    prompt: `Generate a marketing email for:
Product: ${input.product.name} — ${input.product.description}
Price: ${input.product.price} ${input.product.currency}
Target audience: ${input.audience}
Urgency level: ${input.urgency}
Include: subject line, HTML body with CTA button, and plain text fallback.`,
    schema: marketingEmailSchema,
    schemaName: "marketing_email",
  });

  return result;
}
```

### 7.3 Social Media Post Generation

```typescript
export async function generateSocialPost(input: {
  agent: NodeDataAgent;
  product: Product;
  platform: "instagram" | "facebook" | "twitter" | "linkedin";
  language: string;
}): Promise<{ caption: string; hashtags: string[]; suggestedImagePrompt: string }> {
  // Platform-specific constraints
  const constraints = {
    instagram: { maxLength: 2200, hashtagCount: 15 },
    facebook: { maxLength: 500, hashtagCount: 5 },
    twitter: { maxLength: 280, hashtagCount: 3 },
    linkedin: { maxLength: 3000, hashtagCount: 5 },
  };

  return aiGenerateObject({
    tier: "cheap",                // social posts are short, cheap tier sufficient
    system: `You write social media posts for ${input.platform}.
${constraints[input.platform].maxLength} char max.
Brand: ${input.agent.knowledge_base.brand_guidelines ?? "engaging"}.
Tone: ${input.agent.persona.tone}. Language: ${input.language}.`,
    prompt: `Product: ${input.product.name}
Price: ${input.product.price} ${input.product.currency}
Generate a ${input.platform} post with hashtags.`,
    schema: socialPostSchema,
    schemaName: "social_post",
  });
}
```

### 7.4 Brand Voice Configuration

Brand voice is configured at the agent level via `knowledge_base.brand_guidelines` and `persona.tone`. These are injected into every AI prompt as part of the system message. For businesses with multiple product lines, each product line gets its own agent node with different brand settings, all under the same tenant.

---

## 8. ANALYTICS AND FEEDBACK LOOP

### 8.1 Key Metrics

All metrics are derived from **events** (append-only, single source of truth). No separate analytics tables needed.

```typescript
// packages/core/src/agents/analytics.ts

export interface AgentMetrics {
  // Outreach metrics
  outreach: {
    sent: number;
    delivered: number;
    opened: number;             // email only
    replied: number;
    reply_rate: number;          // replied / delivered
    bounce_rate: number;
  };
  // Conversation metrics
  conversations: {
    total: number;
    active: number;
    completed: number;
    escalated: number;
    abandoned: number;
    avg_turns_to_conversion: number;
    avg_response_time_seconds: number;
    escalation_rate: number;    // escalated / total
  };
  // Conversion metrics
  conversions: {
    total: number;
    conversion_rate: number;    // completed / (replied conversations)
    revenue: number;
    avg_order_value: number;
    top_products: Array<{ productId: string; name: string; count: number }>;
  };
  // Efficiency metrics
  efficiency: {
    ai_cost: number;            // total tokens * price per token
    cost_per_conversion: number;
    human_interventions: number;
    avg_messages_before_escalation: number;
  };
  // Time period
  period: { start: string; end: string };
}
```

### 8.2 Computing Metrics from Events

```sql
-- Example: Reply rate for a campaign
SELECT
  COUNT(*) FILTER (WHERE data->>'direction' = 'outbound' AND data->>'campaign_step' = '1') AS sent,
  COUNT(*) FILTER (WHERE data->>'direction' = 'inbound') AS replied,
  COUNT(*) FILTER (WHERE data->>'direction' = 'inbound')::float /
    NULLIF(COUNT(*) FILTER (WHERE data->>'direction' = 'outbound' AND data->>'campaign_step' = '1'), 0) AS reply_rate
FROM events
WHERE tenant_id = $1
  AND type_id = (SELECT id FROM labels WHERE domain = 'event_type' AND code = 'agent_message')
  AND node_id IN (SELECT id FROM nodes WHERE data->>'campaign_id' = $2)
  AND occurred_at BETWEEN $3 AND $4;
```

This follows the existing rule: **event resolution in SQL** with window functions, never in JavaScript.

### 8.3 Learning from Outcomes

The feedback loop works in three stages:

1. **Tag outcomes:** When a conversation reaches `completed` or `abandoned`, record which template variant was used, which products were shown, how many turns it took, and whether the prospect converted.

2. **Aggregate patterns:** A weekly job analyzes:
   - Which opening lines had the highest reply rate?
   - Which objection-handling responses led to conversions?
   - At which conversation state do most abandonments happen?
   - Which products are most requested but least converted (pricing issue)?

3. **Surface insights:** Results are displayed on the admin dashboard and optionally fed back into the agent's system prompt as "winning patterns."

The system does NOT auto-modify agent behavior. Following the core principle: **AI proposes, human decides.** The system surfaces insights; the business owner decides whether to adjust templates, change pricing, or modify the agent's constraints.

### 8.4 Dashboard

The admin dashboard (at `apps/web/app/(app)/agents/[id]/analytics/page.tsx`) is a Server Component that queries event aggregates directly via Drizzle:

- **Overview cards:** Conversations today, conversion rate, revenue, active conversations
- **Funnel chart:** initial_contact -> qualifying -> presenting -> closing -> completed (with drop-off rates)
- **Campaign performance table:** sent, opened, replied, converted per campaign
- **A/B test results:** variant comparison with statistical significance indicator
- **Escalation log:** recent escalations with reasons
- **Timeline:** recent conversation activity

---

## 9. APRIL 1 MVP SCOPE

### 9.1 Use Case: Football Ticket Sales

**The business:** A football club (or ticket reseller) wants to sell more tickets to upcoming matches using AI-assisted outreach and conversation.

**What the AI agent does:**
1. Sends personalized outreach emails about upcoming matches to a prospect list
2. Handles replies: answers questions about matches, seating, pricing
3. Sends WhatsApp messages for real-time follow-up
4. Provides a booking link when the prospect is ready
5. Escalates to a human for refunds, complaints, or group bookings

### 9.2 MVP Feature Cut

| Feature | In MVP | Notes |
|---------|--------|-------|
| Agent configuration (node) | YES | Single agent per tenant |
| Conversation as node + events | YES | Core state management |
| Email outreach campaigns | YES | Resend adapter exists |
| Email reply handling | YES | New webhook endpoint |
| WhatsApp conversations | YES | Adapter exists |
| WhatsApp template outreach | YES | Requires Meta template approval |
| Web chat widget | NO | Phase 2 |
| SMS conversations | PARTIAL | Fallback only, adapter exists |
| Voice calls | NO | Phase 3+ |
| Social DMs | NO | Phase 3 |
| CatalogAdapter interface | YES | Static catalog for MVP |
| Real-time booking API | NO | Booking link for MVP |
| Package bundles | NO | Single products only |
| A/B testing | YES | Simple variant split |
| Follow-up sequences | YES | 3-step max |
| Human handoff | YES | Basic escalation + notification |
| Bidirectional handoff | NO | Human takes over only |
| Marketing email generation | YES | Core value proposition |
| Social post generation | YES | Low effort, high value |
| Landing page / SEO content | NO | Phase 2 |
| Analytics dashboard | YES | Basic metrics only |
| Feedback loop / auto-optimization | NO | Phase 2 |
| GDPR compliance (unsubscribe) | YES | Required by law |
| Rate limiting | YES | Required for deliverability |

### 9.3 MVP Data Model (New Labels)

```typescript
// packages/shared/src/labels/platform-defaults.ts (extend)

// Node types
{ domain: "node_type", code: "agent",        name: "AI Agent" },
{ domain: "node_type", code: "conversation", name: "Conversation" },
{ domain: "node_type", code: "lead",         name: "Lead/Prospect" },
{ domain: "node_type", code: "campaign",     name: "Campaign" },

// Edge types
{ domain: "edge_type", code: "agent_owns",      name: "Agent owns conversation" },
{ domain: "edge_type", code: "lead_in",          name: "Lead in conversation" },
{ domain: "edge_type", code: "campaign_targets",  name: "Campaign targets lead" },
{ domain: "edge_type", code: "campaign_uses",     name: "Campaign uses agent" },

// Event types
{ domain: "event_type", code: "agent_message",     name: "Agent message" },
{ domain: "event_type", code: "booking",           name: "Booking" },
{ domain: "event_type", code: "escalation",        name: "Escalation" },
{ domain: "event_type", code: "campaign_send",     name: "Campaign send" },
{ domain: "event_type", code: "agent_coaching",    name: "Agent coaching" },

// Conversation states
{ domain: "conversation_state", code: "initial_contact",    name: "Initial Contact" },
{ domain: "conversation_state", code: "qualifying",         name: "Qualifying" },
{ domain: "conversation_state", code: "presenting_options", name: "Presenting Options" },
{ domain: "conversation_state", code: "negotiating",        name: "Negotiating" },
{ domain: "conversation_state", code: "closing",            name: "Closing" },
{ domain: "conversation_state", code: "post_sale",          name: "Post Sale" },
{ domain: "conversation_state", code: "escalated",          name: "Escalated" },
{ domain: "conversation_state", code: "abandoned",          name: "Abandoned" },
{ domain: "conversation_state", code: "completed",          name: "Completed" },
```

### 9.4 MVP File Structure

```
packages/core/src/agents/
  ├── types.ts                 # Agent, Conversation, Lead, Campaign schemas
  ├── state-machine.ts         # Conversation state transitions
  ├── escalation.ts            # Escalation rule engine
  ├── context-builder.ts       # AI context assembly with token budgeting
  ├── conversation-engine.ts   # Core: receive message -> classify -> respond
  ├── personalize.ts           # Template personalization
  ├── format-options.ts        # Channel-specific product formatting
  ├── booking.ts               # Booking flow (link-based for MVP)
  ├── rate-limiter.ts          # Send rate enforcement
  ├── content/
  │   ├── email.ts             # Marketing email generation
  │   └── social.ts            # Social post generation
  └── analytics.ts             # Metrics queries

packages/integrations/src/
  ├── catalog/
  │   ├── types.ts             # CatalogAdapter interface
  │   └── static-adapter.ts    # Static catalog for MVP

apps/web/app/(app)/agents/
  ├── page.tsx                 # Agent list
  ├── [id]/
  │   ├── page.tsx             # Agent detail / conversations
  │   ├── settings/page.tsx    # Agent configuration
  │   ├── campaigns/page.tsx   # Campaign management
  │   ├── analytics/page.tsx   # Dashboard
  │   └── conversations/
  │       └── [convId]/page.tsx # Single conversation view

apps/web/app/api/webhooks/
  ├── email/inbound/route.ts   # Inbound email webhook
  └── whatsapp/route.ts        # (exists, extend for agent routing)

packages/core/src/jobs/
  └── campaign-processor.ts    # Scheduled job for outreach + follow-ups
```

### 9.5 MVP Conversation Engine (Core Loop)

```typescript
// packages/core/src/agents/conversation-engine.ts

export async function handleAgentMessage(
  db: PgDatabase<any>,
  input: {
    conversationId: string;
    inboundText: string;
    channel: "email" | "whatsapp" | "sms";
    senderIdentifier: string;     // email address or phone number
  }
): Promise<{ response: string; newState: ConversationState }> {
  // 1. Load conversation node
  const conversation = await loadConversation(db, input.conversationId);
  if (conversation.state === "escalated") {
    return { response: "", newState: "escalated" }; // human is handling
  }

  // 2. Load agent node
  const agent = await loadAgent(db, conversation.agent_id);

  // 3. Log inbound message as event
  await createEvent(db, conversation.tenant_id, {
    nodeId: input.conversationId,
    typeCode: "agent_message",
    data: {
      text: input.inboundText,
      channel: input.channel,
      direction: "inbound",
      role: "prospect",
    },
    origin: "human",
    occurredAt: new Date(),
  });

  // 4. Classify intent + check escalation
  const classification = await classifyProspectMessage({
    text: input.inboundText,
    conversationState: conversation.state,
    agentGoal: agent.goals.primary,
  });

  const escalationCheck = shouldEscalate({
    conversation, agent, latestMessage: input.inboundText, aiClassification: classification,
  });

  if (escalationCheck.escalate) {
    await escalateConversation(db, conversation, agent, escalationCheck.reason!);
    const response = "Let me connect you with a team member who can help. They'll be in touch shortly.";
    return { response, newState: "escalated" };
  }

  // 5. Determine next state
  const newState = resolveNextState(conversation.state, classification);

  // 6. Build context and generate response
  const recentMessages = await getConversationMessages(db, input.conversationId, 10);
  const products = await loadRelevantProducts(agent, classification);

  const context = await buildAgentContext({
    agent, conversation: { ...conversation, state: newState }, recentMessages, products,
  });

  const response = await aiGenerateText({
    tier: "medium",  // conversations need quality but not max expense
    system: context.systemPrompt,
    prompt: `${context.productContext}\n\n${context.conversationHistory}\n\nProspect: ${input.inboundText}\n\nRespond as the agent. Stay in character. Be helpful and guide toward ${agent.goals.conversion_action}.`,
  });

  // 7. Log outbound message as event
  await createEvent(db, conversation.tenant_id, {
    nodeId: input.conversationId,
    typeCode: "agent_message",
    data: {
      text: response,
      channel: input.channel,
      direction: "outbound",
      role: "agent",
    },
    origin: "ai_generated",
    occurredAt: new Date(),
  });

  // 8. Update conversation state + turn count
  await updateConversationState(db, input.conversationId, newState, conversation.turn_count + 1);

  // 9. Periodically update context summary (every 10 turns)
  if ((conversation.turn_count + 1) % 10 === 0) {
    const summary = await generateConversationSummary(recentMessages);
    await updateContextSummary(db, input.conversationId, summary);
  }

  return { response, newState };
}
```

### 9.6 MVP Timeline (4 Weeks to April 1)

| Week | Deliverables |
|------|-------------|
| **Week 1 (Mar 2-8)** | Agent + Conversation + Lead + Campaign node schemas and labels. `CatalogAdapter` interface + static adapter. Conversation engine core loop. State machine. |
| **Week 2 (Mar 9-15)** | Email outreach (send campaigns via Resend). Inbound email webhook. Follow-up sequence processor. WhatsApp conversation routing (extend existing webhook). |
| **Week 3 (Mar 16-22)** | Admin UI: agent config, campaign builder, conversation viewer. Marketing email generator. Human escalation + notification. |
| **Week 4 (Mar 23-31)** | Analytics dashboard. Rate limiting + GDPR compliance. End-to-end testing with twin server. Deploy to staging. |

### 9.7 What "Good Enough" Looks Like on April 1

A football club can:

1. **Configure an agent** in the admin UI: give it a name ("Biljett-Bansen"), set tone to "enthusiastic," paste in match schedule as static catalog, upload brand guidelines.

2. **Import a CSV of prospects** (name, email, phone) as lead nodes.

3. **Create a campaign** targeting those leads via email, with a template: "Hej {{first_name}}, {{personalization}} -- Vi har biljetter till {{product_name}}! Svara pa detta mejl for att boka."

4. **Launch the campaign.** The system sends personalized emails at the configured rate. Follow-ups go out automatically if no reply after 48 hours.

5. **Prospects reply by email.** The agent handles the conversation: answers questions about matches, seat categories, pricing. When the prospect wants to buy, the agent sends a booking link (to the club's existing ticket platform).

6. **For WhatsApp:** Prospects who share their phone number (or are contacted via WhatsApp template) get the same conversation experience with faster response times.

7. **If the prospect gets difficult,** the agent escalates. The club's sales manager gets a notification with a summary and picks up the conversation.

8. **On the dashboard,** the club sees: 500 emails sent, 23% reply rate, 12 bookings, 3 escalations.

This is a functional, end-to-end AI sales agent -- not a chatbot, not a mail merge. It conducts genuine multi-turn sales conversations across email and WhatsApp, with real escalation handling and basic analytics. The platform architecture supports extending to new verticals (travel packages, event bookings, real estate showings) by swapping the `CatalogAdapter` and adjusting the agent's configuration.

---

## Key Design Decisions Summary

1. **Agents, conversations, leads, and campaigns are all nodes** in the existing 7-table model. No new tables needed. This is the single most important architectural decision -- it means the entire multi-tenant, RLS, event-sourced, bitemporal infrastructure works for sales agents without modification.

2. **Every message is an event.** Inbound and outbound messages are append-only events on conversation nodes. This gives full audit trail, enables analytics from events, and makes context building a matter of querying recent events.

3. **Stateless agent architecture.** The agent has no in-memory state. All conversation state lives in the database. This means the system can handle any number of concurrent conversations without memory pressure, and any server instance can handle any conversation.

4. **Token budget management via rolling summaries.** Long conversations are compressed using cheap AI to generate summaries every 10 turns. The last 6 messages are always included verbatim. This keeps context windows manageable while preserving conversation coherence.

5. **Booking via link, not via API (MVP).** For April 1, the agent sends a booking link to the external ticket platform rather than executing the booking through an API. This avoids the complexity of payment handling and inventory synchronization. The `CatalogAdapter.createBooking()` method is defined but the MVP implementation just returns a URL.

6. **AI proposes, human decides -- extended to sales.** The agent generates responses and suggestions, but escalates to humans for anything outside its constraints. The human can take over, coach the AI, or hand back. This is the same principle as the construction ERP but applied to sales conversations.

---
