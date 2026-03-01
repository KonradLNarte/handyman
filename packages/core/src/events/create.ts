import { eq, and, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { events } from "@resonansia/db";
import { computeTotal } from "@resonansia/db";
import { generateId, getEventDataSchema, type EventOrigin } from "@resonansia/shared";
import { getLabelId } from "../labels.js";

export interface CreateEventInput {
  nodeId: string;
  typeCode: string;
  data: unknown;
  qty?: number | null;
  unitCode?: string;
  unitPrice?: number | null;
  origin: EventOrigin;
  occurredAt: string | Date;
  actorId?: string | null;
  refId?: string | null;
}

export async function createEvent(
  db: PgDatabase<any>,
  tenantId: string,
  input: CreateEventInput
) {
  const typeId = await getLabelId(db, "event_type", input.typeCode, tenantId);

  // Validate data against type-specific schema
  const schema = getEventDataSchema(input.typeCode);
  const parsed = schema.parse(input.data);

  // Compute total deterministically
  const qty = input.qty ?? null;
  const unitPrice = input.unitPrice ?? null;
  const total = computeTotal(qty, unitPrice);

  let unitId: number | null = null;
  if (input.unitCode) {
    unitId = await getLabelId(db, "unit", input.unitCode, tenantId);
  }

  // If ref_id is set, validate it points to a ROOT event
  if (input.refId) {
    const [refEvent] = await db
      .select()
      .from(events)
      .where(
        and(eq(events.id, input.refId), eq(events.tenant_id, tenantId))
      );

    if (!refEvent) {
      throw new Error(`Referenced event not found: ${input.refId}`);
    }

    // ref_id must point to a root event (one with ref_id = null)
    if (refEvent.ref_id !== null) {
      throw new Error(
        `ref_id must point to a root event. Event ${input.refId} is itself a correction pointing to ${refEvent.ref_id}`
      );
    }
  }

  const id = generateId();
  const occurredAt =
    input.occurredAt instanceof Date
      ? input.occurredAt
      : new Date(input.occurredAt);

  const [created] = await db
    .insert(events)
    .values({
      id,
      tenant_id: tenantId,
      node_id: input.nodeId,
      ref_id: input.refId ?? null,
      actor_id: input.actorId ?? null,
      type_id: typeId,
      origin: input.origin,
      qty: qty !== null ? String(qty) : null,
      unit_id: unitId,
      unit_price: unitPrice !== null ? String(unitPrice) : null,
      total: total !== null ? String(total) : null,
      data: parsed,
      occurred_at: occurredAt,
    })
    .returning();

  return created;
}
