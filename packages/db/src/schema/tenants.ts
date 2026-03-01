import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(),
  status: text("status").notNull().default("active"), // active | suspended | deleted
  region: text("region").notNull(), // data residency zone
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
