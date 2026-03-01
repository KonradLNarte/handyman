import { eq, and, or } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { edges, nodes } from "@resonansia/db";
import { generateId, getEdgeDataSchema } from "@resonansia/shared";
import { getLabelId, getLabelCode } from "./labels.js";

export interface CreateEdgeInput {
  sourceId: string;
  targetId: string;
  typeCode: string;
  data?: unknown;
}

export async function createEdge(
  db: PgDatabase<any>,
  tenantId: string,
  input: CreateEdgeInput
) {
  // Validate source exists and belongs to same tenant
  const [source] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, input.sourceId), eq(nodes.tenant_id, tenantId)));

  if (!source) {
    throw new Error("Source node not found or belongs to different tenant");
  }

  // Validate target exists and belongs to same tenant
  const [target] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, input.targetId), eq(nodes.tenant_id, tenantId)));

  if (!target) {
    throw new Error("Target node not found or belongs to different tenant");
  }

  const typeId = await getLabelId(db, "edge_type", input.typeCode, tenantId);

  // Validate data against type-specific schema if provided
  let parsedData = input.data ?? null;
  if (parsedData !== null) {
    const schema = getEdgeDataSchema(input.typeCode);
    parsedData = schema.parse(parsedData);
  }

  const id = generateId();

  try {
    const [created] = await db
      .insert(edges)
      .values({
        id,
        tenant_id: tenantId,
        source_id: input.sourceId,
        target_id: input.targetId,
        type_id: typeId,
        data: parsedData,
      })
      .returning();

    return created;
  } catch (error: any) {
    if (error.code === "23505") {
      // unique_violation
      throw new Error(
        `Edge already exists: (${input.sourceId}, ${input.targetId}, ${input.typeCode})`
      );
    }
    throw error;
  }
}

/**
 * Physical delete (edges are not append-only like events).
 */
export async function deleteEdge(
  db: PgDatabase<any>,
  tenantId: string,
  id: string
) {
  const [deleted] = await db
    .delete(edges)
    .where(and(eq(edges.id, id), eq(edges.tenant_id, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error("Edge not found");
  }

  return deleted;
}

export async function listEdges(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  direction: "outgoing" | "incoming" | "both" = "both"
) {
  const tenantCond = eq(edges.tenant_id, tenantId);

  let directionCond;
  if (direction === "outgoing") {
    directionCond = eq(edges.source_id, nodeId);
  } else if (direction === "incoming") {
    directionCond = eq(edges.target_id, nodeId);
  } else {
    directionCond = or(eq(edges.source_id, nodeId), eq(edges.target_id, nodeId));
  }

  return db
    .select()
    .from(edges)
    .where(and(tenantCond, directionCond));
}

/**
 * Convenience: returns the nodes on the other end of matching edges.
 */
export async function getRelatedNodes(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  edgeTypeCode: string,
  direction: "outgoing" | "incoming"
) {
  const typeId = await getLabelId(db, "edge_type", edgeTypeCode, tenantId);
  const tenantCond = eq(edges.tenant_id, tenantId);
  const typeCond = eq(edges.type_id, typeId);

  let directionCond;
  if (direction === "outgoing") {
    directionCond = eq(edges.source_id, nodeId);
  } else {
    directionCond = eq(edges.target_id, nodeId);
  }

  const edgeRows = await db
    .select()
    .from(edges)
    .where(and(tenantCond, typeCond, directionCond));

  if (edgeRows.length === 0) return [];

  // Get the node IDs from the other end
  const otherIds = edgeRows.map((e) =>
    direction === "outgoing" ? e.target_id : e.source_id
  );

  const results = [];
  for (const nid of otherIds) {
    const [node] = await db
      .select()
      .from(nodes)
      .where(and(eq(nodes.id, nid), eq(nodes.tenant_id, tenantId)));
    if (node) results.push(node);
  }

  return results;
}
