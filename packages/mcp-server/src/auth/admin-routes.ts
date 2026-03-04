/**
 * Admin routes — POST /admin/token for JWT generation.
 */
import { Hono } from 'hono';
import { signToken } from './jwt.js';

export function createAdminRoutes(jwtSecret: string): Hono {
  const app = new Hono();

  app.post('/admin/token', async (c) => {
    const body = await c.req.json<{
      sub: string;
      tenant_ids: string[];
      scopes: string[];
      expires_in_seconds?: number;
    }>();

    if (!body.sub || !body.tenant_ids || !body.scopes) {
      return c.json({ error: 'Missing required fields: sub, tenant_ids, scopes' }, 400);
    }

    const token = await signToken(
      {
        sub: body.sub,
        tenant_ids: body.tenant_ids,
        scopes: body.scopes,
        expiresInSeconds: body.expires_in_seconds,
      },
      jwtSecret,
    );

    return c.json({ token });
  });

  return app;
}
