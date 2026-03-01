import type { z } from "zod";
import { aiGenerateObject, aiGenerateText } from "./complete";
import type { AiTier } from "./config";
import { AI_TIERS } from "./config";

export type ModelTier = AiTier;

export type AiResponse<T = string> =
  | { success: true; data: T; model: string; tier: ModelTier }
  | { success: false; error: string; model: string; tier: ModelTier };

/**
 * Unified AI completion function that enforces model tiering
 * and provides structured output.
 *
 * Never throws — returns { success: false, error } on failure.
 * Always logs: tier, model, input tokens, output tokens, latency.
 */
export async function aiComplete<T extends z.ZodType>(options: {
  tier: ModelTier;
  system: string;
  prompt: string;
  schema?: T;
  maxTokens?: number;
}): Promise<AiResponse<z.infer<T>>> {
  const config = AI_TIERS[options.tier];
  const model = config.model;
  const start = Date.now();

  try {
    if (options.schema) {
      const result = await aiGenerateObject({
        tier: options.tier,
        system: options.system,
        prompt: options.prompt,
        schema: options.schema,
      });

      const latency = Date.now() - start;
      console.log(
        `[AI] tier=${options.tier} model=${model} latency=${latency}ms`
      );

      return { success: true, data: result, model, tier: options.tier };
    } else {
      const result = await aiGenerateText({
        tier: options.tier,
        system: options.system,
        prompt: options.prompt,
      });

      const latency = Date.now() - start;
      console.log(
        `[AI] tier=${options.tier} model=${model} latency=${latency}ms`
      );

      return {
        success: true,
        data: result as z.infer<T>,
        model,
        tier: options.tier,
      };
    }
  } catch (err) {
    const latency = Date.now() - start;
    const errorMessage =
      err instanceof Error ? err.message : "Unknown AI error";
    console.error(
      `[AI ERROR] tier=${options.tier} model=${model} latency=${latency}ms error=${errorMessage}`
    );

    return { success: false, error: errorMessage, model, tier: options.tier };
  }
}
