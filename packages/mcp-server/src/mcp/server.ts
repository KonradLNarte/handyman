/**
 * MCP Server — registers all 15 tools with the MCP SDK.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PGlite } from '../db/connection.js';
import type { AuthContext } from '../auth/context.js';
import { McpError } from '../errors.js';

// Tool implementations
import { storeEntity } from '../tools/store-entity.js';
import { findEntities } from '../tools/find-entities.js';
import { connectEntities } from '../tools/connect-entities.js';
import { exploreGraph } from '../tools/explore-graph.js';
import { removeEntity } from '../tools/remove-entity.js';
import { getSchema } from '../tools/get-schema.js';
import { getStats } from '../tools/get-stats.js';
import { queryAtTime } from '../tools/query-at-time.js';
import { getTimeline } from '../tools/get-timeline.js';
import { proposeEvent } from '../tools/propose-event.js';
import { verifyLineage } from '../tools/verify-lineage.js';
import { storeBlob, getBlob } from '../tools/store-blob.js';
import { lookupDict } from '../tools/lookup-dict.js';
import { createCaptureThought } from '../tools/capture-thought.js';
import { createMockExtractionService } from '../ai/extraction.js';

// Schemas (for tool registration)
import {
  StoreEntityParams,
  FindEntitiesParams,
  ConnectEntitiesParams,
  ExploreGraphParams,
  RemoveEntityParams,
  GetSchemaParams,
  GetStatsParams,
  QueryAtTimeParams,
  GetTimelineParams,
  CaptureThoughtParams,
  ProposeEventParams,
  VerifyLineageParams,
  StoreBlobParams,
  GetBlobParams,
  LookupDictParams,
} from '../tools/schemas.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'resonansia-mcp',
    version: '0.0.1',
  });

  return server;
}

/**
 * Register all tool handlers. The auth context and db are injected per-request
 * via the transport layer.
 */
export function registerTools(
  server: McpServer,
  getDb: () => PGlite,
  getAuth: () => AuthContext,
) {
  const toolHandler =
    (fn: (db: PGlite, auth: AuthContext, params: unknown) => Promise<unknown>) =>
    async (params: Record<string, unknown>) => {
      try {
        const result = await fn(getDb(), getAuth(), params);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        if (e instanceof McpError) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(e.toJSON()) },
            ],
            isError: true,
          };
        }
        throw e;
      }
    };

  // ═══ Core tools ═══
  server.tool(
    'store_entity',
    "Create or update an entity node. Provide entity_id to update, omit to create.",
    StoreEntityParams.shape,
    toolHandler(storeEntity),
  );

  server.tool(
    'find_entities',
    "Search entities by type, filters, and optional semantic query.",
    FindEntitiesParams.shape,
    toolHandler(findEntities),
  );

  server.tool(
    'connect_entities',
    "Create an edge between two entities.",
    ConnectEntitiesParams.shape,
    toolHandler(connectEntities),
  );

  server.tool(
    'explore_graph',
    "BFS traversal from a start entity, following edges.",
    ExploreGraphParams.shape,
    toolHandler(exploreGraph),
  );

  server.tool(
    'remove_entity',
    "Soft-delete an entity.",
    RemoveEntityParams.shape,
    toolHandler(removeEntity),
  );

  server.tool(
    'get_schema',
    "Get type definitions (entity types and edge types) for a tenant.",
    GetSchemaParams.shape,
    toolHandler(getSchema),
  );

  server.tool(
    'get_stats',
    "Get entity/edge/event counts and type breakdown for a tenant.",
    GetStatsParams.shape,
    toolHandler(getStats),
  );

  // ═══ Temporal tools ═══
  server.tool(
    'query_at_time',
    "Bitemporal point-in-time query for an entity.",
    QueryAtTimeParams.shape,
    toolHandler(queryAtTime),
  );

  server.tool(
    'get_timeline',
    "Get chronological event/version history.",
    GetTimelineParams.shape,
    toolHandler(getTimeline),
  );

  server.tool(
    'propose_event',
    "Submit a raw event for projection.",
    ProposeEventParams.shape,
    toolHandler(proposeEvent),
  );

  server.tool(
    'verify_lineage',
    "Check INV-LINEAGE integrity: every fact has a valid event.",
    VerifyLineageParams.shape,
    toolHandler(verifyLineage),
  );

  // ═══ AI tools ═══
  const captureThought = createCaptureThought(createMockExtractionService());
  server.tool(
    'capture_thought',
    "Extract structured entities from free-text via LLM.",
    CaptureThoughtParams.shape,
    toolHandler(captureThought),
  );

  // ═══ Blob tools ═══
  server.tool(
    'store_blob',
    "Store a binary blob (image, document) linked to an entity.",
    StoreBlobParams.shape,
    toolHandler(storeBlob),
  );

  server.tool(
    'get_blob',
    "Retrieve a stored blob by ID.",
    GetBlobParams.shape,
    toolHandler(getBlob),
  );

  server.tool(
    'lookup_dict',
    "Look up dictionary entries (e.g., postal codes, labels).",
    LookupDictParams.shape,
    toolHandler(lookupDict),
  );
}
