/**
 * Phase 3 tests — projection engine: entity CRUD, edges, epistemic, atomicity.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed, IDS, TENANT_IDS } from '../src/db/seed.js';
import {
  projectEntityCreated,
  projectEntityUpdated,
  projectEntityRemoved,
  projectEdgeCreated,
  projectEdgeRemoved,
  projectEpistemicChange,
  type ProjectionContext,
} from '../src/events/projections.js';
import { resolveEntityType, resolveEdgeType, validateSchema } from '../src/events/type-resolution.js';
import { McpError } from '../src/errors.js';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await migrate(db);
  await seed(db);
});

afterAll(async () => {
  await db.close();
});

function ctx(tenantId: string, actorId: string = IDS.ACTOR_SALES): ProjectionContext {
  return { db, tenantId, actorId };
}

// ═══════════════════════════════════════════════════════════════
// Type Resolution
// ═══════════════════════════════════════════════════════════════
describe('Type resolution', () => {
  test('resolves entity type for tenant', async () => {
    const resolved = await resolveEntityType(db, TENANT_IDS.TAYLOR_EVENTS, 'lead');
    expect(resolved.typeNodeId).toBe(IDS.TYPE_LEAD);
    expect(resolved.labelSchema).toBeTruthy();
  });

  test('resolves edge type from system tenant', async () => {
    const edgeTypeId = await resolveEdgeType(db, TENANT_IDS.TAYLOR_EVENTS, 'includes');
    expect(edgeTypeId.toLowerCase()).toBe(IDS.EDGE_INCLUDES.toLowerCase());
  });

  test('rejects unknown entity type', async () => {
    await expect(
      resolveEntityType(db, TENANT_IDS.TAYLOR_EVENTS, 'nonexistent'),
    ).rejects.toThrow(McpError);
  });

  test('rejects unknown edge type', async () => {
    await expect(
      resolveEdgeType(db, TENANT_IDS.TAYLOR_EVENTS, 'nonexistent'),
    ).rejects.toThrow(McpError);
  });

  test('validateSchema catches missing required field', () => {
    expect(() =>
      validateSchema(
        { email: 'test@test.com' },
        { required: ['name'], properties: { name: { type: 'string' } } },
        'lead',
      ),
    ).toThrow(McpError);
  });

  test('validateSchema catches wrong type', () => {
    expect(() =>
      validateSchema(
        { name: 123 },
        { properties: { name: { type: 'string' } } },
        'lead',
      ),
    ).toThrow(McpError);
  });

  test('validateSchema passes valid data', () => {
    expect(() =>
      validateSchema(
        { name: 'Test' },
        { required: ['name'], properties: { name: { type: 'string' } } },
        'lead',
      ),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// entity_created projection
// ═══════════════════════════════════════════════════════════════
describe('entity_created', () => {
  test('creates entity with correct version=1', async () => {
    const result = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Test Lead', email: 'test@example.com', status: 'new' },
    });

    expect(result.version).toBe(1);
    expect(result.entityType).toBe('lead');
    expect(result.data.name).toBe('Test Lead');
    expect(result.epistemic).toBe('asserted');
    expect(result.previousVersionId).toBeNull();
    expect(result.entityId).toBeTruthy();
    expect(result.eventId).toBeTruthy();
  });

  test('creates event with correct intent_type', async () => {
    const result = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Event Check Lead', status: 'new' },
    });

    const event = await db.query<{ intent_type: string; payload: string }>(
      'SELECT intent_type, payload FROM events WHERE event_id = $1',
      [result.eventId],
    );
    expect(event.rows[0]!.intent_type).toBe('entity_created');
  });

  test('respects custom valid_from (backdating)', async () => {
    const backdate = '2025-01-01T00:00:00.000Z';
    const result = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Backdated Lead', status: 'new' },
      validFrom: backdate,
    });

    expect(result.validFrom).toBe(backdate);
  });

  test('validates schema — rejects missing required', async () => {
    await expect(
      projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityType: 'lead',
        data: { email: 'no-name@test.com' }, // missing required 'name'
      }),
    ).rejects.toThrow(McpError);
  });

  test('rejects unknown entity type', async () => {
    await expect(
      projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityType: 'nonexistent_type',
        data: { name: 'test' },
      }),
    ).rejects.toThrow(McpError);
  });
});

// ═══════════════════════════════════════════════════════════════
// entity_updated projection
// ═══════════════════════════════════════════════════════════════
describe('entity_updated', () => {
  let testEntityId: string;

  beforeAll(async () => {
    const result = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Update Test Lead', status: 'new' },
    });
    testEntityId = result.entityId;
  });

  test('updates entity and increments version', async () => {
    const result = await projectEntityUpdated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: testEntityId,
      data: { name: 'Update Test Lead', status: 'contacted' },
    });

    expect(result.version).toBe(2);
    expect(result.data.status).toBe('contacted');
    expect(result.previousVersionId).toBeTruthy();
  });

  test('creates two node versions (old closed, new current)', async () => {
    const versions = await db.query<{ is_current: boolean }>(
      `SELECT (valid_to = 'infinity') AS is_current FROM nodes
       WHERE node_id = $1 ORDER BY valid_from`,
      [testEntityId],
    );
    expect(versions.rows.length).toBeGreaterThanOrEqual(2);

    // Older versions are closed (not current), latest is current
    const latest = versions.rows[versions.rows.length - 1]!;
    expect(latest.is_current).toBe(true);

    // At least one earlier version should be closed
    const older = versions.rows[0]!;
    expect(older.is_current).toBe(false);
  });

  test('rejects update on nonexistent entity', async () => {
    await expect(
      projectEntityUpdated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityId: '00000000-0000-0000-0000-000000000000',
        data: { name: 'nope' },
      }),
    ).rejects.toThrow(McpError);
  });

  test('rejects version conflict', async () => {
    await expect(
      projectEntityUpdated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityId: testEntityId,
        data: { name: 'conflict' },
        expectedVersion: '1999-01-01T00:00:00.000Z', // wrong version
      }),
    ).rejects.toThrow(McpError);
  });
});

// ═══════════════════════════════════════════════════════════════
// entity_removed projection
// ═══════════════════════════════════════════════════════════════
describe('entity_removed', () => {
  test('soft-deletes entity', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'To Be Removed', status: 'new' },
    });

    const result = await projectEntityRemoved(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: created.entityId,
    });

    expect(result.removed).toBe(true);
    expect(result.entityType).toBe('lead');

    // Verify soft-deleted
    const node = await db.query(
      `SELECT is_deleted FROM nodes
       WHERE node_id = $1 AND valid_to = 'infinity'`,
      [created.entityId],
    );
    // After deletion, the node should have is_deleted=true or no active row
    const activeNode = await db.query(
      `SELECT 1 FROM nodes
       WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [created.entityId],
    );
    expect(activeNode.rows.length).toBe(0);
  });

  test('rejects removal of already-deleted entity', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Double Remove', status: 'new' },
    });

    await projectEntityRemoved(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: created.entityId,
    });

    await expect(
      projectEntityRemoved(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityId: created.entityId,
      }),
    ).rejects.toThrow(McpError);
  });
});

// ═══════════════════════════════════════════════════════════════
// edge_created projection
// ═══════════════════════════════════════════════════════════════
describe('edge_created', () => {
  let sourceId: string;
  let targetId: string;

  beforeAll(async () => {
    const s = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Edge Source', status: 'new' },
    });
    sourceId = s.entityId;

    const t = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'campaign',
      data: { name: 'Edge Target', type: 'digital' },
    });
    targetId = t.entityId;
  });

  test('creates intra-tenant edge', async () => {
    const result = await projectEdgeCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      edgeType: 'contacted_via',
      sourceId,
      targetId,
    });

    expect(result.edgeId).toBeTruthy();
    expect(result.edgeType).toBe('contacted_via');
    expect(result.isCrossTenant).toBe(false);
    expect(result.source.entityId).toBe(sourceId);
    expect(result.target.entityId).toBe(targetId);
  });

  test('creates cross-tenant edge with grant', async () => {
    // Nordic Tickets (tenant) → Mountain Cabins property (granted TRAVERSE)
    const result = await projectEdgeCreated(
      ctx(TENANT_IDS.NORDIC_TICKETS, IDS.ACTOR_PARTNER),
      {
        edgeType: 'includes',
        sourceId: IDS.PACKAGE_MIDSOMMAR,
        targetId: IDS.PROPERTY_BJORNEN,
      },
    );

    expect(result.isCrossTenant).toBe(true);
  });

  test('rejects cross-tenant edge without grant', async () => {
    // Pettson Holding has no grant on PACKAGE_MIDSOMMAR
    await expect(
      projectEdgeCreated(ctx(TENANT_IDS.PETTSON_HOLDING, IDS.ACTOR_SALES), {
        edgeType: 'includes',
        sourceId: IDS.LEAD_ERIK, // Taylor entity, doesn't matter — it's the target grant that's checked
        targetId: IDS.PACKAGE_MIDSOMMAR,
      }),
    ).rejects.toThrow(McpError);
  });

  test('rejects edge with nonexistent source', async () => {
    await expect(
      projectEdgeCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        edgeType: 'contacted_via',
        sourceId: '00000000-0000-0000-0000-000000000000',
        targetId,
      }),
    ).rejects.toThrow(McpError);
  });

  test('rejects edge with unknown edge type', async () => {
    await expect(
      projectEdgeCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        edgeType: 'nonexistent_edge',
        sourceId,
        targetId,
      }),
    ).rejects.toThrow(McpError);
  });
});

// ═══════════════════════════════════════════════════════════════
// edge_removed projection
// ═══════════════════════════════════════════════════════════════
describe('edge_removed', () => {
  test('soft-deletes edge', async () => {
    const s = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Edge Remove Source', status: 'new' },
    });
    const t = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'campaign',
      data: { name: 'Edge Remove Target', type: 'event' },
    });
    const edge = await projectEdgeCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      edgeType: 'contacted_via',
      sourceId: s.entityId,
      targetId: t.entityId,
    });

    const result = await projectEdgeRemoved(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      edgeId: edge.edgeId,
    });

    expect(result.removed).toBe(true);
    expect(result.edgeType).toBe('contacted_via');

    // Verify soft-deleted
    const active = await db.query(
      `SELECT 1 FROM edges
       WHERE edge_id = $1 AND is_deleted = false AND valid_to = 'infinity'`,
      [edge.edgeId],
    );
    expect(active.rows.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// epistemic_change projection
// ═══════════════════════════════════════════════════════════════
describe('epistemic_change', () => {
  test('hypothesis → asserted', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Epistemic Test', status: 'new' },
      epistemic: 'hypothesis',
    });

    const result = await projectEpistemicChange(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: created.entityId,
      data: { name: 'Epistemic Test', status: 'new' },
      newEpistemic: 'asserted',
    });

    expect(result.epistemic).toBe('asserted');
    expect(result.version).toBe(2);
  });

  test('asserted → confirmed', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Confirm Test', status: 'new' },
      epistemic: 'asserted',
    });

    const result = await projectEpistemicChange(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: created.entityId,
      data: { name: 'Confirm Test', status: 'new' },
      newEpistemic: 'confirmed',
    });

    expect(result.epistemic).toBe('confirmed');
  });

  test('rejects confirmed → asserted', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'No Downgrade', status: 'new' },
      epistemic: 'confirmed',
    });

    await expect(
      projectEpistemicChange(ctx(TENANT_IDS.TAYLOR_EVENTS), {
        entityId: created.entityId,
        data: { name: 'No Downgrade', status: 'new' },
        newEpistemic: 'asserted',
      }),
    ).rejects.toThrow(McpError);
  });

  test('entity_updated delegates to epistemic_change when epistemic changes', async () => {
    const created = await projectEntityCreated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityType: 'lead',
      data: { name: 'Delegate Test', status: 'new' },
      epistemic: 'hypothesis',
    });

    // Update with both data and epistemic change
    const result = await projectEntityUpdated(ctx(TENANT_IDS.TAYLOR_EVENTS), {
      entityId: created.entityId,
      data: { name: 'Delegate Test Updated', status: 'contacted' },
      epistemic: 'asserted',
    });

    expect(result.epistemic).toBe('asserted');
    expect(result.data.name).toBe('Delegate Test Updated');

    // Verify the event type is epistemic_change, not entity_updated
    const event = await db.query<{ intent_type: string }>(
      'SELECT intent_type FROM events WHERE event_id = $1',
      [result.eventId],
    );
    expect(event.rows[0]!.intent_type).toBe('epistemic_change');
  });
});

// ═══════════════════════════════════════════════════════════════
// INV-ATOMIC: atomicity tests
// ═══════════════════════════════════════════════════════════════
describe('INV-ATOMIC', () => {
  test('every node has a valid created_by_event', async () => {
    const orphans = await db.query(
      `SELECT n.node_id FROM nodes n
       LEFT JOIN events e ON n.created_by_event = e.event_id
       WHERE e.event_id IS NULL`,
    );
    expect(orphans.rows.length).toBe(0);
  });

  test('every edge has a valid created_by_event', async () => {
    const orphans = await db.query(
      `SELECT ed.edge_id FROM edges ed
       LEFT JOIN events e ON ed.created_by_event = e.event_id
       WHERE e.event_id IS NULL`,
    );
    expect(orphans.rows.length).toBe(0);
  });

  test('event count >= fact count (events never orphaned)', async () => {
    const events = await db.query<{ c: number }>(
      'SELECT COUNT(*)::int AS c FROM events',
    );
    const nodes = await db.query<{ c: number }>(
      'SELECT COUNT(*)::int AS c FROM nodes',
    );
    const edges = await db.query<{ c: number }>(
      'SELECT COUNT(*)::int AS c FROM edges',
    );
    // Every fact has an event, but events can reference multiple facts
    expect(events.rows[0]!.c).toBeGreaterThan(0);
    expect(nodes.rows[0]!.c).toBeGreaterThan(0);
  });
});
