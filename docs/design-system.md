# Resonansia — Design System v1.0

> UI primitives, component taxonomy, and interaction patterns.
> This file is fed to the frontend agent alongside resonansia-spec.md
> and tech-decisions.md.

**Last updated:** 2026-02-28

---

## Design Philosophy

Resonansia serves tradespeople — painters, plumbers, electricians.
The interface must be:

1. **Fast** — Dashboard loads in < 2 seconds. No unnecessary animations.
2. **Obvious** — Zero training needed. A painter who has never used business software should understand the dashboard in 10 seconds.
3. **Dense where needed** — Project economics, event timelines, and financial summaries pack information tightly. Use data tables, not cards-with-icons.
4. **Spacious where needed** — WhatsApp-style message views, photo galleries, and quote builders use generous whitespace.
5. **Works on all screens** — Desktop for Lisa (office admin). Mobile for Kimmo (in the field). Phone-only for Aziz (WhatsApp user who occasionally opens a link).

---

## Tech Stack (UI)

| Tool | Purpose |
|------|---------|
| shadcn/ui | Component library (copied into project, not a dependency) |
| Tailwind CSS 4 | Utility-first styling |
| Lucide React | Icon set |
| @react-pdf/renderer | PDF generation (quotes, invoices, reports) |
| Recharts | Charts (project economics, dashboard) |

---

## Color System

```
Primary:      slate-900 (#0f172a)    — Headers, primary text
Secondary:    slate-500 (#64748b)    — Secondary text, labels
Accent:       blue-600 (#2563eb)     — Interactive elements, links, primary buttons
Success:      green-600 (#16a34a)    — Positive status, completed, profit
Warning:      amber-500 (#f59e0b)    — Deviations, attention needed
Danger:       red-600 (#dc2626)      — Errors, losses, critical alerts
Surface:      white (#ffffff)        — Card backgrounds
Background:   slate-50 (#f8fafc)     — Page background
Border:       slate-200 (#e2e8f0)    — Dividers, card borders

AI Insight:   violet-50 bg + violet-700 text + violet-200 border
              — All AI-generated content uses this palette to satisfy AXIOM-05
```

---

## Typography

```
Font:         Inter (system fallback: -apple-system, sans-serif)
              For Arabic: Noto Sans Arabic
              
Sizes:
  Page title:    text-2xl (24px) font-semibold
  Section head:  text-lg (18px) font-medium
  Body:          text-sm (14px) font-normal
  Caption:       text-xs (12px) font-normal text-slate-500
  Data cell:     text-sm (14px) font-mono (for numbers)
  
Numbers:      ALWAYS right-aligned, monospace font, locale-formatted
              Swedish: "45 000,00 kr"  (space as thousands, comma as decimal)
```

---

## Layout Patterns

### Dashboard (Desktop)

```
┌─────────────────────────────────────────────────┐
│  Logo    [Search]              [User] [Tenant]  │
├────────┬────────────────────────────────────────┤
│        │                                        │
│  Nav   │   Summary Cards (KPIs)                 │
│        │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ Proj.  │   │Active│ │Month │ │Unin- │ │AI    │ │
│ Custom.│   │Proj. │ │Rev.  │ │voiced│ │Alert │ │
│ People │   └──────┘ └──────┘ └──────┘ └──────┘ │
│ Quotes │                                        │
│ Invoic.│   Project List (table, sortable)       │
│ Reports│   ┌────┬──────┬──────┬──────┬────────┐ │
│        │   │ #  │ Name │Status│Margin│ Action │ │
│ ────── │   ├────┼──────┼──────┼──────┼────────┤ │
│ Settings│  │ ...│ ...  │ ...  │ ...  │  ...   │ │
│        │   └────┴──────┴──────┴──────┴────────┘ │
│        │                                        │
│        │   AI Insights (if any)                 │
│        │   ┌─ violet border ──────────────────┐ │
│        │   │ ⚠ Material cost 15% above avg... │ │
│        │   └──────────────────────────────────┘ │
└────────┴────────────────────────────────────────┘
```

### Dashboard (Mobile)

```
┌──────────────────────┐
│  ☰  Resonansia  [👤] │
├──────────────────────┤
│  Summary Cards (2x2) │
│  ┌────┐ ┌────┐       │
│  │Proj│ │Rev.│       │
│  └────┘ └────┘       │
│  ┌────┐ ┌────┐       │
│  │Uninv│ │AI │       │
│  └────┘ └────┘       │
│                      │
│  Project List (cards)│
│  ┌──────────────────┐│
│  │ Eriksson         ││
│  │ In progress 3/5  ││
│  │ Margin: 42%  ▶   ││
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │ BRF Solbacken    ││
│  │ ...              ││
│  └──────────────────┘│
│                      │
│  [＋ New Project]     │
└──────────────────────┘
```

### Project Detail

```
┌──────────────────────────────────────────────────┐
│  ← Projects    Eriksson — Interior Painting      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Status: In Progress (Day 3/5)    [Actions ▾]    │
│                                                  │
│  Economics                                       │
│  ┌────────────┬────────────┬────────────────────┐│
│  │ Quote      │ Actual     │ Margin             ││
│  │ 45 000 kr  │ 38 200 kr  │ 6 800 kr (15.1%)  ││
│  │            │            │ ████████░░ (84.9%) ││
│  └────────────┴────────────┴────────────────────┘│
│                                                  │
│  ┌─ Tabs ──────────────────────────────────────┐ │
│  │ Timeline │ Photos │ People │ Quotes │ Invoices│
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Timeline (event feed)                           │
│  ┌──────────────────────────────────────────────┐│
│  │ Today 14:32  Aziz — 8h registered            ││
│  │ Today 14:30  Aziz — Photo uploaded            ││
│  │ Yesterday    Piotr — 7.5h registered          ││
│  │ Mar 25       Quote signed by Erik Eriksson    ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

---

## Component Taxonomy

### Data Display

| Component | When to Use |
|-----------|------------|
| `DataTable` | Lists of projects, events, invoices. Sortable, filterable. |
| `KpiCard` | Dashboard summary numbers. Number + label + optional trend. |
| `Timeline` | Event feed on project detail. Chronological, grouped by day. |
| `EconomicsBar` | Quote vs actual with margin. Horizontal bar + numbers. |
| `StatusBadge` | Node state. Color-coded: draft=slate, active=blue, in_progress=amber, completed=green, cancelled=red. |

### AI Content

| Component | When to Use |
|-----------|------------|
| `AiInsightCard` | Anomaly alerts, suggestions. ALWAYS uses violet palette. |
| `AiProposalView` | Transient quote/invoice proposals. Edit-in-place before approval. Clearly marked as "AI Draft — Review before approving". |
| `AiSourceRef` | Inline reference to source data. Clickable, shows the event/node. |
| `AiTruncationNotice` | When context was truncated. Shows count of items not included. |

### Forms & Input

| Component | When to Use |
|-----------|------------|
| `QuoteBuilder` | Line-item editor for quotes. Add/remove/reorder rows. |
| `TimeInput` | Quick time registration. Number + project selector. |
| `PhotoUpload` | Drag-drop or camera capture. Auto-associates to project. |
| `NodeSelector` | Search + select for projects, customers, persons. |

### Communication

| Component | When to Use |
|-----------|------------|
| `MessageThread` | WhatsApp-style conversation view. Shows inbound/outbound. |
| `BroadcastPreview` | Preview of outgoing status update before send. |
| `FederationConsentView` | Full-page consent display for magic link flow. Shows projection contract in user's language. |

---

## AI Content Visual Rules

Per AXIOM-05 (Transparency over magic), ALL AI-generated content must be
visually distinguishable from human/system content:

1. **Background**: `bg-violet-50` (light violet)
2. **Border**: `border-violet-200` (left border or full border)
3. **Label**: Small text "AI-generated" or "AI suggestion" in `text-violet-600`
4. **Source references**: Every claim links to source data via `AiSourceRef`
5. **Truncation notice**: If AI context was truncated, `AiTruncationNotice` shown

---

## RTL Support

The system MUST support right-to-left text (Arabic). Implementation:

1. `dir="rtl"` on root element when user locale is Arabic
2. Tailwind RTL plugin for automatic margin/padding flipping
3. Font: Noto Sans Arabic loaded conditionally
4. PDF generation: RTL text rendering via @react-pdf/renderer

---

## Responsive Breakpoints

```
sm:   640px    — Phone landscape / small tablet
md:   768px    — Tablet portrait
lg:   1024px   — Tablet landscape / small desktop
xl:   1280px   — Desktop

Mobile-first: default styles are for phone.
```

---

## Interaction Patterns

### Quick Actions

Every screen should support the most common action in ≤ 2 taps/clicks:
- Dashboard → Create project (FAB on mobile, button on desktop)
- Project detail → Register time (inline input)
- Project detail → Upload photo (camera button)
- Quote → Send to customer (one click with confirmation)

### Loading States

- Skeleton loading for lists and cards (shimmer, not spinner)
- Optimistic updates for time registration (show immediately, reconcile)
- Progress indicator for AI generation (streaming text if possible)

### Empty States

Every list/view MUST have a helpful empty state:
- "No projects yet. Create your first project to get started."
- "No time registered this week. Your team's time reports will appear here."

### Error States

- Inline errors (red border + message below field)
- Toast notifications for background errors (integration failures)
- Full-page error for critical failures (database unavailable)
- Never show stack traces or technical errors to users

---

## PDF Document Templates

### Quote PDF Layout

```
┌──────────────────────────────────────┐
│  [Logo]     OFFERT / QUOTE           │
│  Company Name                        │
│  Address, Phone, Email               │
│─────────────────────────────────────│
│  Till / To:          Offert nr:      │
│  Customer Name       Q-2026-042      │
│  Customer Address    Datum: 2026-03  │
│─────────────────────────────────────│
│  Beskrivning   Antal  á-pris  Summa  │
│  ─────────────────────────────────── │
│  Spackling      85 m²  45 kr  3 825  │
│  Grundmålning   85 m²  55 kr  4 675  │
│  ...                                 │
│─────────────────────────────────────│
│  Summa material:          15 000 kr  │
│  Summa arbete:            30 000 kr  │
│  Moms 25%:                11 250 kr  │
│  TOTALT:                  56 250 kr  │
│                                      │
│  ROT-avdrag (30% av arbete):         │
│  -9 000 kr                           │
│                                      │
│  ATT BETALA:              47 250 kr  │
│─────────────────────────────────────│
│  Giltig t.o.m: 2026-04-25           │
│  Betalningsvillkor: 30 dagar        │
└──────────────────────────────────────┘
```

### Invoice PDF: Same structure + OCR line, bankgiro, payment reference.

---

## Accessibility

- WCAG 2.1 AA compliance target
- Keyboard navigation for all interactive elements
- Screen reader labels on all form inputs
- Color is never the only indicator (always paired with icon or text)
- Minimum contrast ratio 4.5:1 for text
