import { z } from "zod";

export const eventDataTimeSchema = z.object({
  break_minutes: z.number().int().nullable(),
  note: z.string().nullable(),
});
export type EventDataTime = z.infer<typeof eventDataTimeSchema>;

export const eventDataMaterialSchema = z.object({
  description: z.string().nullable(),
  delivery_note_ref: z.string().nullable(),
});
export type EventDataMaterial = z.infer<typeof eventDataMaterialSchema>;

export const eventDataPhotoSchema = z.object({
  url: z.string(),
  caption: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
});
export type EventDataPhoto = z.infer<typeof eventDataPhotoSchema>;

export const eventDataMessageSchema = z.object({
  text: z.string(),
  channel: z.enum(["whatsapp", "sms", "email", "app"]),
  direction: z.enum(["inbound", "outbound"]),
  external_id: z.string().nullable(),
});
export type EventDataMessage = z.infer<typeof eventDataMessageSchema>;

export const eventDataQuoteLineSchema = z.object({
  description: z.string(),
  is_labor: z.boolean(),
  vat_rate: z.number(),
  sort_order: z.number().int(),
});
export type EventDataQuoteLine = z.infer<typeof eventDataQuoteLineSchema>;

export const eventDataInvoiceLineSchema = z.object({
  description: z.string(),
  is_labor: z.boolean(),
  vat_rate: z.number(),
  sort_order: z.number().int(),
  quote_line_ref: z.string().uuid().nullable(),
});
export type EventDataInvoiceLine = z.infer<typeof eventDataInvoiceLineSchema>;

export const eventDataAdjustmentSchema = z.object({
  reason: z.string(),
});
export type EventDataAdjustment = z.infer<typeof eventDataAdjustmentSchema>;

export const eventDataStateChangeSchema = z.object({
  from_state: z.string(),
  to_state: z.string(),
  trigger: z.enum(["human", "system", "customer_signing"]),
});
export type EventDataStateChange = z.infer<typeof eventDataStateChangeSchema>;

export const eventDataPaymentSchema = z.object({
  method: z.enum(["invoice", "swish", "bankgiro", "card"]),
  reference: z.string().nullable(),
});
export type EventDataPayment = z.infer<typeof eventDataPaymentSchema>;

export const eventDataNoteSchema = z.object({
  text: z.string(),
});
export type EventDataNote = z.infer<typeof eventDataNoteSchema>;
