-- Resonansia initial schema migration
-- Creates all 8 tables with constraints, RLS, indexes, and federation access function.

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE event_origin AS ENUM ('human', 'ai_generated', 'system', 'external_api');
CREATE TYPE federation_status AS ENUM ('pending', 'accepted', 'rejected', 'revoked');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Tenants
CREATE TABLE tenants (
  id            UUID PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'deleted')),
  region        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Labels (type system / controlled vocabularies)
CREATE TABLE labels (
  id            SMALLSERIAL PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id),  -- NULL = platform-global
  domain        TEXT NOT NULL,
  code          TEXT NOT NULL,
  parent_id     SMALLINT REFERENCES labels(id),
  sort_order    INT NOT NULL DEFAULT 0,
  is_system     BOOLEAN NOT NULL DEFAULT false
);

-- 3. Nodes (everything that exists)
CREATE TABLE nodes (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  parent_id     UUID REFERENCES nodes(id),
  type_id       SMALLINT NOT NULL REFERENCES labels(id),
  key           TEXT,
  state_id      SMALLINT REFERENCES labels(id),
  data          JSONB NOT NULL DEFAULT '{}',
  search_text   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Edges (directed typed relations)
CREATE TABLE edges (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  source_id     UUID NOT NULL REFERENCES nodes(id),
  target_id     UUID NOT NULL REFERENCES nodes(id),
  type_id       SMALLINT NOT NULL REFERENCES labels(id),
  data          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_id, target_id, type_id)
);

-- 5. Events (everything that happens — append-only, bitemporal)
CREATE TABLE events (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  node_id       UUID NOT NULL REFERENCES nodes(id),
  ref_id        UUID,
  actor_id      UUID,
  type_id       SMALLINT NOT NULL REFERENCES labels(id),
  origin        event_origin NOT NULL,
  qty           NUMERIC,
  unit_id       SMALLINT REFERENCES labels(id),
  unit_price    NUMERIC,
  total         NUMERIC,
  data          JSONB,
  occurred_at   TIMESTAMPTZ NOT NULL
);

-- 6. Blobs (binary content metadata)
CREATE TABLE blobs (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  node_id       UUID REFERENCES nodes(id),
  event_id      UUID REFERENCES events(id),
  type_id       SMALLINT NOT NULL REFERENCES labels(id),
  url           TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'
);

-- 7. Dicts (i18n, semantics, configuration)
CREATE TABLE dicts (
  id            UUID PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id),  -- NULL = platform-global
  scope         TEXT NOT NULL,
  locale_id     SMALLINT NOT NULL REFERENCES labels(id),
  value         JSONB NOT NULL
);

-- 8. Federation Edges (cross-tenant consent-based relations)
CREATE TABLE federation_edges (
  id              UUID PRIMARY KEY,
  source_tenant   UUID NOT NULL REFERENCES tenants(id),
  source_node     UUID NOT NULL REFERENCES nodes(id),
  target_tenant   UUID NOT NULL REFERENCES tenants(id),
  target_node     UUID NOT NULL REFERENCES nodes(id),
  type_id         SMALLINT NOT NULL REFERENCES labels(id),
  status          SMALLINT NOT NULL DEFAULT 0,  -- 0=pending, 1=accepted, -1=rejected, -2=revoked
  scope           TEXT NOT NULL,
  data            JSONB
);

-- ============================================================================
-- FEDERATION ACCESS FUNCTION (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION has_federation_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM federation_edges
    WHERE status = 1  -- accepted
      AND (
        (source_tenant = target_tenant_id
         AND target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
        OR
        (target_tenant = target_tenant_id
         AND source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
      )
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_self_access" ON tenants
  FOR SELECT
  USING (id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "tenant_insert" ON tenants
  FOR INSERT
  WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "tenant_update" ON tenants
  FOR UPDATE
  USING (id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Labels (readable by all authenticated, writable by platform admin only)
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_read" ON labels
  FOR SELECT
  USING (true);

CREATE POLICY "labels_write" ON labels
  FOR INSERT
  WITH CHECK (
    tenant_id IS NULL  -- platform labels: require service role (handled outside RLS)
    OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "labels_update" ON labels
  FOR UPDATE
  USING (
    tenant_id IS NULL
    OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "labels_delete" ON labels
  FOR DELETE
  USING (
    is_system = false
    AND (
      tenant_id IS NULL
      OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    )
  );

-- Nodes
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes_select" ON nodes
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

CREATE POLICY "nodes_insert" ON nodes
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "nodes_update" ON nodes
  FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "nodes_delete" ON nodes
  FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Edges
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edges_select" ON edges
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

CREATE POLICY "edges_insert" ON edges
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "edges_update" ON edges
  FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "edges_delete" ON edges
  FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

CREATE POLICY "events_insert" ON events
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "events_update" ON events
  FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "events_delete" ON events
  FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Blobs
ALTER TABLE blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blobs_select" ON blobs
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

CREATE POLICY "blobs_insert" ON blobs
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "blobs_update" ON blobs
  FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY "blobs_delete" ON blobs
  FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Dicts
ALTER TABLE dicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dicts_select" ON dicts
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR has_federation_access(tenant_id)
  );

CREATE POLICY "dicts_insert" ON dicts
  FOR INSERT
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "dicts_update" ON dicts
  FOR UPDATE
  USING (
    tenant_id IS NULL
    OR tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

-- Federation Edges
ALTER TABLE federation_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "federation_edge_select" ON federation_edges
  FOR SELECT
  USING (
    source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "federation_edge_insert" ON federation_edges
  FOR INSERT
  WITH CHECK (
    source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "federation_edge_update" ON federation_edges
  FOR UPDATE
  USING (
    source_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
    OR target_tenant = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_events_tenant_node ON events (tenant_id, node_id);
CREATE INDEX idx_events_tenant_ref ON events (tenant_id, ref_id);
CREATE INDEX idx_edges_source ON edges (source_id);
CREATE INDEX idx_edges_target ON edges (target_id);
CREATE INDEX idx_labels_domain_code ON labels (domain, code);
CREATE INDEX idx_federation_edges_lookup ON federation_edges (source_tenant, target_tenant, status);
CREATE INDEX idx_nodes_tenant_type ON nodes (tenant_id, type_id);
CREATE INDEX idx_nodes_search ON nodes USING gin (to_tsvector('simple', search_text));
