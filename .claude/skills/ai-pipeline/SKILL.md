---
name: ai-pipeline
description: >
  AI capabilities, LLM model tiers, classification, quote generation,
  anomaly detection, context protocol, token budgets, prompt engineering,
  translation, OCR, document understanding, insight generation,
  scope similarity, blind spot prevention.
---

# AI Pipeline Skill

## AI Capabilities & Model Tiers

| Capability | Tier | Model | Max Tokens | Latency |
|-----------|------|-------|------------|---------|
| `classify_message` | CHEAP | gpt-4o-mini | 1000 | < 2s |
| `translate` | CHEAP/MEDIUM | gpt-4o-mini | 1000 | < 2s |
| `summarize` | CHEAP | gpt-4o-mini | 1000 | < 2s |
| `evaluate_scope_similarity` | CHEAP | gpt-4o-mini | 1000 | < 2s |
| `understand_document` (OCR) | MEDIUM | claude-haiku-4-5 | 2000 | < 5s |
| `detect_anomaly` | MEDIUM | claude-haiku-4-5 | 2000 | < 5s |
| `generate_quote` | EXPENSIVE | claude-sonnet-4-5 | 4000 | < 10s |
| `answer_question` | EXPENSIVE | claude-sonnet-4-5 | 4000 | < 10s |

Config:

```typescript
export const AI_TIERS = {
  cheap:     { provider: 'openai',    model: 'gpt-4o-mini',      maxTokens: 1000 },
  medium:    { provider: 'anthropic', model: 'claude-haiku-4-5',  maxTokens: 2000 },
  expensive: { provider: 'anthropic', model: 'claude-sonnet-4-5', maxTokens: 4000 },
} as const;
```

## Context Protocol (5 Levels)

| Level | Name | Budget | When Included |
|-------|------|--------|---------------|
| 0 | Platform | ~100 tokens | Always |
| 1 | Tenant | ~50 tokens | Always |
| 2 | Project | ~200 tokens | Project-related queries |
| 3 | Detail | ~2000 tokens | Detailed queries |
| 4 | History | ~500 tokens | Comparison/analysis |

Context is built hierarchically: focal entity → directly related → 2 hops → summary.

## Dynamic Resolution Degradation

When requested scope exceeds Level 2 budget (e.g., > 10 projects):

1. Degrade to Level 1.5 (topline metrics only: ID, State, Margin)
2. Or truncate to Top-N sorted by recent activity
3. MUST explicitly tell the AI: `"[Context truncated to Top 5 active projects. 15 additional active projects not included.]"`

## Truncation Transparency

If context is truncated, the AI response MUST disclose:
> "This summary covers your 5 most recently active projects. You have 15 additional active projects not included."

The user MUST never receive a partial answer that appears complete.

## Anomaly Shield

### Phase 1 (tenant has < 100 events of this type)
- Use **platform-wide** reference statistics per event_type and industry
- Flag if value > 5x platform median

### Phase 2 (tenant has ≥ 100 events of this type)
- Use **tenant-specific** statistics
- Flag if value > 3x standard deviation from tenant mean

In both phases:
- Flagged events are **NOT excluded silently**
- Annotated in AI prompt: `"(⚠ Event {id}: qty={value} is {N}x above reference. Possible data error.)"`
- AI MUST mention the anomaly in its response

## Blind Spot Prevention

Anomaly detector MUST evaluate actuals against BOTH:
- A: The project's approved quote (merged quote lines)
- B: Platform/tenant historical data for semantically similar projects

Deviation from B flags an anomaly on the **quote itself** (retroactive AI estimation error detection).

## Scope Similarity

When comparing against historical data:
1. AI evaluates semantic similarity (sqm, room count, surface types, duration)
2. Similarity score + justification included in reports
3. Minimum 3 similar projects required for baseline
4. If < 3: fail open, state "Insufficient historical data"
5. Justify scope match: "Compared against 4 past interior painting projects of 80-90 sqm."

## Token Counting

```typescript
import { countTokens } from '@anthropic-ai/tokenizer';
const count = countTokens(text);
```

**MUST use `@anthropic-ai/tokenizer`** for Anthropic models. NEVER estimate via `string.length / 4`.

## Anti-Patterns

- **AI NEVER does arithmetic** — returns qty + unit_price only, system computes total
- **NEVER silently exclude anomalies** — always annotate and disclose
- **NEVER present partial answer as complete** — always show truncation notice
- **NEVER estimate tokens** — use the tokenizer library
- **NEVER hardcode model names** — use the AI_TIERS config

See `docs/resonansia-spec.md` section 5 for full AI behavioral contracts.
