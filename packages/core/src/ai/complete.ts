import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { z } from "zod";
import { AI_TIERS, type AiTier } from "./config";

/**
 * Unified AI completion function that routes to the correct provider/model
 * based on the tier. Uses Vercel AI SDK's generateObject for structured output
 * and generateText for freeform text.
 */
export async function aiGenerateObject<T extends z.ZodType>(input: {
  tier: AiTier;
  system: string;
  prompt: string;
  schema: T;
  schemaName?: string;
}): Promise<z.infer<T>> {
  const config = AI_TIERS[input.tier];
  const model = getModel(config.provider, config.model);

  const result = await generateObject({
    model,
    system: input.system,
    prompt: input.prompt,
    schema: input.schema,
    schemaName: input.schemaName,
    maxTokens: config.maxTokens,
  });

  return result.object;
}

export async function aiGenerateText(input: {
  tier: AiTier;
  system: string;
  prompt: string;
}): Promise<string> {
  const config = AI_TIERS[input.tier];
  const model = getModel(config.provider, config.model);

  const result = await generateText({
    model,
    system: input.system,
    prompt: input.prompt,
    maxTokens: config.maxTokens,
  });

  return result.text;
}

function getModel(provider: "openai" | "anthropic", modelId: string) {
  if (provider === "openai") {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    return openai(modelId);
  }
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic(modelId);
}
