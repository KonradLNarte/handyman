export interface PlatformLabel {
  domain: string;
  code: string;
  sort_order: number;
  is_system: boolean;
  parent_code?: string;
}

export const platformDefaultLabels: PlatformLabel[] = [
  // node_type
  { domain: "node_type", code: "org", sort_order: 1, is_system: true },
  { domain: "node_type", code: "person", sort_order: 2, is_system: true },
  { domain: "node_type", code: "project", sort_order: 3, is_system: true },
  { domain: "node_type", code: "customer", sort_order: 4, is_system: true },
  { domain: "node_type", code: "supplier", sort_order: 5, is_system: true },
  { domain: "node_type", code: "product", sort_order: 6, is_system: true },
  { domain: "node_type", code: "location", sort_order: 7, is_system: true },

  // edge_type
  { domain: "edge_type", code: "member_of", sort_order: 1, is_system: true },
  { domain: "edge_type", code: "assigned_to", sort_order: 2, is_system: true },
  { domain: "edge_type", code: "subcontractor_of", sort_order: 3, is_system: true },
  { domain: "edge_type", code: "customer_of", sort_order: 4, is_system: true },
  { domain: "edge_type", code: "located_at", sort_order: 5, is_system: true },
  { domain: "edge_type", code: "supplier_of", sort_order: 6, is_system: true },
  { domain: "edge_type", code: "uses_product", sort_order: 7, is_system: true },

  // event_type
  { domain: "event_type", code: "time", sort_order: 1, is_system: true },
  { domain: "event_type", code: "material", sort_order: 2, is_system: true },
  { domain: "event_type", code: "photo", sort_order: 3, is_system: true },
  { domain: "event_type", code: "message", sort_order: 4, is_system: true },
  { domain: "event_type", code: "quote_line", sort_order: 5, is_system: true },
  { domain: "event_type", code: "invoice_line", sort_order: 6, is_system: true },
  { domain: "event_type", code: "adjustment", sort_order: 7, is_system: true },
  { domain: "event_type", code: "state_change", sort_order: 8, is_system: true },
  { domain: "event_type", code: "payment", sort_order: 9, is_system: true },
  { domain: "event_type", code: "note", sort_order: 10, is_system: true },

  // node_state
  { domain: "node_state", code: "draft", sort_order: 1, is_system: true },
  { domain: "node_state", code: "active", sort_order: 2, is_system: true },
  { domain: "node_state", code: "in_progress", sort_order: 3, is_system: true },
  { domain: "node_state", code: "completed", sort_order: 4, is_system: true },
  { domain: "node_state", code: "archived", sort_order: 5, is_system: true },
  { domain: "node_state", code: "cancelled", sort_order: 6, is_system: true },

  // unit
  { domain: "unit", code: "hour", sort_order: 1, is_system: true },
  { domain: "unit", code: "minute", sort_order: 2, is_system: true },
  { domain: "unit", code: "sqm", sort_order: 3, is_system: true },
  { domain: "unit", code: "lm", sort_order: 4, is_system: true },
  { domain: "unit", code: "piece", sort_order: 5, is_system: true },
  { domain: "unit", code: "kg", sort_order: 6, is_system: true },
  { domain: "unit", code: "liter", sort_order: 7, is_system: true },

  // currency
  { domain: "currency", code: "sek", sort_order: 1, is_system: true },
  { domain: "currency", code: "nok", sort_order: 2, is_system: true },
  { domain: "currency", code: "dkk", sort_order: 3, is_system: true },
  { domain: "currency", code: "eur", sort_order: 4, is_system: true },
  { domain: "currency", code: "usd", sort_order: 5, is_system: true },

  // locale
  { domain: "locale", code: "sv", sort_order: 1, is_system: true },
  { domain: "locale", code: "en", sort_order: 2, is_system: true },
  { domain: "locale", code: "ar", sort_order: 3, is_system: true },
  { domain: "locale", code: "pl", sort_order: 4, is_system: true },
  { domain: "locale", code: "tr", sort_order: 5, is_system: true },
  { domain: "locale", code: "fi", sort_order: 6, is_system: true },
  { domain: "locale", code: "no", sort_order: 7, is_system: true },
  { domain: "locale", code: "da", sort_order: 8, is_system: true },

  // blob_kind
  { domain: "blob_kind", code: "photo", sort_order: 1, is_system: true },
  { domain: "blob_kind", code: "document", sort_order: 2, is_system: true },
  { domain: "blob_kind", code: "invoice_scan", sort_order: 3, is_system: true },
  { domain: "blob_kind", code: "delivery_note", sort_order: 4, is_system: true },
  { domain: "blob_kind", code: "signature", sort_order: 5, is_system: true },
];
