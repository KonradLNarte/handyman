import { pgTable, uuid, smallint, numeric, jsonb, timestamp, text } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  node_id: uuid("node_id").notNull(),
  ref_id: uuid("ref_id"),
  actor_id: uuid("actor_id"),
  type_id: smallint("type_id").notNull(),
  origin: text("origin").notNull(), // event_origin enum in DB
  qty: numeric("qty"),
  unit_id: smallint("unit_id"),
  unit_price: numeric("unit_price"),
  total: numeric("total"),
  data: jsonb("data"),
  occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
});
