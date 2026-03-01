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

// AI Quote Generation schemas

export const aiQuoteLineSchema = z.object({
  description: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().positive(),
  unitCode: z.string(), // 'hour', 'sqm', 'piece', etc.
  isLabor: z.boolean(),
  sortOrder: z.number().int(),
  catalogMatch: z.string().optional(), // product name AI thinks matches
});
export type AiQuoteLine = z.infer<typeof aiQuoteLineSchema>;

export const aiQuoteOutputSchema = z.object({
  lines: z.array(aiQuoteLineSchema).min(1),
  reasoning: z.string(), // AI explains its estimate (transparency)
});
export type AiQuoteOutput = z.infer<typeof aiQuoteOutputSchema>;

// Delivery Note OCR schemas

export const aiDeliveryNoteLineSchema = z.object({
  articleName: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().positive(),
  unit: z.string(),
  catalogMatch: z.string().optional(),
});
export type AiDeliveryNoteLine = z.infer<typeof aiDeliveryNoteLineSchema>;

export const aiDeliveryNoteSchema = z.object({
  lines: z.array(aiDeliveryNoteLineSchema),
  supplierName: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  date: z.string().optional(),
});
export type AiDeliveryNote = z.infer<typeof aiDeliveryNoteSchema>;
