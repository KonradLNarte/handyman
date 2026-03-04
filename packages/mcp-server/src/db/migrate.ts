/**
 * Database migration — creates all 7 tables, indexes, and metatype bootstrap.
 * Translates spec §2.1, §2.6.1, §2.6.3, §2.6.4 to PGlite-compatible DDL.
 *
 * [FEEDBACK:gen1-impl] RLS policies (§2.6.2) are NOT created — PGlite has no RLS.
 * [FEEDBACK:gen1-impl] btree_gist extension may not be available — EXCLUDE constraint
 *   may need to be skipped. We attempt it and fall back gracefully.
 * [FEEDBACK:gen1-impl] UUIDv7 generated in application layer, not via DB DEFAULT.
 */
import type { PGlite } from './connection.js';

// Well-known UUIDs from spec §7.8
export const SYSTEM_TENANT_ID = '00000000-0000-7000-0000-000000000000';
export const METATYPE_ID = '00000000-0000-7000-0000-000000000001';
export const ACTOR_TYPE_ID = '00000000-0000-7000-0000-000000000002';

export async function migrate(db: PGlite): Promise<void> {
  // Extensions
  await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');
  try {
    await db.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  } catch {
    // PGlite may not have pgcrypto — gen_random_bytes fallback below
  }

  // UUIDv7 function (spec §2.6.4)
  // [FEEDBACK:gen1-impl] PGlite lacks gen_random_bytes — use gen_random_uuid() for random bits
  await db.exec(`
    CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS UUID AS $$
    DECLARE
      v_time BIGINT;
      v_random_uuid UUID;
      v_time_bytes BYTEA;
      v_rand_bytes BYTEA;
      v_bytes BYTEA;
    BEGIN
      v_time := (extract(epoch from clock_timestamp()) * 1000)::BIGINT;
      v_time_bytes := decode(lpad(to_hex(v_time), 12, '0'), 'hex');
      v_random_uuid := gen_random_uuid();
      v_rand_bytes := decode(replace(v_random_uuid::text, '-', ''), 'hex');
      v_bytes := v_time_bytes || substring(v_rand_bytes from 1 for 10);
      v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & x'0f'::int) | x'70'::int);
      v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & x'3f'::int) | x'80'::int);
      RETURN encode(v_bytes, 'hex')::UUID;
    END $$ LANGUAGE plpgsql VOLATILE;
  `);

  // Table 1: TENANTS
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id       UUID REFERENCES tenants,
      name            TEXT NOT NULL,
      config          JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants (parent_id) WHERE parent_id IS NOT NULL;
  `);

  // Table 2: EVENTS — append-only immutable truth
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      event_id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      tenant_id       UUID NOT NULL REFERENCES tenants,
      intent_type     TEXT NOT NULL CHECK (intent_type IN (
        'entity_created', 'entity_updated', 'entity_removed',
        'edge_created', 'edge_removed',
        'epistemic_change', 'thought_captured',
        'grant_created', 'grant_revoked',
        'blob_stored'
      )),
      payload         JSONB NOT NULL,
      stream_id       UUID,
      node_ids        UUID[] DEFAULT '{}',
      edge_ids        UUID[] DEFAULT '{}',
      occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by      UUID NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_tenant ON events (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_events_stream ON events (stream_id) WHERE stream_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_intent ON events (tenant_id, intent_type);
    CREATE INDEX IF NOT EXISTS idx_events_occurred ON events (tenant_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_recorded ON events (recorded_at DESC);
  `);

  // Table 3: NODES — entities with composite PK and bitemporality
  // Note: REFERENCES nodes for type_node_id is LOGICAL, not enforced as FK (spec note §2.1)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      node_id         UUID NOT NULL,
      tenant_id       UUID NOT NULL REFERENCES tenants,
      type_node_id    UUID NOT NULL,
      data            JSONB NOT NULL DEFAULT '{}',
      embedding       vector(1536),
      epistemic       TEXT NOT NULL DEFAULT 'hypothesis',
      valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_to        TIMESTAMPTZ DEFAULT 'infinity',
      recorded_at     TIMESTAMPTZ DEFAULT now(),
      created_by      UUID NOT NULL,
      created_by_event UUID NOT NULL REFERENCES events,
      is_deleted      BOOLEAN DEFAULT false,
      PRIMARY KEY (node_id, valid_from)
    );
    CREATE INDEX IF NOT EXISTS idx_nodes_tenant ON nodes (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes (type_node_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_active ON nodes (tenant_id, type_node_id) WHERE is_deleted = false AND valid_to = 'infinity';
    CREATE INDEX IF NOT EXISTS idx_nodes_stream ON nodes (node_id, valid_from DESC);
  `);

  // Attempt EXCLUDE constraint (needs btree_gist)
  // [FEEDBACK:gen1-impl] If this fails, non-overlapping valid ranges enforced in application layer only
  try {
    await db.exec('CREATE EXTENSION IF NOT EXISTS btree_gist;');
    await db.exec(`
      ALTER TABLE nodes ADD CONSTRAINT nodes_no_overlap
        EXCLUDE USING gist (
          node_id WITH =,
          tstzrange(valid_from, valid_to) WITH &&
        );
    `);
  } catch {
    console.warn(
      '[FEEDBACK:gen1-impl] btree_gist EXCLUDE constraint not available in PGlite. ' +
        'Non-overlapping valid ranges enforced at application level only.',
    );
  }

  // HNSW index for vector search
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_embedding ON nodes
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    `);
  } catch {
    console.warn(
      '[FEEDBACK:gen1-impl] HNSW index creation failed — vector search will use sequential scan.',
    );
  }

  // Table 4: EDGES — immutable with soft-delete, simple PK (D-002)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      edge_id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      tenant_id       UUID NOT NULL REFERENCES tenants,
      type_node_id    UUID NOT NULL,
      source_id       UUID NOT NULL,
      target_id       UUID NOT NULL,
      data            JSONB DEFAULT '{}',
      valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_to        TIMESTAMPTZ DEFAULT 'infinity',
      recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by      UUID NOT NULL,
      created_by_event UUID NOT NULL REFERENCES events,
      is_deleted      BOOLEAN DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_edges_tenant ON edges (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges (source_id) WHERE is_deleted = false;
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges (target_id) WHERE is_deleted = false;
    CREATE INDEX IF NOT EXISTS idx_edges_type ON edges (type_node_id);
    CREATE INDEX IF NOT EXISTS idx_edges_active ON edges (tenant_id) WHERE is_deleted = false AND valid_to = 'infinity';
  `);

  // Table 5: GRANTS — capability-based access control
  await db.exec(`
    CREATE TABLE IF NOT EXISTS grants (
      grant_id        UUID PRIMARY KEY,
      tenant_id       UUID NOT NULL REFERENCES tenants,
      subject_tenant_id UUID NOT NULL REFERENCES tenants,
      object_node_id  UUID NOT NULL,
      capability      TEXT NOT NULL,
      valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_to        TIMESTAMPTZ DEFAULT 'infinity',
      is_deleted      BOOLEAN DEFAULT false,
      created_by      UUID NOT NULL,
      created_by_event UUID NOT NULL REFERENCES events
    );
    CREATE INDEX IF NOT EXISTS idx_grants_tenant ON grants (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_grants_subject ON grants (subject_tenant_id);
    CREATE INDEX IF NOT EXISTS idx_grants_object ON grants (object_node_id);
    CREATE INDEX IF NOT EXISTS idx_grants_active ON grants (subject_tenant_id, object_node_id, capability) WHERE is_deleted = false AND valid_to = 'infinity';
  `);

  // Table 6: BLOBS — binary metadata
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blobs (
      blob_id         UUID PRIMARY KEY,
      tenant_id       UUID NOT NULL REFERENCES tenants,
      content_type    TEXT NOT NULL,
      storage_ref     TEXT NOT NULL,
      size_bytes      BIGINT NOT NULL,
      node_id         UUID,
      created_at      TIMESTAMPTZ DEFAULT now(),
      created_by      UUID NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blobs_tenant ON blobs (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_blobs_node ON blobs (node_id) WHERE node_id IS NOT NULL;
  `);

  // Table 7: DICTS — reference data
  await db.exec(`
    CREATE TABLE IF NOT EXISTS dicts (
      dict_id         UUID PRIMARY KEY,
      tenant_id       UUID NOT NULL REFERENCES tenants,
      type            TEXT NOT NULL,
      key             TEXT NOT NULL,
      value           JSONB NOT NULL,
      valid_from      TIMESTAMPTZ DEFAULT now(),
      valid_to        TIMESTAMPTZ DEFAULT 'infinity',
      UNIQUE(tenant_id, type, key, valid_from)
    );
    CREATE INDEX IF NOT EXISTS idx_dicts_lookup ON dicts (tenant_id, type, key);
  `);

  // Metatype bootstrap (spec §2.6.3)
  await bootstrapMetatype(db);
}

async function bootstrapMetatype(db: PGlite): Promise<void> {
  // Check if already bootstrapped
  const existing = await db.query(
    'SELECT 1 FROM tenants WHERE tenant_id = $1',
    [SYSTEM_TENANT_ID],
  );
  if (existing.rows.length > 0) return;

  const bootstrapEventId = (
    await db.query<{ uuid_generate_v7: string }>(
      'SELECT uuid_generate_v7() as uuid_generate_v7',
    )
  ).rows[0]!.uuid_generate_v7;

  const actorTypeEventId = (
    await db.query<{ uuid_generate_v7: string }>(
      'SELECT uuid_generate_v7() as uuid_generate_v7',
    )
  ).rows[0]!.uuid_generate_v7;

  // System tenant
  await db.exec(`
    INSERT INTO tenants (tenant_id, name, config)
    VALUES ('${SYSTEM_TENANT_ID}', '__system__', '{"is_system": true}');
  `);

  // Bootstrap event for metatype
  await db.query(
    `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, created_by)
     VALUES ($1, $2, 'entity_created', $3, $4, now(), $4)`,
    [
      bootstrapEventId,
      SYSTEM_TENANT_ID,
      JSON.stringify({
        type: 'metatype',
        data: {
          name: 'metatype',
          description:
            'The type of all type nodes. Self-referential bootstrap node.',
          kind: 'entity_type',
        },
      }),
      METATYPE_ID,
    ],
  );

  // Metatype node (self-referential: type_node_id = node_id)
  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $1, $3, 'confirmed', now(), 'infinity', $1, $4, false)`,
    [
      METATYPE_ID,
      SYSTEM_TENANT_ID,
      JSON.stringify({
        name: 'metatype',
        description:
          'The type of all type nodes. Self-referential bootstrap node.',
        kind: 'entity_type',
      }),
      bootstrapEventId,
    ],
  );

  // Actor type node (spec §4.6 — needed for actor identity)
  await db.query(
    `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, occurred_at, created_by)
     VALUES ($1, $2, 'entity_created', $3, $4, now(), $5)`,
    [
      actorTypeEventId,
      SYSTEM_TENANT_ID,
      JSON.stringify({
        type: 'actor',
        data: {
          name: 'actor',
          description: 'An agent, user, or system actor',
          kind: 'entity_type',
          label_schema: {
            type: 'object',
            required: ['name', 'actor_type', 'external_id'],
            properties: {
              name: { type: 'string', description: 'Display name of the actor' },
              actor_type: {
                type: 'string',
                enum: ['user', 'agent', 'system'],
                description: 'Type of actor',
              },
              external_id: {
                type: 'string',
                description: 'JWT sub claim value',
              },
              purpose: {
                type: 'string',
                description: 'What this actor does (for agents)',
              },
              scopes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Scopes assigned to this actor',
              },
            },
          },
        },
      }),
      ACTOR_TYPE_ID,
      METATYPE_ID,
    ],
  );

  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, 'confirmed', now(), 'infinity', $3, $5, false)`,
    [
      ACTOR_TYPE_ID,
      SYSTEM_TENANT_ID,
      METATYPE_ID,
      JSON.stringify({
        name: 'actor',
        description: 'An agent, user, or system actor',
        kind: 'entity_type',
        label_schema: {
          type: 'object',
          required: ['name', 'actor_type', 'external_id'],
          properties: {
            name: { type: 'string' },
            actor_type: { type: 'string', enum: ['user', 'agent', 'system'] },
            external_id: { type: 'string' },
            purpose: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
          },
        },
      }),
      actorTypeEventId,
    ],
  );
}
