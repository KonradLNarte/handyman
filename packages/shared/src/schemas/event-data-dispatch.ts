import { z, type ZodSchema } from "zod";
import {
  eventDataTimeSchema,
  eventDataMaterialSchema,
  eventDataPhotoSchema,
  eventDataMessageSchema,
  eventDataQuoteLineSchema,
  eventDataInvoiceLineSchema,
  eventDataAdjustmentSchema,
  eventDataStateChangeSchema,
  eventDataPaymentSchema,
  eventDataNoteSchema,
} from "./event-data";

const schemaMap: Record<string, ZodSchema> = {
  time: eventDataTimeSchema,
  material: eventDataMaterialSchema,
  photo: eventDataPhotoSchema,
  message: eventDataMessageSchema,
  quote_line: eventDataQuoteLineSchema,
  invoice_line: eventDataInvoiceLineSchema,
  adjustment: eventDataAdjustmentSchema,
  state_change: eventDataStateChangeSchema,
  payment: eventDataPaymentSchema,
  note: eventDataNoteSchema,
};

/**
 * Given an event_type code string, returns the correct Zod schema
 * for validating event.data.
 */
export function getEventDataSchema(typeCode: string): ZodSchema {
  return schemaMap[typeCode] ?? z.record(z.unknown());
}
