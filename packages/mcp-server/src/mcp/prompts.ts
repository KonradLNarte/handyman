/**
 * MCP Prompts — spec §3.7.
 * 4 prompts for common operations.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer) {
  server.prompt(
    'capture-thought',
    'Capture and extract entities from free-text input',
    [
      { name: 'content', description: 'Free-text to extract entities from', required: true },
      { name: 'source', description: 'Origin of the thought (e.g., whatsapp, voice_note)', required: false },
    ],
    async ({ content, source }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please use the capture_thought tool to extract entities from the following text:\n\n${content}\n\nSource: ${source ?? 'manual'}`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'find-and-explore',
    'Find an entity and explore its connections',
    [
      { name: 'query', description: 'Search query', required: true },
      { name: 'entity_type', description: 'Type of entity to find', required: false },
    ],
    async ({ query, entity_type }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Find entities matching "${query}"${entity_type ? ` of type "${entity_type}"` : ''}, then explore the graph connections of the best match.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'timeline-review',
    'Review the timeline of events for an entity',
    [
      { name: 'entity_id', description: 'Entity ID to review', required: true },
    ],
    async ({ entity_id }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Show me the complete timeline for entity ${entity_id}. Use get_timeline and query_at_time to show how it changed over time.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'data-quality-check',
    'Run integrity checks on the knowledge graph',
    [
      { name: 'tenant_id', description: 'Tenant to check', required: false },
    ],
    async ({ tenant_id }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Run a data quality check${tenant_id ? ` for tenant ${tenant_id}` : ''}. Use verify_lineage to check integrity, then get_stats for an overview.`,
          },
        },
      ],
    }),
  );
}
