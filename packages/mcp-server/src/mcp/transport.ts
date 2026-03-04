/**
 * Hono ↔ MCP Streamable HTTP transport bridge.
 * Wraps MCP SDK's StreamableHTTPServerTransport for use with Hono.
 */
import { Hono } from 'hono';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PGlite } from '../db/connection.js';
import { verifyToken } from '../auth/jwt.js';
import { createAuthContext, type AuthContext } from '../auth/context.js';

/**
 * Create Hono routes for MCP Streamable HTTP transport.
 */
export function createMcpRoutes(
  mcpServer: McpServer,
  db: PGlite,
  jwtSecret: string,
): Hono {
  const app = new Hono();

  // Store per-session auth context
  let currentAuth: AuthContext | null = null;

  app.post('/mcp', async (c) => {
    // Extract JWT from Authorization header
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const claims = await verifyToken(token, jwtSecret);
        currentAuth = await createAuthContext(claims, db);
      } catch {
        return c.json({ error: 'Invalid token' }, 401);
      }
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcpServer.connect(transport);

    const body = await c.req.json();
    const response = await transport.handleRequest(
      new Request(c.req.url, {
        method: 'POST',
        headers: Object.fromEntries(c.req.raw.headers.entries()),
        body: JSON.stringify(body),
      }),
    );

    if (!response) {
      return c.json({ error: 'No response from MCP' }, 500);
    }

    // Copy response headers and body
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });
  });

  return app;
}

/**
 * Get auth context accessor for tool registration.
 */
export function createAuthAccessor() {
  let auth: AuthContext | null = null;

  return {
    set(ctx: AuthContext) {
      auth = ctx;
    },
    get(): AuthContext {
      if (!auth) throw new Error('No auth context available');
      return auth;
    },
  };
}
