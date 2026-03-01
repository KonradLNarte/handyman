import { pgTable, uuid, smallint, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  parent_id: uuid("parent_id"),
  type_id: smallint("type_id").notNull(),
  key: text("key"),
  state_id: smallint("state_id"),
  data: jsonb("data").notNull().default({}),
  search_text: text("search_text").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
