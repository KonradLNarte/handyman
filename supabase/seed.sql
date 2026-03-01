-- Resonansia platform-default labels
-- tenant_id = NULL means platform-global

INSERT INTO labels (tenant_id, domain, code, sort_order, is_system) VALUES
  -- node_type
  (NULL, 'node_type', 'org', 1, true),
  (NULL, 'node_type', 'person', 2, true),
  (NULL, 'node_type', 'project', 3, true),
  (NULL, 'node_type', 'customer', 4, true),
  (NULL, 'node_type', 'supplier', 5, true),
  (NULL, 'node_type', 'product', 6, true),
  (NULL, 'node_type', 'location', 7, true),

  -- edge_type
  (NULL, 'edge_type', 'member_of', 1, true),
  (NULL, 'edge_type', 'assigned_to', 2, true),
  (NULL, 'edge_type', 'subcontractor_of', 3, true),
  (NULL, 'edge_type', 'customer_of', 4, true),
  (NULL, 'edge_type', 'located_at', 5, true),
  (NULL, 'edge_type', 'supplier_of', 6, true),
  (NULL, 'edge_type', 'uses_product', 7, true),

  -- event_type
  (NULL, 'event_type', 'time', 1, true),
  (NULL, 'event_type', 'material', 2, true),
  (NULL, 'event_type', 'photo', 3, true),
  (NULL, 'event_type', 'message', 4, true),
  (NULL, 'event_type', 'quote_line', 5, true),
  (NULL, 'event_type', 'invoice_line', 6, true),
  (NULL, 'event_type', 'adjustment', 7, true),
  (NULL, 'event_type', 'state_change', 8, true),
  (NULL, 'event_type', 'payment', 9, true),
  (NULL, 'event_type', 'note', 10, true),

  -- node_state
  (NULL, 'node_state', 'draft', 1, true),
  (NULL, 'node_state', 'active', 2, true),
  (NULL, 'node_state', 'in_progress', 3, true),
  (NULL, 'node_state', 'completed', 4, true),
  (NULL, 'node_state', 'archived', 5, true),
  (NULL, 'node_state', 'cancelled', 6, true),

  -- unit
  (NULL, 'unit', 'hour', 1, true),
  (NULL, 'unit', 'minute', 2, true),
  (NULL, 'unit', 'sqm', 3, true),
  (NULL, 'unit', 'lm', 4, true),
  (NULL, 'unit', 'piece', 5, true),
  (NULL, 'unit', 'kg', 6, true),
  (NULL, 'unit', 'liter', 7, true),

  -- currency
  (NULL, 'currency', 'sek', 1, true),
  (NULL, 'currency', 'nok', 2, true),
  (NULL, 'currency', 'dkk', 3, true),
  (NULL, 'currency', 'eur', 4, true),
  (NULL, 'currency', 'usd', 5, true),

  -- locale
  (NULL, 'locale', 'sv', 1, true),
  (NULL, 'locale', 'en', 2, true),
  (NULL, 'locale', 'ar', 3, true),
  (NULL, 'locale', 'pl', 4, true),
  (NULL, 'locale', 'tr', 5, true),
  (NULL, 'locale', 'fi', 6, true),
  (NULL, 'locale', 'no', 7, true),
  (NULL, 'locale', 'da', 8, true),

  -- blob_kind
  (NULL, 'blob_kind', 'photo', 1, true),
  (NULL, 'blob_kind', 'document', 2, true),
  (NULL, 'blob_kind', 'invoice_scan', 3, true),
  (NULL, 'blob_kind', 'delivery_note', 4, true),
  (NULL, 'blob_kind', 'signature', 5, true);
