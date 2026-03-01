import { z } from "zod";

export const messageIntentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("time_report"),
    hours: z.number().positive().max(24),
  }),
  z.object({
    type: z.literal("correction"),
    hours: z.number().positive().max(24),
    originalText: z.string().optional(),
  }),
  z.object({
    type: z.literal("photo"),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("status_question"),
    question: z.string(),
  }),
  z.object({
    type: z.literal("confirmation"),
  }),
  z.object({
    type: z.literal("completion"),
    status: z.string(),
  }),
  z.object({
    type: z.literal("other"),
    text: z.string(),
  }),
]);

export type MessageIntent = z.infer<typeof messageIntentSchema>;
