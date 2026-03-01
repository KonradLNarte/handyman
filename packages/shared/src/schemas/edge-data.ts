import { z } from "zod";

export const edgeDataMemberOfSchema = z.object({
  role: z.string().nullable(),
  start_date: z.string().nullable(),
});
export type EdgeDataMemberOf = z.infer<typeof edgeDataMemberOfSchema>;

export const edgeDataAssignedToSchema = z.object({
  role: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});
export type EdgeDataAssignedTo = z.infer<typeof edgeDataAssignedToSchema>;

export const edgeDataSubcontractorOfSchema = z.object({
  contract_ref: z.string().nullable(),
  rate: z.number().nullable(),
  currency_id: z.number().int().nullable(),
});
export type EdgeDataSubcontractorOf = z.infer<typeof edgeDataSubcontractorOfSchema>;

export const edgeDataCustomerOfSchema = z.object({
  since: z.string().nullable(),
});
export type EdgeDataCustomerOf = z.infer<typeof edgeDataCustomerOfSchema>;

export const edgeDataLocatedAtSchema = z.object({});
export type EdgeDataLocatedAt = z.infer<typeof edgeDataLocatedAtSchema>;

export const edgeDataSupplierOfSchema = z.object({
  account_number: z.string().nullable(),
});
export type EdgeDataSupplierOf = z.infer<typeof edgeDataSupplierOfSchema>;

export const edgeDataUsesProductSchema = z.object({
  estimated_qty: z.number().nullable(),
  unit_id: z.number().int().nullable(),
});
export type EdgeDataUsesProduct = z.infer<typeof edgeDataUsesProductSchema>;
