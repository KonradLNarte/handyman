/**
 * Phase 6 tests — AI tools: embeddings, capture_thought, deduplication.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed, IDS, TENANT_IDS } from '../src/db/seed.js';
import { signToken, verifyToken } from '../src/auth/jwt.js';
import { createAuthContext, type AuthContext } from '../src/auth/context.js';
import { createMockEmbeddingService } from '../src/ai/embeddings.js';
import { createMockExtractionService } from '../src/ai/extraction.js';
import { deduplicateEntity } from '../src/ai/deduplication.js';
import { EmbeddingQueue } from '../src/ai/embedding-queue.js';
import { createCaptureThought } from '../src/tools/capture-thought.js';

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
});

// ═══════════════════════════════════════════════════════════════
// Mock embeddings
// ═══════════════════════════════════════════════════════════════
describe('Mock embeddings', () => {
  const service = createMockEmbeddingService(256);

  test('generates deterministic embeddings', async () => {
    const v1 = await service.embed('hello world');
    const v2 = await service.embed('hello world');
    expect(v1).toEqual(v2);
    expect(v1.length).toBe(256);
  });

  test('different texts produce different embeddings', async () => {
    const v1 = await service.embed('hello');
    const v2 = await service.embed('goodbye');
    expect(v1).not.toEqual(v2);
  });

  test('batch embedding works', async () => {
    const batch = await service.embedBatch(['text1', 'text2', 'text3']);
    expect(batch.length).toBe(3);
    expect(batch[0]!.length).toBe(256);
  });
});

// ═══════════════════════════════════════════════════════════════
// Embedding queue
// ═══════════════════════════════════════════════════════════════
describe('EmbeddingQueue', () => {
  test('queues and processes embeddings', async () => {
    const service = createMockEmbeddingService(1536);
    const queue = new EmbeddingQueue(db, service);

    // Enqueue for LEAD_ERIK
    queue.enqueue(IDS.LEAD_ERIK, 'lead: Erik Lindström');

    // Wait for processing
    await new Promise((r) => setTimeout(r, 100));

    // Check that embedding was stored
    const result = await db.query<{ has_embedding: boolean }>(
      `SELECT (embedding IS NOT NULL) AS has_embedding
       FROM nodes WHERE node_id = $1 AND valid_to = 'infinity'`,
      [IDS.LEAD_ERIK],
    );
    expect(result.rows[0]?.has_embedding).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Deduplication
// ═══════════════════════════════════════════════════════════════
describe('Deduplication', () => {
  test('exact match finds Erik by name', async () => {
    const result = await deduplicateEntity(
      db,
      TENANT_IDS.TAYLOR_EVENTS,
      IDS.TYPE_LEAD,
      { name: 'Erik Lindström' },
    );

    expect(result.match).toBeTruthy();
    expect(result.match!.nodeId).toBe(IDS.LEAD_ERIK);
    expect(result.tier).toBe('exact');
  });

  test('no match for unknown name', async () => {
    const result = await deduplicateEntity(
      db,
      TENANT_IDS.TAYLOR_EVENTS,
      IDS.TYPE_LEAD,
      { name: 'Unknown Person XYZ' },
    );

    expect(result.match).toBeNull();
    expect(result.tier).toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════════
// capture_thought
// ═══════════════════════════════════════════════════════════════
describe('capture_thought', () => {
  const captureThought = createCaptureThought(createMockExtractionService());

  test('creates hypothesis entity from text', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await captureThought(db, auth, {
      content: 'Met a new client named Anders at the trade fair. He wants to book for summer.',
      source: 'manual',
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as {
      primary_entity: { entity_id: string; entity_type: string; data: Record<string, unknown> };
      mentioned_entities: unknown[];
      edges_created: number;
      event_id: string;
    };

    expect(result.primary_entity.entity_id).toBeTruthy();
    expect(result.event_id).toBeTruthy();

    // Verify entity was created as hypothesis
    const node = await db.query<{ epistemic: string }>(
      `SELECT epistemic FROM nodes
       WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [result.primary_entity.entity_id],
    );
    expect(node.rows[0]?.epistemic).toBe('hypothesis');
  });

  test('creates event with thought_captured intent', async () => {
    const auth = await makeAuth('sales-agent-001', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`,
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    const result = await captureThought(db, auth, {
      content: 'Quick note about pricing update for Allsvenskan packages',
      tenant_id: TENANT_IDS.TAYLOR_EVENTS,
    }) as { event_id: string };

    const event = await db.query<{ intent_type: string }>(
      'SELECT intent_type FROM events WHERE event_id = $1',
      [result.event_id],
    );
    expect(event.rows[0]?.intent_type).toBe('thought_captured');
  });

  test('rejects without write scope', async () => {
    const auth = await makeAuth('reader', [TENANT_IDS.TAYLOR_EVENTS], [
      `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
    ]);

    await expect(
      captureThought(db, auth, {
        content: 'test',
        tenant_id: TENANT_IDS.TAYLOR_EVENTS,
      }),
    ).rejects.toThrow();
  });
});
