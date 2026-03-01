import { eq } from "drizzle-orm";
import { tenants } from "../schema/tenants";
import { nodes } from "../schema/nodes";
import { edges } from "../schema/edges";
import { events } from "../schema/events";
import { blobs } from "../schema/blobs";
import { dicts } from "../schema/dicts";

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
