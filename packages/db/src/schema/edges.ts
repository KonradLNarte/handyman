import { pgTable, uuid, smallint, jsonb, timestamp } from "drizzle-orm/pg-core";

export const edges = pgTable("edges", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  source_id: uuid("source_id").notNull(),
  target_id: uuid("target_id").notNull(),
  type_id: smallint("type_id").notNull(),
  data: jsonb("data"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
