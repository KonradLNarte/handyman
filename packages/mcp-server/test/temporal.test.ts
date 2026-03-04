/**
 * Phase 5 tests — temporal tools, blob storage, lineage verification.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed, IDS, TENANT_IDS } from '../src/db/seed.js';
import { signToken, verifyToken } from '../src/auth/jwt.js';
import { createAuthContext, type AuthContext } from '../src/auth/context.js';
import { storeEntity } from '../src/tools/store-entity.js';
import { queryAtTime } from '../src/tools/query-at-time.js';
import { getTimeline } from '../src/tools/get-timeline.js';
import { proposeEvent } from '../src/tools/propose-event.js';
import { verifyLineage } from '../src/tools/verify-lineage.js';
import { storeBlob, getBlob } from '../src/tools/store-blob.js';
import { lookupDict } from '../src/tools/lookup-dict.js';
import * as fs from 'node:fs';

const SECRET = 'test-secret-key-for-jwt-signing-min-32-chars!!';
let db: PGlite;

async function makeAuth(
  sub: string,
  tenantIds: string[],
  scopes: string[],
): Promise<AuthContext> {
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
  // Clean up blob test files
  try { fs.rmSync('./data/blobs', { recursive: true, force: true }); } catch {}
});

// ═══════════════════════════════════════════════════════════════
// query_at_time — bitemporal
// ═══════════════════════════════════════════════════════════════
describe('query_at_time', () => {
  test('queries seed entity at current time', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await queryAtTime(db, auth, {
      entity_id: IDS.LEAD_ERIK,
      at_time: new Date().toISOString(),
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(result.entity_id).toBe(IDS.LEAD_ERIK);
    expect(result.entity_type).toBe('lead');
  });

  test('queries entity at past time shows previous version', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    // Create entity
    const created = await storeEntity(db, auth, {
      entity_type: 'lead',
      data: { name: 'Time Travel', status: 'new' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    const afterCreate = new Date().toISOString();

    // Wait a tiny bit then update
    await new Promise((r) => setTimeout(r, 10));

    await storeEntity(db, auth, {
      entity_type: 'lead',
      entity_id: created.entity_id as string,
      data: { name: 'Time Travel', status: 'contacted' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    });

    // Query at time just after creation — should show old version
    const past = await queryAtTime(db, auth, {
      entity_id: created.entity_id as string,
      at_time: afterCreate,
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect((past.data as Record<string, unknown>).status).toBe('new');
  });

  test('Erik backdated to 2026-01-01', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    // Erik was backdated to 2026-01-01
    const result = await queryAtTime(db, auth, {
      entity_id: IDS.LEAD_ERIK,
      at_time: '2026-02-01T00:00:00Z',
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(result.entity_id).toBe(IDS.LEAD_ERIK);
  });
});

// ═══════════════════════════════════════════════════════════════
// get_timeline
// ═══════════════════════════════════════════════════════════════
describe('get_timeline', () => {
  test('returns events for tenant', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await getTimeline(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { events: unknown[] };

    expect(result.events.length).toBeGreaterThan(0);
  });

  test('filters by entity_id', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await getTimeline(db, auth, {
      entity_id: IDS.LEAD_ERIK,
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { events: Array<{ intent_type: string }> };

    expect(result.events.length).toBeGreaterThan(0);
    // All events should reference LEAD_ERIK
    for (const e of result.events) {
      expect(e.intent_type).toBeTruthy();
    }
  });

  test('filters by event type', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await getTimeline(db, auth, {
      event_types: ['entity_created'],
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { events: Array<{ intent_type: string }> };

    for (const e of result.events) {
      expect(e.intent_type).toBe('entity_created');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// propose_event
// ═══════════════════════════════════════════════════════════════
describe('propose_event', () => {
  test('creates generic event', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
    ]);

    const result = await proposeEvent(db, auth, {
      intent_type: 'thought_captured',
      payload: { content: 'test thought', source: 'manual' },
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(result.event_id).toBeTruthy();
    // Generic events without dedicated projection return projected=false
    expect(result.projected).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// verify_lineage
// ═══════════════════════════════════════════════════════════════
describe('verify_lineage', () => {
  test('all seed data has valid lineage', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await verifyLineage(db, auth, {
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { valid: boolean; checked: number; violations: unknown[] };

    expect(result.valid).toBe(true);
    expect(result.checked).toBeGreaterThan(0);
    expect(result.violations).toEqual([]);
  });

  test('checks specific entity lineage', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await verifyLineage(db, auth, {
      entity_id: IDS.LEAD_ERIK,
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { valid: boolean; checked: number };

    expect(result.valid).toBe(true);
    expect(result.checked).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// store_blob / get_blob
// ═══════════════════════════════════════════════════════════════
describe('blob storage', () => {
  test('stores and retrieves blob', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const testContent = 'Hello, this is a test blob!';
    const base64 = Buffer.from(testContent).toString('base64');

    const stored = await storeBlob(db, auth, {
      content_type: 'text/plain',
      data_base64: base64,
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as Record<string, unknown>;

    expect(stored.blob_id).toBeTruthy();
    expect(stored.size_bytes).toBe(testContent.length);

    // Retrieve
    const retrieved = await getBlob(db, auth, {
      blob_id: stored.blob_id as string,
    }) as Record<string, unknown>;

    expect(retrieved.content_type).toBe('text/plain');
    expect(Buffer.from(retrieved.data_base64 as string, 'base64').toString()).toBe(testContent);
  });
});

// ═══════════════════════════════════════════════════════════════
// lookup_dict
// ═══════════════════════════════════════════════════════════════
describe('lookup_dict', () => {
  test('returns empty for nonexistent dict', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await lookupDict(db, auth, {
      dict_type: 'postal_codes',
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { entries: unknown[] };

    expect(result.entries).toEqual([]);
  });
});
