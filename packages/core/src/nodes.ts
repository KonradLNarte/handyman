import { eq, and, sql, ilike } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { nodes } from "@resonansia/db";
import { generateId, getNodeDataSchema } from "@resonansia/shared";
import { getLabelId, getLabelCode } from "./labels";
import { buildSearchText } from "./search";

export interface CreateNodeInput {
  typeCode: string;
  data: unknown;
  parentId?: string;
  key?: string;
  stateCode?: string;
}

export interface UpdateNodeInput {
  data?: unknown;
  stateCode?: string;
}

export interface NodeFilters {
  search?: string;
  stateCode?: string;
  limit?: number;
  offset?: number;
}

export async function createNode(
  db: PgDatabase<any>,
  tenantId: string,
  input: CreateNodeInput
) {
  const typeId = await getLabelId(db, "node_type", input.typeCode, tenantId);

  // Validate data against type-specific schema
  const schema = getNodeDataSchema(input.typeCode);
  const parsed = schema.parse(input.data);

  const id = generateId();
  const searchText = buildSearchText(input.typeCode, parsed);

  let stateId: number | null = null;
  if (input.stateCode) {
    stateId = await getLabelId(db, "node_state", input.stateCode, tenantId);
  }

  const [created] = await db
    .insert(nodes)
    .values({
      id,
      tenant_id: tenantId,
      parent_id: input.parentId ?? null,
      type_id: typeId,
      key: input.key ?? null,
      state_id: stateId,
      data: parsed,
      search_text: searchText,
    })
    .returning();

  return created;
}

export async function updateNode(
  db: PgDatabase<any>,
  tenantId: string,
  id: string,
  input: UpdateNodeInput
) {
  // Fetch existing node to get type
  const [existing] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, id), eq(nodes.tenant_id, tenantId)));

  if (!existing) {
    throw new Error("Node not found");
  }

  const { code: typeCode } = await getLabelCode(db, existing.type_id, tenantId);

  const updates: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (input.data !== undefined) {
    const schema = getNodeDataSchema(typeCode);
    const parsed = schema.parse(input.data);
    updates.data = parsed;
    updates.search_text = buildSearchText(typeCode, parsed);
  }

  if (input.stateCode !== undefined) {
    updates.state_id = await getLabelId(db, "node_state", input.stateCode, tenantId);
  }

  const [updated] = await db
    .update(nodes)
    .set(updates)
    .where(and(eq(nodes.id, id), eq(nodes.tenant_id, tenantId)))
    .returning();

  return updated;
}

export async function getNode(
  db: PgDatabase<any>,
  tenantId: string,
  id: string
) {
  const [node] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, id), eq(nodes.tenant_id, tenantId)));

  return node ?? null;
}

export async function listNodes(
  db: PgDatabase<any>,
  tenantId: string,
  typeCode: string,
  filters?: NodeFilters
) {
  const typeId = await getLabelId(db, "node_type", typeCode, tenantId);

  const conditions = [eq(nodes.tenant_id, tenantId), eq(nodes.type_id, typeId)];

  if (filters?.stateCode) {
    const stateId = await getLabelId(db, "node_state", filters.stateCode, tenantId);
    conditions.push(eq(nodes.state_id, stateId));
  }

  if (filters?.search) {
    conditions.push(
      sql`to_tsvector('simple', ${nodes.search_text}) @@ plainto_tsquery('simple', ${filters.search})`
    );
  }

  let query = db
    .select()
    .from(nodes)
    .where(and(...conditions))
    .orderBy(nodes.created_at);

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  return query;
}

/**
 * Soft delete: sets state to 'archived'.
 * NEVER physical delete.
 */
export async function deleteNode(
  db: PgDatabase<any>,
  tenantId: string,
  id: string
) {
  return updateNode(db, tenantId, id, { stateCode: "archived" });
}
