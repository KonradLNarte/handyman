export const AI_TIERS = {
  cheap: {
    provider: "openai" as const,
    model: "gpt-4o-mini",
    maxTokens: 1000,
  },
  medium: {
    provider: "anthropic" as const,
    model: "claude-haiku-4-5",
    maxTokens: 2000,
  },
  expensive: {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-5",
    maxTokens: 4000,
  },
} as const;

export type AiTier = keyof typeof AI_TIERS;
