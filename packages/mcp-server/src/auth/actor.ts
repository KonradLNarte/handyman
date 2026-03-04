/**
 * Actor resolution — spec §4.6.
 * Maps JWT sub claim to actor node_id per tenant.
 * Auto-creates actor node if not found.
 */
import type { PGlite } from '../db/connection.js';
import { generateUUIDv7 } from '../db/uuid.js';
import { ACTOR_TYPE_ID } from '../db/migrate.js';

/**
 * Resolve JWT sub to actor node_id for a tenant.
 * If no actor node exists, auto-creates one.
 */
export async function resolveActor(
  db: PGlite,
  sub: string,
  tenantId: string,
): Promise<string> {
  // Look up existing actor node by external_id
  const result = await db.query<{ node_id: string }>(
    `SELECT node_id FROM nodes
     WHERE tenant_id = $1
       AND type_node_id = $2
       AND data->>'external_id' = $3
       AND is_deleted = false
       AND valid_to = 'infinity'`,
    [tenantId, ACTOR_TYPE_ID, sub],
  );

  if (result.rows.length > 0) {
    return result.rows[0]!.node_id;
  }

  // Auto-create actor node
  const nodeId = generateUUIDv7();
  const eventId = generateUUIDv7();
  const data = {
    name: sub,
    actor_type: 'agent',
    external_id: sub,
  };

  await db.query(
    `INSERT INTO events (event_id, tenant_id, intent_type, payload, stream_id, node_ids, occurred_at, created_by)
     VALUES ($1, $2, 'entity_created', $3, $4, ARRAY[$4::uuid], now(), $4)`,
    [eventId, tenantId, JSON.stringify({ type: 'actor', data }), nodeId],
  );

  await db.query(
    `INSERT INTO nodes (node_id, tenant_id, type_node_id, data, epistemic, valid_from, valid_to, created_by, created_by_event, is_deleted)
     VALUES ($1, $2, $3, $4, 'confirmed', now(), 'infinity', $1, $5, false)`,
    [nodeId, tenantId, ACTOR_TYPE_ID, JSON.stringify(data), eventId],
  );

  return nodeId;
}
