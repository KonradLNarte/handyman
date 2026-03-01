import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  project_id: uuid("project_id"),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  event_id: uuid("event_id"),
  read: boolean("read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
