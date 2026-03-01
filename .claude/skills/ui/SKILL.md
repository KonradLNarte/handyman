---
name: ui
description: >
  UI components, design system, layout patterns, dashboard, project detail,
  PDF generation, quote and invoice templates, RTL Arabic support,
  shadcn/ui, Tailwind CSS, color palette, typography, data tables,
  AI content visual rules, form patterns, responsive design.
---

# UI Skill

## Color Palette

```
Primary:     slate-900  (#0f172a)  — Headers, primary text
Secondary:   slate-500  (#64748b)  — Secondary text, labels
Accent:      blue-600   (#2563eb)  — Interactive elements, links, primary buttons
Success:     green-600  (#16a34a)  — Positive status, completed, profit
Warning:     amber-500  (#f59e0b)  — Deviations, attention needed
Danger:      red-600    (#dc2626)  — Errors, losses, critical alerts
Surface:     white      (#ffffff)  — Card backgrounds
Background:  slate-50   (#f8fafc)  — Page background
Border:      slate-200  (#e2e8f0)  — Dividers, card borders
AI Insight:  violet-50 bg + violet-700 text + violet-200 border
```

## Typography

```
Font:          Inter (fallback: -apple-system, sans-serif)
Arabic:        Noto Sans Arabic (loaded conditionally)

Page title:    text-2xl (24px) font-semibold
Section head:  text-lg  (18px) font-medium
Body:          text-sm  (14px) font-normal
Caption:       text-xs  (12px) font-normal text-slate-500
Data cell:     text-sm  (14px) font-mono (numbers)

Numbers: ALWAYS right-aligned, monospace, locale-formatted
Swedish: "45 000,00 kr" (space thousands, comma decimal)
```

## Layout — Dashboard Desktop

```
┌──────────────────────────────────────────────────┐
│  Logo    [Search]              [User] [Tenant]   │
├────────┬─────────────────────────────────────────┤
│  Nav   │  KPI Cards (Active Proj, Revenue,       │
│        │  Uninvoiced, AI Alerts)                  │
│ Proj.  │                                         │
│ Custom.│  Project List (DataTable, sortable)      │
│ People │                                         │
│ Quotes │  AI Insights (violet border)             │
│ Invoic.│                                         │
└────────┴─────────────────────────────────────────┘
```

## Layout — Dashboard Mobile

```
┌──────────────────────┐
│  ☰  Resonansia  [👤] │
├──────────────────────┤
│  KPI Cards (2x2)     │
│  Project List (cards)│
│  [+ New Project]     │
└──────────────────────┘
```

## Layout — Project Detail

```
┌──────────────────────────────────────────────────┐
│  ← Projects    Project Name           [Actions]  │
├──────────────────────────────────────────────────┤
│  Status: In Progress (Day 3/5)                   │
│  Economics: Quote | Actual | Margin (bar + nums) │
│  Tabs: Timeline | Photos | People | Quotes | Inv │
│  Event feed (chronological, grouped by day)      │
└──────────────────────────────────────────────────┘
```

## Component Taxonomy

### Data Display
- `DataTable` — Lists (projects, events, invoices). Sortable, filterable.
- `KpiCard` — Summary numbers. Number + label + optional trend.
- `Timeline` — Event feed. Chronological, grouped by day.
- `EconomicsBar` — Quote vs actual with margin. Bar + numbers.
- `StatusBadge` — Color: draft=slate, active=blue, in_progress=amber, completed=green, cancelled=red.

### AI Content
- `AiInsightCard` — Anomaly alerts. ALWAYS violet palette.
- `AiProposalView` — Transient quote/invoice proposals. "AI Draft — Review before approving".
- `AiSourceRef` — Inline clickable reference to source data.
- `AiTruncationNotice` — Shows count of items not included.

### Forms & Input
- `QuoteBuilder` — Line-item editor. Add/remove/reorder rows.
- `TimeInput` — Quick time reg. Number + project selector.
- `PhotoUpload` — Drag-drop or camera. Auto-associates to project.
- `NodeSelector` — Search + select for projects, customers, persons.

### Communication
- `MessageThread` — WhatsApp-style conversation view.
- `BroadcastPreview` — Preview outgoing status update.
- `FederationConsentView` — Full-page consent for magic link.

## AI Content Visual Rules

ALL AI-generated content MUST be visually distinct:

1. Background: `bg-violet-50`
2. Border: `border-violet-200` (left or full)
3. Label: "AI-generated" / "AI suggestion" in `text-violet-600`
4. Source references via `AiSourceRef` for every claim
5. Truncation notice via `AiTruncationNotice` if context was limited

## RTL Support

1. `dir="rtl"` on root element when locale is Arabic
2. Tailwind RTL plugin for margin/padding flipping
3. Font: Noto Sans Arabic loaded conditionally
4. PDF: RTL text rendering via @react-pdf/renderer

## PDF Layout — Quote

```
┌──────────────────────────────────────┐
│  [Logo]     OFFERT / QUOTE           │
│  Company Name, Address, Contact      │
│──────────────────────────────────────│
│  To: Customer    Offert nr: Q-2026-X │
│──────────────────────────────────────│
│  Beskrivning  Antal  á-pris  Summa   │
│  Line items...                       │
│──────────────────────────────────────│
│  Summa material:        XX XXX kr    │
│  Summa arbete:          XX XXX kr    │
│  Moms 25%:              XX XXX kr    │
│  TOTALT:                XX XXX kr    │
│  ROT-avdrag:           -XX XXX kr    │
│  ATT BETALA:            XX XXX kr    │
│──────────────────────────────────────│
│  Giltig t.o.m / Betalningsvillkor    │
└──────────────────────────────────────┘
```

## Next.js Architecture Rules

- **RSC** for all data fetching — call Drizzle directly, no fetch() to own API
- **Server Actions** for all mutations — validate with Zod, call Drizzle, revalidate
- **Route Handlers** ONLY for: external webhooks, PDF endpoints, cron jobs
- **Client Components** ONLY for: interactive UI, realtime subscriptions, browser APIs

## Anti-Patterns

- **NEVER fetch() own API from Client Component** — receive data as props from RSC
- **NEVER Route Handler for internal data fetching** — use RSC
- **NEVER show AI content without violet visual distinction** — always bg-violet-50 + label
- **NEVER use color alone as indicator** — pair with icon or text (WCAG 2.1 AA)

See `docs/design-system.md` for full design specification.
