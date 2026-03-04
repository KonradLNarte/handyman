/**
 * MCP Resources — spec §3.6.
 * 5 resources exposing tenant info, schema, and stats.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PGlite } from '../db/connection.js';
import { METATYPE_ID, SYSTEM_TENANT_ID } from '../db/migrate.js';

export function registerResources(
  server: McpServer,
  getDb: () => PGlite,
) {
  // Resource: tenant list
  server.resource(
    'tenants',
    'resonansia://tenants',
    { description: 'List of all tenants', mimeType: 'application/json' },
    async () => {
      const db = getDb();
      const result = await db.query<{ tenant_id: string; name: string }>(
        'SELECT tenant_id, name FROM tenants ORDER BY name',
      );
      return {
        contents: [{
          uri: 'resonansia://tenants',
          mimeType: 'application/json',
          text: JSON.stringify(result.rows, null, 2),
        }],
      };
    },
  );

  // Resource: entity types for a tenant
  server.resource(
    'entity-types',
    'resonansia://types/{tenant_id}',
    { description: 'Entity and edge type definitions', mimeType: 'application/json' },
    async (uri) => {
      const db = getDb();
      const tenantId = uri.pathname.split('/').pop() ?? '';
      const result = await db.query<{ node_id: string; data: Record<string, unknown> }>(
        `SELECT node_id, data FROM nodes
         WHERE (tenant_id = $1 OR tenant_id = $2)
           AND type_node_id = $3
           AND is_deleted = false AND valid_to = 'infinity'
         ORDER BY data->>'name'`,
        [tenantId, SYSTEM_TENANT_ID, METATYPE_ID],
      );
      const types = result.rows.map((r) => ({
        node_id: r.node_id,
        ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
      }));
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(types, null, 2),
        }],
      };
    },
  );

  // Resource: entity count stats
  server.resource(
    'stats',
    'resonansia://stats/{tenant_id}',
    { description: 'Entity and event counts', mimeType: 'application/json' },
    async (uri) => {
      const db = getDb();
      const tenantId = uri.pathname.split('/').pop() ?? '';
      const entities = await db.query<{ c: number }>(
        `SELECT COUNT(*)::int AS c FROM nodes
         WHERE tenant_id = $1 AND type_node_id != $2
           AND is_deleted = false AND valid_to = 'infinity'`,
        [tenantId, METATYPE_ID],
      );
      const events = await db.query<{ c: number }>(
        'SELECT COUNT(*)::int AS c FROM events WHERE tenant_id = $1',
        [tenantId],
      );
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            tenant_id: tenantId,
            entity_count: entities.rows[0]?.c ?? 0,
            event_count: events.rows[0]?.c ?? 0,
          }, null, 2),
        }],
      };
    },
  );
}
