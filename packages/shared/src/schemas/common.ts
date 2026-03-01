import { z } from "zod";

export const addressSchema = z.object({
  street: z.string(),
  street2: z.string().nullable(),
  postal_code: z.string(),
  city: z.string(),
  country: z.string(), // ISO 3166-1 alpha-2
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type Address = z.infer<typeof addressSchema>;

export const contactInfoSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable(), // E.164
  website: z.string().url().nullable(),
});
export type ContactInfo = z.infer<typeof contactInfoSchema>;

export const moneyAmountSchema = z.object({
  amount: z.number(), // minor units (öre/cent)
  currency_id: z.number().int(), // label ref (domain = currency)
});
export type MoneyAmount = z.infer<typeof moneyAmountSchema>;

export const dateRangeSchema = z.object({
  start_date: z.string(), // ISO 8601 date
  end_date: z.string().nullable(),
});
export type DateRange = z.infer<typeof dateRangeSchema>;

export const localeSchema = z.object({
  language: z.string(), // ISO 639-1
  region: z.string().nullable(), // ISO 3166-1 alpha-2
});
export type Locale = z.infer<typeof localeSchema>;
