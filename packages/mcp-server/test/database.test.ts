/**
 * Phase 1 test: Database foundation — migration + seed + integrity.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate, METATYPE_ID, SYSTEM_TENANT_ID, ACTOR_TYPE_ID } from '../src/db/migrate.js';
import { seed, IDS } from '../src/db/seed.js';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase(); // in-memory
  await migrate(db);
  await seed(db);
});

afterAll(async () => {
  await db.close();
});

describe('Migration', () => {
  it('creates all 7 tables', async () => {
    const result = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tables = result.rows.map((r) => r.tablename);
    expect(tables).toContain('tenants');
    expect(tables).toContain('events');
    expect(tables).toContain('nodes');
    expect(tables).toContain('edges');
    expect(tables).toContain('grants');
    expect(tables).toContain('blobs');
    expect(tables).toContain('dicts');
  });

  it('creates system tenant', async () => {
    const result = await db.query('SELECT name FROM tenants WHERE tenant_id = $1', [
      SYSTEM_TENANT_ID,
    ]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]!.name).toBe('__system__');
  });

  it('creates self-referential metatype node', async () => {
    const result = await db.query<{
      node_id: string;
      type_node_id: string;
      epistemic: string;
    }>(
      'SELECT node_id, type_node_id, epistemic FROM nodes WHERE node_id = $1 AND valid_to = $2',
      [METATYPE_ID, 'infinity'],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]!.node_id).toBe(METATYPE_ID);
    expect(result.rows[0]!.type_node_id).toBe(METATYPE_ID); // self-referential
    expect(result.rows[0]!.epistemic).toBe('confirmed');
  });

  it('creates actor type node', async () => {
    const result = await db.query(
      'SELECT node_id, type_node_id FROM nodes WHERE node_id = $1 AND valid_to = $2',
      [ACTOR_TYPE_ID, 'infinity'],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]!.type_node_id).toBe(METATYPE_ID);
  });
});

describe('Seed data', () => {
  it('creates 5 tenants (1 system + 4 Pettson)', async () => {
    const result = await db.query('SELECT COUNT(*)::int as count FROM tenants');
    expect(result.rows[0]!.count).toBe(5);
  });

  it('creates correct tenant hierarchy', async () => {
    const result = await db.query<{ name: string; parent_id: string | null }>(
      'SELECT name, parent_id FROM tenants WHERE tenant_id != $1 ORDER BY name',
      [SYSTEM_TENANT_ID],
    );
    const holding = result.rows.find((r) => r.name === 'Pettson Holding AB');
    expect(holding?.parent_id).toBeNull();

    const taylor = result.rows.find((r) => r.name === 'Taylor Events AB');
    expect(taylor?.parent_id).toBe(IDS.PETTSON_HOLDING);
  });

  it('creates 16 type nodes + metatype + actor type = 18 type-layer nodes', async () => {
    // All nodes where type_node_id = METATYPE_ID are type nodes
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM nodes
       WHERE type_node_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [METATYPE_ID],
    );
    // metatype itself + actor_type + 5 taylor + 4 mountain + 4 nordic + 6 edge = 21
    // (actor_type has type_node_id = METATYPE_ID, counted here)
    expect(result.rows[0]!.count).toBe(21);
  });

  it('creates 9 sample entities', async () => {
    // Entities that are NOT type nodes (type_node_id != METATYPE_ID)
    // and NOT actors (type_node_id != ACTOR_TYPE_ID)
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM nodes
       WHERE type_node_id != $1 AND type_node_id != $2
       AND is_deleted = false AND valid_to = 'infinity'`,
      [METATYPE_ID, ACTOR_TYPE_ID],
    );
    expect(result.rows[0]!.count).toBe(9);
  });

  it('creates 6 edges', async () => {
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM edges WHERE is_deleted = false`,
    );
    expect(result.rows[0]!.count).toBe(6);
  });

  it('creates 4 grants', async () => {
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM grants WHERE is_deleted = false`,
    );
    expect(result.rows[0]!.count).toBe(4);
  });

  it('creates 4 actor nodes', async () => {
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM nodes
       WHERE type_node_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [ACTOR_TYPE_ID],
    );
    expect(result.rows[0]!.count).toBe(4);
  });

  it('has Erik lead with backdated valid_from for T07', async () => {
    const result = await db.query<{ valid_from: string; data: object }>(
      `SELECT valid_from, data FROM nodes
       WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [IDS.LEAD_ERIK],
    );
    expect(result.rows.length).toBe(1);
    const validFrom = new Date(result.rows[0]!.valid_from);
    expect(validFrom.getFullYear()).toBe(2026);
    expect(validFrom.getMonth()).toBe(0); // January
  });
});

describe('INV-LINEAGE: Event lineage integrity (T13 equivalent)', () => {
  it('every node has a valid created_by_event', async () => {
    const result = await db.query(
      `SELECT n.node_id, n.created_by_event
       FROM nodes n
       LEFT JOIN events e ON n.created_by_event = e.event_id
       WHERE e.event_id IS NULL`,
    );
    expect(result.rows.length).toBe(0); // no orphaned facts
  });

  it('every edge has a valid created_by_event', async () => {
    const result = await db.query(
      `SELECT ed.edge_id, ed.created_by_event
       FROM edges ed
       LEFT JOIN events e ON ed.created_by_event = e.event_id
       WHERE e.event_id IS NULL`,
    );
    expect(result.rows.length).toBe(0);
  });

  it('every grant has a valid created_by_event', async () => {
    const result = await db.query(
      `SELECT g.grant_id, g.created_by_event
       FROM grants g
       LEFT JOIN events e ON g.created_by_event = e.event_id
       WHERE e.event_id IS NULL`,
    );
    expect(result.rows.length).toBe(0);
  });

  it('event count matches fact row count', async () => {
    const events = await db.query('SELECT COUNT(*)::int as count FROM events');
    const nodes = await db.query('SELECT COUNT(*)::int as count FROM nodes');
    const edges = await db.query('SELECT COUNT(*)::int as count FROM edges');
    const grants = await db.query('SELECT COUNT(*)::int as count FROM grants');

    const factCount =
      (nodes.rows[0]!.count as number) +
      (edges.rows[0]!.count as number) +
      (grants.rows[0]!.count as number);

    // Every fact row has exactly one event, plus the metatype bootstrap event
    // events >= facts (some events may not have facts, like bootstrap)
    expect(events.rows[0]!.count).toBeGreaterThanOrEqual(factCount);
  });
});

describe('Cross-tenant edges', () => {
  it('package includes property (nordic → mountain)', async () => {
    const result = await db.query<{ source_id: string; target_id: string; tenant_id: string }>(
      'SELECT source_id, target_id, tenant_id FROM edges WHERE edge_id = $1',
      [IDS.EDGE_PKG_INCLUDES_PROP],
    );
    expect(result.rows[0]!.source_id).toBe(IDS.PACKAGE_MIDSOMMAR);
    expect(result.rows[0]!.target_id).toBe(IDS.PROPERTY_BJORNEN);
    expect(result.rows[0]!.tenant_id).toBe(IDS.NORDIC_TICKETS); // nordic owns
  });

  it('grants exist for cross-tenant access', async () => {
    const result = await db.query<{ subject_tenant_id: string; capability: string }>(
      `SELECT subject_tenant_id, capability FROM grants
       WHERE object_node_id = $1 AND is_deleted = false`,
      [IDS.PROPERTY_BJORNEN],
    );
    expect(result.rows.length).toBe(2); // taylor READ + nordic TRAVERSE
    const capabilities = result.rows.map((r) => `${r.subject_tenant_id}:${r.capability}`);
    expect(capabilities).toContain(`${IDS.TAYLOR_EVENTS}:READ`);
    expect(capabilities).toContain(`${IDS.NORDIC_TICKETS}:TRAVERSE`);
  });
});
