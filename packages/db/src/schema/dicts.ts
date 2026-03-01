import { pgTable, uuid, text, smallint, jsonb } from "drizzle-orm/pg-core";

export const dicts = pgTable("dicts", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id"), // null = platform-global
  scope: text("scope").notNull(),
  locale_id: smallint("locale_id").notNull(),
  value: jsonb("value").notNull(),
});
