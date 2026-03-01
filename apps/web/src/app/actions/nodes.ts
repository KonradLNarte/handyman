"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@resonansia/db";
import { createNode, updateNode, createEvent } from "@resonansia/core";
import { nodeDataProjectSchema, nodeDataCustomerSchema } from "@resonansia/shared";
import { getTenantId } from "@/lib/supabase-server";

const createProjectSchema = z.object({
  name: z.string().min(1, "Projektnamn krävs"),
  description: z.string().optional().default(""),
  street: z.string().optional().default(""),
  city: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  rot_applicable: z.string().optional(),
  rut_applicable: z.string().optional(),
});

export async function createProjectAction(formData: FormData) {
  const tenantId = await getTenantId();
  const db = getDb();

  const raw = Object.fromEntries(formData.entries());
  const input = createProjectSchema.parse(raw);

  const address =
    input.street || input.city
      ? {
          street: input.street || "",
          street2: null,
          postal_code: input.postal_code || "",
          city: input.city || "",
          country: "SE",
          lat: null,
          lng: null,
        }
      : null;

  const node = await createNode(db, tenantId, {
    typeCode: "project",
    stateCode: "draft",
    data: {
      name: input.name,
      description: input.description || null,
      address,
      dates: null,
      rot_applicable: input.rot_applicable === "on",
      rut_applicable: input.rut_applicable === "on",
      estimated_hours: null,
      notes: null,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${node.id}`);
}

const createCustomerSchema = z.object({
  name: z.string().min(1, "Kundnamn krävs"),
  email: z.string().email().optional().default(""),
  phone: z.string().optional().default(""),
  is_company: z.string().optional(),
});

export async function createCustomerAction(formData: FormData) {
  const tenantId = await getTenantId();
  const db = getDb();

  const raw = Object.fromEntries(formData.entries());
  const input = createCustomerSchema.parse(raw);

  await createNode(db, tenantId, {
    typeCode: "customer",
    stateCode: "active",
    data: {
      name: input.name,
      address: null,
      contact: {
        email: input.email || null,
        phone: input.phone || null,
        website: null,
      },
      org_number: null,
      is_company: input.is_company === "on",
      preferred_channel: "email",
      rot_rut_person_number: null,
    },
  });

  revalidatePath("/dashboard");
}

export async function updateNodeAction(
  id: string,
  formData: FormData
) {
  const tenantId = await getTenantId();
  const db = getDb();

  const data = Object.fromEntries(formData.entries());
  await updateNode(db, tenantId, id, { data });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

export async function changeNodeStateAction(id: string, newState: string) {
  const tenantId = await getTenantId();
  const db = getDb();

  await updateNode(db, tenantId, id, { stateCode: newState });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}
