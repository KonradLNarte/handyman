import { pgTable, uuid, smallint, text, jsonb } from "drizzle-orm/pg-core";

export const federationEdges = pgTable("federation_edges", {
  id: uuid("id").primaryKey(),
  source_tenant: uuid("source_tenant").notNull(),
  source_node: uuid("source_node").notNull(),
  target_tenant: uuid("target_tenant").notNull(),
  target_node: uuid("target_node").notNull(),
  type_id: smallint("type_id").notNull(),
  status: smallint("status").notNull().default(0), // 0=pending, 1=accepted, -1=rejected, -2=revoked
  scope: text("scope").notNull(), // projection scope
  data: jsonb("data"),
});
