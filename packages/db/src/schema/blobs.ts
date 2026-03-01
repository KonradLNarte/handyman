import { pgTable, uuid, smallint, text, jsonb } from "drizzle-orm/pg-core";

export const blobs = pgTable("blobs", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  node_id: uuid("node_id"),
  event_id: uuid("event_id"),
  type_id: smallint("type_id").notNull(),
  url: text("url").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
});
