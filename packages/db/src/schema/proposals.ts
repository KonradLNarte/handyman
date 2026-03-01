import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  project_id: uuid("project_id").notNull(),
  type: text("type").notNull(), // 'quote' | 'invoice'
  status: text("status").notNull().default("draft"), // 'draft' | 'approved' | 'rejected'
  data: jsonb("data").notNull(), // full proposal data (lines, rotRut, deviations, reasoning)
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
