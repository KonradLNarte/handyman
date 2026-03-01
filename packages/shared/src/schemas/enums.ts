import { z } from "zod";

export const tenantStatusSchema = z.enum(["active", "suspended", "deleted"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const federationStatusSchema = z.enum(["pending", "accepted", "rejected", "revoked"]);
export type FederationStatus = z.infer<typeof federationStatusSchema>;

export const federationStatusValues = {
  pending: 0,
  accepted: 1,
  rejected: -1,
  revoked: -2,
} as const;

export const projectionScopeSchema = z.enum([
  "subcontractor_default",
  "client_default",
  "supplier_default",
]);
export type ProjectionScope = z.infer<typeof projectionScopeSchema>;

export const eventOriginSchema = z.enum([
  "human",
  "ai_generated",
  "system",
  "external_api",
]);
export type EventOrigin = z.infer<typeof eventOriginSchema>;
