import { pgTable, smallserial, uuid, text, integer, boolean } from "drizzle-orm/pg-core";

export const labels = pgTable("labels", {
  id: smallserial("id").primaryKey(),
  tenant_id: uuid("tenant_id"), // null = platform-global
  domain: text("domain").notNull(),
  code: text("code").notNull(),
  parent_id: integer("parent_id"),
  sort_order: integer("sort_order").notNull().default(0),
  is_system: boolean("is_system").notNull().default(false),
});
