/**
 * explore_graph tool — BFS traversal from a start node.
 */
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { ExploreGraphParams } from './schemas.js';
import { getTypeName } from '../events/type-resolution.js';
import { McpError } from '../errors.js';

interface Connection {
  edge_id: string;
  edge_type: string;
  direction: 'outgoing' | 'incoming';
  entity: {
    entity_id: string;
    entity_type: string;
    data: Record<string, unknown>;
    tenant_id: string;
    epistemic: string;
  };
  depth: number;
}

export async function exploreGraph(
  db: PGlite,
  auth: AuthContext,
  rawParams: unknown,
) {
  const params = ExploreGraphParams.parse(rawParams);

  // Fetch center node
  const centerResult = await db.query<{
    node_id: string;
    tenant_id: string;
    type_node_id: string;
    data: Record<string, unknown>;
  }>(
    `SELECT node_id, tenant_id, type_node_id, data FROM nodes
     WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'
     LIMIT 1`,
    [params.start_id],
  );

  if (centerResult.rows.length === 0) {
    throw McpError.notFound('entity', params.start_id);
  }
  const center = centerResult.rows[0]!;
  const centerTypeName = await getTypeName(db, center.type_node_id);

  const connections: Connection[] = [];
  const visited = new Set<string>([params.start_id]);
  let frontier = [params.start_id];

  for (let d = 1; d <= (params.depth ?? 1); d++) {
    if (connections.length >= (params.max_results ?? 50)) break;
    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      if (connections.length >= (params.max_results ?? 50)) break;

      // Outgoing edges
      if (params.direction !== 'incoming') {
        const outgoing = await db.query<{
          edge_id: string;
          type_node_id: string;
          target_id: string;
        }>(
          `SELECT e.edge_id, e.type_node_id, e.target_id
           FROM edges e
           WHERE e.source_id = $1 AND e.is_deleted = false AND e.valid_to = 'infinity'`,
          [nodeId],
        );

        for (const edge of outgoing.rows) {
          if (visited.has(edge.target_id)) continue;
          if (connections.length >= (params.max_results ?? 50)) break;

          const edgeTypeName = await getTypeName(db, edge.type_node_id);
          if (params.edge_types && !params.edge_types.includes(edgeTypeName))
            continue;

          const targetNode = await db.query<{
            node_id: string;
            tenant_id: string;
            type_node_id: string;
            data: Record<string, unknown>;
            epistemic: string;
          }>(
            `SELECT node_id, tenant_id, type_node_id, data, epistemic FROM nodes
             WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'
             LIMIT 1`,
            [edge.target_id],
          );

          if (targetNode.rows.length === 0) continue; // dangling edge

          const target = targetNode.rows[0]!;
          const targetTypeName = await getTypeName(db, target.type_node_id);

          connections.push({
            edge_id: edge.edge_id,
            edge_type: edgeTypeName,
            direction: 'outgoing',
            entity: {
              entity_id: target.node_id,
              entity_type: targetTypeName,
              data: typeof target.data === 'string'
                ? JSON.parse(target.data)
                : target.data,
              tenant_id: target.tenant_id,
              epistemic: target.epistemic,
            },
            depth: d,
          });

          visited.add(edge.target_id);
          nextFrontier.push(edge.target_id);
        }
      }

      // Incoming edges
      if (params.direction !== 'outgoing') {
        const incoming = await db.query<{
          edge_id: string;
          type_node_id: string;
          source_id: string;
        }>(
          `SELECT e.edge_id, e.type_node_id, e.source_id
           FROM edges e
           WHERE e.target_id = $1 AND e.is_deleted = false AND e.valid_to = 'infinity'`,
          [nodeId],
        );

        for (const edge of incoming.rows) {
          if (visited.has(edge.source_id)) continue;
          if (connections.length >= (params.max_results ?? 50)) break;

          const edgeTypeName = await getTypeName(db, edge.type_node_id);
          if (params.edge_types && !params.edge_types.includes(edgeTypeName))
            continue;

          const sourceNode = await db.query<{
            node_id: string;
            tenant_id: string;
            type_node_id: string;
            data: Record<string, unknown>;
            epistemic: string;
          }>(
            `SELECT node_id, tenant_id, type_node_id, data, epistemic FROM nodes
             WHERE node_id = $1 AND is_deleted = false AND valid_to = 'infinity'
             LIMIT 1`,
            [edge.source_id],
          );

          if (sourceNode.rows.length === 0) continue;

          const source = sourceNode.rows[0]!;
          const sourceTypeName = await getTypeName(db, source.type_node_id);

          connections.push({
            edge_id: edge.edge_id,
            edge_type: edgeTypeName,
            direction: 'incoming',
            entity: {
              entity_id: source.node_id,
              entity_type: sourceTypeName,
              data: typeof source.data === 'string'
                ? JSON.parse(source.data)
                : source.data,
              tenant_id: source.tenant_id,
              epistemic: source.epistemic,
            },
            depth: d,
          });

          visited.add(edge.source_id);
          nextFrontier.push(edge.source_id);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return {
    center: {
      entity_id: center.node_id,
      entity_type: centerTypeName,
      data: typeof center.data === 'string'
        ? JSON.parse(center.data)
        : center.data,
    },
    connections,
  };
}
