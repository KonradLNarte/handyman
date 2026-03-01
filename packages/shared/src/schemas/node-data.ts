import { z } from "zod";
import { addressSchema, contactInfoSchema, dateRangeSchema } from "./common.js";

export const nodeDataOrgSchema = z.object({
  name: z.string().min(1),
  org_number: z.string().nullable(),
  address: addressSchema.nullable(),
  contact: contactInfoSchema,
  logo_url: z.string().url().nullable(),
  industry: z.string().nullable(),
  default_currency_id: z.number().int(),
  default_locale_id: z.number().int(),
  vat_number: z.string().nullable(),
  bankgiro: z.string().nullable(),
  plusgiro: z.string().nullable(),
  payment_terms_days: z.number().int().default(30),
});
export type NodeDataOrg = z.infer<typeof nodeDataOrgSchema>;

export const nodeDataPersonSchema = z.object({
  name: z.string().min(1),
  contact: contactInfoSchema,
  language: z.string(), // ISO 639-1
  role: z.string().nullable(),
  hourly_rate: z.number().nullable(),
  avatar_url: z.string().url().nullable(),
});
export type NodeDataPerson = z.infer<typeof nodeDataPersonSchema>;

export const nodeDataCustomerSchema = z.object({
  name: z.string().min(1),
  address: addressSchema.nullable(),
  contact: contactInfoSchema,
  org_number: z.string().nullable(),
  is_company: z.boolean(),
  preferred_channel: z.enum(["email", "sms", "whatsapp"]),
  rot_rut_person_number: z.string().nullable(),
});
export type NodeDataCustomer = z.infer<typeof nodeDataCustomerSchema>;

export const nodeDataProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  address: addressSchema.nullable(),
  dates: dateRangeSchema.nullable(),
  rot_applicable: z.boolean().default(false),
  rut_applicable: z.boolean().default(false),
  estimated_hours: z.number().nullable(),
  notes: z.string().nullable(),
});
export type NodeDataProject = z.infer<typeof nodeDataProjectSchema>;

export const nodeDataProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable(),
  unit_id: z.number().int(), // label ref (domain = unit)
  default_price: z.number().nullable(),
  coverage_sqm: z.number().nullable(),
  supplier_id: z.string().uuid().nullable(),
  barcode: z.string().nullable(),
});
export type NodeDataProduct = z.infer<typeof nodeDataProductSchema>;

export const nodeDataLocationSchema = z.object({
  name: z.string().min(1),
  address: addressSchema,
});
export type NodeDataLocation = z.infer<typeof nodeDataLocationSchema>;

export const nodeDataSupplierSchema = z.object({
  name: z.string().min(1),
  org_number: z.string().nullable(),
  contact: contactInfoSchema,
  account_number: z.string().nullable(),
});
export type NodeDataSupplier = z.infer<typeof nodeDataSupplierSchema>;
