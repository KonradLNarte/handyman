"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@resonansia/db";
import { createEdge } from "@resonansia/core";
import { getTenantId } from "@/lib/supabase-server";

export async function assignPersonToProjectAction(
  personId: string,
  projectId: string,
  role: string
) {
  const tenantId = await getTenantId();
  const db = getDb();

  await createEdge(db, tenantId, {
    sourceId: personId,
    targetId: projectId,
    typeCode: "assigned_to",
    data: {
      role,
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function addCustomerToOrgAction(customerId: string) {
  const tenantId = await getTenantId();
  const db = getDb();

  // Get the org node (first org for this tenant)
  const { listNodes } = await import("@resonansia/core");
  const orgs = await listNodes(db, tenantId, "org");
  if (orgs.length === 0) {
    throw new Error("No organization found");
  }

  await createEdge(db, tenantId, {
    sourceId: customerId,
    targetId: orgs[0].id,
    typeCode: "customer_of",
    data: {
      since: new Date().toISOString().split("T")[0],
    },
  });

  revalidatePath("/dashboard");
}
