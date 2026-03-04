/**
 * Entry point — PGlite init, migration, Hono server on port 3001.
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createDatabase, type PGlite } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { loadConfig } from './config.js';
import { createAdminRoutes } from './auth/admin-routes.js';
import { createMcpServer, registerTools } from './mcp/server.js';
import { verifyToken } from './auth/jwt.js';
import { createAuthContext, type AuthContext } from './auth/context.js';

async function main() {
  const config = loadConfig();

  console.log('Initializing PGlite...');
  const db = await createDatabase({ dataDir: config.dataDir });
  await migrate(db);
  await seed(db);
  console.log('Database ready (migrated + seeded).');

  // MCP Server
  const mcpServer = createMcpServer();

  // Auth context — set per request
  let currentAuth: AuthContext | null = null;
  const getAuth = () => {
    if (!currentAuth) throw new Error('No auth context');
    return currentAuth;
  };

  registerTools(mcpServer, () => db, getAuth);

  // Hono app
  const app = new Hono();

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Admin routes
  app.route('/', createAdminRoutes(config.jwtSecret));

  // MCP endpoint info
  app.get('/mcp', (c) =>
    c.json({
      name: 'resonansia-mcp',
      version: '0.0.1',
      description: 'Resonansia MCP Server — multi-tenant knowledge graph',
    }),
  );

  console.log(`Starting server on port ${config.port}...`);
  serve(
    { fetch: app.fetch, port: config.port },
    (info) => {
      console.log(`Resonansia MCP Server running on http://localhost:${info.port}`);
      console.log(`  MCP endpoint: http://localhost:${info.port}/mcp`);
      console.log(`  Admin token:  POST http://localhost:${info.port}/admin/token`);
      console.log(`  Health:       GET http://localhost:${info.port}/health`);
    },
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
