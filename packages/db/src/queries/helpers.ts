import { eq } from "drizzle-orm";
import { tenants } from "../schema/tenants.js";
import { nodes } from "../schema/nodes.js";
import { edges } from "../schema/edges.js";
import { events } from "../schema/events.js";
import { blobs } from "../schema/blobs.js";
import { dicts } from "../schema/dicts.js";

/**
 * Returns a Drizzle where clause for tenant_id filtering.
 */
export function withTenant(tenantId: string) {
  return {
    nodes: eq(nodes.tenant_id, tenantId),
    edges: eq(edges.tenant_id, tenantId),
    events: eq(events.tenant_id, tenantId),
    blobs: eq(blobs.tenant_id, tenantId),
    tenants: eq(tenants.id, tenantId),
  };
}

/**
 * Deterministic total computation.
 * Returns qty * unitPrice, or null if either is null.
 * This is the ONLY function that computes event totals.
 */
export function computeTotal(
  qty: number | null,
  unitPrice: number | null
): number | null {
  if (qty === null || qty === undefined || unitPrice === null || unitPrice === undefined) {
    return null;
  }
  return qty * unitPrice;
}
