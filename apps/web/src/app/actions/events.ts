"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@resonansia/db";
import { createEvent, correctEvent } from "@resonansia/core";
import { getTenantId } from "@/lib/supabase-server";

const registerTimeSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().min(1, "Datum krävs"),
  hours: z.coerce.number().positive("Timmar måste vara positivt"),
  hourlyRate: z.coerce.number().positive("Timpris krävs"),
  note: z.string().optional().default(""),
});

export async function registerTimeAction(formData: FormData) {
  const tenantId = await getTenantId();
  const db = getDb();

  const raw = Object.fromEntries(formData.entries());
  const input = registerTimeSchema.parse(raw);

  await createEvent(db, tenantId, {
    nodeId: input.projectId,
    typeCode: "time",
    data: {
      break_minutes: null,
      note: input.note || null,
    },
    qty: input.hours,
    unitCode: "hour",
    unitPrice: input.hourlyRate,
    origin: "human",
    occurredAt: new Date(input.date),
  });

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

const registerMaterialSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().min(1, "Datum krävs"),
  qty: z.coerce.number().positive("Antal måste vara positivt"),
  unitPrice: z.coerce.number().positive("Pris krävs"),
  unit: z.string().min(1),
  description: z.string().optional().default(""),
});

export async function registerMaterialAction(formData: FormData) {
  const tenantId = await getTenantId();
  const db = getDb();

  const raw = Object.fromEntries(formData.entries());
  const input = registerMaterialSchema.parse(raw);

  await createEvent(db, tenantId, {
    nodeId: input.projectId,
    typeCode: "material",
    data: {
      description: input.description || null,
      delivery_note_ref: null,
    },
    qty: input.qty,
    unitCode: input.unit,
    unitPrice: input.unitPrice,
    origin: "human",
    occurredAt: new Date(input.date),
  });

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}

const correctEventSchema = z.object({
  eventId: z.string().uuid(),
  projectId: z.string().uuid(),
  qty: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  reason: z.string().min(1, "Orsak krävs"),
});

export async function correctEventAction(formData: FormData) {
  const tenantId = await getTenantId();
  const db = getDb();

  const raw = Object.fromEntries(formData.entries());
  const input = correctEventSchema.parse(raw);

  await correctEvent(db, tenantId, input.eventId, {
    qty: input.qty ?? null,
    unitPrice: input.unitPrice ?? null,
    reason: input.reason,
  });

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/dashboard");
}
