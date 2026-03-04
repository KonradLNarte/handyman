/**
 * Phase 4 tests — core tools via tool functions (not MCP transport).
 * Tests: store_entity, find_entities, connect_entities, explore_graph,
 *        remove_entity, get_schema, get_stats.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed, IDS, TENANT_IDS } from '../src/db/seed.js';
import { signToken, verifyToken } from '../src/auth/jwt.js';
import { createAuthContext, type AuthContext } from '../src/auth/context.js';
import { storeEntity } from '../src/tools/store-entity.js';
import { findEntities } from '../src/tools/find-entities.js';
import { connectEntities } from '../src/tools/connect-entities.js';
import { exploreGraph } from '../src/tools/explore-graph.js';
import { removeEntity } from '../src/tools/remove-entity.js';
import { getSchema } from '../src/tools/get-schema.js';
import { getStats } from '../src/tools/get-stats.js';

const SECRET = 'test-secret-key-for-jwt-signing-min-32-chars!!';

let db: PGlite;

async function makeAuth(sub: string, tenantIds: string[], scopes: string[]): Promise<AuthContext> {
  const token = await signToken({ sub, tenant_ids: tenantIds, scopes }, SECRET);
  const claims = await verifyToken(token, SECRET);
  return createAuthContext(claims, db);
}

beforeAll(async () => {
  db = await createDatabase();
  await migrate(db);
  await seed(db);
});

afterAll(async () => {
  await db.close();
});

// ═══════════════════════════════════════════════════════════════
// store_entity
// ═══════════════════════════════════════════════════════════════
describe('store_entity', () => {
  test('creates new entity', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
    ]);
    const result = await storeEntity(db, auth, {
      entity_type: 'lead',
      data: { name: 'Tool Test Lead', status: 'new' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(result.entity_id).toBeTruthy();
    expect(result.entity_type).toBe('lead');
    expect(result.version).toBe(1);
  });

  test('updates existing entity', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
    ]);
    const created = await storeEntity(db, auth, {
      entity_type: 'lead',
      data: { name: 'Update Me', status: 'new' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    const updated = await storeEntity(db, auth, {
      entity_type: 'lead',
      entity_id: created.entity_id,
      data: { name: 'Update Me', status: 'contacted' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(updated.version).toBe(2);
    expect((updated.data as Record<string, unknown>).status).toBe('contacted');
  });

  test('rejects write without scope', async () => {
    const auth = await makeAuth('reader', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    await expect(
      storeEntity(db, auth, {
        entity_type: 'lead',
        data: { name: 'No Write' },
        tenant_id: TENANT_IDS.TAYLOR_EVENTS,
      }),
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// find_entities
// ═══════════════════════════════════════════════════════════════
describe('find_entities', () => {
  test('finds entities by type', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await findEntities(db, auth, {
      entity_types: ['lead'],
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { results: unknown[]; total_count: number };

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.total_count).toBeGreaterThan(0);
  });

  test('filters by data field', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await findEntities(db, auth, {
      entity_types: ['lead'],
      filters: { status: 'qualified' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { results: Array<{ data: Record<string, unknown> }> };

    for (const r of result.results) {
      expect(r.data.status).toBe('qualified');
    }
  });

  test('type-scoped token only sees allowed types', async () => {
    // Content agent can only see campaigns
    const auth = await makeAuth('content-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:nodes:campaign:read`,
    ]);
    const result = await findEntities(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { results: Array<{ entity_type: string }> };

    for (const r of result.results) {
      expect(r.entity_type).toBe('campaign');
    }
  });

  test('respects limit', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await findEntities(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
      limit: 2,
    }) as { results: unknown[] };

    expect(result.results.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// connect_entities
// ═══════════════════════════════════════════════════════════════
describe('connect_entities', () => {
  test('connects two entities in same tenant', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    // Create two entities first
    const a = await storeEntity(db, auth, {
      entity_type: 'lead',
      data: { name: 'Connect Source', status: 'new' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    const b = await storeEntity(db, auth, {
      entity_type: 'campaign',
      data: { name: 'Connect Target', type: 'digital' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    const result = await connectEntities(db, auth, {
      edge_type: 'contacted_via',
      source_id: a.entity_id,
      target_id: b.entity_id,
    }) as Record<string, unknown>;

    expect(result.edge_id).toBeTruthy();
    expect(result.is_cross_tenant).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// explore_graph
// ═══════════════════════════════════════════════════════════════
describe('explore_graph', () => {
  test('traverses outgoing edges from seed data', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    // Lead Erik has edges to booking and campaign
    const result = await exploreGraph(db, auth, {
      start_id: IDS.LEAD_ERIK,
    }) as { center: Record<string, unknown>; connections: unknown[] };

    expect(result.center.entity_id).toBe(IDS.LEAD_ERIK);
    expect(result.connections.length).toBeGreaterThan(0);
  });

  test('respects direction filter', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await exploreGraph(db, auth, {
      start_id: IDS.LEAD_ERIK,
      direction: 'outgoing',
    }) as { connections: Array<{ direction: string }> };

    for (const conn of result.connections) {
      expect(conn.direction).toBe('outgoing');
    }
  });

  test('filters by edge type', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await exploreGraph(db, auth, {
      start_id: IDS.LEAD_ERIK,
      edge_types: ['contacted_via'],
    }) as { connections: Array<{ edge_type: string }> };

    for (const conn of result.connections) {
      expect(conn.edge_type).toBe('contacted_via');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// remove_entity
// ═══════════════════════════════════════════════════════════════
describe('remove_entity', () => {
  test('soft-deletes entity via tool', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
    ]);
    const created = await storeEntity(db, auth, {
      entity_type: 'lead',
      data: { name: 'Remove Via Tool', status: 'new' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    const result = await removeEntity(db, auth, {
      entity_id: created.entity_id,
    }) as Record<string, unknown>;

    expect(result.removed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// get_schema
// ═══════════════════════════════════════════════════════════════
describe('get_schema', () => {
  test('returns all types for tenant', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await getSchema(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { types: Array<{ name: string; kind: string }> };

    const entityTypes = result.types.filter((t) => t.kind === 'entity_type');
    // 5 Taylor types + metatype + actor_type from system tenant = 7
    expect(entityTypes.length).toBeGreaterThanOrEqual(5);

    const edgeTypes = result.types.filter((t) => t.kind === 'edge_type');
    expect(edgeTypes.length).toBeGreaterThan(0);
  });

  test('returns specific type', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await getSchema(db, auth, {
      entity_type: 'lead',
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { types: Array<{ name: string; label_schema?: Record<string, unknown> }> };

    expect(result.types.length).toBe(1);
    expect(result.types[0]!.name).toBe('lead');
    expect(result.types[0]!.label_schema).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// get_stats
// ═══════════════════════════════════════════════════════════════
describe('get_stats', () => {
  test('returns counts for tenant', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);
    const result = await getStats(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as {
      tenant_id: string;
      entity_count: number;
      edge_count: number;
      event_count: number;
      type_counts: Record<string, number>;
    };

    expect(result.tenant_id).toBe(TENANT_IDS.TAYLOR_EVENTS);
    expect(result.entity_count).toBeGreaterThan(0);
    expect(result.event_count).toBeGreaterThan(0);
    expect(result.type_counts).toBeTruthy();
  });
});
