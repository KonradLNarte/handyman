# RESONANSIA MCP SERVER — GEN 1 SPEC

> **Generation:** 1
> **Ancestor:** gen0-v3 (resonansia-mcp-server-gen0-spec-v3.md)
> **Date:** 2026-03-03
> **Tech Profile:** Deno + Hono + Supabase Edge Functions
> **Status:** Complete — ready for gen2

## 0. GENERATIONAL PROTOCOL

This document is **generation 1** of the Resonansia MCP Server specification. It inherits all invariants from gen0 and resolves all `[DECIDE:gen1]` and `[RESEARCH:gen1]` markers.

### 0.1 What this generation did
1. **INHERIT** — Read gen0-v3 spec in full.
2. **QUESTION** — Challenged 4 assumptions (see Decision Log).
3. **RESOLVE** — Resolved 9 DECIDE markers and 5 RESEARCH markers.
4. **RESEARCH** — Conducted 5 parallel research efforts (PostgreSQL temporal, MCP SDK, Supabase limits, Graphiti dedup, MCP OAuth).
5. **BUILD** — Produced concrete specifications for all 9 artifacts (this document).
6. **VALIDATE** — Defined executable test specifications for T01-T14.
7. **HAND OFF** — Decision Log, Generation Summary, and gen2 instructions included.

### 0.2 How to use this document
This spec is detailed enough for a developer or AI agent to implement directly. Each artifact section contains:
- Exact SQL (copy-paste ready)
- Exact TypeScript types and Zod schemas
- Exact function signatures with parameter/return types
- Exact error codes and messages
- Implementation notes where behavior is non-obvious

### 0.3 What gen2 must do
See section 11 (Generation Handoff) for gen2's complete task list, DECIDE markers, and RESEARCH markers.

---

## 1. TECH PROFILE (bound)

This generation binds the tech-agnostic gen0 spec to the following concrete stack.

### 1.1 Runtime and framework

| Component | Package | Version | Deno import specifier |
|---|---|---|---|
| Runtime | Deno | >=2.0 | (built-in) |
| HTTP framework | hono | 4.9.7 | `npm:hono@4.9.7` |
| MCP SDK | @modelcontextprotocol/sdk | ^1.27.1 | `npm:@modelcontextprotocol/sdk@^1.27.1` |
| MCP adapter | @hono/mcp | ^0.2.3 | `npm:@hono/mcp@^0.2.3` |
| Schema validation | zod | ^3.25 | `npm:zod@^3.25` |

### 1.2 Database and storage

| Component | Package / Service | Version | Import |
|---|---|---|---|
| Database | Supabase PostgreSQL | 15+ (hosted) | — |
| Vector extension | pgvector | 0.7+ | `CREATE EXTENSION vector` |
| Trigram extension | pg_trgm | (bundled) | `CREATE EXTENSION pg_trgm` |
| GiST support | btree_gist | (bundled) | `CREATE EXTENSION btree_gist` |
| Supabase client | @supabase/supabase-js | ^2.49 | `npm:@supabase/supabase-js@^2.49` |
| Object storage | Supabase Storage | (hosted) | via supabase-js |

### 1.3 AI and embeddings

| Component | Provider | Model | Dimensions |
|---|---|---|---|
| Embedding API | OpenRouter | text-embedding-3-small | 1536 |
| Extraction LLM | OpenRouter | gpt-4o-mini | — |
| OpenRouter base URL | `https://openrouter.ai/api/v1` | — | — |

### 1.4 Auth

| Component | Details |
|---|---|
| Auth provider | Supabase Auth (OAuth 2.1 Authorization Server) |
| Token format | Stateless JWT (D-002) |
| JWT validation | Supabase `auth.jwt()` in RLS + application-level `jose` verification |
| JWT library | `npm:jose@^6.0` |
| Token claim: tenant_ids | `auth.jwt() -> 'tenant_ids'` — JSON array of accessible tenant UUIDs |
| Token claim: scopes | `auth.jwt() -> 'scopes'` — JSON array of scope strings |

### 1.5 Deployment

| Component | Details |
|---|---|
| Deployment target | Supabase Edge Functions |
| Test runner | `deno test` |
| License | Apache 2.0 (D-009) |

### 1.6 Deno configuration (`deno.json`)

```json
{
  "imports": {
    "hono": "npm:hono@4.9.7",
    "hono/": "npm:hono@4.9.7/",
    "@hono/mcp": "npm:@hono/mcp@^0.2.3",
    "@modelcontextprotocol/sdk": "npm:@modelcontextprotocol/sdk@^1.27.1",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.49",
    "zod": "npm:zod@^3.25",
    "jose": "npm:jose@^6.0"
  },
  "tasks": {
    "dev": "deno run --allow-net --allow-env --watch index.ts",
    "test": "deno test --allow-net --allow-env",
    "check": "deno check index.ts"
  },
  "compilerOptions": {
    "strict": true
  }
}
```

---

## 2. ARTIFACT 1 — DATABASE SCHEMA

This is the complete, runnable SQL for the Resonansia database. Execute sections in order.
All SQL targets Supabase PostgreSQL 15+ with pgvector, pg_trgm, and btree_gist extensions.

### 2.1 Extensions

```sql
-- ============================================================
-- RESONANSIA MCP SERVER — DATABASE SCHEMA
-- Generation: gen1
-- Target: Supabase PostgreSQL 15+
-- Execute sections in order. Idempotent (uses IF NOT EXISTS).
-- ============================================================

-- Extensions required by the schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector: VECTOR type, cosine ops
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- trigram similarity for fuzzy dedup
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- GiST index support for EXCLUDE constraints
```

### 2.2 UUIDv7 generation function

UUIDv7 encodes a Unix millisecond timestamp in the first 48 bits, providing time-ordered UUIDs.
This is used for `event_id` (D-007). The `recorded_at` column is retained alongside for query
ergonomics — extracting timestamps from UUIDs in WHERE clauses is awkward and prevents index use.

```sql
-- UUIDv7 generator: timestamp-ordered UUIDs (RFC 9562)
-- First 48 bits = Unix ms timestamp, bits 48-51 = version (7),
-- bits 64-65 = variant (10), rest = random.
CREATE OR REPLACE FUNCTION uuidv7() RETURNS UUID AS $$
DECLARE
  unix_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  unix_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  -- Start with 16 random bytes
  uuid_bytes := gen_random_bytes(16);
  -- Overwrite first 6 bytes with timestamp (big-endian)
  uuid_bytes := set_byte(uuid_bytes, 0, (unix_ms >> 40)::INT & 255);
  uuid_bytes := set_byte(uuid_bytes, 1, (unix_ms >> 32)::INT & 255);
  uuid_bytes := set_byte(uuid_bytes, 2, (unix_ms >> 24)::INT & 255);
  uuid_bytes := set_byte(uuid_bytes, 3, (unix_ms >> 16)::INT & 255);
  uuid_bytes := set_byte(uuid_bytes, 4, (unix_ms >> 8)::INT & 255);
  uuid_bytes := set_byte(uuid_bytes, 5, unix_ms::INT & 255);
  -- Set version to 7 (bits 48-51)
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  -- Set variant to RFC 4122 (bits 64-65 = 10)
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION uuidv7() IS
  'Generates a UUIDv7 (RFC 9562) with millisecond-precision timestamp ordering. '
  'Used for event_id to provide implicit system-time ordering.';
```

### 2.3 Helper function: get_tenant_ids()

Extracts the array of tenant UUIDs from the current JWT token. Used by all RLS policies.

```sql
-- Extract tenant_ids from JWT claims for RLS policies.
-- Returns an array of UUIDs that the current user can access.
-- Falls back to empty array if claim is missing (denies all access).
CREATE OR REPLACE FUNCTION get_tenant_ids() RETURNS UUID[] AS $$
DECLARE
  raw_json JSONB;
  result UUID[];
BEGIN
  -- Supabase stores custom claims in the JWT payload
  raw_json := coalesce(
    current_setting('request.jwt.claims', true)::JSONB -> 'tenant_ids',
    '[]'::JSONB
  );
  SELECT array_agg(elem::TEXT::UUID)
  INTO result
  FROM jsonb_array_elements_text(raw_json) AS elem;
  RETURN coalesce(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_ids() IS
  'Extracts tenant_ids UUID array from JWT claims for RLS. '
  'Returns empty array if claim is absent (denies all access).';
```

### 2.4 Helper function: get_user_id()

```sql
-- Extract the authenticated user's UUID from the JWT sub claim.
CREATE OR REPLACE FUNCTION get_user_id() RETURNS UUID AS $$
BEGIN
  RETURN coalesce(
    (current_setting('request.jwt.claims', true)::JSONB ->> 'sub')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 2.5 Table 1: TENANTS

```sql
-- ============================================================
-- TABLE 1: TENANTS — isolation boundary
-- Every other table references tenant_id. This is the root.
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Isolation boundary. Every row in every other table references a tenant.';
COMMENT ON COLUMN tenants.parent_id IS 'Hierarchy for holding companies. NULL = top-level tenant.';
COMMENT ON COLUMN tenants.config IS 'Feature flags, limits, plan tier, custom settings.';

-- RLS: Users can only see tenants listed in their JWT tenant_ids claim.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY tenants_insert ON tenants
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- No UPDATE or DELETE policies: tenants are managed by platform admin only.
-- Service-role bypasses RLS for admin operations.
```

### 2.6 Table 2: EVENTS

```sql
-- ============================================================
-- TABLE 2: EVENTS — append-only immutable truth
-- THIS IS THE SINGLE SOURCE OF TRUTH.
-- Fact tables (nodes, edges, grants) are projections of events.
-- NEVER updated. NEVER deleted. Corrections are new events
-- with payload referencing the original event.
-- D-007: event_id uses UUIDv7 for time-ordering.
-- D-007: recorded_at retained for query ergonomics.
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  event_id     UUID PRIMARY KEY DEFAULT uuidv7(),
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
  intent_type  TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  stream_id    UUID,
  node_ids     UUID[] NOT NULL DEFAULT '{}',
  edge_ids     UUID[] NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID NOT NULL
);

COMMENT ON TABLE events IS
  'Append-only event stream. The single source of truth. '
  'Fact tables are deterministic projections of this stream. '
  'INV-APPEND: never update, never delete.';
COMMENT ON COLUMN events.event_id IS 'UUIDv7: encodes system time in first 48 bits (D-007).';
COMMENT ON COLUMN events.intent_type IS 'Event kind, e.g. entity_created, edge_created, entity_updated.';
COMMENT ON COLUMN events.stream_id IS 'Groups events about the same entity. Equals node_id for entity streams.';
COMMENT ON COLUMN events.occurred_at IS 'Business time: when it happened in reality.';
COMMENT ON COLUMN events.recorded_at IS 'System time: when the system learned about it. Redundant with UUIDv7 timestamp but kept for query ergonomics (D-007).';

-- RLS: INSERT only (append-only). SELECT filtered by tenant. No UPDATE/DELETE.
-- INV-APPEND enforced at database level.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select ON events
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY events_insert ON events
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- Explicitly: NO update or delete policies. This enforces INV-APPEND.
-- Even service-role should not update/delete events (application-level guard).

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_tenant_stream
  ON events (tenant_id, stream_id);

CREATE INDEX IF NOT EXISTS idx_events_tenant_intent
  ON events (tenant_id, intent_type);

CREATE INDEX IF NOT EXISTS idx_events_occurred
  ON events (tenant_id, occurred_at DESC);
```

### 2.7 Table 3: NODES

```sql
-- ============================================================
-- TABLE 3: NODES — entities in the knowledge graph (FACT LAYER)
-- Projection of the event stream. Every row references its
-- creating event via created_by_event (INV-LINEAGE).
--
-- BITEMPORAL: Multiple rows per node_id — one per version.
-- Composite PK: (node_id, valid_from).
-- Current version: valid_to = 'infinity' AND is_deleted = false.
-- EXCLUDE constraint prevents overlapping valid ranges.
--
-- EMBEDDING: VECTOR(1536) for semantic search (D-001).
-- Populated asynchronously after node creation.
--
-- TYPE REFERENCE: type_node_id references another node's node_id.
-- This is APPLICATION-ENFORCED, not FK-enforced, because:
--   1. nodes has composite PK (node_id, valid_from) — cannot FK to node_id alone
--   2. Adding a UNIQUE on node_id would fail (multiple versions per node_id)
--   3. A separate node_identities table would violate the "7 tables" rule
-- The application layer validates type_node_id existence on every write.
-- The bootstrap metatype (self-referential) is created in the seed script.
-- ============================================================
CREATE TABLE IF NOT EXISTS nodes (
  node_id          UUID NOT NULL,
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id),
  type_node_id     UUID NOT NULL,                                 -- app-enforced ref to type node
  data             JSONB NOT NULL DEFAULT '{}',
  embedding        VECTOR(1536),                                  -- D-001: text-embedding-3-small
  epistemic        TEXT NOT NULL DEFAULT 'hypothesis'
                   CHECK (epistemic IN ('hypothesis', 'asserted', 'confirmed')),
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to         TIMESTAMPTZ NOT NULL DEFAULT 'infinity',
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events(event_id),     -- INV-LINEAGE
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (node_id, valid_from),
  -- INV-BITEMP: prevent overlapping valid ranges for the same node
  EXCLUDE USING gist (
    node_id WITH =,
    tstzrange(valid_from, valid_to, '[)') WITH &&
  )
);

COMMENT ON TABLE nodes IS
  'Knowledge graph entities. Fact layer — projection of events. '
  'Composite PK (node_id, valid_from) enables bitemporal versioning. '
  'type_node_id is application-enforced (not FK) due to composite PK.';
COMMENT ON COLUMN nodes.type_node_id IS
  'References the type node defining this entity''s schema. '
  'Application-enforced: cannot use FK because nodes has composite PK. '
  'The metatype node has type_node_id = its own node_id (self-referential bootstrap).';
COMMENT ON COLUMN nodes.epistemic IS
  'Epistemic status: hypothesis (LLM-inferred), asserted (human-stated), confirmed (verified).';
COMMENT ON COLUMN nodes.embedding IS
  'VECTOR(1536) for semantic search. Populated async by embedding pipeline. D-001.';

-- RLS: SELECT by tenant_id. INSERT by tenant_id. No UPDATE. No DELETE.
-- New versions = new rows (INSERT). Soft delete = new row with is_deleted=true.
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY nodes_select ON nodes
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY nodes_insert ON nodes
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- No UPDATE policy: new versions are INSERT operations (INV-BITEMP).
-- No DELETE policy: soft delete only (INV-SOFT).

-- Indexes for nodes
-- GiST index is created implicitly by the EXCLUDE constraint.

-- HNSW index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_nodes_embedding_hnsw
  ON nodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Btree indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_nodes_tenant_type
  ON nodes (tenant_id, type_node_id);

CREATE INDEX IF NOT EXISTS idx_nodes_identity
  ON nodes (node_id);

CREATE INDEX IF NOT EXISTS idx_nodes_current
  ON nodes (tenant_id, node_id)
  WHERE valid_to = 'infinity' AND is_deleted = false;

-- Trigram index on data for fuzzy text search (dedup, D-005)
CREATE INDEX IF NOT EXISTS idx_nodes_data_trgm
  ON nodes USING gin (data jsonb_ops);
```

### 2.8 Table 4: EDGES

```sql
-- ============================================================
-- TABLE 4: EDGES — relationships between nodes (FACT LAYER)
-- Cross-tenant edges are the federation mechanism.
-- source_id and target_id may belong to different tenants.
-- Auth must verify access to BOTH endpoints (INV-XTEN).
--
-- type_node_id references a type node (application-enforced,
-- same rationale as nodes.type_node_id).
--
-- source_id and target_id reference node_id (entity identity).
-- These are also application-enforced, not FK, because nodes
-- has composite PK (node_id, valid_from).
-- ============================================================
CREATE TABLE IF NOT EXISTS edges (
  edge_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id),
  type_node_id     UUID NOT NULL,          -- app-enforced ref to edge type node
  source_id        UUID NOT NULL,          -- app-enforced ref to source node
  target_id        UUID NOT NULL,          -- app-enforced ref to target node
  data             JSONB NOT NULL DEFAULT '{}',
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to         TIMESTAMPTZ NOT NULL DEFAULT 'infinity',
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID NOT NULL,
  created_by_event UUID NOT NULL REFERENCES events(event_id),  -- INV-LINEAGE
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  -- INV-BITEMP: prevent overlapping valid ranges for the same edge
  EXCLUDE USING gist (
    edge_id WITH =,
    tstzrange(valid_from, valid_to, '[)') WITH &&
  )
);

COMMENT ON TABLE edges IS
  'Relationships between nodes. Fact layer — projection of events. '
  'Cross-tenant edges enable federation (INV-XTEN). '
  'source_id/target_id and type_node_id are application-enforced.';

-- RLS: SELECT where tenant_id matches.
-- Cross-tenant edge visibility is handled at application level (D-006)
-- using service-role bypass + grants table consultation.
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY edges_select ON edges
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY edges_insert ON edges
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- No UPDATE or DELETE policies (INV-SOFT, INV-BITEMP).

-- Indexes for edges
CREATE INDEX IF NOT EXISTS idx_edges_source
  ON edges (source_id)
  WHERE valid_to = 'infinity' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_edges_target
  ON edges (target_id)
  WHERE valid_to = 'infinity' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_edges_tenant
  ON edges (tenant_id)
  WHERE valid_to = 'infinity' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_edges_type
  ON edges (tenant_id, type_node_id)
  WHERE valid_to = 'infinity' AND is_deleted = false;
```

### 2.9 Table 5: GRANTS

```sql
-- ============================================================
-- TABLE 5: GRANTS — capability-based access control (FACT LAYER)
-- A grant says: "subject_tenant may perform capability on
-- object_node during valid_range."
-- Grants are the fine-grained inner gate of the two-layer
-- access control model (scopes = outer gate, grants = inner gate).
-- ============================================================
CREATE TABLE IF NOT EXISTS grants (
  grant_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  subject_tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  object_node_id     UUID NOT NULL,        -- app-enforced ref to granted node
  capability         TEXT NOT NULL
                     CHECK (capability IN ('READ', 'WRITE', 'TRAVERSE')),
  valid_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to           TIMESTAMPTZ NOT NULL DEFAULT 'infinity',
  created_by         UUID NOT NULL,
  created_by_event   UUID NOT NULL REFERENCES events(event_id)  -- INV-LINEAGE
);

COMMENT ON TABLE grants IS
  'Capability-based cross-tenant access control. '
  'Scopes (JWT) are the fast outer gate; grants are the fine-grained inner gate. '
  'Both must pass for cross-tenant operations to succeed.';
COMMENT ON COLUMN grants.tenant_id IS 'Tenant that owns/issued this grant.';
COMMENT ON COLUMN grants.subject_tenant_id IS 'Tenant receiving the capability.';
COMMENT ON COLUMN grants.object_node_id IS 'Node the capability applies to.';

-- RLS: SELECT by either owning tenant or subject tenant.
-- INSERT only by owning tenant.
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY grants_select ON grants
  FOR SELECT
  USING (
    tenant_id = ANY(get_tenant_ids())
    OR subject_tenant_id = ANY(get_tenant_ids())
  );

CREATE POLICY grants_insert ON grants
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- No UPDATE or DELETE policies.

-- Indexes for grants
CREATE INDEX IF NOT EXISTS idx_grants_subject_object
  ON grants (subject_tenant_id, object_node_id)
  WHERE valid_to = 'infinity';

CREATE INDEX IF NOT EXISTS idx_grants_tenant
  ON grants (tenant_id)
  WHERE valid_to = 'infinity';
```

### 2.10 Table 6: BLOBS

```sql
-- ============================================================
-- TABLE 6: BLOBS — binary storage metadata
-- Blob content is stored in Supabase Storage (D-008, INV-BLOB).
-- Only metadata (path, content type, size) lives in the database.
-- ============================================================
CREATE TABLE IF NOT EXISTS blobs (
  blob_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id),
  content_type  TEXT NOT NULL,
  storage_ref   TEXT NOT NULL,           -- path/key in Supabase Storage
  size_bytes    BIGINT NOT NULL,
  node_id       UUID,                    -- app-enforced ref to related node
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID NOT NULL
);

COMMENT ON TABLE blobs IS
  'Binary storage metadata. Content stored in Supabase Storage (INV-BLOB). '
  'storage_ref points to the object storage path.';

-- RLS: SELECT/INSERT by tenant_id.
ALTER TABLE blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY blobs_select ON blobs
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY blobs_insert ON blobs
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));

-- No UPDATE or DELETE policies.
```

### 2.11 Table 7: DICTS

```sql
-- ============================================================
-- TABLE 7: DICTS — reference data
-- Temporal reference data: currencies, countries, account codes.
-- ============================================================
CREATE TABLE IF NOT EXISTS dicts (
  dict_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id),
  type        TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to    TIMESTAMPTZ NOT NULL DEFAULT 'infinity',
  UNIQUE (tenant_id, type, key, valid_from)
);

COMMENT ON TABLE dicts IS
  'Temporal reference data. Currencies, countries, BAS account codes, etc.';

-- RLS: SELECT/INSERT by tenant_id.
ALTER TABLE dicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY dicts_select ON dicts
  FOR SELECT
  USING (tenant_id = ANY(get_tenant_ids()));

CREATE POLICY dicts_insert ON dicts
  FOR INSERT
  WITH CHECK (tenant_id = ANY(get_tenant_ids()));
```

### 2.12 Semantic search function

```sql
-- ============================================================
-- SEMANTIC SEARCH FUNCTION
-- Used by the find_entities tool for embedding-based search.
-- Returns current (non-deleted, non-expired) nodes ranked by
-- cosine similarity to the query embedding.
-- RLS is NOT applied here (SECURITY DEFINER) — the calling
-- application code must enforce tenant access via the
-- match_tenant_id parameter (D-006).
-- ============================================================
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding   VECTOR(1536),
  match_tenant_id   UUID,
  match_count       INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5,
  filter_type_node_id UUID DEFAULT NULL,
  filter_epistemic  TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  node_id          UUID,
  tenant_id        UUID,
  type_node_id     UUID,
  data             JSONB,
  epistemic        TEXT,
  valid_from       TIMESTAMPTZ,
  recorded_at      TIMESTAMPTZ,
  similarity       FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.node_id,
    n.tenant_id,
    n.type_node_id,
    n.data,
    n.epistemic,
    n.valid_from,
    n.recorded_at,
    (1 - (n.embedding <=> query_embedding))::FLOAT AS similarity
  FROM nodes n
  WHERE n.tenant_id = match_tenant_id
    AND n.valid_to = 'infinity'
    AND n.is_deleted = false
    AND n.embedding IS NOT NULL
    AND (1 - (n.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_type_node_id IS NULL OR n.type_node_id = filter_type_node_id)
    AND (filter_epistemic IS NULL OR n.epistemic = ANY(filter_epistemic))
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION semantic_search IS
  'Cosine similarity search over node embeddings. '
  'SECURITY DEFINER: caller must enforce tenant access. '
  'Returns current nodes (valid_to=infinity, is_deleted=false) '
  'ranked by similarity above threshold.';
```

### 2.13 Fuzzy text search function (for dedup, D-005)

```sql
-- ============================================================
-- FUZZY TEXT SEARCH FUNCTION
-- Used by capture_thought for entity deduplication (D-005).
-- Hybrid approach: pg_trgm similarity on name-like fields,
-- combined with optional embedding cosine distance.
-- ============================================================
CREATE OR REPLACE FUNCTION fuzzy_match_nodes(
  match_tenant_id   UUID,
  search_text       TEXT,
  match_count       INT DEFAULT 5,
  trgm_threshold    FLOAT DEFAULT 0.3,
  filter_type_node_id UUID DEFAULT NULL
)
RETURNS TABLE (
  node_id          UUID,
  tenant_id        UUID,
  type_node_id     UUID,
  data             JSONB,
  trgm_similarity  FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.node_id,
    n.tenant_id,
    n.type_node_id,
    n.data,
    greatest(
      similarity(n.data ->> 'name', search_text),
      similarity(n.data ->> 'title', search_text),
      similarity(
        coalesce(n.data ->> 'name', '') || ' ' || coalesce(n.data ->> 'title', ''),
        search_text
      )
    )::FLOAT AS trgm_similarity
  FROM nodes n
  WHERE n.tenant_id = match_tenant_id
    AND n.valid_to = 'infinity'
    AND n.is_deleted = false
    AND (filter_type_node_id IS NULL OR n.type_node_id = filter_type_node_id)
    AND greatest(
      similarity(n.data ->> 'name', search_text),
      similarity(n.data ->> 'title', search_text),
      similarity(
        coalesce(n.data ->> 'name', '') || ' ' || coalesce(n.data ->> 'title', ''),
        search_text
      )
    ) >= trgm_threshold
  ORDER BY trgm_similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION fuzzy_match_nodes IS
  'Trigram-based fuzzy text matching for entity deduplication (D-005). '
  'Searches name/title fields in node data. '
  'Combined with embedding search in the hybrid dedup pipeline.';
```

### 2.14 Bootstrap metatype node

The metatype is the self-referential root of the ontology layer. Its `type_node_id` equals
its own `node_id`. All other type nodes reference it as their type. This must be created
with a bootstrap event, honoring INV-LINEAGE.

```sql
-- ============================================================
-- BOOTSTRAP: Metatype node
-- The metatype is the root of the ontology. It types itself.
-- Created with a bootstrap event (INV-LINEAGE).
--
-- Fixed UUIDs for deterministic bootstrapping:
--   BOOTSTRAP_EVENT:  00000000-0000-7000-8000-000000000001
--   METATYPE_NODE:    00000000-0000-7000-8000-000000000002
--   SYSTEM_TENANT:    00000000-0000-7000-8000-000000000000
--
-- The system tenant is a platform-level tenant that owns
-- the metatype. All per-tenant type nodes are separate nodes
-- in their respective tenants, but they all have
-- type_node_id = METATYPE_NODE_ID.
-- ============================================================

-- System tenant (platform-level, owns the metatype)
INSERT INTO tenants (tenant_id, parent_id, name, config)
VALUES (
  '00000000-0000-7000-8000-000000000000',
  NULL,
  '_system',
  '{"description": "Platform-level system tenant. Owns the metatype bootstrap node."}'::JSONB
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Bootstrap event (created before the metatype node, INV-LINEAGE)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES (
  '00000000-0000-7000-8000-000000000001',
  '00000000-0000-7000-8000-000000000000',
  'bootstrap',
  '{
    "description": "Bootstrap event creating the metatype node. This is the root of the ontology.",
    "metatype_node_id": "00000000-0000-7000-8000-000000000002"
  }'::JSONB,
  '00000000-0000-7000-8000-000000000002',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (event_id) DO NOTHING;

-- Metatype node: type_node_id = own node_id (self-referential)
INSERT INTO nodes (
  node_id, tenant_id, type_node_id, data, epistemic,
  valid_from, valid_to, recorded_at,
  created_by, created_by_event, is_deleted
)
VALUES (
  '00000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',  -- self-referential
  '{
    "name": "metatype",
    "description": "The root type node. All type nodes have type_node_id pointing to this node. The metatype types itself.",
    "kind": "entity_type",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "description": "Type name, e.g. lead, booking, campaign" },
        "description": { "type": "string" },
        "kind": {
          "type": "string",
          "enum": ["entity_type", "edge_type", "event_type"],
          "description": "Whether this type describes entities, edges, or events"
        },
        "label_schema": {
          "type": "object",
          "description": "JSON Schema for validating data fields of entities/edges of this type"
        }
      },
      "required": ["name", "kind"]
    }
  }'::JSONB,
  'confirmed',
  '2026-01-01T00:00:00Z',
  'infinity',
  '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-7000-8000-000000000001',
  false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;
```

### 2.15 Pettson seed data — Tenants

The Pettson scenario is the acceptance test foundation. Four tenants: a holding company
and three subsidiaries. All seed data follows the event-first pattern — even in seeding,
the event is created before the fact row.

**UUID scheme for seed data:** To make seed data deterministic and readable, we use a
systematic UUID pattern:

```
Tenant UUIDs:     10000000-0000-7000-8000-00000000000X
Event UUIDs:      20000000-0000-7000-8000-0000000000XX
Type node UUIDs:  30000000-0000-7000-8000-0000000000XX
Entity UUIDs:     40000000-0000-7000-8000-0000000000XX
Edge UUIDs:       50000000-0000-7000-8000-0000000000XX
Grant UUIDs:      60000000-0000-7000-8000-0000000000XX
```

```sql
-- ============================================================
-- PETTSON SEED DATA: TENANTS
-- Holding company + 3 subsidiaries
-- ============================================================

-- Pettson Holding (parent tenant)
INSERT INTO tenants (tenant_id, parent_id, name, config)
VALUES (
  '10000000-0000-7000-8000-000000000001',
  NULL,
  'Pettson Holding AB',
  '{
    "org_number": "559100-0001",
    "description": "Holdingbolag för Pettson-koncernen. Äger Taylor Events, Mountain Cabins och Nordic Tickets.",
    "plan": "enterprise"
  }'::JSONB
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Taylor Events (event production, child of Pettson)
INSERT INTO tenants (tenant_id, parent_id, name, config)
VALUES (
  '10000000-0000-7000-8000-000000000002',
  '10000000-0000-7000-8000-000000000001',
  'Taylor Events AB',
  '{
    "org_number": "559100-0002",
    "description": "Eventproduktion — konserter, festivaler, företagsevent. Huvudkontor i Stockholm.",
    "plan": "professional"
  }'::JSONB
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Mountain Cabins (cabin rentals, child of Pettson)
INSERT INTO tenants (tenant_id, parent_id, name, config)
VALUES (
  '10000000-0000-7000-8000-000000000003',
  '10000000-0000-7000-8000-000000000001',
  'Mountain Cabins AB',
  '{
    "org_number": "559100-0003",
    "description": "Stuguthyrning i Sälenfjällen. 45 stugor, året-runt-verksamhet med fokus på skidsäsong och midsommar.",
    "plan": "professional"
  }'::JSONB
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Nordic Tickets (ticket sales, child of Pettson)
INSERT INTO tenants (tenant_id, parent_id, name, config)
VALUES (
  '10000000-0000-7000-8000-000000000004',
  '10000000-0000-7000-8000-000000000001',
  'Nordic Tickets AB',
  '{
    "org_number": "559100-0004",
    "description": "Biljettförmedling för sport och underhållning. Partner med Allsvenskan och SHL.",
    "plan": "professional"
  }'::JSONB
)
ON CONFLICT (tenant_id) DO NOTHING;
```

### 2.16 Pettson seed data — Type nodes

Each tenant gets its own type nodes. Type nodes have `type_node_id` pointing to the metatype.
Every type node requires a bootstrap event first (INV-LINEAGE).

```sql
-- ============================================================
-- PETTSON SEED DATA: TYPE NODES
-- Each tenant gets type nodes for its entity types.
-- All type nodes reference the metatype as their type.
-- ============================================================

-- Shorthand for metatype and system user
-- METATYPE = 00000000-0000-7000-8000-000000000002
-- SYSTEM_USER = 00000000-0000-0000-0000-000000000000

-- ─── TAYLOR EVENTS TYPE NODES ───

-- Event: type_node bootstrap event for "lead" type
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000001', '10000000-0000-7000-8000-000000000002', 'type_created',
   '{"type_name": "lead", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000001', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000002',  -- metatype
  '{
    "name": "lead",
    "kind": "entity_type",
    "description": "Potentiell kund eller affärsmöjlighet. Kan vara en person eller organisation som visat intresse.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "company": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "source": { "type": "string", "enum": ["mässa", "telefon", "web", "referral", "event"] },
        "interest": { "type": "string" },
        "status": { "type": "string", "enum": ["new", "contacted", "qualified", "proposal", "won", "lost"] },
        "estimated_value": { "type": "number" },
        "notes": { "type": "string" }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000001', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: campaign
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000002', '10000000-0000-7000-8000-000000000002', 'type_created',
   '{"type_name": "campaign", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000002', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000002',
  '10000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "campaign",
    "kind": "entity_type",
    "description": "Marknadsföringskampanj eller säljaktivitet. Kan vara kopplad till specifika event eller produkter.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "start_date": { "type": "string", "format": "date" },
        "end_date": { "type": "string", "format": "date" },
        "budget": { "type": "number" },
        "status": { "type": "string", "enum": ["draft", "active", "paused", "completed"] },
        "channel": { "type": "string", "enum": ["email", "social", "print", "event", "partner"] },
        "target_audience": { "type": "string" }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000002', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: event (the "event" entity type in Taylor Events, not to be confused with the events table)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000003', '10000000-0000-7000-8000-000000000002', 'type_created',
   '{"type_name": "event", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000003', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000003',
  '10000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "event",
    "kind": "entity_type",
    "description": "Planerat arrangemang — konsert, festival, företagsgala, mässa. Inte att förväxla med events-tabellen.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "date": { "type": "string", "format": "date" },
        "venue": { "type": "string" },
        "capacity": { "type": "integer" },
        "genre": { "type": "string" },
        "status": { "type": "string", "enum": ["planning", "confirmed", "sold_out", "completed", "cancelled"] },
        "ticket_price": { "type": "number" },
        "description": { "type": "string" }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000003', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: venue
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000004', '10000000-0000-7000-8000-000000000002', 'type_created',
   '{"type_name": "venue", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000004', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000004',
  '10000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "venue",
    "kind": "entity_type",
    "description": "Plats eller lokal för arrangemang. Kan vara arena, konferenslokal, utomhusområde.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "address": { "type": "string" },
        "city": { "type": "string" },
        "capacity": { "type": "integer" },
        "type": { "type": "string", "enum": ["arena", "conference", "outdoor", "restaurant", "other"] },
        "contact_person": { "type": "string" },
        "contact_phone": { "type": "string" }
      },
      "required": ["name", "city"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000004', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: contact
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000005', '10000000-0000-7000-8000-000000000002', 'type_created',
   '{"type_name": "contact", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000005', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000005',
  '10000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "contact",
    "kind": "entity_type",
    "description": "Kontaktperson — kan vara kund, leverantör, artist, samarbetspartner.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "company": { "type": "string" },
        "role": { "type": "string" },
        "notes": { "type": "string" }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000005', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- ─── MOUNTAIN CABINS TYPE NODES ───

-- Type: property
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000006', '10000000-0000-7000-8000-000000000003', 'type_created',
   '{"type_name": "property", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000006', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000006',
  '10000000-0000-7000-8000-000000000003',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "property",
    "kind": "entity_type",
    "description": "Stuga eller boende. Kan vara fjällstuga, semesterlägenhet eller camping.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "address": { "type": "string" },
        "area": { "type": "string" },
        "beds": { "type": "integer" },
        "amenities": { "type": "array", "items": { "type": "string" } },
        "price_per_night": { "type": "number" },
        "status": { "type": "string", "enum": ["available", "booked", "maintenance", "closed"] },
        "description": { "type": "string" }
      },
      "required": ["name", "beds"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000006', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: booking
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000007', '10000000-0000-7000-8000-000000000003', 'type_created',
   '{"type_name": "booking", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000007', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000007',
  '10000000-0000-7000-8000-000000000003',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "booking",
    "kind": "entity_type",
    "description": "Bokning av stuga. Innehåller checkin/checkout, gästinfo och betalningsstatus.",
    "label_schema": {
      "type": "object",
      "properties": {
        "guest_name": { "type": "string" },
        "check_in": { "type": "string", "format": "date" },
        "check_out": { "type": "string", "format": "date" },
        "guests": { "type": "integer" },
        "total_price": { "type": "number" },
        "status": { "type": "string", "enum": ["pending", "confirmed", "checked_in", "checked_out", "cancelled"] },
        "payment_status": { "type": "string", "enum": ["unpaid", "partial", "paid", "refunded"] },
        "notes": { "type": "string" }
      },
      "required": ["guest_name", "check_in", "check_out"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000007', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: guest
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000008', '10000000-0000-7000-8000-000000000003', 'type_created',
   '{"type_name": "guest", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000008', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000008',
  '10000000-0000-7000-8000-000000000003',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "guest",
    "kind": "entity_type",
    "description": "Gäst som bokat eller besökt en stuga.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "address": { "type": "string" },
        "loyalty_tier": { "type": "string", "enum": ["standard", "silver", "gold"] },
        "total_bookings": { "type": "integer" },
        "notes": { "type": "string" }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000008', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: season
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000009', '10000000-0000-7000-8000-000000000003', 'type_created',
   '{"type_name": "season", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000009', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000009',
  '10000000-0000-7000-8000-000000000003',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "season",
    "kind": "entity_type",
    "description": "Säsong med specifika priser och tillgänglighet. T.ex. skidsäsong, midsommar, sommar.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "start_date": { "type": "string", "format": "date" },
        "end_date": { "type": "string", "format": "date" },
        "price_multiplier": { "type": "number" },
        "min_nights": { "type": "integer" },
        "status": { "type": "string", "enum": ["upcoming", "active", "completed"] }
      },
      "required": ["name", "start_date", "end_date"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000009', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- ─── NORDIC TICKETS TYPE NODES ───

-- Type: match
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000010', '10000000-0000-7000-8000-000000000004', 'type_created',
   '{"type_name": "match", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000010', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000010',
  '10000000-0000-7000-8000-000000000004',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "match",
    "kind": "entity_type",
    "description": "Sportmatch — Allsvenskan, SHL, landskamp. Biljetter säljs per match.",
    "label_schema": {
      "type": "object",
      "properties": {
        "home_team": { "type": "string" },
        "away_team": { "type": "string" },
        "date": { "type": "string", "format": "date" },
        "venue": { "type": "string" },
        "league": { "type": "string", "enum": ["allsvenskan", "shl", "damallsvenskan", "landskamp", "other"] },
        "capacity": { "type": "integer" },
        "tickets_sold": { "type": "integer" },
        "status": { "type": "string", "enum": ["scheduled", "on_sale", "sold_out", "completed", "postponed"] }
      },
      "required": ["home_team", "away_team", "date"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000010', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: ticket_batch
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000011', '10000000-0000-7000-8000-000000000004', 'type_created',
   '{"type_name": "ticket_batch", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000011', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000011',
  '10000000-0000-7000-8000-000000000004',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "ticket_batch",
    "kind": "entity_type",
    "description": "Biljettparti — en allokering av biljetter för en specifik match eller event.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "quantity": { "type": "integer" },
        "price_per_ticket": { "type": "number" },
        "section": { "type": "string" },
        "available": { "type": "integer" },
        "status": { "type": "string", "enum": ["available", "reserved", "sold_out"] }
      },
      "required": ["name", "quantity", "price_per_ticket"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000011', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: package
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000012', '10000000-0000-7000-8000-000000000004', 'type_created',
   '{"type_name": "package", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000012', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000012',
  '10000000-0000-7000-8000-000000000004',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "package",
    "kind": "entity_type",
    "description": "Paketlösning som kombinerar biljetter med boende eller andra tjänster. Säljs till slutkund eller via resebyråpartner.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "includes_tickets": { "type": "integer" },
        "includes_nights": { "type": "integer" },
        "price": { "type": "number" },
        "valid_from": { "type": "string", "format": "date" },
        "valid_to": { "type": "string", "format": "date" },
        "status": { "type": "string", "enum": ["draft", "active", "expired", "sold_out"] }
      },
      "required": ["name", "price"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000012', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Type: partner
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000013', '10000000-0000-7000-8000-000000000004', 'type_created',
   '{"type_name": "partner", "kind": "entity_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000013', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000013',
  '10000000-0000-7000-8000-000000000004',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "partner",
    "kind": "entity_type",
    "description": "Samarbetspartner — resebyrå, hotell, eventarrangör som säljer eller inkluderar Nordic Tickets produkter.",
    "label_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "type": { "type": "string", "enum": ["travel_agency", "hotel", "event_organizer", "corporate", "other"] },
        "contact_person": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "commission_rate": { "type": "number" },
        "status": { "type": "string", "enum": ["active", "inactive", "pending"] }
      },
      "required": ["name"]
    }
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000013', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;
```

### 2.17 Pettson seed data — Edge type nodes

Edge types define the relationships. They are also type nodes (kind = 'edge_type')
with `type_node_id` pointing to the metatype.

```sql
-- ============================================================
-- PETTSON SEED DATA: EDGE TYPE NODES
-- Relationship types used in the Pettson scenario.
-- These are shared across tenants (created in the system tenant)
-- so that cross-tenant edges can reference them.
-- ============================================================

-- Edge type: includes (package includes property/tickets)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000020', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "includes", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000020', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000020',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "includes",
    "kind": "edge_type",
    "description": "Source includes target as a component. E.g. package includes property."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000020', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Edge type: sells (campaign sells ticket_batch)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000021', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "sells", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000021', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000021',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "sells",
    "kind": "edge_type",
    "description": "Source sells or promotes target. E.g. campaign sells ticket_batch."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000021', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Edge type: also_booked (lead also booked cabin)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000022', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "also_booked", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000022', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000022',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "also_booked",
    "kind": "edge_type",
    "description": "Source also booked target. Cross-entity relationship, e.g. lead also booked a cabin."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000022', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Edge type: contacted_via (lead contacted via campaign)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000023', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "contacted_via", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000023', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000023',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "contacted_via",
    "kind": "edge_type",
    "description": "Source was contacted via target channel/campaign."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000023', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Edge type: booked_at (booking at property)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000024', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "booked_at", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000024', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000024',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "booked_at",
    "kind": "edge_type",
    "description": "Booking is at a specific property."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000024', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Edge type: for_match (ticket_batch for match)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000025', '00000000-0000-7000-8000-000000000000', 'type_created',
   '{"type_name": "for_match", "kind": "edge_type"}'::JSONB,
   '30000000-0000-7000-8000-000000000025', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '30000000-0000-7000-8000-000000000025',
  '00000000-0000-7000-8000-000000000000',
  '00000000-0000-7000-8000-000000000002',
  '{
    "name": "for_match",
    "kind": "edge_type",
    "description": "Ticket batch is allocated for a specific match."
  }'::JSONB,
  'confirmed', '2026-01-01T00:00:00Z', 'infinity', '2026-01-01T00:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000025', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;
```

### 2.18 Pettson seed data — Sample entities

At least one entity per type, with realistic Swedish construction/events industry data.

```sql
-- ============================================================
-- PETTSON SEED DATA: SAMPLE ENTITIES
-- Realistic data for the Swedish events/construction industry.
-- ============================================================

-- ─── TAYLOR EVENTS ENTITIES ───

-- Lead: Johan Eriksson (interested in football + cabin)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000030', '10000000-0000-7000-8000-000000000002', 'entity_created',
   '{"entity_type": "lead", "data": {"name": "Johan Eriksson"}}'::JSONB,
   '40000000-0000-7000-8000-000000000001', '2026-01-10T09:00:00Z', '2026-01-10T09:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000001',  -- lead type
  '{
    "name": "Johan Eriksson",
    "company": "Eriksson Bygg AB",
    "email": "johan@erikssonbygg.se",
    "phone": "070-123 45 67",
    "source": "mässa",
    "interest": "Fotbollsbiljetter och stugpaket för företagsevent med 20 personer",
    "status": "qualified",
    "estimated_value": 85000,
    "notes": "Träffade Johan på Stugmässan i Sälen. Vill ha 20 biljetter till Allsvenskan + stugor för midsommar."
  }'::JSONB,
  'asserted', '2026-01-10T09:00:00Z', 'infinity', '2026-01-10T09:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000030', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Campaign: Sommarfestival 2026
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000031', '10000000-0000-7000-8000-000000000002', 'entity_created',
   '{"entity_type": "campaign", "data": {"name": "Sommarfestival 2026"}}'::JSONB,
   '40000000-0000-7000-8000-000000000002', '2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000002',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000002',  -- campaign type
  '{
    "name": "Sommarfestival 2026",
    "description": "Kombinerat stugpaket + biljetter för Allsvenskan och festivaler i Dalarna",
    "start_date": "2026-05-01",
    "end_date": "2026-08-31",
    "budget": 250000,
    "status": "active",
    "channel": "partner",
    "target_audience": "Företag och grupper som vill kombinera sport och semester"
  }'::JSONB,
  'asserted', '2026-01-15T10:00:00Z', 'infinity', '2026-01-15T10:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000031', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Venue: Tele2 Arena
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000032', '10000000-0000-7000-8000-000000000002', 'entity_created',
   '{"entity_type": "venue", "data": {"name": "Tele2 Arena"}}'::JSONB,
   '40000000-0000-7000-8000-000000000003', '2026-01-05T08:00:00Z', '2026-01-05T08:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000003',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000004',  -- venue type
  '{
    "name": "Tele2 Arena",
    "address": "Arenaslingan 14",
    "city": "Stockholm",
    "capacity": 33000,
    "type": "arena",
    "contact_person": "Anna Lindqvist",
    "contact_phone": "08-600 91 00"
  }'::JSONB,
  'confirmed', '2026-01-05T08:00:00Z', 'infinity', '2026-01-05T08:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000032', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Contact: Maria Svensson
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000033', '10000000-0000-7000-8000-000000000002', 'entity_created',
   '{"entity_type": "contact", "data": {"name": "Maria Svensson"}}'::JSONB,
   '40000000-0000-7000-8000-000000000004', '2026-01-08T14:00:00Z', '2026-01-08T14:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000004',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000005',  -- contact type
  '{
    "name": "Maria Svensson",
    "email": "maria@taylorevents.se",
    "phone": "073-456 78 90",
    "company": "Taylor Events AB",
    "role": "Säljchef",
    "notes": "Ansvarig för företagspaket och partnerrelationer"
  }'::JSONB,
  'confirmed', '2026-01-08T14:00:00Z', 'infinity', '2026-01-08T14:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000033', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- ─── MOUNTAIN CABINS ENTITIES ───

-- Property: Fjällstuga Björnen
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000034', '10000000-0000-7000-8000-000000000003', 'entity_created',
   '{"entity_type": "property", "data": {"name": "Fjällstuga Björnen"}}'::JSONB,
   '40000000-0000-7000-8000-000000000005', '2026-01-02T10:00:00Z', '2026-01-02T10:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000005',
  '10000000-0000-7000-8000-000000000003',
  '30000000-0000-7000-8000-000000000006',  -- property type
  '{
    "name": "Fjällstuga Björnen",
    "address": "Fjällvägen 12, Sälen",
    "area": "Lindvallen",
    "beds": 8,
    "amenities": ["bastu", "spis", "wifi", "diskmaskin", "parkeringsplats"],
    "price_per_night": 2800,
    "status": "available",
    "description": "Rymlig fjällstuga med bastu och öppen spis. 200m till liften. Perfekt för familjer och grupper."
  }'::JSONB,
  'confirmed', '2026-01-02T10:00:00Z', 'infinity', '2026-01-02T10:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000034', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Booking: Midsommar bokning (Johan Eriksson)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000035', '10000000-0000-7000-8000-000000000003', 'entity_created',
   '{"entity_type": "booking", "data": {"guest_name": "Johan Eriksson"}}'::JSONB,
   '40000000-0000-7000-8000-000000000006', '2026-02-01T11:00:00Z', '2026-02-01T11:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000006',
  '10000000-0000-7000-8000-000000000003',
  '30000000-0000-7000-8000-000000000007',  -- booking type
  '{
    "guest_name": "Johan Eriksson",
    "check_in": "2026-06-19",
    "check_out": "2026-06-22",
    "guests": 8,
    "total_price": 8400,
    "status": "confirmed",
    "payment_status": "partial",
    "notes": "Midsommarbokning. Del av företagspaket via Taylor Events."
  }'::JSONB,
  'asserted', '2026-02-01T11:00:00Z', 'infinity', '2026-02-01T11:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000035', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Guest: Johan Eriksson (as guest in Mountain Cabins)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000036', '10000000-0000-7000-8000-000000000003', 'entity_created',
   '{"entity_type": "guest", "data": {"name": "Johan Eriksson"}}'::JSONB,
   '40000000-0000-7000-8000-000000000007', '2026-02-01T11:05:00Z', '2026-02-01T11:05:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000007',
  '10000000-0000-7000-8000-000000000003',
  '30000000-0000-7000-8000-000000000008',  -- guest type
  '{
    "name": "Johan Eriksson",
    "email": "johan@erikssonbygg.se",
    "phone": "070-123 45 67",
    "address": "Storgatan 15, Falun",
    "loyalty_tier": "standard",
    "total_bookings": 1,
    "notes": "Företagskund via Taylor Events kampanj"
  }'::JSONB,
  'asserted', '2026-02-01T11:05:00Z', 'infinity', '2026-02-01T11:05:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000036', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Season: Midsommar 2026
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000037', '10000000-0000-7000-8000-000000000003', 'entity_created',
   '{"entity_type": "season", "data": {"name": "Midsommar 2026"}}'::JSONB,
   '40000000-0000-7000-8000-000000000008', '2026-01-03T09:00:00Z', '2026-01-03T09:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000008',
  '10000000-0000-7000-8000-000000000003',
  '30000000-0000-7000-8000-000000000009',  -- season type
  '{
    "name": "Midsommar 2026",
    "start_date": "2026-06-15",
    "end_date": "2026-06-28",
    "price_multiplier": 1.5,
    "min_nights": 3,
    "status": "upcoming"
  }'::JSONB,
  'confirmed', '2026-01-03T09:00:00Z', 'infinity', '2026-01-03T09:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000037', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- ─── NORDIC TICKETS ENTITIES ───

-- Match: Djurgården vs Hammarby (Allsvenskan)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000038', '10000000-0000-7000-8000-000000000004', 'entity_created',
   '{"entity_type": "match", "data": {"home_team": "Djurgården", "away_team": "Hammarby"}}'::JSONB,
   '40000000-0000-7000-8000-000000000009', '2026-01-20T12:00:00Z', '2026-01-20T12:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000009',
  '10000000-0000-7000-8000-000000000004',
  '30000000-0000-7000-8000-000000000010',  -- match type
  '{
    "home_team": "Djurgården",
    "away_team": "Hammarby",
    "date": "2026-06-20",
    "venue": "Tele2 Arena",
    "league": "allsvenskan",
    "capacity": 33000,
    "tickets_sold": 12000,
    "status": "on_sale"
  }'::JSONB,
  'confirmed', '2026-01-20T12:00:00Z', 'infinity', '2026-01-20T12:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000038', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Ticket batch: Allsvenskan VIP 20-pack
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000039', '10000000-0000-7000-8000-000000000004', 'entity_created',
   '{"entity_type": "ticket_batch", "data": {"name": "Allsvenskan VIP 20-pack"}}'::JSONB,
   '40000000-0000-7000-8000-000000000010', '2026-01-22T15:00:00Z', '2026-01-22T15:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000010',
  '10000000-0000-7000-8000-000000000004',
  '30000000-0000-7000-8000-000000000011',  -- ticket_batch type
  '{
    "name": "Allsvenskan VIP 20-pack",
    "quantity": 20,
    "price_per_ticket": 950,
    "section": "VIP Västra",
    "available": 20,
    "status": "available"
  }'::JSONB,
  'confirmed', '2026-01-22T15:00:00Z', 'infinity', '2026-01-22T15:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000039', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Package: Midsommar Sport & Stuga
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000040', '10000000-0000-7000-8000-000000000004', 'entity_created',
   '{"entity_type": "package", "data": {"name": "Midsommar Sport & Stuga"}}'::JSONB,
   '40000000-0000-7000-8000-000000000011', '2026-01-25T09:00:00Z', '2026-01-25T09:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000011',
  '10000000-0000-7000-8000-000000000004',
  '30000000-0000-7000-8000-000000000012',  -- package type
  '{
    "name": "Midsommar Sport & Stuga",
    "description": "Kombinera Allsvenskan-biljetter med stugboende i Sälenfjällen. 3 nätter + matchbiljett.",
    "includes_tickets": 1,
    "includes_nights": 3,
    "price": 4950,
    "valid_from": "2026-06-15",
    "valid_to": "2026-06-28",
    "status": "active"
  }'::JSONB,
  'confirmed', '2026-01-25T09:00:00Z', 'infinity', '2026-01-25T09:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000040', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Partner: Fjällresor AB (travel agency)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000041', '10000000-0000-7000-8000-000000000004', 'entity_created',
   '{"entity_type": "partner", "data": {"name": "Fjällresor AB"}}'::JSONB,
   '40000000-0000-7000-8000-000000000012', '2026-01-12T13:00:00Z', '2026-01-12T13:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000012',
  '10000000-0000-7000-8000-000000000004',
  '30000000-0000-7000-8000-000000000013',  -- partner type
  '{
    "name": "Fjällresor AB",
    "type": "travel_agency",
    "contact_person": "Erik Bergström",
    "email": "erik@fjallresor.se",
    "phone": "0771-123 456",
    "commission_rate": 0.12,
    "status": "active"
  }'::JSONB,
  'confirmed', '2026-01-12T13:00:00Z', 'infinity', '2026-01-12T13:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000041', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;
```

### 2.19 Pettson seed data — Intra-tenant edges

```sql
-- ============================================================
-- PETTSON SEED DATA: INTRA-TENANT EDGES
-- Relationships within a single tenant.
-- ============================================================

-- Lead Johan contacted_via campaign Sommarfestival
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000050', '10000000-0000-7000-8000-000000000002', 'edge_created',
   '{"edge_type": "contacted_via", "source": "lead:Johan Eriksson", "target": "campaign:Sommarfestival 2026"}'::JSONB,
   '40000000-0000-7000-8000-000000000001', '2026-01-18T10:00:00Z', '2026-01-18T10:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000023',  -- contacted_via edge type
  '40000000-0000-7000-8000-000000000001',  -- Johan (lead)
  '40000000-0000-7000-8000-000000000002',  -- Sommarfestival (campaign)
  '{"channel": "mässa", "date": "2026-01-18"}'::JSONB,
  '2026-01-18T10:00:00Z', 'infinity', '2026-01-18T10:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000050', false
)
ON CONFLICT (edge_id) DO NOTHING;

-- Booking booked_at property Fjällstuga Björnen
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000051', '10000000-0000-7000-8000-000000000003', 'edge_created',
   '{"edge_type": "booked_at", "source": "booking:Johan", "target": "property:Björnen"}'::JSONB,
   '40000000-0000-7000-8000-000000000006', '2026-02-01T11:10:00Z', '2026-02-01T11:10:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000002',
  '10000000-0000-7000-8000-000000000003',
  '30000000-0000-7000-8000-000000000024',  -- booked_at edge type
  '40000000-0000-7000-8000-000000000006',  -- booking (Johan)
  '40000000-0000-7000-8000-000000000005',  -- property (Björnen)
  '{}'::JSONB,
  '2026-02-01T11:10:00Z', 'infinity', '2026-02-01T11:10:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000051', false
)
ON CONFLICT (edge_id) DO NOTHING;

-- Ticket batch for_match Djurgården vs Hammarby
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000052', '10000000-0000-7000-8000-000000000004', 'edge_created',
   '{"edge_type": "for_match", "source": "ticket_batch:VIP 20", "target": "match:DIF-HIF"}'::JSONB,
   '40000000-0000-7000-8000-000000000010', '2026-01-22T15:05:00Z', '2026-01-22T15:05:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000003',
  '10000000-0000-7000-8000-000000000004',
  '30000000-0000-7000-8000-000000000025',  -- for_match edge type
  '40000000-0000-7000-8000-000000000010',  -- ticket batch (VIP 20)
  '40000000-0000-7000-8000-000000000009',  -- match (DIF vs HIF)
  '{}'::JSONB,
  '2026-01-22T15:05:00Z', 'infinity', '2026-01-22T15:05:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000052', false
)
ON CONFLICT (edge_id) DO NOTHING;
```

### 2.20 Pettson seed data — Cross-tenant edges

These are the federation edges that connect entities across tenant boundaries.
They are owned by the tenant that initiates the connection. The grants table
provides the fine-grained access control.

```sql
-- ============================================================
-- PETTSON SEED DATA: CROSS-TENANT EDGES (3 as specified in gen0)
--
-- 1. package(nordic_tickets)  --[includes]-->  property(mountain_cabins)
-- 2. campaign(taylor_events)  --[sells]-->     ticket_batch(nordic_tickets)
-- 3. lead(taylor_events)      --[also_booked]--> booking(mountain_cabins)
--
-- Edge tenant_id = the tenant that owns/initiated the relationship.
-- ============================================================

-- Cross-tenant edge 1: Package includes Property
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000060', '10000000-0000-7000-8000-000000000004', 'edge_created',
   '{"edge_type": "includes", "cross_tenant": true, "source_tenant": "nordic_tickets", "target_tenant": "mountain_cabins"}'::JSONB,
   '40000000-0000-7000-8000-000000000011', '2026-01-26T10:00:00Z', '2026-01-26T10:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000010',
  '10000000-0000-7000-8000-000000000004',  -- owned by nordic_tickets
  '30000000-0000-7000-8000-000000000020',  -- includes edge type
  '40000000-0000-7000-8000-000000000011',  -- package (nordic_tickets)
  '40000000-0000-7000-8000-000000000005',  -- property (mountain_cabins)
  '{"description": "Midsommar Sport & Stuga paketet inkluderar Fjällstuga Björnen"}'::JSONB,
  '2026-01-26T10:00:00Z', 'infinity', '2026-01-26T10:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000060', false
)
ON CONFLICT (edge_id) DO NOTHING;

-- Cross-tenant edge 2: Campaign sells Ticket batch
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000061', '10000000-0000-7000-8000-000000000002', 'edge_created',
   '{"edge_type": "sells", "cross_tenant": true, "source_tenant": "taylor_events", "target_tenant": "nordic_tickets"}'::JSONB,
   '40000000-0000-7000-8000-000000000002', '2026-01-28T14:00:00Z', '2026-01-28T14:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000011',
  '10000000-0000-7000-8000-000000000002',  -- owned by taylor_events
  '30000000-0000-7000-8000-000000000021',  -- sells edge type
  '40000000-0000-7000-8000-000000000002',  -- campaign (taylor_events)
  '40000000-0000-7000-8000-000000000010',  -- ticket_batch (nordic_tickets)
  '{"description": "Sommarfestival 2026 kampanjen säljer VIP-biljetter till Allsvenskan"}'::JSONB,
  '2026-01-28T14:00:00Z', 'infinity', '2026-01-28T14:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000061', false
)
ON CONFLICT (edge_id) DO NOTHING;

-- Cross-tenant edge 3: Lead also_booked Booking
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000062', '10000000-0000-7000-8000-000000000002', 'edge_created',
   '{"edge_type": "also_booked", "cross_tenant": true, "source_tenant": "taylor_events", "target_tenant": "mountain_cabins"}'::JSONB,
   '40000000-0000-7000-8000-000000000001', '2026-02-02T09:00:00Z', '2026-02-02T09:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '50000000-0000-7000-8000-000000000012',
  '10000000-0000-7000-8000-000000000002',  -- owned by taylor_events
  '30000000-0000-7000-8000-000000000022',  -- also_booked edge type
  '40000000-0000-7000-8000-000000000001',  -- lead Johan (taylor_events)
  '40000000-0000-7000-8000-000000000006',  -- booking (mountain_cabins)
  '{"description": "Johan Eriksson (lead i Taylor Events) bokade även stuga via Mountain Cabins"}'::JSONB,
  '2026-02-02T09:00:00Z', 'infinity', '2026-02-02T09:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000062', false
)
ON CONFLICT (edge_id) DO NOTHING;
```

### 2.21 Pettson seed data — Grants

Four grants as defined in the gen0 spec. These enable cross-tenant access.

```sql
-- ============================================================
-- PETTSON SEED DATA: GRANTS (4 as specified in gen0)
--
-- 1. Grant(subject=taylor_events, object=packages in nordic_tickets, capability=READ)
-- 2. Grant(subject=taylor_events, object=properties in mountain_cabins, capability=READ)
-- 3. Grant(subject=mountain_cabins, object=packages in nordic_tickets, capability=READ)
-- 4. Grant(subject=nordic_tickets, object=properties in mountain_cabins, capability=TRAVERSE)
--
-- Note: object_node_id points to TYPE NODES, not individual entities.
-- A grant on a type node means "access to all entities of this type".
-- This is application-enforced: the explore_graph tool checks grants
-- for each node it encounters during traversal.
-- ============================================================

-- Grant 1: Taylor Events can READ packages in Nordic Tickets
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000070', '10000000-0000-7000-8000-000000000004', 'grant_created',
   '{"subject": "taylor_events", "object": "package", "capability": "READ"}'::JSONB,
   NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO grants (grant_id, tenant_id, subject_tenant_id, object_node_id, capability, valid_from, valid_to, created_by, created_by_event)
VALUES (
  '60000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000004',  -- issued by nordic_tickets
  '10000000-0000-7000-8000-000000000002',  -- subject: taylor_events
  '30000000-0000-7000-8000-000000000012',  -- object: package type node
  'READ',
  '2026-01-01T00:00:00Z', 'infinity',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000070'
)
ON CONFLICT (grant_id) DO NOTHING;

-- Grant 2: Taylor Events can READ properties in Mountain Cabins
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000071', '10000000-0000-7000-8000-000000000003', 'grant_created',
   '{"subject": "taylor_events", "object": "property", "capability": "READ"}'::JSONB,
   NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO grants (grant_id, tenant_id, subject_tenant_id, object_node_id, capability, valid_from, valid_to, created_by, created_by_event)
VALUES (
  '60000000-0000-7000-8000-000000000002',
  '10000000-0000-7000-8000-000000000003',  -- issued by mountain_cabins
  '10000000-0000-7000-8000-000000000002',  -- subject: taylor_events
  '30000000-0000-7000-8000-000000000006',  -- object: property type node
  'READ',
  '2026-01-01T00:00:00Z', 'infinity',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000071'
)
ON CONFLICT (grant_id) DO NOTHING;

-- Grant 3: Mountain Cabins can READ packages in Nordic Tickets
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000072', '10000000-0000-7000-8000-000000000004', 'grant_created',
   '{"subject": "mountain_cabins", "object": "package", "capability": "READ"}'::JSONB,
   NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO grants (grant_id, tenant_id, subject_tenant_id, object_node_id, capability, valid_from, valid_to, created_by, created_by_event)
VALUES (
  '60000000-0000-7000-8000-000000000003',
  '10000000-0000-7000-8000-000000000004',  -- issued by nordic_tickets
  '10000000-0000-7000-8000-000000000003',  -- subject: mountain_cabins
  '30000000-0000-7000-8000-000000000012',  -- object: package type node
  'READ',
  '2026-01-01T00:00:00Z', 'infinity',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000072'
)
ON CONFLICT (grant_id) DO NOTHING;

-- Grant 4: Nordic Tickets can TRAVERSE properties in Mountain Cabins
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000073', '10000000-0000-7000-8000-000000000003', 'grant_created',
   '{"subject": "nordic_tickets", "object": "property", "capability": "TRAVERSE"}'::JSONB,
   NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO grants (grant_id, tenant_id, subject_tenant_id, object_node_id, capability, valid_from, valid_to, created_by, created_by_event)
VALUES (
  '60000000-0000-7000-8000-000000000004',
  '10000000-0000-7000-8000-000000000003',  -- issued by mountain_cabins
  '10000000-0000-7000-8000-000000000004',  -- subject: nordic_tickets
  '30000000-0000-7000-8000-000000000006',  -- object: property type node
  'TRAVERSE',
  '2026-01-01T00:00:00Z', 'infinity',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000073'
)
ON CONFLICT (grant_id) DO NOTHING;
```

### 2.22 Pettson seed data — Bitemporal history for T07

Test T07 requires a lead that was updated on Feb 1, so a point-in-time query for Jan 15
returns the original data. We create a second version of the Johan lead with updated status.

```sql
-- ============================================================
-- PETTSON SEED DATA: BITEMPORAL HISTORY
-- Create a second version of the Johan lead to support T07.
-- The original version (valid_from = Jan 10) gets valid_to = Feb 1.
-- The new version (valid_from = Feb 1) has updated status.
-- ============================================================

-- First, close out the original version by inserting a new event
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, recorded_at, created_by)
VALUES
  ('20000000-0000-7000-8000-000000000080', '10000000-0000-7000-8000-000000000002', 'entity_updated',
   '{"entity_type": "lead", "changes": {"status": "qualified -> proposal", "estimated_value": "85000 -> 95000"}}'::JSONB,
   '40000000-0000-7000-8000-000000000001', '2026-02-01T14:00:00Z', '2026-02-01T14:00:00Z',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (event_id) DO NOTHING;

-- Close the original version (set valid_to)
-- NOTE: In a real system, this is done atomically in a transaction.
-- For seed data, we delete and re-insert with the correct valid_to.
-- This is the ONLY place we do DELETE in this schema — seed data correction only.
DELETE FROM nodes
WHERE node_id = '40000000-0000-7000-8000-000000000001'
  AND valid_from = '2026-01-10T09:00:00Z';

INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000001',
  '{
    "name": "Johan Eriksson",
    "company": "Eriksson Bygg AB",
    "email": "johan@erikssonbygg.se",
    "phone": "070-123 45 67",
    "source": "mässa",
    "interest": "Fotbollsbiljetter och stugpaket för företagsevent med 20 personer",
    "status": "qualified",
    "estimated_value": 85000,
    "notes": "Träffade Johan på Stugmässan i Sälen. Vill ha 20 biljetter till Allsvenskan + stugor för midsommar."
  }'::JSONB,
  'asserted', '2026-01-10T09:00:00Z', '2026-02-01T14:00:00Z', '2026-01-10T09:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000030', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;

-- Insert the new version with updated data
INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  '40000000-0000-7000-8000-000000000001',
  '10000000-0000-7000-8000-000000000002',
  '30000000-0000-7000-8000-000000000001',
  '{
    "name": "Johan Eriksson",
    "company": "Eriksson Bygg AB",
    "email": "johan@erikssonbygg.se",
    "phone": "070-123 45 67",
    "source": "mässa",
    "interest": "Fotbollsbiljetter och stugpaket för företagsevent med 20 personer",
    "status": "proposal",
    "estimated_value": 95000,
    "notes": "Träffade Johan på Stugmässan i Sälen. Vill ha 20 biljetter till Allsvenskan + stugor för midsommar. Offert skickad 2026-02-01."
  }'::JSONB,
  'asserted', '2026-02-01T14:00:00Z', 'infinity', '2026-02-01T14:00:00Z',
  '00000000-0000-0000-0000-000000000000', '20000000-0000-7000-8000-000000000080', false
)
ON CONFLICT (node_id, valid_from) DO NOTHING;
```

### 2.23 Seed data summary — UUID quick-reference

For implementors and test writers, here is the complete UUID reference table:

```
SYSTEM UUIDS:
  System tenant:     00000000-0000-7000-8000-000000000000
  Bootstrap event:   00000000-0000-7000-8000-000000000001
  Metatype node:     00000000-0000-7000-8000-000000000002
  System user:       00000000-0000-0000-0000-000000000000

TENANT UUIDS:
  Pettson Holding:   10000000-0000-7000-8000-000000000001
  Taylor Events:     10000000-0000-7000-8000-000000000002
  Mountain Cabins:   10000000-0000-7000-8000-000000000003
  Nordic Tickets:    10000000-0000-7000-8000-000000000004

TYPE NODE UUIDS (entity types):
  Taylor Events:
    lead:            30000000-0000-7000-8000-000000000001
    campaign:        30000000-0000-7000-8000-000000000002
    event:           30000000-0000-7000-8000-000000000003
    venue:           30000000-0000-7000-8000-000000000004
    contact:         30000000-0000-7000-8000-000000000005
  Mountain Cabins:
    property:        30000000-0000-7000-8000-000000000006
    booking:         30000000-0000-7000-8000-000000000007
    guest:           30000000-0000-7000-8000-000000000008
    season:          30000000-0000-7000-8000-000000000009
  Nordic Tickets:
    match:           30000000-0000-7000-8000-000000000010
    ticket_batch:    30000000-0000-7000-8000-000000000011
    package:         30000000-0000-7000-8000-000000000012
    partner:         30000000-0000-7000-8000-000000000013

TYPE NODE UUIDS (edge types, in system tenant):
  includes:          30000000-0000-7000-8000-000000000020
  sells:             30000000-0000-7000-8000-000000000021
  also_booked:       30000000-0000-7000-8000-000000000022
  contacted_via:     30000000-0000-7000-8000-000000000023
  booked_at:         30000000-0000-7000-8000-000000000024
  for_match:         30000000-0000-7000-8000-000000000025

ENTITY UUIDS:
  Johan (lead):              40000000-0000-7000-8000-000000000001
  Sommarfestival (campaign):  40000000-0000-7000-8000-000000000002
  Tele2 Arena (venue):       40000000-0000-7000-8000-000000000003
  Maria Svensson (contact):  40000000-0000-7000-8000-000000000004
  Björnen (property):        40000000-0000-7000-8000-000000000005
  Midsommar booking:         40000000-0000-7000-8000-000000000006
  Johan (guest):             40000000-0000-7000-8000-000000000007
  Midsommar season:          40000000-0000-7000-8000-000000000008
  DIF vs HIF (match):        40000000-0000-7000-8000-000000000009
  VIP 20-pack (tickets):     40000000-0000-7000-8000-000000000010
  Sport & Stuga (package):   40000000-0000-7000-8000-000000000011
  Fjällresor (partner):      40000000-0000-7000-8000-000000000012

EDGE UUIDS:
  Intra-tenant:
    Johan contacted_via Sommarfestival:   50000000-0000-7000-8000-000000000001
    Booking booked_at Björnen:            50000000-0000-7000-8000-000000000002
    VIP tickets for_match DIF-HIF:        50000000-0000-7000-8000-000000000003
  Cross-tenant:
    Package includes Property:            50000000-0000-7000-8000-000000000010
    Campaign sells Ticket batch:          50000000-0000-7000-8000-000000000011
    Lead also_booked Booking:             50000000-0000-7000-8000-000000000012

GRANT UUIDS:
  TE reads NT packages:     60000000-0000-7000-8000-000000000001
  TE reads MC properties:   60000000-0000-7000-8000-000000000002
  MC reads NT packages:     60000000-0000-7000-8000-000000000003
  NT traverses MC props:    60000000-0000-7000-8000-000000000004
```

### 2.24 Design decisions documented in this artifact

| Decision | ID | Resolution | Section |
|---|---|---|---|
| type_node_id FK enforcement | — | Application-enforced, not FK. Composite PK prevents standard FK. | 2.7 |
| source_id/target_id FK enforcement | — | Application-enforced. Same rationale as type_node_id. | 2.8 |
| node_id FK in blobs/grants | — | Application-enforced. node_id column, not FK constraint. | 2.9, 2.10 |
| RLS for cross-tenant edges | D-006 | Application-level enforcement with service-role bypass. | 2.8 |
| Embedding dimensions | D-001 | 1536 with text-embedding-3-small. | 2.7 |
| UUIDv7 for events | D-007 | Yes, with recorded_at retained. | 2.6 |
| Blob storage | D-008 | Supabase Storage (external). storage_ref column. | 2.10 |
| Dedup strategy | D-005 | Hybrid pg_trgm + embedding cosine. | 2.13 |

---

## 3. ARTIFACT 2 — TOOL SPECIFICATIONS

This section specifies all 15 MCP tools registered by the Resonansia MCP Server. Each tool definition is detailed enough to implement directly: exact Zod input schemas, exact SQL queries (parameterized), exact output types, exact error codes, and event patterns.

### 3.0 Conventions

**Scope checking.** Every tool call begins with scope validation. The scope syntax is `tenant:{tenant_id}:{resource}:{action}` (see section 4 of gen0-v3). The shorthand `tenant:{tid}:read` grants read access to all resources; `tenant:{tid}:write` grants write access to all resources. The `admin` scope bypasses all checks.

**User ID.** Extracted from `ctx.jwt.sub` (the authenticated user or agent identity). Used as `created_by` in events and fact rows.

**Tenant ID.** Extracted from tool input parameters. Validated against `ctx.jwt.tenant_ids`.

**Event-first pattern.** All mutations follow: BEGIN -> INSERT event -> project to fact tables -> COMMIT. The event `event_id` is generated via `uuidv7()` inside the transaction.

**Embedding generation.** Embedding is generated asynchronously after entity creation/update. The tool returns immediately; the embedding is populated by a background job. For `find_entities` with semantic search, only nodes with non-NULL embeddings are returned.

**RLS bypass.** Tool implementations use the Supabase service-role client (bypasses RLS) and enforce tenant access at the application level. This is required because cross-tenant operations (federation) need to read across tenant boundaries that RLS would block.

**Error response format.** All errors are returned as MCP tool results with `isError: true`:

```typescript
interface ToolError {
  code: string;            // machine-readable error code
  message: string;         // human-readable description
  hint?: string;           // self-correction guidance for the LLM
  details?: Record<string, unknown>;
}
```

**Common error codes** (apply to all tools unless overridden):

| Code | Message | Hint |
|---|---|---|
| `UNAUTHORIZED` | Actor lacks required scope for this operation. | Check that your token includes the required scope. Use `get_schema` to discover available entity types. |
| `TENANT_NOT_FOUND` | Tenant ID not found or not accessible. | Verify tenant_id is correct and included in your token's tenant_ids claim. |
| `INVALID_INPUT` | Input validation failed. | Check the input against the tool's schema. The `details` field contains specific validation errors. |
| `INTERNAL_ERROR` | An unexpected error occurred. | Retry the operation. If the error persists, report to the system administrator. |

---

### 3.1 Tool 1: `store_entity`

Create a new entity or update an existing one. Event-first: creates an event, then projects to the nodes table. Updates close the previous version and insert a new one.

#### 3.1.1 Registration

```typescript
server.registerTool("store_entity", {
  title: "Store Entity",
  description:
    "Create a new entity or update an existing one in the knowledge graph. " +
    "Validates data against the type node's label_schema. " +
    "Creates an event first, then projects to the nodes table. " +
    "For updates, provide entity_id to create a new version (closes previous). " +
    "Returns the entity with its node_id and event_id.",
  inputSchema: StoreEntityInput,
});
```

#### 3.1.2 Input schema

```typescript
const StoreEntityInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this entity."),
  entity_id: z.string().uuid().optional().describe(
    "If provided, updates the existing entity (creates new version). " +
    "If omitted, creates a new entity with a generated node_id."
  ),
  type_node_id: z.string().uuid().describe(
    "UUID of the type node defining this entity's schema. " +
    "Use get_schema to discover available type nodes."
  ),
  data: z.record(z.unknown()).describe(
    "Entity data. Must conform to the type node's label_schema. " +
    "For updates, this is the COMPLETE new data (not a partial patch)."
  ),
  epistemic: z.enum(["hypothesis", "asserted", "confirmed"]).default("asserted").describe(
    "Epistemic status. 'hypothesis' = LLM-inferred, 'asserted' = human-stated, 'confirmed' = verified."
  ),
  occurred_at: z.string().datetime().optional().describe(
    "Business time: when this actually happened. Defaults to now(). " +
    "Use this for backdated entries (e.g., recording a meeting that happened yesterday)."
  ),
});
```

#### 3.1.3 Output schema

```typescript
interface StoreEntityOutput {
  entity_id: string;          // node_id of the created/updated entity
  event_id: string;           // event_id of the created event
  type_node_id: string;       // echoed back for confirmation
  version: number;            // version count (1 for new, N+1 for update)
  valid_from: string;         // ISO 8601 timestamp of this version's start
  is_update: boolean;         // true if this was an update, false if new
  data: Record<string, unknown>;  // the stored data (echoed back)
}
```

#### 3.1.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR tenant:{tenant_id}:nodes:{type_name}:write OR admin
  - Extract user_id from ctx.jwt.sub

Step 2: Validate type_node_id exists
  SQL:
```

```sql
SELECT n.node_id, n.data
FROM nodes n
WHERE n.node_id = $1
  AND n.tenant_id = $2
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND n.data->>'kind' = 'entity_type';
-- $1 = type_node_id, $2 = tenant_id
```

```
  If no rows: return error TYPE_NOT_FOUND.

Step 3: Validate data against label_schema
  - Extract label_schema from type_node.data.label_schema
  - Validate input.data against label_schema (JSON Schema validation)
  - If validation fails: return error SCHEMA_VALIDATION_FAILED with details.

Step 4: If entity_id provided (update), verify existing entity
  SQL:
```

```sql
SELECT n.node_id, n.valid_from, n.data, n.epistemic
FROM nodes n
WHERE n.node_id = $1
  AND n.tenant_id = $2
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = entity_id, $2 = tenant_id
```

```
  If no rows and entity_id was provided: return error ENTITY_NOT_FOUND.

Step 5: Generate IDs
  - new_node_id = entity_id ?? crypto.randomUUID()  (reuse for updates, generate for creates)
  - valid_from = occurred_at ?? now()
  - intent_type = entity_id ? "entity_updated" : "entity_created"

Step 6: Execute transaction
  SQL (atomic):
```

```sql
BEGIN;

-- Step 6a: Insert event FIRST (INV-LINEAGE)
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, occurred_at, recorded_at, created_by)
VALUES (
  uuidv7(),
  $1,                     -- tenant_id
  $2,                     -- intent_type: 'entity_created' or 'entity_updated'
  $3,                     -- payload: { "type_node_id": "...", "data": {...}, "epistemic": "...", "previous_event_id": "..." }
  $4,                     -- stream_id: node_id (groups all events about this entity)
  ARRAY[$4]::UUID[],      -- node_ids: [node_id]
  coalesce($5, now()),    -- occurred_at
  now(),                  -- recorded_at
  $6                      -- created_by: user_id from JWT
)
RETURNING event_id;

-- Step 6b: If update, close the previous version
-- (only executed when entity_id is provided)
UPDATE nodes
SET valid_to = $7         -- valid_from of the new version
WHERE node_id = $4
  AND valid_to = 'infinity'
  AND is_deleted = false;

-- Step 6c: Insert new version
INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  $4,                     -- node_id (same for updates, new for creates)
  $1,                     -- tenant_id
  $8,                     -- type_node_id
  $3->'data',             -- data from payload
  $9,                     -- epistemic
  coalesce($5, now()),    -- valid_from
  'infinity',             -- valid_to
  now(),                  -- recorded_at
  $6,                     -- created_by
  $10,                    -- created_by_event (the event_id from step 6a)
  false                   -- is_deleted
);

COMMIT;
```

```
Step 7: Queue embedding generation (async)
  - Enqueue: { node_id, tenant_id, text: JSON.stringify(data) }
  - Embedding pipeline calls OpenRouter text-embedding-3-small
  - Updates nodes SET embedding = $vector WHERE node_id = $id AND valid_from = $vf

Step 8: Compute version count
  SQL:
```

```sql
SELECT count(*) AS version_count
FROM nodes
WHERE node_id = $1 AND tenant_id = $2;
-- $1 = node_id, $2 = tenant_id
```

```
Step 9: Return StoreEntityOutput
```

#### 3.1.5 Event pattern

| Field | Value |
|---|---|
| intent_type | `entity_created` (new) or `entity_updated` (update) |
| stream_id | node_id of the entity |
| node_ids | `[node_id]` |
| payload | `{ "type_node_id": "<uuid>", "data": {<entity_data>}, "epistemic": "<status>", "previous_event_id": "<uuid>" }` (previous_event_id only for updates) |

#### 3.1.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `TYPE_NOT_FOUND` | Type node not found or not an entity type. | Use `get_schema` to list available type nodes for this tenant. The type_node_id must reference a node with `data.kind = 'entity_type'`. |
| `SCHEMA_VALIDATION_FAILED` | Entity data does not conform to type node's label_schema. | Check the `details` field for specific validation errors. Use `get_schema` to see the expected schema. |
| `ENTITY_NOT_FOUND` | Entity with the given entity_id not found or already deleted. | Verify the entity_id exists and belongs to the specified tenant. Use `find_entities` to search. |
| `CONCURRENT_MODIFICATION` | Another version was created between read and write. | Retry the operation. The entity was modified concurrently. |

#### 3.1.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `tenant:{tenant_id}:nodes:{type_name}:write` (type-specific write) OR
- `admin`

---

### 3.2 Tool 2: `find_entities`

Search for entities using semantic similarity, structured filters, or both. Combines embedding-based search via `semantic_search()` with JSONB filters on entity data.

#### 3.2.1 Registration

```typescript
server.registerTool("find_entities", {
  title: "Find Entities",
  description:
    "Search for entities using semantic search (natural language query), " +
    "structured filters (type, data fields, epistemic status), or both. " +
    "Semantic search uses embedding cosine similarity. " +
    "Structured filters use JSONB operators on entity data. " +
    "Always returns current versions only (not deleted, not expired). " +
    "Results are ranked by relevance (similarity score for semantic, recency for structured).",
  inputSchema: FindEntitiesInput,
});
```

#### 3.2.2 Input schema

```typescript
const FindEntitiesInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to search within."),
  query: z.string().optional().describe(
    "Natural language search query. If provided, uses semantic search (embedding similarity). " +
    "Example: 'music festivals in Stockholm this summer'"
  ),
  type_node_id: z.string().uuid().optional().describe(
    "Filter by entity type. Only return entities of this type."
  ),
  filters: z.record(z.unknown()).optional().describe(
    "Structured JSONB filters on entity data. Keys are field names, values are match conditions. " +
    "Example: { \"status\": \"active\", \"city\": \"Stockholm\" }. " +
    "Supports exact match (string/number), array containment (@>), and null checks."
  ),
  epistemic: z.array(z.enum(["hypothesis", "asserted", "confirmed"])).optional().describe(
    "Filter by epistemic status. Default: all statuses."
  ),
  limit: z.number().int().min(1).max(100).default(20).describe(
    "Maximum number of results to return."
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of results to skip (for pagination)."
  ),
  similarity_threshold: z.number().min(0).max(1).default(0.5).describe(
    "Minimum cosine similarity score for semantic search results. Ignored if query is not provided."
  ),
  include_edges: z.boolean().default(false).describe(
    "If true, include edges connected to each returned entity."
  ),
});
```

#### 3.2.3 Output schema

```typescript
interface FindEntitiesOutput {
  entities: Array<{
    entity_id: string;
    type_node_id: string;
    type_name: string;
    data: Record<string, unknown>;
    epistemic: string;
    valid_from: string;
    recorded_at: string;
    similarity?: number;         // present only for semantic search results
    edges?: Array<{              // present only if include_edges=true
      edge_id: string;
      type_node_id: string;
      type_name: string;
      direction: "outgoing" | "incoming";
      connected_entity_id: string;
      connected_entity_name?: string;
      data: Record<string, unknown>;
    }>;
  }>;
  total_estimate: number;        // estimated total matching (for pagination UX)
  has_more: boolean;             // true if more results exist beyond offset+limit
}
```

#### 3.2.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR tenant:{tenant_id}:nodes:{type_name}:read OR admin

Step 2: Branch on search mode

  MODE A — Semantic search (query provided):

  Step 2a: Generate embedding for query
    - Call OpenRouter text-embedding-3-small with input = query
    - Receive 1536-dimensional vector

  Step 2b: Call semantic_search()
    SQL:
```

```sql
SELECT
  ss.node_id AS entity_id,
  ss.type_node_id,
  tn.data->>'name' AS type_name,
  ss.data,
  ss.epistemic,
  ss.valid_from,
  ss.recorded_at,
  ss.similarity
FROM semantic_search(
  $1::VECTOR(1536),      -- query_embedding
  $2::UUID,               -- match_tenant_id
  $3::INT,                -- match_count = limit + offset (fetch extra for pagination)
  $4::FLOAT,              -- similarity_threshold
  $5::UUID,               -- filter_type_node_id (NULL if not specified)
  $6::TEXT[]               -- filter_epistemic (NULL if not specified)
) ss
LEFT JOIN nodes tn
  ON tn.node_id = ss.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
ORDER BY ss.similarity DESC;
-- $1 = query embedding vector
-- $2 = tenant_id
-- $3 = limit + offset + 1 (extra to detect has_more)
-- $4 = similarity_threshold
-- $5 = type_node_id or NULL
-- $6 = epistemic array or NULL
```

```
  Step 2c: Apply structured filters in-memory (post-filter)
    - If filters provided, iterate results and filter by JSONB field match
    - Apply offset/limit after filtering

  MODE B — Structured only (no query):

  SQL:
```

```sql
SELECT
  n.node_id AS entity_id,
  n.type_node_id,
  tn.data->>'name' AS type_name,
  n.data,
  n.epistemic,
  n.valid_from,
  n.recorded_at
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.tenant_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND ($2::UUID IS NULL OR n.type_node_id = $2)
  AND ($3::TEXT[] IS NULL OR n.epistemic = ANY($3))
  AND ($4::JSONB IS NULL OR n.data @> $4)
  AND n.data->>'kind' IS DISTINCT FROM 'entity_type'
  AND n.data->>'kind' IS DISTINCT FROM 'edge_type'
ORDER BY n.recorded_at DESC
LIMIT $5 OFFSET $6;
-- $1 = tenant_id
-- $2 = type_node_id or NULL
-- $3 = epistemic array or NULL
-- $4 = filters as JSONB (for @> containment) or NULL
-- $5 = limit + 1 (for has_more detection)
-- $6 = offset
```

```
Step 3: If include_edges, fetch edges for returned entities
  SQL:
```

```sql
SELECT
  e.edge_id,
  e.type_node_id,
  etn.data->>'name' AS type_name,
  CASE WHEN e.source_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction,
  CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END AS connected_entity_id,
  cn.data->>'name' AS connected_entity_name,
  e.data
FROM edges e
LEFT JOIN nodes etn
  ON etn.node_id = e.type_node_id
  AND etn.valid_to = 'infinity'
  AND etn.is_deleted = false
LEFT JOIN nodes cn
  ON cn.node_id = CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END
  AND cn.valid_to = 'infinity'
  AND cn.is_deleted = false
WHERE (e.source_id = $1 OR e.target_id = $1)
  AND e.valid_to = 'infinity'
  AND e.is_deleted = false
  AND e.tenant_id = $2;
-- $1 = entity_id (run for each entity in results)
-- $2 = tenant_id
```

```
Step 4: Assemble and return FindEntitiesOutput
  - total_estimate: for semantic search, count from semantic_search() call; for structured, run COUNT(*)
  - has_more: true if fetched rows > limit
```

#### 3.2.5 Event pattern

None. `find_entities` is a read-only tool. No events are created.

#### 3.2.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `EMBEDDING_FAILED` | Failed to generate embedding for the search query. | The embedding API (OpenRouter) may be temporarily unavailable. Retry, or use structured filters without a query. |
| `TYPE_NOT_FOUND` | Specified type_node_id does not exist. | Use `get_schema` to list available type nodes. |

#### 3.2.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `tenant:{tenant_id}:nodes:{type_name}:read` (type-specific read) OR
- `admin`

---

### 3.3 Tool 3: `connect_entities`

Create an edge (relationship) between two entities. Validates both endpoints exist. For cross-tenant edges, verifies grants.

#### 3.3.1 Registration

```typescript
server.registerTool("connect_entities", {
  title: "Connect Entities",
  description:
    "Create a relationship (edge) between two entities. " +
    "Validates that both source and target entities exist and are current. " +
    "The edge type must be a valid edge type node. " +
    "For cross-tenant edges, verifies that appropriate grants exist. " +
    "Returns the created edge with its edge_id and event_id.",
  inputSchema: ConnectEntitiesInput,
});
```

#### 3.3.2 Input schema

```typescript
const ConnectEntitiesInput = z.object({
  tenant_id: z.string().uuid().describe(
    "Owning tenant for this edge. Typically the tenant that initiates the relationship."
  ),
  source_id: z.string().uuid().describe("Node ID of the source entity."),
  target_id: z.string().uuid().describe("Node ID of the target entity."),
  type_node_id: z.string().uuid().describe(
    "UUID of the edge type node defining this relationship. " +
    "Use get_schema to discover available edge types."
  ),
  data: z.record(z.unknown()).default({}).describe(
    "Additional data for this edge (e.g., role, weight, notes)."
  ),
  occurred_at: z.string().datetime().optional().describe(
    "Business time: when this relationship was established. Defaults to now()."
  ),
});
```

#### 3.3.3 Output schema

```typescript
interface ConnectEntitiesOutput {
  edge_id: string;
  event_id: string;
  source_id: string;
  target_id: string;
  type_node_id: string;
  type_name: string;
  is_cross_tenant: boolean;
  data: Record<string, unknown>;
  valid_from: string;
}
```

#### 3.3.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR admin

Step 2: Validate edge type node exists
  SQL:
```

```sql
SELECT n.node_id, n.data
FROM nodes n
WHERE n.node_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND n.data->>'kind' = 'edge_type';
-- $1 = type_node_id
```

```
  If no rows: return error EDGE_TYPE_NOT_FOUND.

Step 3: Validate source entity exists
  SQL:
```

```sql
SELECT n.node_id, n.tenant_id
FROM nodes n
WHERE n.node_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = source_id
```

```
  If no rows: return error SOURCE_NOT_FOUND.

Step 4: Validate target entity exists
  SQL (same as above with target_id):
```

```sql
SELECT n.node_id, n.tenant_id
FROM nodes n
WHERE n.node_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = target_id
```

```
  If no rows: return error TARGET_NOT_FOUND.

Step 5: Cross-tenant check
  - Determine if source and target belong to different tenants
  - is_cross_tenant = (source.tenant_id != target.tenant_id)
  - If cross-tenant:
    a. Verify caller has scope for BOTH tenants
    b. Check grants table for WRITE or TRAVERSE capability
    SQL:
```

```sql
SELECT grant_id
FROM grants
WHERE subject_tenant_id = $1
  AND object_node_id = $2
  AND capability IN ('WRITE', 'TRAVERSE')
  AND valid_from <= now()
  AND valid_to > now();
-- $1 = tenant_id (the tenant creating the edge)
-- $2 = the foreign node_id (whichever node belongs to the other tenant)
```

```
    If no grant: return error CROSS_TENANT_DENIED.

Step 6: Execute transaction
  SQL (atomic):
```

```sql
BEGIN;

-- Step 6a: Insert event FIRST
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, edge_ids, node_ids, occurred_at, recorded_at, created_by)
VALUES (
  uuidv7(),
  $1,                     -- tenant_id
  'edge_created',
  $2,                     -- payload: { "type_node_id": "...", "source_id": "...", "target_id": "...", "data": {...}, "is_cross_tenant": bool }
  $3,                     -- stream_id: source_id (group by source entity)
  ARRAY[$4]::UUID[],      -- edge_ids: [edge_id]
  ARRAY[$5, $6]::UUID[],  -- node_ids: [source_id, target_id]
  coalesce($7, now()),    -- occurred_at
  now(),                  -- recorded_at
  $8                      -- created_by
)
RETURNING event_id;

-- Step 6b: Insert edge
INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  $4,                     -- edge_id (pre-generated UUID)
  $1,                     -- tenant_id
  $9,                     -- type_node_id
  $5,                     -- source_id
  $6,                     -- target_id
  $10,                    -- data
  coalesce($7, now()),    -- valid_from
  'infinity',             -- valid_to
  now(),                  -- recorded_at
  $8,                     -- created_by
  $11,                    -- created_by_event (from step 6a)
  false                   -- is_deleted
);

COMMIT;
```

```
Step 7: Return ConnectEntitiesOutput
```

#### 3.3.5 Event pattern

| Field | Value |
|---|---|
| intent_type | `edge_created` |
| stream_id | source_id |
| edge_ids | `[edge_id]` |
| node_ids | `[source_id, target_id]` |
| payload | `{ "type_node_id": "<uuid>", "source_id": "<uuid>", "target_id": "<uuid>", "data": {<edge_data>}, "is_cross_tenant": <bool> }` |

#### 3.3.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `EDGE_TYPE_NOT_FOUND` | Edge type node not found. | Use `get_schema` to list available edge type nodes (kind = 'edge_type'). |
| `SOURCE_NOT_FOUND` | Source entity not found or deleted. | Verify source_id with `find_entities`. The entity must be current (not deleted, not expired). |
| `TARGET_NOT_FOUND` | Target entity not found or deleted. | Verify target_id with `find_entities`. The entity must be current (not deleted, not expired). |
| `CROSS_TENANT_DENIED` | No grant exists for cross-tenant edge creation. | A WRITE or TRAVERSE grant must exist from the edge's tenant to the foreign node. Contact the foreign tenant's admin. |
| `DUPLICATE_EDGE` | An active edge of this type already exists between these entities. | Use `explore_graph` to check existing edges. Close the existing edge first if you need to recreate it. |

#### 3.3.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `admin`
- For cross-tenant edges: scope must include BOTH tenants

---

### 3.4 Tool 4: `explore_graph`

Traverse the knowledge graph from a starting node. Returns connected entities up to a configurable depth. Respects federation grants for cross-tenant traversal.

#### 3.4.1 Registration

```typescript
server.registerTool("explore_graph", {
  title: "Explore Graph",
  description:
    "Traverse the knowledge graph starting from a given entity. " +
    "Returns connected entities up to the specified depth (1-5). " +
    "Can filter by edge type and traversal direction. " +
    "Cross-tenant traversal requires TRAVERSE grants. " +
    "Useful for discovering relationships and building context.",
  inputSchema: ExploreGraphInput,
});
```

#### 3.4.2 Input schema

```typescript
const ExploreGraphInput = z.object({
  tenant_id: z.string().uuid().describe("Starting tenant context."),
  start_node_id: z.string().uuid().describe("Node ID to start traversal from."),
  depth: z.number().int().min(1).max(5).default(1).describe(
    "Maximum traversal depth. 1 = direct connections only. Max 5."
  ),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both").describe(
    "Edge direction to follow. 'outgoing' = source->target, 'incoming' = target->source."
  ),
  edge_type_ids: z.array(z.string().uuid()).optional().describe(
    "Filter: only follow edges of these types. If omitted, follows all edge types."
  ),
  include_cross_tenant: z.boolean().default(false).describe(
    "If true, follow cross-tenant edges where TRAVERSE grants exist."
  ),
  max_nodes: z.number().int().min(1).max(200).default(50).describe(
    "Maximum total nodes to return (safety limit for large graphs)."
  ),
});
```

#### 3.4.3 Output schema

```typescript
interface ExploreGraphOutput {
  nodes: Array<{
    entity_id: string;
    type_node_id: string;
    type_name: string;
    tenant_id: string;
    data: Record<string, unknown>;
    epistemic: string;
    depth: number;                // 0 = start node, 1 = direct connection, etc.
    is_cross_tenant: boolean;
  }>;
  edges: Array<{
    edge_id: string;
    type_node_id: string;
    type_name: string;
    source_id: string;
    target_id: string;
    data: Record<string, unknown>;
    is_cross_tenant: boolean;
  }>;
  truncated: boolean;             // true if max_nodes was reached before full traversal
}
```

#### 3.4.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Validate start node exists
  SQL:
```

```sql
SELECT n.node_id, n.tenant_id, n.type_node_id, n.data, n.epistemic,
       tn.data->>'name' AS type_name
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.node_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = start_node_id
```

```
  If no rows: return error START_NODE_NOT_FOUND.

Step 3: Load grants if include_cross_tenant
  SQL:
```

```sql
SELECT object_node_id, capability
FROM grants
WHERE subject_tenant_id = $1
  AND capability IN ('READ', 'TRAVERSE')
  AND valid_from <= now()
  AND valid_to > now();
-- $1 = tenant_id
```

```
Step 4: BFS traversal (iterative, depth-limited)
  visited = Set<string>()      // node_ids already seen
  result_nodes = []
  result_edges = []
  queue = [{ node_id: start_node_id, depth: 0 }]

  While queue is not empty AND result_nodes.length < max_nodes:
    { node_id, current_depth } = queue.shift()
    If node_id in visited: continue
    visited.add(node_id)

    If current_depth > 0:   // start node was already fetched
      Fetch node data and add to result_nodes

    If current_depth >= depth: continue  // don't explore beyond max depth

    Fetch adjacent edges:
    SQL:
```

```sql
SELECT
  e.edge_id,
  e.type_node_id,
  etn.data->>'name' AS type_name,
  e.source_id,
  e.target_id,
  e.tenant_id AS edge_tenant_id,
  e.data
FROM edges e
LEFT JOIN nodes etn
  ON etn.node_id = e.type_node_id
  AND etn.valid_to = 'infinity'
  AND etn.is_deleted = false
WHERE e.valid_to = 'infinity'
  AND e.is_deleted = false
  AND (
    ($1 = 'outgoing' AND e.source_id = $2)
    OR ($1 = 'incoming' AND e.target_id = $2)
    OR ($1 = 'both' AND (e.source_id = $2 OR e.target_id = $2))
  )
  AND ($3::UUID[] IS NULL OR e.type_node_id = ANY($3));
-- $1 = direction ('outgoing', 'incoming', 'both')
-- $2 = current node_id
-- $3 = edge_type_ids array or NULL
```

```
    For each edge:
      next_node_id = (edge.source_id == node_id) ? edge.target_id : edge.source_id

      -- Check tenant boundary
      Fetch next node's tenant:
      SQL:
```

```sql
SELECT n.node_id, n.tenant_id, n.type_node_id, n.data, n.epistemic,
       tn.data->>'name' AS type_name
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.node_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = next_node_id
```

```
      is_cross_tenant = (next_node.tenant_id != tenant_id)

      If is_cross_tenant AND NOT include_cross_tenant: skip
      If is_cross_tenant AND include_cross_tenant:
        Check grants for TRAVERSE on next_node_id
        If no grant: skip

      Add edge to result_edges (with is_cross_tenant flag)
      queue.push({ node_id: next_node_id, depth: current_depth + 1 })

Step 5: Return ExploreGraphOutput
  - truncated = (result_nodes.length >= max_nodes AND queue is not empty)
```

#### 3.4.5 Event pattern

None. `explore_graph` is a read-only tool. No events are created.

#### 3.4.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `START_NODE_NOT_FOUND` | Start node not found or deleted. | Verify start_node_id exists with `find_entities`. |
| `DEPTH_EXCEEDED` | Requested depth exceeds maximum (5). | Reduce the depth parameter. For deep exploration, make multiple calls with different start nodes. |
| `TRAVERSAL_LIMIT_REACHED` | Result truncated at max_nodes limit. | Increase max_nodes (up to 200) or reduce depth. The `truncated` field indicates incomplete results. |

#### 3.4.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`
- For cross-tenant traversal: scope must include the foreign tenant(s) AND TRAVERSE grants must exist

---

### 3.5 Tool 5: `remove_entity`

Soft-delete an entity. Creates a new version with `is_deleted = true` and closes the current version's `valid_to`. Never physically deletes data (INV-APPEND, INV-SOFT).

#### 3.5.1 Registration

```typescript
server.registerTool("remove_entity", {
  title: "Remove Entity",
  description:
    "Soft-delete an entity from the knowledge graph. " +
    "Creates a final version with is_deleted=true and closes the valid range. " +
    "The entity's history is preserved (bitemporal). " +
    "Also soft-deletes all edges where this entity is source or target. " +
    "This operation is reversible via store_entity (re-create with same node_id).",
  inputSchema: RemoveEntityInput,
});
```

#### 3.5.2 Input schema

```typescript
const RemoveEntityInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this entity."),
  entity_id: z.string().uuid().describe("Node ID of the entity to delete."),
  occurred_at: z.string().datetime().optional().describe(
    "Business time of the deletion. Defaults to now()."
  ),
});
```

#### 3.5.3 Output schema

```typescript
interface RemoveEntityOutput {
  entity_id: string;
  event_id: string;
  deleted_at: string;           // valid_to of the closed version
  edges_deleted: number;        // count of edges also soft-deleted
}
```

#### 3.5.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR admin

Step 2: Verify entity exists and is current
  SQL:
```

```sql
SELECT n.node_id, n.tenant_id, n.type_node_id, n.data, n.valid_from, n.epistemic
FROM nodes n
WHERE n.node_id = $1
  AND n.tenant_id = $2
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = entity_id, $2 = tenant_id
```

```
  If no rows: return error ENTITY_NOT_FOUND.

Step 3: Find active edges referencing this entity
  SQL:
```

```sql
SELECT e.edge_id, e.source_id, e.target_id
FROM edges e
WHERE (e.source_id = $1 OR e.target_id = $1)
  AND e.valid_to = 'infinity'
  AND e.is_deleted = false;
-- $1 = entity_id
```

```
Step 4: Execute transaction
  SQL (atomic):
```

```sql
BEGIN;

-- Step 4a: Insert deletion event
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, edge_ids, occurred_at, recorded_at, created_by)
VALUES (
  uuidv7(),
  $1,                     -- tenant_id
  'entity_deleted',
  $2,                     -- payload: { "entity_id": "...", "type_node_id": "...", "edges_deleted": [...] }
  $3,                     -- stream_id: entity_id
  ARRAY[$3]::UUID[],      -- node_ids: [entity_id]
  $4::UUID[],             -- edge_ids: array of affected edge_ids
  coalesce($5, now()),    -- occurred_at
  now(),                  -- recorded_at
  $6                      -- created_by
)
RETURNING event_id;

-- Step 4b: Close current node version
UPDATE nodes
SET valid_to = coalesce($5, now())
WHERE node_id = $3
  AND valid_to = 'infinity'
  AND is_deleted = false;

-- Step 4c: Insert deleted version
INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
VALUES (
  $3,                     -- node_id
  $1,                     -- tenant_id
  $7,                     -- type_node_id (from existing entity)
  $8,                     -- data (preserved from existing entity)
  $9,                     -- epistemic (preserved)
  coalesce($5, now()),    -- valid_from = deletion time
  coalesce($5, now()),    -- valid_to = same as valid_from (zero-width, closed)
  now(),                  -- recorded_at
  $6,                     -- created_by
  $10,                    -- created_by_event
  true                    -- is_deleted = true
);

-- Step 4d: Close active edges (for each affected edge)
UPDATE edges
SET valid_to = coalesce($5, now()),
    is_deleted = true
WHERE edge_id = ANY($4::UUID[])
  AND valid_to = 'infinity'
  AND is_deleted = false;

COMMIT;
```

```
Step 5: Return RemoveEntityOutput
  - edges_deleted = count of edges affected
```

#### 3.5.5 Event pattern

| Field | Value |
|---|---|
| intent_type | `entity_deleted` |
| stream_id | entity_id |
| node_ids | `[entity_id]` |
| edge_ids | `[...affected_edge_ids]` |
| payload | `{ "entity_id": "<uuid>", "type_node_id": "<uuid>", "edges_deleted": ["<edge_uuid>", ...] }` |

#### 3.5.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `ENTITY_NOT_FOUND` | Entity not found, already deleted, or not in this tenant. | Verify entity_id and tenant_id. Use `find_entities` to search. Already-deleted entities cannot be deleted again. |
| `ENTITY_HAS_CROSS_TENANT_EDGES` | Entity has active cross-tenant edges that cannot be auto-deleted. | Remove cross-tenant edges first using the edge owner's tenant context, then retry deletion. |

#### 3.5.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `admin`

---

### 3.6 Tool 6: `query_at_time`

Bitemporal point-in-time query. Returns the state of an entity or set of entities as it was known at a specific system time (recorded_at / transaction time) AND as it was in reality at a specific business time (occurred_at / valid time).

#### 3.6.1 Registration

```typescript
server.registerTool("query_at_time", {
  title: "Query At Time",
  description:
    "Bitemporal point-in-time query. Returns entity state at a specific " +
    "combination of system time (when the system knew) and business time " +
    "(when it happened in reality). Supports querying a single entity or " +
    "all entities of a type. Essential for auditing, corrections, and " +
    "understanding what was known when.",
  inputSchema: QueryAtTimeInput,
});
```

#### 3.6.2 Input schema

```typescript
const QueryAtTimeInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to query."),
  entity_id: z.string().uuid().optional().describe(
    "Specific entity to query. If omitted, queries all entities matching filters."
  ),
  type_node_id: z.string().uuid().optional().describe(
    "Filter by entity type. Required if entity_id is not provided."
  ),
  system_time: z.string().datetime().describe(
    "System time (transaction time): 'what did the system know at this moment?' " +
    "Maps to recorded_at. Use this to see historical system state."
  ),
  business_time: z.string().datetime().describe(
    "Business time (valid time): 'what was true in reality at this moment?' " +
    "Maps to the valid_from/valid_to range. Use this to see real-world state."
  ),
  limit: z.number().int().min(1).max(100).default(20).describe(
    "Maximum results when querying multiple entities."
  ),
});
```

#### 3.6.3 Output schema

```typescript
interface QueryAtTimeOutput {
  entities: Array<{
    entity_id: string;
    type_node_id: string;
    type_name: string;
    data: Record<string, unknown>;
    epistemic: string;
    valid_from: string;
    valid_to: string;
    recorded_at: string;
    was_deleted: boolean;
  }>;
  query: {
    system_time: string;
    business_time: string;
  };
  count: number;
}
```

#### 3.6.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Validate that at least entity_id or type_node_id is provided

Step 3: Execute bitemporal query
  SQL:
```

```sql
SELECT
  n.node_id AS entity_id,
  n.type_node_id,
  tn.data->>'name' AS type_name,
  n.data,
  n.epistemic,
  n.valid_from,
  n.valid_to,
  n.recorded_at,
  n.is_deleted AS was_deleted
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.tenant_id = $1
  -- System time axis: version must have been recorded BEFORE the query system_time
  AND n.recorded_at <= $2
  -- Business time axis: the queried business_time must fall within [valid_from, valid_to)
  AND n.valid_from <= $3
  AND n.valid_to > $3
  -- Entity filter
  AND ($4::UUID IS NULL OR n.node_id = $4)
  -- Type filter
  AND ($5::UUID IS NULL OR n.type_node_id = $5)
  -- Exclude type nodes themselves
  AND n.data->>'kind' IS DISTINCT FROM 'entity_type'
  AND n.data->>'kind' IS DISTINCT FROM 'edge_type'
ORDER BY n.recorded_at DESC
LIMIT $6;
-- $1 = tenant_id
-- $2 = system_time
-- $3 = business_time
-- $4 = entity_id or NULL
-- $5 = type_node_id or NULL
-- $6 = limit
```

```
  NOTE on bitemporal semantics:
  - recorded_at <= system_time: "the system had recorded this version by system_time"
  - valid_from <= business_time < valid_to: "this version was valid at business_time"
  - Together: "what did the system believe was true at business_time, based on what it knew at system_time"

  If entity_id was specific and multiple rows returned (shouldn't happen with correct data),
  take the one with the latest recorded_at (most recent knowledge at that system_time).

Step 4: Return QueryAtTimeOutput
```

#### 3.6.5 Event pattern

None. `query_at_time` is a read-only tool. No events are created.

#### 3.6.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `MISSING_FILTER` | Either entity_id or type_node_id must be provided. | Provide entity_id to query a specific entity, or type_node_id to query all entities of a type at the specified time. |
| `NO_VERSION_AT_TIME` | No entity version found at the specified time coordinates. | The entity may not have existed yet at the queried system_time, or it was not valid at the queried business_time. Try adjusting the time parameters. Use `get_timeline` to see the entity's full history. |

#### 3.6.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.7 Tool 7: `get_timeline`

Return the chronological version history of an entity, showing all changes over time. Essential for auditing, understanding corrections, and bitemporal exploration.

#### 3.7.1 Registration

```typescript
server.registerTool("get_timeline", {
  title: "Get Timeline",
  description:
    "Get the complete version history of an entity in chronological order. " +
    "Shows all versions including corrections and deletions. " +
    "Each version includes its valid range, recorded time, and the event that created it. " +
    "Useful for auditing, understanding entity evolution, and debugging bitemporal data.",
  inputSchema: GetTimelineInput,
});
```

#### 3.7.2 Input schema

```typescript
const GetTimelineInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this entity."),
  entity_id: z.string().uuid().describe("Node ID of the entity to get history for."),
  include_events: z.boolean().default(true).describe(
    "If true, include the full event that created each version."
  ),
});
```

#### 3.7.3 Output schema

```typescript
interface GetTimelineOutput {
  entity_id: string;
  type_node_id: string;
  type_name: string;
  versions: Array<{
    version_number: number;       // 1-based, chronological
    data: Record<string, unknown>;
    epistemic: string;
    valid_from: string;
    valid_to: string;
    recorded_at: string;
    is_deleted: boolean;
    is_current: boolean;          // true for the latest active version
    created_by: string;
    created_by_event: string;
    event?: {                     // included if include_events=true
      event_id: string;
      intent_type: string;
      payload: Record<string, unknown>;
      occurred_at: string;
      recorded_at: string;
    };
  }>;
  total_versions: number;
}
```

#### 3.7.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Fetch all versions of the entity
  SQL:
```

```sql
SELECT
  n.node_id AS entity_id,
  n.type_node_id,
  tn.data->>'name' AS type_name,
  n.data,
  n.epistemic,
  n.valid_from,
  n.valid_to,
  n.recorded_at,
  n.is_deleted,
  n.created_by,
  n.created_by_event,
  (n.valid_to = 'infinity' AND n.is_deleted = false) AS is_current,
  ROW_NUMBER() OVER (ORDER BY n.valid_from ASC) AS version_number
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.node_id = $1
  AND n.tenant_id = $2
ORDER BY n.valid_from ASC;
-- $1 = entity_id, $2 = tenant_id
```

```
  If no rows: return error ENTITY_NOT_FOUND.

Step 3: If include_events, fetch events for each version
  SQL:
```

```sql
SELECT
  e.event_id,
  e.intent_type,
  e.payload,
  e.occurred_at,
  e.recorded_at
FROM events e
WHERE e.event_id = ANY($1::UUID[])
ORDER BY e.recorded_at ASC;
-- $1 = array of created_by_event IDs from step 2
```

```
Step 4: Join events to versions and return GetTimelineOutput
```

#### 3.7.5 Event pattern

None. `get_timeline` is a read-only tool. No events are created.

#### 3.7.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `ENTITY_NOT_FOUND` | No versions found for this entity in the specified tenant. | Verify entity_id and tenant_id. The entity may belong to a different tenant. |

#### 3.7.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.8 Tool 8: `capture_thought`

Free-text capture with LLM-powered extraction. Accepts unstructured text (e.g., voice memo transcription, meeting notes, WhatsApp message), uses an LLM to extract structured entities and relationships, runs a dedup pipeline, and creates entities with `epistemic = 'hypothesis'`. Human review is required before promotion to 'asserted' or 'confirmed'.

#### 3.8.1 Registration

```typescript
server.registerTool("capture_thought", {
  title: "Capture Thought",
  description:
    "Capture unstructured text and extract structured entities using AI. " +
    "Accepts free-text input (meeting notes, voice memos, messages). " +
    "Uses LLM to classify entity types, extract structured fields, identify " +
    "mentioned entities, and suggest relationships. " +
    "All extracted entities are created with epistemic='hypothesis' (requires human review). " +
    "Includes a 3-tier dedup pipeline to prevent duplicate entities. " +
    "Returns extracted entities, dedup matches, and suggested actions.",
  inputSchema: CaptureThoughtInput,
});
```

#### 3.8.2 Input schema

```typescript
const CaptureThoughtInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant context for entity extraction."),
  text: z.string().min(1).max(10000).describe(
    "Free-text input to extract entities from. " +
    "Can be meeting notes, voice memo transcription, WhatsApp message, etc."
  ),
  source: z.string().optional().describe(
    "Source of the text (e.g., 'voice_memo', 'whatsapp', 'meeting_notes', 'email'). " +
    "Included in event metadata."
  ),
  context_entity_ids: z.array(z.string().uuid()).optional().describe(
    "Entity IDs for context. If the user is viewing an entity when they capture a thought, " +
    "include it here. The LLM will use these as relationship hints."
  ),
  auto_create: z.boolean().default(true).describe(
    "If true, automatically create hypothesis entities. " +
    "If false, return extraction results without creating anything (dry run)."
  ),
});
```

#### 3.8.3 Output schema

```typescript
interface CaptureThoughtOutput {
  event_id: string;                  // the capture event
  extracted: Array<{
    entity_id?: string;              // set if auto_create=true and entity was created
    type_node_id: string;
    type_name: string;
    data: Record<string, unknown>;
    confidence: number;              // 0.0-1.0 extraction confidence
    dedup_result: {
      status: "new" | "merged" | "possible_duplicate";
      matched_entity_id?: string;    // if merged or possible_duplicate
      matched_entity_name?: string;
      match_tier?: 1 | 2 | 3;       // which dedup tier matched (1=exact, 2=trigram, 3=embedding)
      similarity?: number;           // similarity score from matching tier
    };
  }>;
  relationships: Array<{
    source_name: string;
    target_name: string;
    edge_type: string;
    confidence: number;
    created: boolean;                // true if edge was auto-created
    edge_id?: string;                // set if created
  }>;
  action_items: string[];            // suggested follow-up actions
  raw_extraction: Record<string, unknown>;  // full LLM output for debugging
}
```

#### 3.8.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR admin

Step 2: Fetch tenant's type nodes (for LLM context)
  SQL:
```

```sql
SELECT
  n.node_id AS type_node_id,
  n.data->>'name' AS type_name,
  n.data->>'description' AS type_description,
  n.data->'label_schema' AS label_schema,
  n.data->>'kind' AS kind
FROM nodes n
WHERE n.tenant_id = $1
  AND n.type_node_id = '00000000-0000-7000-8000-000000000002'
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
ORDER BY n.data->>'name';
-- $1 = tenant_id
```

```
  Also fetch system-level edge type nodes:
```

```sql
SELECT
  n.node_id AS type_node_id,
  n.data->>'name' AS type_name,
  n.data->>'description' AS type_description,
  n.data->>'kind' AS kind
FROM nodes n
WHERE n.tenant_id = '00000000-0000-7000-8000-000000000000'
  AND n.type_node_id = '00000000-0000-7000-8000-000000000002'
  AND n.data->>'kind' = 'edge_type'
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
ORDER BY n.data->>'name';
```

```
Step 3: Fetch context entities (if context_entity_ids provided)
  SQL:
```

```sql
SELECT
  n.node_id, n.type_node_id,
  tn.data->>'name' AS type_name,
  n.data
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.node_id = ANY($1::UUID[])
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false;
-- $1 = context_entity_ids
```

```
Step 4: Call LLM for entity extraction (gpt-4o-mini via OpenRouter)
```

**LLM PROMPT TEMPLATE:**

```
You are an entity extraction system for a Swedish business knowledge graph.
Your task is to extract structured entities, relationships, and action items from free-text input.

## TENANT CONTEXT

This text belongs to the tenant's business domain. Extract entities that match the available types.

## AVAILABLE ENTITY TYPES

{{#each entity_types}}
### {{type_name}} (ID: {{type_node_id}})
{{type_description}}
Schema:
```json
{{json label_schema}}
```
{{/each}}

## AVAILABLE EDGE TYPES

{{#each edge_types}}
- **{{type_name}}** (ID: {{type_node_id}}): {{type_description}}
{{/each}}

## CONTEXT ENTITIES (already in the graph)

{{#if context_entities}}
{{#each context_entities}}
- {{type_name}}: {{data.name}} (ID: {{node_id}})
{{/each}}
{{else}}
No context entities provided.
{{/if}}

## INPUT TEXT

```
{{text}}
```

## SOURCE

{{source}}

## INSTRUCTIONS

1. **Extract entities**: For each entity mentioned in the text, determine its type from the AVAILABLE ENTITY TYPES list. Extract structured fields according to the type's label_schema. If a field is mentioned but ambiguous, include it with your best interpretation.

2. **Identify relationships**: For each pair of entities that have a relationship, identify the edge type from AVAILABLE EDGE TYPES. Include relationships to CONTEXT ENTITIES if mentioned.

3. **Assess confidence**: Rate each extraction 0.0-1.0:
   - 1.0: explicitly stated with no ambiguity
   - 0.7-0.9: clearly implied or partially stated
   - 0.4-0.6: inferred from context
   - 0.1-0.3: speculative

4. **Action items**: Extract any TODO items, follow-ups, or next steps mentioned.

5. **Language**: The text may be in Swedish or English. Extract data in the language it appears. Field names must match the schema (English).

## OUTPUT FORMAT

Return ONLY valid JSON matching this exact schema:

```json
{
  "entities": [
    {
      "type_node_id": "<uuid of the matching entity type>",
      "type_name": "<name of the type>",
      "data": { <fields matching the type's label_schema> },
      "confidence": <0.0-1.0>,
      "mention_text": "<the exact text span that mentions this entity>"
    }
  ],
  "relationships": [
    {
      "source_name": "<name/identifier of source entity>",
      "target_name": "<name/identifier of target entity>",
      "edge_type": "<name of edge type from AVAILABLE EDGE TYPES>",
      "edge_type_node_id": "<uuid of the edge type>",
      "confidence": <0.0-1.0>
    }
  ],
  "action_items": [
    "<action item text>"
  ]
}
```

IMPORTANT:
- Only use entity types from the AVAILABLE ENTITY TYPES list. Do NOT invent new types.
- Only use edge types from the AVAILABLE EDGE TYPES list.
- Each entity must have at least a "name" field in its data.
- Do not extract the same entity twice. If an entity is mentioned multiple times, consolidate.
- If no entities can be extracted, return {"entities": [], "relationships": [], "action_items": []}.
```

```
Step 5: Parse LLM response
  - Parse JSON response
  - Validate each entity's type_node_id exists in the fetched type nodes
  - Validate each entity's data against the type's label_schema (best-effort, don't fail)

Step 6: Dedup pipeline for each extracted entity

  TIER 1 — Exact match (name equality):
  SQL:
```

```sql
SELECT n.node_id, n.data
FROM nodes n
WHERE n.tenant_id = $1
  AND n.type_node_id = $2
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND lower(n.data->>'name') = lower($3);
-- $1 = tenant_id
-- $2 = extracted entity's type_node_id
-- $3 = extracted entity's data.name
```

```
  If exact match found:
    dedup_result = { status: "merged", matched_entity_id, match_tier: 1, similarity: 1.0 }
    Skip to next entity (do not create).

  TIER 2 — Trigram similarity (>= 0.7):
  SQL (uses fuzzy_match_nodes):
```

```sql
SELECT node_id, data, trgm_similarity
FROM fuzzy_match_nodes(
  $1,            -- match_tenant_id
  $2,            -- search_text = entity name
  5,             -- match_count
  0.7,           -- trgm_threshold = 0.7 for dedup
  $3             -- filter_type_node_id
);
-- $1 = tenant_id
-- $2 = extracted entity's data.name
-- $3 = extracted entity's type_node_id
```

```
  If match found with trgm_similarity >= 0.7:
    dedup_result = { status: "possible_duplicate", matched_entity_id, match_tier: 2, similarity: trgm_similarity }
    If auto_create: still create as hypothesis (human decides if it's a dupe).

  TIER 3 — Embedding cosine similarity (>= 0.85):
  - Generate embedding for extracted entity text (name + key fields)
  SQL (uses semantic_search):
```

```sql
SELECT node_id, data, similarity
FROM semantic_search(
  $1::VECTOR(1536),   -- embedding of extracted entity text
  $2::UUID,            -- match_tenant_id
  5,                   -- match_count
  0.85,                -- similarity_threshold = 0.85 for dedup
  $3::UUID             -- filter_type_node_id
);
-- $1 = embedding vector
-- $2 = tenant_id
-- $3 = extracted entity's type_node_id
```

```
  If match found with similarity >= 0.85:
    dedup_result = { status: "possible_duplicate", matched_entity_id, match_tier: 3, similarity }
    If auto_create: still create as hypothesis.

  If no match in any tier:
    dedup_result = { status: "new" }

Step 7: Create entities (if auto_create=true)
  For each entity where dedup_result.status != "merged":
    Use store_entity internally with epistemic = "hypothesis"
    Record the entity_id in the extraction result.

Step 8: Create relationships (if auto_create=true)
  For each relationship:
    Resolve source_name and target_name to entity_ids (from step 7 results or context_entities)
    If both resolved:
      Use connect_entities internally
      Record edge_id and created=true

Step 9: Create capture event
  SQL:
```

```sql
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, edge_ids, occurred_at, recorded_at, created_by)
VALUES (
  uuidv7(),
  $1,                     -- tenant_id
  'thought_captured',
  $2,                     -- payload: { "text": "...", "source": "...", "extraction": {...}, "dedup_results": [...] }
  NULL,                   -- stream_id: NULL (capture events don't belong to a single entity stream)
  $3::UUID[],             -- node_ids: all created entity IDs
  $4::UUID[],             -- edge_ids: all created edge IDs
  now(),                  -- occurred_at
  now(),                  -- recorded_at
  $5                      -- created_by
)
RETURNING event_id;
-- $1 = tenant_id
-- $2 = full payload with text, source, extraction, dedup results
-- $3 = array of created node_ids
-- $4 = array of created edge_ids
-- $5 = user_id
```

```
Step 10: Return CaptureThoughtOutput
```

#### 3.8.5 Event pattern

| Field | Value |
|---|---|
| intent_type | `thought_captured` |
| stream_id | NULL |
| node_ids | `[...created_entity_ids]` |
| edge_ids | `[...created_edge_ids]` |
| payload | `{ "text": "<original_text>", "source": "<source>", "extraction": {<llm_output>}, "dedup_results": [{<per_entity_dedup>}], "context_entity_ids": [<uuids>] }` |

Note: Individual entity creation events (`entity_created`) are also generated by `store_entity` calls in step 7. The `thought_captured` event is the parent event that groups them.

#### 3.8.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `EXTRACTION_FAILED` | LLM entity extraction failed or returned invalid JSON. | The text may be too short, ambiguous, or in an unsupported language. Try rephrasing or providing more context. |
| `NO_TYPE_NODES` | No entity type nodes found for this tenant. | The tenant has no type nodes defined. Use `get_schema` to verify, and create type nodes with `store_entity` if needed. |
| `EMBEDDING_FAILED` | Failed to generate embedding for dedup. | The embedding API may be temporarily unavailable. Entities were still extracted but dedup tier 3 (embedding) was skipped. |
| `CONTEXT_ENTITY_NOT_FOUND` | One or more context_entity_ids not found. | Verify the context entity IDs. Non-existent context entities are ignored (extraction proceeds without them). |

#### 3.8.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `admin`

---

### 3.9 Tool 9: `get_schema`

Discover the type nodes (ontology) available in a tenant. Returns entity types and edge types with their label schemas. This is how an LLM agent discovers what entities it can create and what fields they expect.

Type nodes are NOT stored in a separate registry. They are regular nodes in the graph with `type_node_id` pointing to the metatype. This tool queries them reflexively (INV-TYPE).

#### 3.9.1 Registration

```typescript
server.registerTool("get_schema", {
  title: "Get Schema",
  description:
    "Discover entity types and edge types available in a tenant. " +
    "Returns type nodes from the knowledge graph (reflexive, typed by the metatype). " +
    "Each type includes its name, description, and label_schema (JSON Schema for data validation). " +
    "Use this tool first to understand what entities you can create and what fields they expect.",
  inputSchema: GetSchemaInput,
});
```

#### 3.9.2 Input schema

```typescript
const GetSchemaInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to get schema for."),
  kind: z.enum(["entity_type", "edge_type", "all"]).default("all").describe(
    "Filter by type kind. 'entity_type' for entity types, 'edge_type' for relationship types, 'all' for both."
  ),
  include_system: z.boolean().default(true).describe(
    "If true, also include system-level type nodes (edge types shared across tenants)."
  ),
});
```

#### 3.9.3 Output schema

```typescript
interface GetSchemaOutput {
  entity_types: Array<{
    type_node_id: string;
    name: string;
    description: string;
    label_schema: Record<string, unknown>;   // JSON Schema
    kind: "entity_type";
    tenant_id: string;
  }>;
  edge_types: Array<{
    type_node_id: string;
    name: string;
    description: string;
    kind: "edge_type";
    tenant_id: string;
  }>;
  metatype_id: string;           // the metatype node_id for reference
}
```

#### 3.9.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Fetch type nodes
  SQL:
```

```sql
SELECT
  n.node_id AS type_node_id,
  n.tenant_id,
  n.data->>'name' AS name,
  n.data->>'description' AS description,
  n.data->'label_schema' AS label_schema,
  n.data->>'kind' AS kind
FROM nodes n
WHERE n.type_node_id = '00000000-0000-7000-8000-000000000002'
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND (
    n.tenant_id = $1
    OR ($2 = true AND n.tenant_id = '00000000-0000-7000-8000-000000000000')
  )
  AND (
    $3 = 'all'
    OR n.data->>'kind' = $3
  )
ORDER BY n.data->>'kind', n.data->>'name';
-- $1 = tenant_id
-- $2 = include_system (boolean)
-- $3 = kind filter ('entity_type', 'edge_type', or 'all')
```

```
Step 3: Separate into entity_types and edge_types arrays

Step 4: Return GetSchemaOutput
  - metatype_id = '00000000-0000-7000-8000-000000000002'
```

#### 3.9.5 Event pattern

None. `get_schema` is a read-only tool. No events are created.

#### 3.9.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `NO_TYPE_NODES` | No type nodes found for this tenant. | The tenant may not have been seeded with type nodes yet. Contact the system administrator. |

#### 3.9.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.10 Tool 10: `get_stats`

Return dashboard statistics for a tenant: entity counts by type, edge counts, event counts, recent activity, and storage usage.

#### 3.10.1 Registration

```typescript
server.registerTool("get_stats", {
  title: "Get Stats",
  description:
    "Get dashboard statistics for a tenant. Returns entity counts by type, " +
    "edge counts, recent event counts, storage usage, and activity timeline. " +
    "Useful for monitoring, reporting, and understanding the state of the knowledge graph.",
  inputSchema: GetStatsInput,
});
```

#### 3.10.2 Input schema

```typescript
const GetStatsInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to get statistics for."),
  period_days: z.number().int().min(1).max(365).default(30).describe(
    "Number of days to include in activity statistics. Default: 30."
  ),
});
```

#### 3.10.3 Output schema

```typescript
interface GetStatsOutput {
  tenant_id: string;
  tenant_name: string;
  entities: {
    total: number;
    by_type: Array<{
      type_node_id: string;
      type_name: string;
      count: number;
    }>;
    by_epistemic: Record<string, number>;   // { hypothesis: N, asserted: N, confirmed: N }
  };
  edges: {
    total: number;
    by_type: Array<{
      type_node_id: string;
      type_name: string;
      count: number;
    }>;
    cross_tenant: number;
  };
  events: {
    total: number;
    in_period: number;                      // events in the last period_days
    by_intent: Record<string, number>;      // { entity_created: N, ... }
  };
  blobs: {
    total: number;
    total_size_bytes: number;
  };
  activity: {
    period_days: number;
    events_per_day: Array<{
      date: string;         // YYYY-MM-DD
      count: number;
    }>;
  };
}
```

#### 3.10.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Fetch tenant name
  SQL:
```

```sql
SELECT name FROM tenants WHERE tenant_id = $1;
-- $1 = tenant_id
```

```
Step 3: Entity counts by type
  SQL:
```

```sql
SELECT
  n.type_node_id,
  tn.data->>'name' AS type_name,
  count(*) AS count
FROM nodes n
LEFT JOIN nodes tn
  ON tn.node_id = n.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE n.tenant_id = $1
  AND n.valid_to = 'infinity'
  AND n.is_deleted = false
  AND n.data->>'kind' IS DISTINCT FROM 'entity_type'
  AND n.data->>'kind' IS DISTINCT FROM 'edge_type'
GROUP BY n.type_node_id, tn.data->>'name'
ORDER BY count DESC;
-- $1 = tenant_id
```

```
Step 4: Entity counts by epistemic
  SQL:
```

```sql
SELECT epistemic, count(*) AS count
FROM nodes
WHERE tenant_id = $1
  AND valid_to = 'infinity'
  AND is_deleted = false
  AND data->>'kind' IS DISTINCT FROM 'entity_type'
  AND data->>'kind' IS DISTINCT FROM 'edge_type'
GROUP BY epistemic;
-- $1 = tenant_id
```

```
Step 5: Edge counts by type
  SQL:
```

```sql
SELECT
  e.type_node_id,
  tn.data->>'name' AS type_name,
  count(*) AS count
FROM edges e
LEFT JOIN nodes tn
  ON tn.node_id = e.type_node_id
  AND tn.valid_to = 'infinity'
  AND tn.is_deleted = false
WHERE e.tenant_id = $1
  AND e.valid_to = 'infinity'
  AND e.is_deleted = false
GROUP BY e.type_node_id, tn.data->>'name'
ORDER BY count DESC;
-- $1 = tenant_id
```

```
Step 6: Cross-tenant edge count
  SQL:
```

```sql
SELECT count(*) AS count
FROM edges e
JOIN nodes src ON src.node_id = e.source_id AND src.valid_to = 'infinity' AND src.is_deleted = false
JOIN nodes tgt ON tgt.node_id = e.target_id AND tgt.valid_to = 'infinity' AND tgt.is_deleted = false
WHERE e.tenant_id = $1
  AND e.valid_to = 'infinity'
  AND e.is_deleted = false
  AND src.tenant_id != tgt.tenant_id;
-- $1 = tenant_id
```

```
Step 7: Event counts
  SQL:
```

```sql
SELECT count(*) AS total
FROM events
WHERE tenant_id = $1;
-- $1 = tenant_id
```

```sql
SELECT count(*) AS in_period
FROM events
WHERE tenant_id = $1
  AND recorded_at >= now() - ($2 || ' days')::INTERVAL;
-- $1 = tenant_id, $2 = period_days
```

```sql
SELECT intent_type, count(*) AS count
FROM events
WHERE tenant_id = $1
  AND recorded_at >= now() - ($2 || ' days')::INTERVAL
GROUP BY intent_type
ORDER BY count DESC;
-- $1 = tenant_id, $2 = period_days
```

```
Step 8: Blob storage
  SQL:
```

```sql
SELECT count(*) AS total, coalesce(sum(size_bytes), 0) AS total_size_bytes
FROM blobs
WHERE tenant_id = $1;
-- $1 = tenant_id
```

```
Step 9: Daily activity
  SQL:
```

```sql
SELECT
  date_trunc('day', recorded_at)::DATE AS date,
  count(*) AS count
FROM events
WHERE tenant_id = $1
  AND recorded_at >= now() - ($2 || ' days')::INTERVAL
GROUP BY date_trunc('day', recorded_at)
ORDER BY date ASC;
-- $1 = tenant_id, $2 = period_days
```

```
Step 10: Assemble and return GetStatsOutput
```

#### 3.10.5 Event pattern

None. `get_stats` is a read-only tool. No events are created.

#### 3.10.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `TENANT_NOT_FOUND` | Tenant not found. | Verify tenant_id is correct and accessible. |

#### 3.10.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.11 Tool 11: `propose_event`

Submit a raw event directly to the event stream. Intended for system integrations (webhooks, external services) that need to inject events without using the higher-level entity tools. The caller is responsible for providing a valid event payload. No automatic projection to fact tables occurs -- the caller must also handle projection, or a separate projection job must process the event.

#### 3.11.1 Registration

```typescript
server.registerTool("propose_event", {
  title: "Propose Event",
  description:
    "Submit a raw event to the append-only event stream. " +
    "For system integrations that need low-level event injection. " +
    "The caller provides the full event payload including intent_type. " +
    "No automatic projection to fact tables (nodes/edges) occurs — " +
    "use store_entity or connect_entities for that. " +
    "Events are immutable once written (INV-APPEND).",
  inputSchema: ProposeEventInput,
});
```

#### 3.11.2 Input schema

```typescript
const ProposeEventInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this event."),
  intent_type: z.string().min(1).max(100).describe(
    "Event type identifier. Convention: 'noun_verbed' (e.g., 'payment_received', 'import_completed')."
  ),
  payload: z.record(z.unknown()).describe(
    "Event payload. Arbitrary JSONB. Should contain all data needed to replay or audit the event."
  ),
  stream_id: z.string().uuid().optional().describe(
    "Stream ID to group related events (typically an entity's node_id)."
  ),
  node_ids: z.array(z.string().uuid()).default([]).describe(
    "Node IDs referenced by this event."
  ),
  edge_ids: z.array(z.string().uuid()).default([]).describe(
    "Edge IDs referenced by this event."
  ),
  occurred_at: z.string().datetime().optional().describe(
    "Business time. Defaults to now()."
  ),
});
```

#### 3.11.3 Output schema

```typescript
interface ProposeEventOutput {
  event_id: string;
  tenant_id: string;
  intent_type: string;
  recorded_at: string;
  occurred_at: string;
}
```

#### 3.11.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR admin

Step 2: Validate referenced node_ids exist (if provided)
  SQL:
```

```sql
SELECT node_id
FROM nodes
WHERE node_id = ANY($1::UUID[])
  AND valid_to = 'infinity'
  AND is_deleted = false;
-- $1 = node_ids
```

```
  If count != node_ids.length: return warning (non-blocking) with missing IDs.

Step 3: Insert event
  SQL:
```

```sql
INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, edge_ids, occurred_at, recorded_at, created_by)
VALUES (
  uuidv7(),
  $1,                     -- tenant_id
  $2,                     -- intent_type
  $3,                     -- payload
  $4,                     -- stream_id (nullable)
  $5::UUID[],             -- node_ids
  $6::UUID[],             -- edge_ids
  coalesce($7, now()),    -- occurred_at
  now(),                  -- recorded_at
  $8                      -- created_by
)
RETURNING event_id, tenant_id, intent_type, recorded_at, occurred_at;
-- $1 = tenant_id
-- $2 = intent_type
-- $3 = payload (JSONB)
-- $4 = stream_id or NULL
-- $5 = node_ids array
-- $6 = edge_ids array
-- $7 = occurred_at or NULL
-- $8 = user_id from JWT
```

```
Step 4: Return ProposeEventOutput
```

#### 3.11.5 Event pattern

| Field | Value |
|---|---|
| intent_type | Caller-provided (arbitrary string) |
| stream_id | Caller-provided or NULL |
| node_ids | Caller-provided |
| edge_ids | Caller-provided |
| payload | Caller-provided (arbitrary JSONB) |

#### 3.11.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `INVALID_INTENT_TYPE` | intent_type must be a non-empty string (max 100 chars), lowercase with underscores. | Use the convention 'noun_verbed' (e.g., 'payment_received'). |
| `PAYLOAD_TOO_LARGE` | Event payload exceeds maximum size (1MB). | Reduce payload size. Store large data in blobs and reference the blob_id in the payload. |

#### 3.11.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `admin`

---

### 3.12 Tool 12: `verify_lineage`

Check event lineage integrity for an entity or a set of events. Verifies that every fact row (node/edge) has a corresponding event (INV-LINEAGE), and that event chains are consistent.

#### 3.12.1 Registration

```typescript
server.registerTool("verify_lineage", {
  title: "Verify Lineage",
  description:
    "Verify event lineage integrity. Checks that every node and edge version " +
    "has a corresponding event (INV-LINEAGE). Can verify a single entity, " +
    "all entities in a tenant, or a specific event chain. " +
    "Returns integrity status and any violations found.",
  inputSchema: VerifyLineageInput,
});
```

#### 3.12.2 Input schema

```typescript
const VerifyLineageInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to verify."),
  entity_id: z.string().uuid().optional().describe(
    "Specific entity to verify. If omitted, verifies all entities in the tenant."
  ),
  check_events_for_nodes: z.boolean().default(true).describe(
    "Verify that every node version has a corresponding event."
  ),
  check_events_for_edges: z.boolean().default(true).describe(
    "Verify that every edge has a corresponding event."
  ),
  check_orphan_events: z.boolean().default(false).describe(
    "Check for events that reference non-existent nodes/edges."
  ),
  limit: z.number().int().min(1).max(1000).default(100).describe(
    "Maximum number of violations to return."
  ),
});
```

#### 3.12.3 Output schema

```typescript
interface VerifyLineageOutput {
  status: "ok" | "violations_found";
  summary: {
    nodes_checked: number;
    edges_checked: number;
    events_checked: number;
    violations_count: number;
  };
  violations: Array<{
    type: "missing_event" | "orphan_event" | "mismatched_tenant" | "broken_chain";
    entity_type: "node" | "edge" | "event";
    entity_id: string;
    event_id?: string;
    description: string;
  }>;
}
```

#### 3.12.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Check nodes have corresponding events (if check_events_for_nodes)
  SQL:
```

```sql
SELECT
  n.node_id,
  n.valid_from,
  n.created_by_event
FROM nodes n
LEFT JOIN events e ON e.event_id = n.created_by_event
WHERE n.tenant_id = $1
  AND ($2::UUID IS NULL OR n.node_id = $2)
  AND e.event_id IS NULL
LIMIT $3;
-- $1 = tenant_id
-- $2 = entity_id or NULL
-- $3 = limit
```

```
  Each row = a violation: node version with no corresponding event.

Step 3: Check edges have corresponding events (if check_events_for_edges)
  SQL:
```

```sql
SELECT
  e_edge.edge_id,
  e_edge.created_by_event
FROM edges e_edge
LEFT JOIN events ev ON ev.event_id = e_edge.created_by_event
WHERE e_edge.tenant_id = $1
  AND ev.event_id IS NULL
LIMIT $2;
-- $1 = tenant_id
-- $2 = limit
```

```
Step 4: Check orphan events (if check_orphan_events)
  SQL:
```

```sql
SELECT
  ev.event_id,
  ev.intent_type,
  ev.node_ids,
  ev.edge_ids
FROM events ev
WHERE ev.tenant_id = $1
  AND ev.intent_type IN ('entity_created', 'entity_updated', 'entity_deleted')
  AND NOT EXISTS (
    SELECT 1 FROM nodes n
    WHERE n.created_by_event = ev.event_id
  )
LIMIT $2;
-- $1 = tenant_id
-- $2 = limit
```

```
Step 5: Check tenant consistency
  SQL:
```

```sql
SELECT
  n.node_id,
  n.tenant_id AS node_tenant,
  e.tenant_id AS event_tenant,
  n.created_by_event
FROM nodes n
JOIN events e ON e.event_id = n.created_by_event
WHERE n.tenant_id = $1
  AND ($2::UUID IS NULL OR n.node_id = $2)
  AND n.tenant_id != e.tenant_id
LIMIT $3;
-- $1 = tenant_id
-- $2 = entity_id or NULL
-- $3 = limit
```

```
Step 6: Count totals for summary
  SQL:
```

```sql
SELECT count(*) AS node_count
FROM nodes
WHERE tenant_id = $1
  AND ($2::UUID IS NULL OR node_id = $2);
-- $1 = tenant_id, $2 = entity_id or NULL
```

```sql
SELECT count(*) AS edge_count
FROM edges
WHERE tenant_id = $1;
-- $1 = tenant_id
```

```sql
SELECT count(*) AS event_count
FROM events
WHERE tenant_id = $1;
-- $1 = tenant_id
```

```
Step 7: Assemble violations array and return VerifyLineageOutput
```

#### 3.12.5 Event pattern

None. `verify_lineage` is a read-only tool. No events are created.

#### 3.12.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `ENTITY_NOT_FOUND` | Specified entity_id has no versions in this tenant. | Verify entity_id and tenant_id. |
| `VERIFICATION_TIMEOUT` | Lineage verification timed out (too many rows). | Use entity_id to verify a specific entity, or reduce the limit. |

#### 3.12.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.13 Tool 13: `store_blob`

Upload a binary file to Supabase Storage and record metadata in the blobs table. Returns a blob_id that can be referenced from entity data.

#### 3.13.1 Registration

```typescript
server.registerTool("store_blob", {
  title: "Store Blob",
  description:
    "Upload a binary file to storage and record its metadata. " +
    "Files are stored in Supabase Storage (organized by tenant). " +
    "Returns a blob_id that can be referenced from entity data fields. " +
    "Supports images, documents, audio, and other file types. " +
    "Maximum file size: 50MB.",
  inputSchema: StoreBlobInput,
});
```

#### 3.13.2 Input schema

```typescript
const StoreBlobInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this blob."),
  content_base64: z.string().describe(
    "File content encoded as base64. Maximum decoded size: 50MB."
  ),
  content_type: z.string().describe(
    "MIME type of the file (e.g., 'image/jpeg', 'application/pdf', 'audio/webm')."
  ),
  filename: z.string().optional().describe(
    "Original filename. Used for the storage path. If omitted, a UUID-based name is generated."
  ),
  node_id: z.string().uuid().optional().describe(
    "Node ID to associate this blob with. The blob metadata will reference this entity."
  ),
});
```

#### 3.13.3 Output schema

```typescript
interface StoreBlobOutput {
  blob_id: string;
  storage_ref: string;           // path in Supabase Storage
  content_type: string;
  size_bytes: number;
  url: string;                   // signed URL for download (time-limited)
}
```

#### 3.13.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:write OR admin

Step 2: Decode and validate content
  - Decode base64 to bytes
  - size_bytes = bytes.length
  - If size_bytes > 50 * 1024 * 1024: return error BLOB_TOO_LARGE
  - Validate content_type is a valid MIME type

Step 3: Generate storage path
  - storage_ref = "{tenant_id}/{YYYY}/{MM}/{blob_id}/{filename_or_uuid}"
  - blob_id = crypto.randomUUID()

Step 4: Upload to Supabase Storage
  - Bucket: "resonansia-blobs" (created at deploy time)
  - supabase.storage.from("resonansia-blobs").upload(storage_ref, bytes, { contentType })

Step 5: Record metadata in blobs table
  SQL:
```

```sql
INSERT INTO blobs (blob_id, tenant_id, content_type, storage_ref, size_bytes, node_id, created_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
RETURNING blob_id, storage_ref, content_type, size_bytes;
-- $1 = blob_id (pre-generated UUID)
-- $2 = tenant_id
-- $3 = content_type
-- $4 = storage_ref
-- $5 = size_bytes
-- $6 = node_id or NULL
-- $7 = user_id from JWT
```

```
Step 6: Generate signed URL
  - supabase.storage.from("resonansia-blobs").createSignedUrl(storage_ref, 3600)
  - URL valid for 1 hour

Step 7: Return StoreBlobOutput
```

#### 3.13.5 Event pattern

No separate event is created for blob storage. Blob uploads are metadata operations. If the blob is associated with an entity operation, the parent event (e.g., `entity_created`) includes the blob_id in its payload.

#### 3.13.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `BLOB_TOO_LARGE` | File exceeds maximum size of 50MB. | Reduce file size or split into multiple uploads. |
| `INVALID_CONTENT_TYPE` | Content type is not a valid MIME type. | Use a standard MIME type (e.g., 'image/jpeg', 'application/pdf'). |
| `STORAGE_UPLOAD_FAILED` | Failed to upload to storage backend. | Supabase Storage may be temporarily unavailable. Retry the upload. |
| `NODE_NOT_FOUND` | Referenced node_id does not exist. | Verify the node_id if provided. The blob will still be created without the node association. |

#### 3.13.7 Scope requirements

- `tenant:{tenant_id}:write` (full tenant write) OR
- `admin`

---

### 3.14 Tool 14: `get_blob`

Download a blob from Supabase Storage. Returns metadata and a signed download URL.

#### 3.14.1 Registration

```typescript
server.registerTool("get_blob", {
  title: "Get Blob",
  description:
    "Get metadata and a signed download URL for a stored blob. " +
    "The signed URL is valid for 1 hour. " +
    "Use this to retrieve files associated with entities.",
  inputSchema: GetBlobInput,
});
```

#### 3.14.2 Input schema

```typescript
const GetBlobInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant that owns this blob."),
  blob_id: z.string().uuid().describe("ID of the blob to retrieve."),
});
```

#### 3.14.3 Output schema

```typescript
interface GetBlobOutput {
  blob_id: string;
  storage_ref: string;
  content_type: string;
  size_bytes: number;
  node_id: string | null;
  created_at: string;
  created_by: string;
  url: string;                   // signed download URL (1 hour validity)
}
```

#### 3.14.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Fetch blob metadata
  SQL:
```

```sql
SELECT blob_id, tenant_id, content_type, storage_ref, size_bytes, node_id, created_at, created_by
FROM blobs
WHERE blob_id = $1
  AND tenant_id = $2;
-- $1 = blob_id, $2 = tenant_id
```

```
  If no rows: return error BLOB_NOT_FOUND.

Step 3: Generate signed URL
  - supabase.storage.from("resonansia-blobs").createSignedUrl(storage_ref, 3600)

Step 4: Return GetBlobOutput
```

#### 3.14.5 Event pattern

None. `get_blob` is a read-only tool. No events are created.

#### 3.14.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `BLOB_NOT_FOUND` | Blob not found or not accessible in this tenant. | Verify blob_id and tenant_id. Use `find_entities` with the node_id to find associated blobs. |
| `SIGNED_URL_FAILED` | Failed to generate signed download URL. | Supabase Storage may be temporarily unavailable. Retry. |

#### 3.14.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.15 Tool 15: `lookup_dict`

Query reference data (dictionaries). Returns temporal reference data entries such as currencies, country codes, BAS account codes, etc.

#### 3.15.1 Registration

```typescript
server.registerTool("lookup_dict", {
  title: "Lookup Dict",
  description:
    "Look up reference data entries (currencies, countries, account codes, etc.). " +
    "Reference data is temporal — entries have valid_from/valid_to ranges. " +
    "Returns entries that are current (valid now) unless a specific point_in_time is provided. " +
    "Use type parameter to filter by dictionary category.",
  inputSchema: LookupDictInput,
});
```

#### 3.15.2 Input schema

```typescript
const LookupDictInput = z.object({
  tenant_id: z.string().uuid().describe("Tenant to query reference data for."),
  type: z.string().describe(
    "Dictionary type/category to query. Examples: 'currency', 'country', 'bas_account', 'tax_rate'."
  ),
  key: z.string().optional().describe(
    "Specific key to look up (e.g., 'SEK', 'SE', '3010'). If omitted, returns all entries of this type."
  ),
  point_in_time: z.string().datetime().optional().describe(
    "Return entries valid at this time. Defaults to now()."
  ),
  limit: z.number().int().min(1).max(500).default(100).describe(
    "Maximum number of entries to return."
  ),
});
```

#### 3.15.3 Output schema

```typescript
interface LookupDictOutput {
  type: string;
  entries: Array<{
    dict_id: string;
    key: string;
    value: Record<string, unknown>;
    valid_from: string;
    valid_to: string;
  }>;
  count: number;
  point_in_time: string;
}
```

#### 3.15.4 Implementation

```
Step 1: Validate scope
  - Require scope: tenant:{tenant_id}:read OR admin

Step 2: Query dicts table
  SQL:
```

```sql
SELECT
  d.dict_id,
  d.key,
  d.value,
  d.valid_from,
  d.valid_to
FROM dicts d
WHERE d.tenant_id = $1
  AND d.type = $2
  AND ($3::TEXT IS NULL OR d.key = $3)
  AND d.valid_from <= coalesce($4, now())
  AND d.valid_to > coalesce($4, now())
ORDER BY d.key ASC
LIMIT $5;
-- $1 = tenant_id
-- $2 = type
-- $3 = key or NULL
-- $4 = point_in_time or NULL (defaults to now() in SQL)
-- $5 = limit
```

```
Step 3: Return LookupDictOutput
  - point_in_time = input.point_in_time ?? new Date().toISOString()
```

#### 3.15.5 Event pattern

None. `lookup_dict` is a read-only tool. No events are created.

#### 3.15.6 Error codes

| Code | Message | Hint |
|---|---|---|
| `DICT_TYPE_NOT_FOUND` | No entries found for dictionary type '{type}'. | Available types depend on tenant seeding. Common types: 'currency', 'country', 'bas_account'. |
| `DICT_KEY_NOT_FOUND` | No entry found for key '{key}' in type '{type}' at the specified time. | The entry may have expired or not yet been valid at the queried point_in_time. Try without point_in_time to see all current entries. |

#### 3.15.7 Scope requirements

- `tenant:{tenant_id}:read` (full tenant read) OR
- `admin`

---

### 3.16 Tool summary matrix

| # | Tool | Category | Mutates | Event Type | Scopes |
|---|---|---|---|---|---|
| 1 | `store_entity` | Entity Management | Yes | `entity_created` / `entity_updated` | write |
| 2 | `find_entities` | Entity Management | No | — | read |
| 3 | `connect_entities` | Entity Management | Yes | `edge_created` | write |
| 4 | `explore_graph` | Entity Management | No | — | read |
| 5 | `remove_entity` | Entity Management | Yes | `entity_deleted` | write |
| 6 | `query_at_time` | Temporal | No | — | read |
| 7 | `get_timeline` | Temporal | No | — | read |
| 8 | `capture_thought` | Capture | Yes | `thought_captured` (+child events) | write |
| 9 | `get_schema` | Discovery | No | — | read |
| 10 | `get_stats` | Discovery | No | — | read |
| 11 | `propose_event` | Advanced | Yes | Caller-defined | write |
| 12 | `verify_lineage` | Advanced | No | — | read |
| 13 | `store_blob` | Utility | Yes | — (metadata only) | write |
| 14 | `get_blob` | Utility | No | — | read |
| 15 | `lookup_dict` | Utility | No | — | read |

---

## 4. ARTIFACT 3 — AUTH & AUTHORIZATION

This artifact specifies the complete authentication and authorization layer for the Resonansia MCP Server.
The MCP server is a **Resource Server only** — it validates tokens and enforces access control, but never issues tokens.
Token issuance is delegated to Supabase Auth (the OAuth 2.1 Authorization Server).

### 4.1 Architecture overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐     ┌───────────────────────────┐
│   MCP Client    │     │         Resonansia MCP Server                │     │     Supabase Auth         │
│  (Claude, etc.) │     │        (Resource Server)                     │     │  (Authorization Server)   │
│                 │     │                                              │     │                           │
│  1. Discover ───┼────>│  /.well-known/oauth-protected-resource       │     │                           │
│     PRM         │<────┼── Returns: AS URL, scopes_supported          │     │                           │
│                 │     │                                              │     │                           │
│  2. Obtain ─────┼─────┼──────────────────────────────────────────────┼────>│  /auth/v1/token           │
│     token       │<────┼──────────────────────────────────────────────┼─────│  Issues JWT with claims   │
│                 │     │                                              │     │                           │
│  3. Call tool ──┼────>│  Authorization: Bearer <JWT>                 │     │                           │
│     with token  │     │  ┌────────────────────────────────────────┐  │     │                           │
│                 │     │  │ Layer 1: JWT Validation (jose)         │  │     │  /.well-known/jwks.json   │
│                 │     │  │  - Verify signature via JWKS  ────────┼──┼────>│  Returns signing keys     │
│                 │     │  │  - Validate iss, aud, exp             │  │     │                           │
│                 │     │  │  - Extract tenant_ids, scopes         │  │     └───────────────────────────┘
│                 │     │  └────────────┬───────────────────────────┘  │
│                 │     │               │ pass                         │
│                 │     │  ┌────────────▼───────────────────────────┐  │     ┌───────────────────────────┐
│                 │     │  │ Layer 2: Scope Check (in-memory)      │  │     │     Supabase PostgreSQL   │
│                 │     │  │  - hasScope(scopes, requirement)      │  │     │                           │
│                 │     │  └────────────┬───────────────────────────┘  │     │                           │
│                 │     │               │ pass                         │     │                           │
│                 │     │  ┌────────────▼───────────────────────────┐  │     │                           │
│                 │     │  │ Layer 3: Grant Check (DB, cross-tenant)│  │     │  grants table             │
│                 │     │  │  - Only for cross-tenant operations   ├──┼────>│  + RLS policies            │
│                 │     │  │  - Temporal validity check             │  │     │                           │
│                 │     │  └────────────┬───────────────────────────┘  │     │                           │
│                 │     │               │ pass                         │     │                           │
│                 │     │  ┌────────────▼───────────────────────────┐  │     │                           │
│  4. Response <──┼─────│  │ Tool Execution                        │  │     │                           │
│                 │     │  │  - RLS enforces tenant isolation      ├──┼────>│  nodes, edges, events     │
│                 │     │  │  - Service-role for cross-tenant      │  │     │  + RLS policies            │
│                 │     │  │  - Audit event (fire-and-forget)      │  │     │                           │
│                 │     │  └────────────────────────────────────────┘  │     └───────────────────────────┘
└─────────────────┘     └──────────────────────────────────────────────┘
```

**Two-layer access control model:**

| Layer | Gate | Storage | Latency | Checked when |
|---|---|---|---|---|
| **Scopes** (outer gate) | JWT claims | In-memory (token payload) | ~0ms | Every tool call |
| **Grants** (inner gate) | Database rows | PostgreSQL query | ~5ms | Cross-tenant operations only |

Both layers must pass for an operation to succeed. Scopes provide fast, coarse-grained tenant-level access control.
Grants provide fine-grained, node-level access control with temporal validity. The design ensures that even if
application code has bugs, PostgreSQL RLS provides a third safety net at the database level.

**Security boundaries:**
- JWT signature verification prevents token forgery.
- Scope checking prevents unauthorized operations within valid tokens.
- Grant checking prevents unauthorized cross-tenant access.
- RLS prevents data leakage even if all application-level checks fail.
- Service-role bypass is used ONLY for cross-tenant queries where grants have been validated at the application layer (D-006).

---

### 4.2 RFC 9728 Protected Resource Metadata endpoint

The MCP specification (June 2025 revision) requires every MCP server acting as a Resource Server to implement
RFC 9728 Protected Resource Metadata (PRM). This endpoint tells MCP clients where to obtain tokens and what
scopes are supported.

#### 4.2.1 Well-known URL path

```
GET /.well-known/oauth-protected-resource
```

Per RFC 9728 Section 3, the path is `/.well-known/oauth-protected-resource` appended to the resource server's
base URL. If the MCP server is deployed at `https://mcp.resonansia.se/`, the full URL is:

```
https://mcp.resonansia.se/.well-known/oauth-protected-resource
```

If the MCP server is deployed as a Supabase Edge Function at a path like `/functions/v1/mcp`, the URL is:

```
https://<project>.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource
```

#### 4.2.2 PRM response JSON

```json
{
  "resource": "https://<project>.supabase.co/functions/v1/mcp",
  "authorization_servers": [
    "https://<project>.supabase.co/auth/v1"
  ],
  "scopes_supported": [
    "tenant:*:read",
    "tenant:*:write",
    "tenant:{tenant_id}:read",
    "tenant:{tenant_id}:write",
    "tenant:{tenant_id}:nodes:{type}:read",
    "tenant:{tenant_id}:nodes:{type}:write",
    "admin"
  ],
  "bearer_methods_supported": [
    "header"
  ],
  "resource_signing_alg_values_supported": [
    "RS256"
  ],
  "resource_name": "Resonansia MCP Server",
  "resource_documentation": "https://resonansia.se/docs/mcp"
}
```

**Field reference (RFC 9728 Section 2):**

| Field | Required | Description |
|---|---|---|
| `resource` | REQUIRED | The resource server's base URL. MUST match the URL the client used to discover this metadata. |
| `authorization_servers` | REQUIRED | Array of AS issuer URLs. Supabase Auth's issuer URL. |
| `scopes_supported` | RECOMMENDED | Scopes the resource server understands. Listed as templates — clients substitute `{tenant_id}` and `{type}` with actual values. |
| `bearer_methods_supported` | RECOMMENDED | How tokens are presented. We support `header` only (Authorization: Bearer). |
| `resource_signing_alg_values_supported` | OPTIONAL | Algorithms the RS accepts for JWT signatures. Supabase Auth uses RS256 by default (asymmetric). |
| `resource_name` | OPTIONAL | Human-readable name. |
| `resource_documentation` | OPTIONAL | URL to API documentation. |

#### 4.2.3 Implementation via @hono/mcp

The `@hono/mcp` package provides `mcpAuthRouter` which can serve this endpoint. However, given our need
for custom scope templates and deployment flexibility, we implement it as a manual Hono route.

```typescript
// src/auth/prm.ts
import { Hono } from "hono";

/**
 * Protected Resource Metadata endpoint (RFC 9728).
 *
 * Tells MCP clients where to get tokens and what scopes are supported.
 * This is a static JSON response — no auth required on this endpoint.
 */
export function createPrmRoute(config: {
  resourceUrl: string;
  supabaseUrl: string;
}): Hono {
  const app = new Hono();

  app.get("/.well-known/oauth-protected-resource", (c) => {
    return c.json({
      resource: config.resourceUrl,
      authorization_servers: [`${config.supabaseUrl}/auth/v1`],
      scopes_supported: [
        "admin",
        "tenant:*:read",
        "tenant:*:write",
        "tenant:{tenant_id}:read",
        "tenant:{tenant_id}:write",
        "tenant:{tenant_id}:nodes:{type}:read",
        "tenant:{tenant_id}:nodes:{type}:write",
      ],
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: ["RS256"],
      resource_name: "Resonansia MCP Server",
      resource_documentation: "https://resonansia.se/docs/mcp",
    });
  });

  return app;
}
```

**Deployment note:** This endpoint MUST be publicly accessible (no auth). MCP clients call it _before_
they have a token. The response is cacheable (add `Cache-Control: public, max-age=3600`).

---

### 4.3 JWT validation middleware

#### 4.3.1 JWKS endpoint

Supabase Auth exposes a JWKS endpoint at:

```
https://<project>.supabase.co/auth/v1/.well-known/jwks.json
```

This endpoint returns the public keys used to sign JWTs. The `jose` library fetches and caches these keys
automatically via `createRemoteJWKSet`. Supabase's edge CDN caches the JWKS response for 10 minutes.

#### 4.3.2 Validated claims type

```typescript
// src/auth/types.ts

/** Token types distinguished by intended use and lifetime. */
export type TokenType = "user_token" | "agent_token" | "partner_token";

/**
 * Validated JWT claims extracted from a Supabase Auth token.
 * Set on the Hono context after successful JWT validation.
 */
export interface AuthClaims {
  /** User or agent UUID (JWT `sub` claim). */
  sub: string;

  /** Token issuer URL (JWT `iss` claim). Must match Supabase Auth URL. */
  iss: string;

  /** Intended audience (JWT `aud` claim). Must be "resonansia-mcp". */
  aud: string;

  /** Tenant UUIDs this token can access. Extracted from custom claim. */
  tenant_ids: string[];

  /** Fine-grained permission scopes. Extracted from custom claim. */
  scopes: string[];

  /** Token expiration as Unix timestamp. */
  exp: number;

  /** Token issued-at as Unix timestamp. */
  iat: number;

  /**
   * Token type, inferred from claims:
   * - "agent_token": has `agent_id` claim
   * - "partner_token": has `partner` claim or only read scopes + exp > 7d
   * - "user_token": default
   */
  token_type: TokenType;
}

/**
 * Hono context variables set by the auth middleware.
 * Access via c.get("auth") in route handlers.
 */
export interface AuthVariables {
  auth: AuthClaims;
}
```

#### 4.3.3 Middleware implementation

```typescript
// src/auth/middleware.ts
import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthClaims, AuthVariables, TokenType } from "./types.ts";

// JWKS is cached in-memory by jose. createRemoteJWKSet handles refetch on key rotation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

/**
 * Infer token type from JWT claims.
 *
 * Rules:
 * 1. If `agent_id` custom claim is present → agent_token
 * 2. If `partner` claim is present, OR all scopes are read-only AND exp > 7 days → partner_token
 * 3. Otherwise → user_token
 */
function inferTokenType(payload: JWTPayload): TokenType {
  if (payload.agent_id) return "agent_token";

  if (payload.partner) return "partner_token";

  const scopes = (payload.scopes as string[]) || [];
  const allReadOnly = scopes.length > 0 && scopes.every(
    (s) => s.endsWith(":read") || s === "admin"
  );
  const exp = payload.exp ?? 0;
  const iat = payload.iat ?? 0;
  const lifetimeDays = (exp - iat) / 86400;

  if (allReadOnly && lifetimeDays > 7) return "partner_token";

  return "user_token";
}

/**
 * JWT validation middleware for Hono.
 *
 * Validates the Bearer token from the Authorization header:
 * 1. Extracts token from "Authorization: Bearer <token>" header
 * 2. Verifies JWT signature against Supabase JWKS
 * 3. Validates issuer, audience, and expiration
 * 4. Extracts tenant_ids and scopes from custom claims
 * 5. Sets validated claims on Hono context as c.get("auth")
 *
 * Returns 401 with WWW-Authenticate header on failure.
 *
 * @param config.supabaseUrl - Supabase project URL (e.g., "https://xyz.supabase.co")
 * @param config.resourceUrl - This MCP server's URL (for PRM link in WWW-Authenticate)
 */
export function jwtAuth(config: {
  supabaseUrl: string;
  resourceUrl: string;
}) {
  const expectedIssuer = `${config.supabaseUrl}/auth/v1`;
  const expectedAudience = "resonansia-mcp";

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // --- Step 1: Extract Bearer token ---
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication required",
            data: {
              type: "UNAUTHENTICATED",
              detail: "Missing or malformed Authorization header. Expected: Bearer <token>",
              prm_url: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp"`,
        }
      );
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // --- Step 2: Verify JWT signature and standard claims ---
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, getJwks(config.supabaseUrl), {
        issuer: expectedIssuer,
        audience: expectedAudience,
        clockTolerance: 30, // 30-second clock skew tolerance
      });
      payload = result.payload;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Token verification failed";

      // Distinguish between expired and invalid tokens
      const isExpired = message.includes("expired") || message.includes("exp");
      const errorType = isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
      const detail = isExpired
        ? "Token has expired. Obtain a new token from the authorization server."
        : `Token validation failed: ${message}`;

      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication failed",
            data: {
              type: errorType,
              detail,
              prm_url: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp", error="${isExpired ? "invalid_token" : "invalid_token"}", error_description="${detail}"`,
        }
      );
    }

    // --- Step 3: Extract and validate custom claims ---
    const tenantIds = Array.isArray(payload.tenant_ids)
      ? (payload.tenant_ids as string[])
      : [];

    if (tenantIds.length === 0) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication failed",
            data: {
              type: "INVALID_CLAIMS",
              detail:
                "Token has no tenant_ids claim. Every valid token must specify at least one tenant.",
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp", error="insufficient_scope"`,
        }
      );
    }

    const scopes = Array.isArray(payload.scopes)
      ? (payload.scopes as string[])
      : [];

    // --- Step 4: Build AuthClaims and set on context ---
    const claims: AuthClaims = {
      sub: payload.sub as string,
      iss: payload.iss as string,
      aud: expectedAudience,
      tenant_ids: tenantIds,
      scopes,
      exp: payload.exp as number,
      iat: payload.iat as number,
      token_type: inferTokenType(payload),
    };

    c.set("auth", claims);

    await next();
  });
}
```

#### 4.3.4 Middleware registration

The middleware is applied to all MCP tool routes but NOT to the PRM endpoint or health check:

```typescript
// src/index.ts (excerpt)
import { Hono } from "hono";
import { createPrmRoute } from "./auth/prm.ts";
import { jwtAuth } from "./auth/middleware.ts";

const app = new Hono();

const config = {
  supabaseUrl: Deno.env.get("SUPABASE_URL")!,
  resourceUrl: Deno.env.get("MCP_RESOURCE_URL")!,
};

// Public routes (no auth)
app.route("/", createPrmRoute(config));
app.get("/health", (c) => c.json({ status: "ok" }));

// Protected routes (auth required)
app.use("/mcp/*", jwtAuth(config));

// MCP tool routes are registered under /mcp/...
```

#### 4.3.5 Claims validation rules

| Claim | Validation | Error on failure |
|---|---|---|
| `iss` | Must equal `https://<project>.supabase.co/auth/v1` | `TOKEN_INVALID` |
| `aud` | Must equal `"resonansia-mcp"` | `TOKEN_INVALID` |
| `exp` | Must be in the future (with 30s clock tolerance) | `TOKEN_EXPIRED` |
| `sub` | Must be a non-empty string | `TOKEN_INVALID` |
| `tenant_ids` | Must be a non-empty array of UUID strings | `INVALID_CLAIMS` |
| `scopes` | Must be an array of strings (may be empty for admin-only tokens) | Valid but grants all operations denied except if `admin` scope present |

---

### 4.4 Scope resolution

#### 4.4.1 Scope syntax

Scopes follow the hierarchical pattern: `tenant:{tenant_id}:{resource}:{action}`

Where segments are progressively more specific:

| Scope pattern | Meaning |
|---|---|
| `admin` | Full access to everything. Superuser. |
| `tenant:*:read` | Read access to all tenants (holding company owner). |
| `tenant:*:write` | Write access to all tenants (holding company owner). |
| `tenant:{id}:read` | Read everything in a specific tenant. |
| `tenant:{id}:write` | Write everything in a specific tenant. |
| `tenant:{id}:nodes:{type}:read` | Read only entities of a specific type in a tenant. |
| `tenant:{id}:nodes:{type}:write` | Write only entities of a specific type in a tenant. |

**Hierarchy:** A broader scope implicitly grants all narrower scopes beneath it.

```
admin
 ├── tenant:*:write
 │    ├── tenant:*:read
 │    ├── tenant:{id}:write
 │    │    ├── tenant:{id}:read
 │    │    ├── tenant:{id}:nodes:{type}:write
 │    │    │    └── tenant:{id}:nodes:{type}:read
 │    │    └── ...
 │    └── ...
 └── ...
```

#### 4.4.2 Scope requirement type

```typescript
// src/auth/scopes.ts

/**
 * A scope requirement that a tool call must satisfy.
 * The tool declares what it needs; the auth layer checks if the token provides it.
 */
export interface ScopeRequirement {
  /** The tenant UUID the operation targets. */
  tenant_id: string;

  /**
   * The action required.
   * - "read": query, list, search, explore, get_schema, get_stats
   * - "write": store_entity, connect_entities, remove_entity, propose_event, capture_thought
   */
  action: "read" | "write";

  /**
   * Optional entity type restriction.
   * If set, the scope must cover this specific type (or a broader scope that covers all types).
   * Example: "lead", "campaign", "booking"
   */
  entity_type?: string;
}
```

#### 4.4.3 Scope matching algorithm

```typescript
// src/auth/scopes.ts

/**
 * Check if a set of scopes authorizes a given operation.
 *
 * Algorithm:
 * 1. If scopes includes "admin" → always authorized.
 * 2. If scopes includes "tenant:*:{action}" or "tenant:*:write" (write implies read) → authorized.
 * 3. If scopes includes "tenant:{tenant_id}:{action}" or "tenant:{tenant_id}:write" → authorized.
 * 4. If entity_type is specified:
 *    a. If scopes includes "tenant:{tenant_id}:nodes:{entity_type}:{action}" → authorized.
 *    b. If scopes includes "tenant:{tenant_id}:nodes:{entity_type}:write" and action is "read" → authorized.
 * 5. Otherwise → denied.
 *
 * "write" scopes always imply "read" for the same scope path.
 *
 * @param scopes - The scopes from the validated JWT token.
 * @param required - The scope requirement for the current operation.
 * @returns true if the scopes authorize the operation.
 *
 * @example
 * hasScope(["tenant:T1:read"], { tenant_id: "T1", action: "read" })              // true
 * hasScope(["tenant:T1:write"], { tenant_id: "T1", action: "read" })             // true (write implies read)
 * hasScope(["tenant:T1:nodes:lead:write"], { tenant_id: "T1", action: "write", entity_type: "lead" }) // true
 * hasScope(["tenant:T1:nodes:lead:read"], { tenant_id: "T1", action: "write", entity_type: "lead" })  // false
 * hasScope(["tenant:*:read"], { tenant_id: "T1", action: "read" })               // true
 * hasScope(["admin"], { tenant_id: "T1", action: "write" })                      // true
 */
export function hasScope(
  scopes: string[],
  required: ScopeRequirement
): boolean {
  const { tenant_id, action, entity_type } = required;

  for (const scope of scopes) {
    // 1. Admin — full access
    if (scope === "admin") return true;

    // 2. Wildcard tenant — "tenant:*:{action}"
    if (scope === "tenant:*:write") return true; // write implies everything
    if (scope === "tenant:*:read" && action === "read") return true;

    // Parse scope segments: "tenant:{id}:{rest...}"
    const parts = scope.split(":");
    if (parts[0] !== "tenant") continue;

    const scopeTenantId = parts[1];
    if (scopeTenantId !== "*" && scopeTenantId !== tenant_id) continue;

    // 3. Tenant-level scope — "tenant:{id}:read" or "tenant:{id}:write"
    if (parts.length === 3) {
      const scopeAction = parts[2];
      if (scopeAction === "write") return true; // write implies read
      if (scopeAction === action) return true;
      continue;
    }

    // 4. Type-level scope — "tenant:{id}:nodes:{type}:{action}"
    if (parts.length === 5 && parts[2] === "nodes") {
      const scopeType = parts[3];
      const scopeAction = parts[4];

      // If no entity_type required, a type-specific scope does NOT satisfy a broad requirement.
      // The caller must have a tenant-level scope for untyped operations.
      if (!entity_type) continue;

      if (scopeType !== entity_type) continue;

      if (scopeAction === "write") return true; // write implies read
      if (scopeAction === action) return true;
    }
  }

  return false;
}

/**
 * Check if scopes grant access to ANY tenant for the given action.
 * Used by tools that auto-resolve tenant_id from the token (single-tenant tokens).
 */
export function hasScopeForAnyTenant(
  scopes: string[],
  action: "read" | "write"
): boolean {
  for (const scope of scopes) {
    if (scope === "admin") return true;
    if (scope === "tenant:*:write") return true;
    if (scope === `tenant:*:${action}`) return true;

    const parts = scope.split(":");
    if (parts[0] === "tenant" && parts.length >= 3) {
      const scopeAction = parts[2];
      if (scopeAction === "write") return true;
      if (scopeAction === action) return true;
    }
  }
  return false;
}
```

#### 4.4.4 Tool scope requirements

Every tool declares its minimum required scope. The `requireScope` helper is called at the start of
each tool handler, before any database access.

```typescript
// src/auth/scopes.ts

/**
 * Check scope and throw an MCP error if insufficient.
 * Call at the start of every tool handler.
 *
 * @throws MCP error with code -32003 (FORBIDDEN) if scope is insufficient.
 */
export function requireScope(
  scopes: string[],
  required: ScopeRequirement
): void {
  if (!hasScope(scopes, required)) {
    const neededScope = required.entity_type
      ? `tenant:${required.tenant_id}:nodes:${required.entity_type}:${required.action}`
      : `tenant:${required.tenant_id}:${required.action}`;

    throw {
      code: -32003,
      message: "Insufficient scope",
      data: {
        type: "FORBIDDEN",
        detail: `This operation requires scope "${neededScope}" or a broader scope that includes it.`,
        required_scope: neededScope,
        available_scopes: scopes,
      },
    };
  }
}
```

**Tool scope table:**

| Tool | Action | Entity type | Minimum scope example |
|---|---|---|---|
| `find_entities` | `read` | from `entity_types[0]` if provided | `tenant:{id}:read` or `tenant:{id}:nodes:{type}:read` |
| `store_entity` | `write` | from `entity_type` param | `tenant:{id}:nodes:{type}:write` |
| `connect_entities` | `write` | — (edge, not node-typed) | `tenant:{id}:write` |
| `explore_graph` | `read` | — | `tenant:{id}:read` (per-node check during traversal) |
| `remove_entity` | `write` | looked up from entity | `tenant:{id}:write` |
| `query_at_time` | `read` | looked up from entity | `tenant:{id}:read` |
| `get_timeline` | `read` | looked up from entity | `tenant:{id}:read` |
| `capture_thought` | `write` | — (multi-type, determined by LLM) | `tenant:{id}:write` |
| `get_schema` | `read` | — | `tenant:{id}:read` |
| `get_stats` | `read` | — | `tenant:{id}:read` |
| `propose_event` | `write` | — | `tenant:{id}:write` |
| `verify_lineage` | `read` | — | `tenant:{id}:read` |
| `store_blob` | `write` | — | `tenant:{id}:write` |
| `get_blob` | `read` | — | `tenant:{id}:read` |
| `lookup_dict` | `read` | — | `tenant:{id}:read` |

**Notes:**
- `find_entities` with `entity_types` param: if the token has a type-specific scope (e.g., `tenant:T1:nodes:lead:read`),
  results are filtered to only return entities of types the token can access. No error is raised for inaccessible types;
  they are silently excluded.
- `explore_graph`: scope is checked per-node during traversal. If a connected node is in a tenant the token cannot
  access, it is silently omitted from results (not an error). Cross-tenant nodes additionally require a grant check.
- `connect_entities`: requires `write` scope on the edge's `tenant_id`. For cross-tenant edges, also requires
  `read` scope on both source and target tenants (or grants — see 4.5).
- `capture_thought`: requires broad `write` scope because the LLM determines entity types dynamically. A type-specific
  write scope is not sufficient for `capture_thought`.

---

### 4.5 Grants consultation

#### 4.5.1 When to check grants

Grants are checked ONLY for cross-tenant operations — that is, when a tool call accesses data in a tenant
that is different from the token's primary tenant or from the edge's own tenant. Specifically:

1. **`explore_graph`** — When traversal encounters a node whose `tenant_id` differs from the starting node's tenant.
2. **`connect_entities`** — When `source_id` and `target_id` belong to different tenants.
3. **`find_entities`** — When results include nodes from multiple tenants (if the token's `tenant_ids` spans multiple tenants, cross-tenant results from the same search may reference granted nodes).

Grants are NOT checked for:
- Same-tenant operations (scopes are sufficient).
- `get_schema` / `get_stats` (always tenant-scoped, no cross-tenant).
- `store_entity` / `remove_entity` (always operate on a single tenant).
- `store_blob` / `get_blob` / `lookup_dict` (always tenant-scoped).

#### 4.5.2 Grant check algorithm

Both scopes AND grants must pass. The check order is:

```
1. Does the token have scope for the target tenant?
   YES → proceed to step 2
   NO  → Does a grant exist for this specific node/type?
          YES → proceed to step 2 (grant substitutes for scope on cross-tenant access)
          NO  → DENY (silently omit node, or return 403 for explicit operations)

2. Is the grant temporally valid?
   YES → ALLOW
   NO  → DENY
```

**Important clarification on scope + grant interaction:**
- For cross-tenant **traversal** (explore_graph), a grant can substitute for a missing scope. A token
  for tenant T1 can traverse into tenant T2 nodes if a TRAVERSE or READ grant exists from T2 to T1 for
  the target node or its type.
- For cross-tenant **explicit access** (connect_entities), the token MUST have scope for its own tenant,
  and a grant must exist for access to the other tenant's node.

#### 4.5.3 SQL query for grant check

```sql
-- Check if subject_tenant has a valid grant for object_node.
-- Called with: $1 = subject_tenant_id, $2 = object_node_id, $3 = required_capability, $4 = check_time
--
-- object_node_id can match either:
--   a) The specific node (for node-level grants)
--   b) The node's type_node_id (for type-level grants)
--
-- Capability hierarchy: WRITE > READ > TRAVERSE
-- A WRITE grant satisfies a READ requirement. A READ grant satisfies a TRAVERSE requirement.
SELECT EXISTS (
  SELECT 1
  FROM grants g
  WHERE g.subject_tenant_id = $1
    AND (
      g.object_node_id = $2                         -- direct node grant
      OR g.object_node_id = (                       -- type-level grant
        SELECT n.type_node_id
        FROM nodes n
        WHERE n.node_id = $2
          AND n.valid_to = 'infinity'
          AND n.is_deleted = false
        LIMIT 1
      )
    )
    AND (
      g.capability = $3                             -- exact capability match
      OR (g.capability = 'WRITE' AND $3 IN ('READ', 'TRAVERSE'))  -- WRITE > READ > TRAVERSE
      OR (g.capability = 'READ' AND $3 = 'TRAVERSE')              -- READ > TRAVERSE
    )
    AND g.valid_from <= $4
    AND g.valid_to > $4
) AS has_grant;
```

#### 4.5.4 TypeScript implementation

```typescript
// src/auth/grants.ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Capability levels with implicit hierarchy. */
export type GrantCapability = "READ" | "WRITE" | "TRAVERSE";

/**
 * Check if a cross-tenant grant exists allowing subject_tenant to access object_node.
 *
 * Uses the service-role Supabase client to bypass RLS (D-006), since the caller
 * may not have RLS access to the granting tenant's data.
 *
 * @param serviceClient - Supabase client with service-role key (bypasses RLS).
 * @param subjectTenantId - The tenant requesting access.
 * @param objectNodeId - The node being accessed.
 * @param requiredCapability - The minimum capability needed.
 * @param atTime - The point in time to check temporal validity. Default: now.
 * @returns true if a valid grant exists.
 */
export async function checkGrant(
  serviceClient: SupabaseClient,
  subjectTenantId: string,
  objectNodeId: string,
  requiredCapability: GrantCapability,
  atTime: Date = new Date()
): Promise<boolean> {
  const { data, error } = await serviceClient.rpc("check_grant", {
    p_subject_tenant_id: subjectTenantId,
    p_object_node_id: objectNodeId,
    p_capability: requiredCapability,
    p_at_time: atTime.toISOString(),
  });

  if (error) {
    // Log error but deny access on failure (fail-closed).
    console.error("Grant check failed:", error.message);
    return false;
  }

  return data === true;
}
```

#### 4.5.5 SQL function for grant checking (called via RPC)

```sql
-- RPC function for grant checking. Called from application layer via supabase.rpc().
-- Uses SECURITY DEFINER to bypass RLS (the caller may not have access to the
-- granting tenant's rows).
CREATE OR REPLACE FUNCTION check_grant(
  p_subject_tenant_id UUID,
  p_object_node_id UUID,
  p_capability TEXT,
  p_at_time TIMESTAMPTZ DEFAULT now()
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM grants g
    WHERE g.subject_tenant_id = p_subject_tenant_id
      AND (
        g.object_node_id = p_object_node_id
        OR g.object_node_id = (
          SELECT n.type_node_id
          FROM nodes n
          WHERE n.node_id = p_object_node_id
            AND n.valid_to = 'infinity'
            AND n.is_deleted = false
          LIMIT 1
        )
      )
      AND (
        g.capability = p_capability
        OR (g.capability = 'WRITE' AND p_capability IN ('READ', 'TRAVERSE'))
        OR (g.capability = 'READ' AND p_capability = 'TRAVERSE')
      )
      AND g.valid_from <= p_at_time
      AND g.valid_to > p_at_time
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION check_grant IS
  'Check if a cross-tenant grant exists. SECURITY DEFINER to bypass RLS. '
  'Capability hierarchy: WRITE > READ > TRAVERSE. '
  'Checks both direct node grants and type-level grants.';
```

#### 4.5.6 Grant temporal validity

Grants have `valid_from` and `valid_to` timestamps. The grant check includes a temporal predicate:

```sql
g.valid_from <= $check_time AND g.valid_to > $check_time
```

This means:
- Grants can be pre-dated (set `valid_from` in the future to schedule access).
- Grants can be revoked by setting `valid_to` to the revocation time (creates a new event, inserts a new grant row with `valid_to` set).
- A grant with `valid_to = 'infinity'` is perpetually valid until explicitly revoked.
- Grant revocation takes effect immediately (no token re-issue needed) because grants are checked at query time, not cached in the JWT.

---

### 4.6 Audit events

#### 4.6.1 Audit principle

Every tool call creates an audit event in the `events` table, regardless of whether the call succeeds or fails.
This provides a complete audit trail of all MCP server interactions.

Audit events are **non-blocking** — they are emitted as fire-and-forget after the tool response is sent.
A failed audit write does not cause the tool call to fail.

#### 4.6.2 Audit event structure

```typescript
// src/auth/audit.ts

/** Audit event payload for tool invocations. */
export interface AuditEventPayload {
  /** The MCP tool that was invoked. */
  tool_name: string;

  /** Hash of the tool parameters (SHA-256 of JSON-serialized params). Privacy-safe. */
  params_hash: string;

  /** Result status of the tool call. */
  result_status: "success" | "denied" | "error";

  /** If denied: the reason. */
  denial_reason?: string;

  /** If denied: the scope that was required but missing. */
  required_scope?: string;

  /** If error: the error code. */
  error_code?: string;

  /** Token type used for this call. */
  token_type: "user_token" | "agent_token" | "partner_token";

  /** Duration of the tool call in milliseconds. */
  duration_ms: number;

  /** Tenant IDs involved in this operation. */
  tenant_ids_involved: string[];

  /** Whether this was a cross-tenant operation. */
  is_cross_tenant: boolean;
}
```

#### 4.6.3 Audit event creation

```typescript
// src/auth/audit.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "./types.ts";

/**
 * Emit an audit event for a tool call. Non-blocking.
 *
 * Creates an event with intent_type = "tool_invoked" in the events table.
 * Uses the first tenant_id from the involved tenants as the event's tenant_id.
 *
 * Fire-and-forget: errors are logged but do not propagate.
 */
export function emitAuditEvent(
  serviceClient: SupabaseClient,
  claims: AuthClaims,
  payload: AuditEventPayload
): void {
  // Use the first tenant_id from the token as the event's owning tenant.
  // For cross-tenant operations, the audit event is owned by the caller's primary tenant.
  const tenantId = claims.tenant_ids[0];

  // Fire and forget — do not await.
  serviceClient
    .from("events")
    .insert({
      tenant_id: tenantId,
      intent_type: "tool_invoked",
      payload: payload as unknown as Record<string, unknown>,
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      created_by: claims.sub,
      node_ids: [],
      edge_ids: [],
    })
    .then(({ error }) => {
      if (error) {
        console.error("Audit event write failed:", error.message);
      }
    });
}

/**
 * Compute a SHA-256 hash of tool parameters for audit logging.
 * Hashing preserves privacy while enabling correlation.
 */
export async function hashParams(
  params: Record<string, unknown>
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(params));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

#### 4.6.4 Audit middleware pattern

The audit event is emitted by a wrapper around each tool handler:

```typescript
// src/tools/wrapper.ts

import { emitAuditEvent, hashParams, type AuditEventPayload } from "../auth/audit.ts";
import { requireScope, type ScopeRequirement } from "../auth/scopes.ts";
import type { AuthClaims } from "../auth/types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wraps a tool handler with scope checking and audit event emission.
 *
 * @param toolName - The MCP tool name.
 * @param scopeResolver - Function that computes the required scope from the tool's params.
 * @param handler - The actual tool implementation.
 * @returns A wrapped handler that adds auth + audit.
 */
export function withAuth<TParams extends Record<string, unknown>, TResult>(
  toolName: string,
  scopeResolver: (params: TParams, claims: AuthClaims) => ScopeRequirement,
  handler: (params: TParams, claims: AuthClaims, client: SupabaseClient) => Promise<TResult>
): (params: TParams, claims: AuthClaims, serviceClient: SupabaseClient) => Promise<TResult> {
  return async (params, claims, serviceClient) => {
    const startTime = performance.now();
    let resultStatus: AuditEventPayload["result_status"] = "success";
    let denialReason: string | undefined;
    let requiredScopeStr: string | undefined;
    let errorCode: string | undefined;

    try {
      // Resolve and check scope
      const required = scopeResolver(params, claims);
      try {
        requireScope(claims.scopes, required);
      } catch (scopeError: unknown) {
        resultStatus = "denied";
        const err = scopeError as { data?: { required_scope?: string; detail?: string } };
        requiredScopeStr = err.data?.required_scope;
        denialReason = err.data?.detail;
        throw scopeError;
      }

      // Execute tool
      return await handler(params, claims, serviceClient);
    } catch (err: unknown) {
      if (resultStatus !== "denied") {
        resultStatus = "error";
        const mcpErr = err as { code?: number; message?: string };
        errorCode = String(mcpErr.code ?? "UNKNOWN");
      }
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      const paramsHashValue = await hashParams(params);

      // Determine involved tenants
      const involvedTenants = new Set(claims.tenant_ids);
      if ("tenant_id" in params && typeof params.tenant_id === "string") {
        involvedTenants.add(params.tenant_id);
      }
      const involvedArray = [...involvedTenants];

      emitAuditEvent(serviceClient, claims, {
        tool_name: toolName,
        params_hash: paramsHashValue,
        result_status: resultStatus,
        denial_reason: denialReason,
        required_scope: requiredScopeStr,
        error_code: errorCode,
        token_type: claims.token_type,
        duration_ms: Math.round(duration),
        tenant_ids_involved: involvedArray,
        is_cross_tenant: involvedArray.length > 1,
      });
    }
  };
}
```

---

### 4.7 Permission matrix

The complete permission matrix for all 15 tools across all 4 Pettson agent roles.

**Legend:**
- `ALLOW` — Operation succeeds.
- `DENY` — Returns MCP error -32003 (Insufficient scope).
- `FILTERED` — Operation succeeds but results are filtered to accessible entities only. Inaccessible entities are silently omitted.
- `GRANT-DEP` — Allowed only if a corresponding grant exists in the grants table.

**Tenant UUIDs:**
- T1 = Taylor Events (`10000000-0000-7000-8000-000000000002`)
- T2 = Mountain Cabins (`10000000-0000-7000-8000-000000000003`)
- T3 = Nordic Tickets (`10000000-0000-7000-8000-000000000004`)

#### 4.7.1 Sales agent

Scopes: `tenant:T1:read`, `tenant:T3:read`, `tenant:T2:read`, `tenant:T1:nodes:lead:write`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` | ALLOW | ALLOW | ALLOW | FILTERED (results from all 3) |
| `store_entity` (lead) | ALLOW | DENY | DENY | — |
| `store_entity` (campaign) | DENY | DENY | DENY | — |
| `connect_entities` | DENY (no broad write) | DENY | DENY | DENY |
| `explore_graph` | ALLOW | ALLOW | ALLOW | GRANT-DEP |
| `remove_entity` | DENY (no broad write) | DENY | DENY | — |
| `query_at_time` | ALLOW | ALLOW | ALLOW | — |
| `get_timeline` | ALLOW | ALLOW | ALLOW | — |
| `capture_thought` | DENY (needs broad write) | DENY | DENY | — |
| `get_schema` | ALLOW | ALLOW | ALLOW | — |
| `get_stats` | ALLOW | ALLOW | ALLOW | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` | ALLOW | ALLOW | ALLOW | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | ALLOW | ALLOW | ALLOW | — |
| `lookup_dict` | ALLOW | ALLOW | ALLOW | — |

**Notes:**
- `store_entity(entity_type="lead")` in T1 is ALLOW because `tenant:T1:nodes:lead:write` covers it.
- `store_entity(entity_type="campaign")` in T1 is DENY because the scope is limited to leads.
- `capture_thought` requires broad `tenant:{id}:write` because entity types are determined dynamically.
- `connect_entities` requires broad write scope (not type-specific) because edges are not node-typed.

#### 4.7.2 Content agent

Scopes: `tenant:T1:nodes:campaign:write`, `tenant:T1:nodes:campaign:read`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` (campaigns) | ALLOW | DENY | DENY | — |
| `find_entities` (leads) | DENY | DENY | DENY | — |
| `find_entities` (no type filter) | DENY (type-specific scope cannot satisfy untyped read) | DENY | DENY | — |
| `store_entity` (campaign) | ALLOW | DENY | DENY | — |
| `store_entity` (lead) | DENY | DENY | DENY | — |
| `connect_entities` | DENY | DENY | DENY | — |
| `explore_graph` | DENY (no broad read) | DENY | DENY | — |
| `remove_entity` (campaign) | DENY (remove needs broad write) | DENY | DENY | — |
| `query_at_time` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `get_timeline` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `capture_thought` | DENY | DENY | DENY | — |
| `get_schema` | DENY | DENY | DENY | — |
| `get_stats` | DENY | DENY | DENY | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | DENY | DENY | DENY | — |
| `lookup_dict` | DENY | DENY | DENY | — |

**Notes:**
- The content agent has the most restrictive scope. It can only read and write campaigns in T1.
- `find_entities` without `entity_types` filter is DENY because a type-specific scope cannot satisfy a broad tenant-level read requirement. The agent must specify `entity_types: ["campaign"]` to get results.
- `remove_entity` requires broad write scope (`tenant:{id}:write`) even for campaigns because removal is a structural operation, not a type-specific one.
- `explore_graph` requires broad read scope for traversal safety — traversal may encounter any entity type.

#### 4.7.3 Booking agent

Scopes: `tenant:T2:write`, `tenant:T3:read`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` | DENY | ALLOW | ALLOW | FILTERED (T2 + T3) |
| `store_entity` | DENY | ALLOW | DENY | — |
| `connect_entities` | DENY | ALLOW | DENY | GRANT-DEP (T2→T3) |
| `explore_graph` | DENY | ALLOW | ALLOW | GRANT-DEP |
| `remove_entity` | DENY | ALLOW | DENY | — |
| `query_at_time` | DENY | ALLOW | ALLOW | — |
| `get_timeline` | DENY | ALLOW | ALLOW | — |
| `capture_thought` | DENY | ALLOW | DENY | — |
| `get_schema` | DENY | ALLOW | ALLOW | — |
| `get_stats` | DENY | ALLOW | ALLOW | — |
| `propose_event` | DENY | ALLOW | DENY | — |
| `verify_lineage` | DENY | ALLOW | ALLOW | — |
| `store_blob` | DENY | ALLOW | DENY | — |
| `get_blob` | DENY | ALLOW | ALLOW | — |
| `lookup_dict` | DENY | ALLOW | ALLOW | — |

**Notes:**
- `capture_thought` is ALLOW for T2 because `tenant:T2:write` is a broad write scope.
- `connect_entities` for a cross-tenant edge (e.g., booking→package) requires write scope on the edge's tenant (T2) plus a grant from T3 for the package node.

#### 4.7.4 Partner travel agency

Scopes: `tenant:T3:nodes:package:read`, `tenant:T2:nodes:property:read`
Token type: `partner_token` (30-day lifetime, non-refreshable)

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` (packages) | DENY | DENY | ALLOW | — |
| `find_entities` (properties) | DENY | ALLOW | DENY | — |
| `find_entities` (no type filter) | DENY | DENY | DENY | — |
| `store_entity` | DENY | DENY | DENY | — |
| `connect_entities` | DENY | DENY | DENY | — |
| `explore_graph` | DENY | DENY | DENY | — |
| `remove_entity` | DENY | DENY | DENY | — |
| `query_at_time` (package) | DENY | DENY | ALLOW | — |
| `query_at_time` (property) | DENY | ALLOW | DENY | — |
| `get_timeline` (package) | DENY | DENY | ALLOW | — |
| `get_timeline` (property) | DENY | ALLOW | DENY | — |
| `capture_thought` | DENY | DENY | DENY | — |
| `get_schema` | DENY | DENY | DENY | — |
| `get_stats` | DENY | DENY | DENY | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` (package) | DENY | DENY | ALLOW | — |
| `verify_lineage` (property) | DENY | ALLOW | DENY | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | DENY | DENY | DENY | — |
| `lookup_dict` | DENY | DENY | DENY | — |

**Notes:**
- Partner tokens are the most restricted. Read-only, type-specific, no structural operations.
- All write operations are DENY regardless of scope because the token only has read scopes.
- `explore_graph` is DENY because traversal requires broad read scope.
- `get_schema` is DENY because it requires broad tenant-level read scope.

#### 4.7.5 Acceptance test coverage

| Test | Agent | Auth assertion |
|---|---|---|
| T01 | sales_agent | Cross-tenant search — results from T1+T2+T3, filtered by scopes + grants |
| T02 | content_agent | `store_entity(campaign)` in T1 — ALLOW |
| T03 | content_agent | `find_entities(entity_types=["lead"])` — DENY (no lead read scope) |
| T04 | booking_agent | `explore_graph` cross-tenant — ALLOW with TRAVERSE grant |
| T05 | partner_travel_agency | `store_entity` — DENY (read-only token) |
| T06 | any | Audit event created for every tool call |

---

### 4.8 Error responses

All auth errors use the JSON-RPC 2.0 error format as required by the MCP specification.
Auth errors use custom error codes in the range -32001 to -32003.

#### 4.8.1 Error code registry

| HTTP Status | JSON-RPC Code | Type | When |
|---|---|---|---|
| 401 | -32001 | `UNAUTHENTICATED` | No Authorization header or malformed Bearer token |
| 401 | -32001 | `TOKEN_EXPIRED` | JWT `exp` claim is in the past |
| 401 | -32001 | `TOKEN_INVALID` | JWT signature verification failed, or `iss`/`aud` mismatch |
| 401 | -32001 | `INVALID_CLAIMS` | Token is valid but missing required claims (`tenant_ids`) |
| 403 | -32003 | `FORBIDDEN` | Valid token but insufficient scope for the requested operation |
| 403 | -32003 | `GRANT_DENIED` | Valid token and scope, but no cross-tenant grant exists |

#### 4.8.2 401 Unauthorized — missing/invalid/expired token

All 401 responses include a `WWW-Authenticate` header pointing to the PRM endpoint so the client
can discover the Authorization Server.

**Missing token:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication required",
    "data": {
      "type": "UNAUTHENTICATED",
      "detail": "Missing or malformed Authorization header. Expected: Bearer <token>",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp"
Content-Type: application/json
```

**Expired token:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication failed",
    "data": {
      "type": "TOKEN_EXPIRED",
      "detail": "Token has expired. Obtain a new token from the authorization server.",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp", error="invalid_token", error_description="Token has expired."
Content-Type: application/json
```

**Invalid token (signature, issuer, or audience failure):**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication failed",
    "data": {
      "type": "TOKEN_INVALID",
      "detail": "Token validation failed: signature verification failed",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp", error="invalid_token", error_description="Token validation failed: signature verification failed"
Content-Type: application/json
```

#### 4.8.3 403 Forbidden — insufficient scope

403 responses include the required scope so the MCP client (or agent) can understand what permission
is needed and potentially request a re-scoped token.

**Insufficient scope:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32003,
    "message": "Insufficient scope",
    "data": {
      "type": "FORBIDDEN",
      "detail": "This operation requires scope \"tenant:10000000-0000-7000-8000-000000000002:nodes:lead:read\" or a broader scope that includes it.",
      "required_scope": "tenant:10000000-0000-7000-8000-000000000002:nodes:lead:read",
      "available_scopes": [
        "tenant:10000000-0000-7000-8000-000000000002:nodes:campaign:write",
        "tenant:10000000-0000-7000-8000-000000000002:nodes:campaign:read"
      ]
    }
  },
  "id": "req-123"
}
```

**Cross-tenant grant denied:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32003,
    "message": "Cross-tenant access denied",
    "data": {
      "type": "GRANT_DENIED",
      "detail": "No active grant allows tenant 10000000-0000-7000-8000-000000000002 to READ node 40000000-0000-7000-8000-000000000005 in tenant 10000000-0000-7000-8000-000000000003.",
      "subject_tenant_id": "10000000-0000-7000-8000-000000000002",
      "object_node_id": "40000000-0000-7000-8000-000000000005",
      "required_capability": "READ"
    }
  },
  "id": "req-456"
}
```

#### 4.8.4 Error response type

```typescript
// src/auth/errors.ts

/** MCP-compatible auth error structure. */
export interface AuthError {
  code: number;
  message: string;
  data: {
    type: "UNAUTHENTICATED" | "TOKEN_EXPIRED" | "TOKEN_INVALID" | "INVALID_CLAIMS" | "FORBIDDEN" | "GRANT_DENIED";
    detail: string;
    prm_url?: string;
    required_scope?: string;
    available_scopes?: string[];
    subject_tenant_id?: string;
    object_node_id?: string;
    required_capability?: string;
  };
}

/**
 * Create a standardized auth error for MCP JSON-RPC responses.
 */
export function createAuthError(
  type: AuthError["data"]["type"],
  detail: string,
  extra?: Partial<AuthError["data"]>
): AuthError {
  const isUnauth = ["UNAUTHENTICATED", "TOKEN_EXPIRED", "TOKEN_INVALID", "INVALID_CLAIMS"].includes(type);
  return {
    code: isUnauth ? -32001 : -32003,
    message: isUnauth ? "Authentication failed" : "Insufficient permissions",
    data: {
      type,
      detail,
      ...extra,
    },
  };
}
```

#### 4.8.5 Error behavior summary

| Scenario | HTTP | Error code | Self-correction hint |
|---|---|---|---|
| No `Authorization` header | 401 | -32001 | `prm_url` to discover AS |
| `Authorization: Bearer <malformed>` | 401 | -32001 | `prm_url` to discover AS |
| Token signature invalid | 401 | -32001 | "Token validation failed" — re-obtain token |
| Token expired | 401 | -32001 | "Token has expired" — re-obtain token |
| Token missing `tenant_ids` | 401 | -32001 | "No tenant_ids claim" — request token with tenant access |
| Valid token, wrong tenant | 403 | -32003 | `required_scope` tells agent what scope to request |
| Valid token, wrong entity type | 403 | -32003 | `required_scope` shows the type-specific scope needed |
| Valid token, no cross-tenant grant | 403 | -32003 | `subject_tenant_id`, `object_node_id`, `required_capability` — agent can explain to user what access is needed |
| Valid token, write on read-only | 403 | -32003 | `required_scope` ends in `:write`, agent sees it needs write access |

All error messages are designed to enable **agent self-correction** (design principle 6 from gen0 section 3.1).
An MCP agent receiving a 403 can inspect the `required_scope` and either adjust its request or explain to the
user what permission is needed.
