import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { nodes, edges, tenants } from "@resonansia/db";
import { normalizePhoneNumber } from "@resonansia/shared";
import { getLabelId, getLabelCode } from "../labels";

export interface ResolvedSender {
  person: typeof nodes.$inferSelect | null;
  tenant: typeof tenants.$inferSelect | null;
  language: string;
  activeProject: typeof nodes.$inferSelect | null;
}

/**
 * Resolves a sender from a phone number.
 * 1. Normalizes the phone number
 * 2. Searches person nodes where data->'contact'->>'phone' matches
 * 3. Loads the person's tenant
 * 4. Determines language (default 'sv')
 * 5. Finds the active project (via assigned_to edges)
 */
export async function resolveSender(
  db: PgDatabase<any>,
  phoneNumber: string
): Promise<ResolvedSender> {
  const nullResult: ResolvedSender = {
    person: null,
    tenant: null,
    language: "sv",
    activeProject: null,
  };

  let normalized: string;
  try {
    normalized = normalizePhoneNumber(phoneNumber);
  } catch {
    return nullResult;
  }

  // Find person nodes where data->'contact'->>'phone' matches
  const personTypeId = await getLabelIdSafe(db, "node_type", "person");
  if (personTypeId === null) return nullResult;

  const persons = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.type_id, personTypeId),
        sql`${nodes.data}->'contact'->>'phone' = ${normalized}`
      )
    );

  if (persons.length === 0) {
    return nullResult;
  }

  // Pick the first person found (cross-tenant: may exist in multiple tenants)
  // If they have assigned_to edges, prefer the tenant where they are active workers
  const person = persons[0];
  const tenantId = person.tenant_id;

  // Load the tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  // Determine language
  const personData = person.data as Record<string, unknown>;
  const language = (personData.language as string) || "sv";

  // Find active project via assigned_to edges (person → project)
  const assignedToTypeId = await getLabelId(db, "edge_type", "assigned_to", tenantId);

  const outgoingEdges = await db
    .select()
    .from(edges)
    .where(
      and(
        eq(edges.tenant_id, tenantId),
        eq(edges.source_id, person.id),
        eq(edges.type_id, assignedToTypeId)
      )
    );

  if (outgoingEdges.length === 0) {
    return { person, tenant: tenant ?? null, language, activeProject: null };
  }

  // Load the target project nodes and filter to active/in_progress
  const projectTypeId = await getLabelId(db, "node_type", "project", tenantId);
  const activeStates = await getActiveStateIds(db, tenantId);

  const projectIds = outgoingEdges.map((e) => e.target_id);
  const projectNodes: (typeof nodes.$inferSelect)[] = [];

  for (const pid of projectIds) {
    const [proj] = await db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.id, pid),
          eq(nodes.tenant_id, tenantId),
          eq(nodes.type_id, projectTypeId)
        )
      );
    if (proj && activeStates.includes(proj.state_id as number)) {
      projectNodes.push(proj);
    }
  }

  let activeProject: typeof nodes.$inferSelect | null = null;
  if (projectNodes.length === 1) {
    activeProject = projectNodes[0];
  } else if (projectNodes.length > 1) {
    // Multiple active projects — pick most recently updated
    activeProject = projectNodes.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
  }

  return { person, tenant: tenant ?? null, language, activeProject };
}

/**
 * Resolves sender and returns all active projects for disambiguation.
 * Used when a person might be on multiple active projects.
 */
export async function resolveSenderWithProjects(
  db: PgDatabase<any>,
  phoneNumber: string
): Promise<ResolvedSender & { activeProjects: (typeof nodes.$inferSelect)[] }> {
  const base = await resolveSender(db, phoneNumber);
  if (!base.person || !base.tenant) {
    return { ...base, activeProjects: [] };
  }

  const tenantId = base.tenant.id;
  const assignedToTypeId = await getLabelId(db, "edge_type", "assigned_to", tenantId);
  const projectTypeId = await getLabelId(db, "node_type", "project", tenantId);
  const activeStates = await getActiveStateIds(db, tenantId);

  const outgoingEdges = await db
    .select()
    .from(edges)
    .where(
      and(
        eq(edges.tenant_id, tenantId),
        eq(edges.source_id, base.person.id),
        eq(edges.type_id, assignedToTypeId)
      )
    );

  const activeProjects: (typeof nodes.$inferSelect)[] = [];
  for (const edge of outgoingEdges) {
    const [proj] = await db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.id, edge.target_id),
          eq(nodes.tenant_id, tenantId),
          eq(nodes.type_id, projectTypeId)
        )
      );
    if (proj && activeStates.includes(proj.state_id as number)) {
      activeProjects.push(proj);
    }
  }

  return { ...base, activeProjects };
}

async function getLabelIdSafe(
  db: PgDatabase<any>,
  domain: string,
  code: string
): Promise<number | null> {
  try {
    return await getLabelId(db, domain, code);
  } catch {
    return null;
  }
}

async function getActiveStateIds(
  db: PgDatabase<any>,
  tenantId: string
): Promise<number[]> {
  const ids: number[] = [];
  for (const code of ["active", "in_progress"]) {
    try {
      ids.push(await getLabelId(db, "node_state", code, tenantId));
    } catch {
      // State label might not exist
    }
  }
  return ids;
}
