import { eq, and } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { events } from "@resonansia/db";
import { computeTotal } from "@resonansia/db";
import { generateId, eventDataAdjustmentSchema } from "@resonansia/shared";
import { getLabelId } from "../labels";

export interface CorrectionInput {
  qty?: number | null;
  unitPrice?: number | null;
  reason: string;
}

/**
 * Corrects an event by creating a new adjustment event.
 * Always follows ref_id to the root event.
 */
export async function correctEvent(
  db: PgDatabase<any>,
  tenantId: string,
  originalEventId: string,
  newValues: CorrectionInput
) {
  // Look up the original event
  const [original] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, originalEventId), eq(events.tenant_id, tenantId))
    );

  if (!original) {
    throw new Error("Original event not found");
  }

  // Follow ref_id to root if original is itself an adjustment
  let rootId = originalEventId;
  if (original.ref_id !== null) {
    rootId = original.ref_id;
  }

  // Get the root event to copy occurred_at
  let rootEvent = original;
  if (rootId !== originalEventId) {
    const [root] = await db
      .select()
      .from(events)
      .where(
        and(eq(events.id, rootId), eq(events.tenant_id, tenantId))
      );
    if (!root) {
      throw new Error("Root event not found");
    }
    rootEvent = root;
  }

  const adjustmentTypeId = await getLabelId(db, "event_type", "adjustment", tenantId);

  // Use new values or fall back to original
  const qty = newValues.qty ?? (original.qty ? parseFloat(original.qty) : null);
  const unitPrice =
    newValues.unitPrice ??
    (original.unit_price ? parseFloat(original.unit_price) : null);
  const total = computeTotal(qty, unitPrice);

  // Validate adjustment data
  const data = eventDataAdjustmentSchema.parse({ reason: newValues.reason });

  const id = generateId();

  const [correction] = await db
    .insert(events)
    .values({
      id,
      tenant_id: tenantId,
      node_id: rootEvent.node_id,
      ref_id: rootId,
      actor_id: rootEvent.actor_id,
      type_id: adjustmentTypeId,
      origin: "human",
      qty: qty !== null ? String(qty) : null,
      unit_id: rootEvent.unit_id,
      unit_price: unitPrice !== null ? String(unitPrice) : null,
      total: total !== null ? String(total) : null,
      data,
      occurred_at: rootEvent.occurred_at,
    })
    .returning();

  return correction;
}
