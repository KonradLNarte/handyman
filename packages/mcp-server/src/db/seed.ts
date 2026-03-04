/**
 * Pettson scenario seed data — spec §7.8.
 * Creates 4 tenants, 16 type nodes, 9 entities, 6 edges, 4 grants, 4 actors.
 * Per INV-LINEAGE, every fact row has a corresponding event.
 */
import type { PGlite } from './connection.js';
import { generateUUIDv7 } from './uuid.js';
import { METATYPE_ID, SYSTEM_TENANT_ID, ACTOR_TYPE_ID } from './migrate.js';

// Well-known UUIDs
const PETTSON_HOLDING = '10000000-0000-7000-0000-000000000001';
const TAYLOR_EVENTS = '10000000-0000-7000-0000-000000000002';
const MOUNTAIN_CABINS = '10000000-0000-7000-0000-000000000003';
const NORDIC_TICKETS = '10000000-0000-7000-0000-000000000004';

export const TENANT_IDS = {
  PETTSON_HOLDING,
  TAYLOR_EVENTS,
  MOUNTAIN_CABINS,
  NORDIC_TICKETS,
} as const;

// Export all well-known IDs for tests
export const IDS = {
  SYSTEM_TENANT: SYSTEM_TENANT_ID,
  METATYPE: METATYPE_ID,
  ACTOR_TYPE: ACTOR_TYPE_ID,
  ...TENANT_IDS,

  // Type nodes — Taylor
  TYPE_LEAD: '20000000-0000-7000-0001-000000000001',
  TYPE_CAMPAIGN: '20000000-0000-7000-0001-000000000002',
  TYPE_EVENT: '20000000-0000-7000-0001-000000000003',
  TYPE_VENUE: '20000000-0000-7000-0001-000000000004',
  TYPE_CONTACT: '20000000-0000-7000-0001-000000000005',

  // Type nodes — Mountain
  TYPE_PROPERTY: '20000000-0000-7000-0002-000000000001',
  TYPE_BOOKING: '20000000-0000-7000-0002-000000000002',
  TYPE_GUEST: '20000000-0000-7000-0002-000000000003',
  TYPE_SEASON: '20000000-0000-7000-0002-000000000004',

  // Type nodes — Nordic
  TYPE_MATCH: '20000000-0000-7000-0003-000000000001',
  TYPE_TICKET_BATCH: '20000000-0000-7000-0003-000000000002',
  TYPE_PACKAGE: '20000000-0000-7000-0003-000000000003',
  TYPE_PARTNER: '20000000-0000-7000-0003-000000000004',

  // Edge types (system tenant)
  EDGE_INCLUDES: '20000000-0000-7000-0000-000000000E01',
  EDGE_SELLS: '20000000-0000-7000-0000-000000000E02',
  EDGE_ALSO_BOOKED: '20000000-0000-7000-0000-000000000E03',
  EDGE_BOOKED_AT: '20000000-0000-7000-0000-000000000E04',
  EDGE_FOR_MATCH: '20000000-0000-7000-0000-000000000E05',
  EDGE_CONTACTED_VIA: '20000000-0000-7000-0000-000000000E06',

  // Entities — Taylor
  LEAD_ERIK: '30000000-0000-7000-0001-000000000001',
  CAMPAIGN_SUMMER: '30000000-0000-7000-0001-000000000002',
  EVENT_ALLSVENSKAN: '30000000-0000-7000-0001-000000000003',

  // Entities — Mountain
  PROPERTY_BJORNEN: '30000000-0000-7000-0002-000000000001',
  BOOKING_MIDSOMMAR: '30000000-0000-7000-0002-000000000002',
  GUEST_ERIK: '30000000-0000-7000-0002-000000000003',

  // Entities — Nordic
  MATCH_IFK_AIK: '30000000-0000-7000-0003-000000000001',
  TICKET_BATCH_STD: '30000000-0000-7000-0003-000000000002',
  PACKAGE_MIDSOMMAR: '30000000-0000-7000-0003-000000000003',

  // Edges
  EDGE_PKG_INCLUDES_PROP: '40000000-0000-7000-0000-000000000001',
  EDGE_CAMP_SELLS_TICKET: '40000000-0000-7000-0000-000000000002',
  EDGE_LEAD_BOOKED: '40000000-0000-7000-0000-000000000003',
  EDGE_BOOKING_AT_PROP: '40000000-0000-7000-0000-000000000010',
  EDGE_TICKET_FOR_MATCH: '40000000-0000-7000-0000-000000000011',
  EDGE_LEAD_CONTACTED: '40000000-0000-7000-0000-000000000012',

  // Grants
  GRANT_TAYLOR_READ_PKG: '50000000-0000-7000-0000-000000000001',
  GRANT_TAYLOR_READ_PROP: '50000000-0000-7000-0000-000000000002',
  GRANT_MOUNTAIN_READ_PKG: '50000000-0000-7000-0000-000000000003',
  GRANT_NORDIC_TRAVERSE_PROP: '50000000-0000-7000-0000-000000000004',

  // Actors
  ACTOR_SALES: '60000000-0000-7000-0000-000000000001',
  ACTOR_CONTENT: '60000000-0000-7000-0000-000000000002',
  ACTOR_BOOKING: '60000000-0000-7000-0000-000000000003',
  ACTOR_PARTNER: '60000000-0000-7000-0000-000000000004',
} as const;

async function insertEvent(
  db: PGlite,
  tenantId: string,
  intentType: string,
  payload: object,
  streamId: string | null,
  nodeIds: string[],
  edgeIds: string[],
  createdBy: string,
  occurredAt?: string,
): Promise<string> {
  const eventId = generateUUIDv7();
  await db.query(
    `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, edge_ids, occurred_at, recorded_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)`,
    [
      eventId,
      tenantId,
      intentType,
      JSON.stringify(payload),
      streamId,
      nodeIds,
      edgeIds,
      occurredAt ?? new Date().toISOString(),
      createdBy,
    ],
  );
  return eventId;
}

async function insertTypeNode(
  db: PGlite,
  nodeId: string,
  tenantId: string,
  data: object,
): Promise<void> {
  const eventId = await insertEvent(
    db,
    tenantId,
    'entity_created',
    { type: (data as { name: string }).name, data },
    nodeId,
    [nodeId],
    [],
    METATYPE_ID,
  );
  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, 'confirmed', now(), 'infinity', $5, $6, false)`,
    [nodeId, tenantId, METATYPE_ID, JSON.stringify(data), METATYPE_ID, eventId],
  );
}

async function insertEntity(
  db: PGlite,
  nodeId: string,
  tenantId: string,
  typeNodeId: string,
  data: object,
  epistemic: string,
  validFrom?: string,
): Promise<void> {
  const eventId = await insertEvent(
    db,
    tenantId,
    'entity_created',
    { type: 'entity', data },
    nodeId,
    [nodeId],
    [],
    METATYPE_ID,
    validFrom,
  );
  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, $5, $6, 'infinity', $7, $8, false)`,
    [
      nodeId,
      tenantId,
      typeNodeId,
      JSON.stringify(data),
      epistemic,
      validFrom ?? new Date().toISOString(),
      METATYPE_ID,
      eventId,
    ],
  );
}

async function insertEdge(
  db: PGlite,
  edgeId: string,
  tenantId: string,
  typeNodeId: string,
  sourceId: string,
  targetId: string,
): Promise<void> {
  const eventId = await insertEvent(
    db,
    tenantId,
    'edge_created',
    { edge_type: typeNodeId, source_id: sourceId, target_id: targetId },
    null,
    [sourceId, targetId],
    [edgeId],
    METATYPE_ID,
  );
  await db.query(
    `INSERT INTO edges (edge_id, tenant_id, type_node_id, source_id, target_id, data, valid_from, valid_to, recorded_at, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, $5, '{}', now(), 'infinity', now(), $6, $7, false)`,
    [edgeId, tenantId, typeNodeId, sourceId, targetId, METATYPE_ID, eventId],
  );
}

async function insertGrant(
  db: PGlite,
  grantId: string,
  tenantId: string,
  subjectTenantId: string,
  objectNodeId: string,
  capability: string,
): Promise<void> {
  const eventId = await insertEvent(
    db,
    tenantId,
    'grant_created',
    {
      subject_tenant_id: subjectTenantId,
      object_node_id: objectNodeId,
      capability,
    },
    null,
    [objectNodeId],
    [],
    METATYPE_ID,
  );
  await db.query(
    `INSERT INTO grants (grant_id, tenant_id, subject_tenant_id, object_node_id, capability, valid_from, valid_to, is_deleted, created_by, created_by_event)
     VALUES ($1, $2, $3, $4, $5, now(), 'infinity', false, $6, $7)`,
    [
      grantId,
      tenantId,
      subjectTenantId,
      objectNodeId,
      capability,
      METATYPE_ID,
      eventId,
    ],
  );
}

async function insertActorNode(
  db: PGlite,
  nodeId: string,
  tenantId: string,
  data: object,
): Promise<void> {
  const eventId = await insertEvent(
    db,
    tenantId,
    'entity_created',
    { type: 'actor', data },
    nodeId,
    [nodeId],
    [],
    METATYPE_ID,
  );
  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, 'confirmed', now(), 'infinity', $5, $6, false)`,
    [nodeId, tenantId, ACTOR_TYPE_ID, JSON.stringify(data), METATYPE_ID, eventId],
  );
}

export async function seed(db: PGlite): Promise<void> {
  // Check if already seeded
  const existing = await db.query(
    'SELECT 1 FROM tenants WHERE tenant_id = $1',
    [PETTSON_HOLDING],
  );
  if (existing.rows.length > 0) return;

  // ═══ TENANTS ═══
  await db.query(
    `INSERT INTO tenants (tenant_id, name, parent_id, config) VALUES
     ($1, 'Pettson Holding AB', NULL, '{"plan":"enterprise","is_holding":true}'),
     ($2, 'Taylor Events AB', $1, '{"plan":"pro"}'),
     ($3, 'Mountain Cabins AB', $1, '{"plan":"pro"}'),
     ($4, 'Nordic Tickets AB', $1, '{"plan":"pro"}')`,
    [PETTSON_HOLDING, TAYLOR_EVENTS, MOUNTAIN_CABINS, NORDIC_TICKETS],
  );

  // ═══ TYPE NODES — Taylor Events ═══
  await insertTypeNode(db, IDS.TYPE_LEAD, TAYLOR_EVENTS, {
    name: 'lead', kind: 'entity_type', description: 'A potential customer or sales opportunity',
    label_schema: {
      type: 'object', required: ['name'],
      properties: {
        name: { type: 'string' }, email: { type: 'string', format: 'email' },
        phone: { type: 'string' }, interest: { type: 'string' }, source: { type: 'string' },
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_CAMPAIGN, TAYLOR_EVENTS, {
    name: 'campaign', kind: 'entity_type', description: 'A marketing or sales campaign',
    label_schema: {
      type: 'object', required: ['name'],
      properties: {
        name: { type: 'string' }, type: { type: 'string', enum: ['digital', 'event', 'print', 'partnership'] },
        budget: { type: 'number' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_EVENT, TAYLOR_EVENTS, {
    name: 'event', kind: 'entity_type', description: 'A scheduled event (concert, show, match)',
    label_schema: {
      type: 'object', required: ['name', 'date'],
      properties: {
        name: { type: 'string' }, date: { type: 'string', format: 'date' },
        venue: { type: 'string' }, capacity: { type: 'integer' },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_VENUE, TAYLOR_EVENTS, {
    name: 'venue', kind: 'entity_type', description: 'A physical location for events',
    label_schema: {
      type: 'object', required: ['name'],
      properties: { name: { type: 'string' }, city: { type: 'string' }, capacity: { type: 'integer' } },
    },
  });
  await insertTypeNode(db, IDS.TYPE_CONTACT, TAYLOR_EVENTS, {
    name: 'contact', kind: 'entity_type', description: 'A person or organization contact',
    label_schema: {
      type: 'object', required: ['name'],
      properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string' } },
    },
  });

  // ═══ TYPE NODES — Mountain Cabins ═══
  await insertTypeNode(db, IDS.TYPE_PROPERTY, MOUNTAIN_CABINS, {
    name: 'property', kind: 'entity_type', description: 'A rental cabin or property',
    label_schema: {
      type: 'object', required: ['name', 'location'],
      properties: {
        name: { type: 'string' }, location: { type: 'string' }, beds: { type: 'integer' },
        price_per_night: { type: 'number' }, amenities: { type: 'array', items: { type: 'string' } },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_BOOKING, MOUNTAIN_CABINS, {
    name: 'booking', kind: 'entity_type', description: 'A cabin reservation',
    label_schema: {
      type: 'object', required: ['check_in', 'check_out'],
      properties: {
        check_in: { type: 'string', format: 'date' }, check_out: { type: 'string', format: 'date' },
        guests: { type: 'integer' }, status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
        total_price: { type: 'number' },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_GUEST, MOUNTAIN_CABINS, {
    name: 'guest', kind: 'entity_type', description: 'A cabin guest',
    label_schema: {
      type: 'object', required: ['name'],
      properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } },
    },
  });
  await insertTypeNode(db, IDS.TYPE_SEASON, MOUNTAIN_CABINS, {
    name: 'season', kind: 'entity_type', description: 'A pricing season',
    label_schema: {
      type: 'object', required: ['name', 'start_date', 'end_date'],
      properties: {
        name: { type: 'string' }, start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' }, price_multiplier: { type: 'number' },
      },
    },
  });

  // ═══ TYPE NODES — Nordic Tickets ═══
  await insertTypeNode(db, IDS.TYPE_MATCH, NORDIC_TICKETS, {
    name: 'match', kind: 'entity_type', description: 'A sports match or event',
    label_schema: {
      type: 'object', required: ['name', 'date'],
      properties: {
        name: { type: 'string' }, date: { type: 'string', format: 'date' },
        sport: { type: 'string' }, venue: { type: 'string' }, teams: { type: 'array', items: { type: 'string' } },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_TICKET_BATCH, NORDIC_TICKETS, {
    name: 'ticket_batch', kind: 'entity_type', description: 'A batch of tickets for sale',
    label_schema: {
      type: 'object', required: ['quantity', 'price_per_ticket'],
      properties: {
        quantity: { type: 'integer' }, price_per_ticket: { type: 'number' },
        category: { type: 'string', enum: ['standard', 'vip', 'corporate'] }, sold: { type: 'integer' },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_PACKAGE, NORDIC_TICKETS, {
    name: 'package', kind: 'entity_type', description: 'A combined package (tickets + accommodation)',
    label_schema: {
      type: 'object', required: ['name', 'price'],
      properties: {
        name: { type: 'string' }, price: { type: 'number' },
        description: { type: 'string' }, includes_accommodation: { type: 'boolean' },
      },
    },
  });
  await insertTypeNode(db, IDS.TYPE_PARTNER, NORDIC_TICKETS, {
    name: 'partner', kind: 'entity_type', description: 'An external distribution partner',
    label_schema: {
      type: 'object', required: ['name'],
      properties: {
        name: { type: 'string' }, type: { type: 'string', enum: ['travel_agency', 'corporate', 'reseller'] },
        commission_pct: { type: 'number' },
      },
    },
  });

  // ═══ EDGE TYPE NODES (system tenant) ═══
  await insertTypeNode(db, IDS.EDGE_INCLUDES, SYSTEM_TENANT_ID, {
    name: 'includes', kind: 'edge_type', description: 'Package includes property/ticket',
  });
  await insertTypeNode(db, IDS.EDGE_SELLS, SYSTEM_TENANT_ID, {
    name: 'sells', kind: 'edge_type', description: 'Campaign sells ticket batch',
  });
  await insertTypeNode(db, IDS.EDGE_ALSO_BOOKED, SYSTEM_TENANT_ID, {
    name: 'also_booked', kind: 'edge_type', description: 'Lead also booked a cabin',
  });
  await insertTypeNode(db, IDS.EDGE_BOOKED_AT, SYSTEM_TENANT_ID, {
    name: 'booked_at', kind: 'edge_type', description: 'Booking is at a property',
  });
  await insertTypeNode(db, IDS.EDGE_FOR_MATCH, SYSTEM_TENANT_ID, {
    name: 'for_match', kind: 'edge_type', description: 'Ticket batch is for a match',
  });
  await insertTypeNode(db, IDS.EDGE_CONTACTED_VIA, SYSTEM_TENANT_ID, {
    name: 'contacted_via', kind: 'edge_type', description: 'Lead was contacted via campaign',
  });

  // ═══ SAMPLE ENTITIES ═══

  // Taylor Events entities
  await insertEntity(db, IDS.LEAD_ERIK, TAYLOR_EVENTS, IDS.TYPE_LEAD, {
    name: 'Erik Lindström', email: 'erik@example.com', phone: '070-111-2222',
    interest: 'football and cabin packages', source: 'website', status: 'qualified',
  }, 'asserted', '2026-01-01T00:00:00Z');

  await insertEntity(db, IDS.CAMPAIGN_SUMMER, TAYLOR_EVENTS, IDS.TYPE_CAMPAIGN, {
    name: 'Summer Festival 2026', type: 'event', budget: 50000,
    start_date: '2026-06-01', end_date: '2026-08-31',
  }, 'asserted');

  await insertEntity(db, IDS.EVENT_ALLSVENSKAN, TAYLOR_EVENTS, IDS.TYPE_EVENT, {
    name: 'Allsvenskan Semifinal', date: '2026-07-15', venue: 'Gamla Ullevi', capacity: 18000,
  }, 'confirmed');

  // Mountain Cabins entities
  await insertEntity(db, IDS.PROPERTY_BJORNEN, MOUNTAIN_CABINS, IDS.TYPE_PROPERTY, {
    name: 'Fjällstugan Björnen', location: 'Åre', beds: 8,
    price_per_night: 2500, amenities: ['sauna', 'fireplace', 'ski-in/ski-out'],
  }, 'confirmed');

  await insertEntity(db, IDS.BOOKING_MIDSOMMAR, MOUNTAIN_CABINS, IDS.TYPE_BOOKING, {
    check_in: '2026-06-19', check_out: '2026-06-22', guests: 4,
    status: 'confirmed', total_price: 7500,
  }, 'confirmed');

  await insertEntity(db, IDS.GUEST_ERIK, MOUNTAIN_CABINS, IDS.TYPE_GUEST, {
    name: 'Erik Lindström', email: 'erik@example.com', phone: '070-111-2222',
  }, 'asserted');

  // Nordic Tickets entities
  await insertEntity(db, IDS.MATCH_IFK_AIK, NORDIC_TICKETS, IDS.TYPE_MATCH, {
    name: 'Allsvenskan: IFK vs AIK', date: '2026-07-15', sport: 'football',
    venue: 'Gamla Ullevi', teams: ['IFK Göteborg', 'AIK'],
  }, 'confirmed');

  await insertEntity(db, IDS.TICKET_BATCH_STD, NORDIC_TICKETS, IDS.TYPE_TICKET_BATCH, {
    quantity: 500, price_per_ticket: 350, category: 'standard', sold: 127,
  }, 'confirmed');

  await insertEntity(db, IDS.PACKAGE_MIDSOMMAR, NORDIC_TICKETS, IDS.TYPE_PACKAGE, {
    name: 'Midsommar Football & Cabin', price: 8900,
    description: '2 match tickets + 3 nights cabin near Åre', includes_accommodation: true,
  }, 'asserted');

  // ═══ EDGES ═══

  // Cross-tenant edges
  await insertEdge(db, IDS.EDGE_PKG_INCLUDES_PROP, NORDIC_TICKETS, IDS.EDGE_INCLUDES,
    IDS.PACKAGE_MIDSOMMAR, IDS.PROPERTY_BJORNEN);
  await insertEdge(db, IDS.EDGE_CAMP_SELLS_TICKET, TAYLOR_EVENTS, IDS.EDGE_SELLS,
    IDS.CAMPAIGN_SUMMER, IDS.TICKET_BATCH_STD);
  await insertEdge(db, IDS.EDGE_LEAD_BOOKED, TAYLOR_EVENTS, IDS.EDGE_ALSO_BOOKED,
    IDS.LEAD_ERIK, IDS.BOOKING_MIDSOMMAR);

  // Intra-tenant edges
  await insertEdge(db, IDS.EDGE_BOOKING_AT_PROP, MOUNTAIN_CABINS, IDS.EDGE_BOOKED_AT,
    IDS.BOOKING_MIDSOMMAR, IDS.PROPERTY_BJORNEN);
  await insertEdge(db, IDS.EDGE_TICKET_FOR_MATCH, NORDIC_TICKETS, IDS.EDGE_FOR_MATCH,
    IDS.TICKET_BATCH_STD, IDS.MATCH_IFK_AIK);
  await insertEdge(db, IDS.EDGE_LEAD_CONTACTED, TAYLOR_EVENTS, IDS.EDGE_CONTACTED_VIA,
    IDS.LEAD_ERIK, IDS.CAMPAIGN_SUMMER);

  // ═══ GRANTS ═══
  await insertGrant(db, IDS.GRANT_TAYLOR_READ_PKG, NORDIC_TICKETS, TAYLOR_EVENTS,
    IDS.PACKAGE_MIDSOMMAR, 'READ');
  await insertGrant(db, IDS.GRANT_TAYLOR_READ_PROP, MOUNTAIN_CABINS, TAYLOR_EVENTS,
    IDS.PROPERTY_BJORNEN, 'READ');
  await insertGrant(db, IDS.GRANT_MOUNTAIN_READ_PKG, NORDIC_TICKETS, MOUNTAIN_CABINS,
    IDS.PACKAGE_MIDSOMMAR, 'READ');
  await insertGrant(db, IDS.GRANT_NORDIC_TRAVERSE_PROP, MOUNTAIN_CABINS, NORDIC_TICKETS,
    IDS.PROPERTY_BJORNEN, 'TRAVERSE');

  // ═══ ACTOR NODES ═══
  await insertActorNode(db, IDS.ACTOR_SALES, TAYLOR_EVENTS, {
    name: 'Sales Agent', actor_type: 'agent', external_id: 'sales-agent-001',
    purpose: 'Manages leads and cross-tenant searches',
    scopes: [
      `tenant:${TAYLOR_EVENTS}:read`, `tenant:${MOUNTAIN_CABINS}:read`,
      `tenant:${NORDIC_TICKETS}:read`, `tenant:${TAYLOR_EVENTS}:write`,
    ],
  });
  await insertActorNode(db, IDS.ACTOR_CONTENT, TAYLOR_EVENTS, {
    name: 'Content Agent', actor_type: 'agent', external_id: 'content-agent-001',
    purpose: 'Manages campaigns',
    scopes: [
      `tenant:${TAYLOR_EVENTS}:nodes:campaign:write`,
      `tenant:${TAYLOR_EVENTS}:nodes:campaign:read`,
    ],
  });
  await insertActorNode(db, IDS.ACTOR_BOOKING, MOUNTAIN_CABINS, {
    name: 'Booking Agent', actor_type: 'agent', external_id: 'booking-agent-001',
    purpose: 'Manages bookings and properties',
    scopes: [`tenant:${MOUNTAIN_CABINS}:write`, `tenant:${NORDIC_TICKETS}:read`],
  });
  await insertActorNode(db, IDS.ACTOR_PARTNER, NORDIC_TICKETS, {
    name: 'Partner Travel Agency', actor_type: 'agent', external_id: 'partner-travel-001',
    purpose: 'External partner with read-only access',
    scopes: [
      `tenant:${NORDIC_TICKETS}:nodes:package:read`,
      `tenant:${MOUNTAIN_CABINS}:nodes:property:read`,
    ],
  });
}
