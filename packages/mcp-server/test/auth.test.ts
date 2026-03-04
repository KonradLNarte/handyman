/**
 * Phase 2 auth tests — JWT, scopes, actor resolution, grants, context.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type PGlite } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seed, IDS, TENANT_IDS } from '../src/db/seed.js';
import { signToken, verifyToken } from '../src/auth/jwt.js';
import { hasScope, getAccessibleTypes } from '../src/auth/scopes.js';
import { resolveActor } from '../src/auth/actor.js';
import { checkGrant } from '../src/auth/grants.js';
import { createAuthContext } from '../src/auth/context.js';
import { McpError } from '../src/errors.js';

const SECRET = 'test-secret-key-for-jwt-signing-min-32-chars!!';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await migrate(db);
  await seed(db);
});

afterAll(async () => {
  await db.close();
});

// ═══════════════════════════════════════════════════════════════
// JWT sign/verify
// ═══════════════════════════════════════════════════════════════
describe('JWT', () => {
  test('sign and verify round-trip', async () => {
    const token = await signToken(
      {
        sub: 'sales-agent-001',
        tenant_ids: [TENANT_IDS.TAYLOR_EVENTS],
        scopes: [`tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`],
      },
      SECRET,
    );
    expect(typeof token).toBe('string');

    const claims = await verifyToken(token, SECRET);
    expect(claims.sub).toBe('sales-agent-001');
    expect(claims.tenant_ids).toEqual([TENANT_IDS.TAYLOR_EVENTS]);
    expect(claims.scopes).toEqual([`tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`]);
    expect(claims.iss).toBe('resonansia-admin');
    expect(claims.aud).toBe('resonansia-mcp');
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('verify rejects wrong secret', async () => {
    const token = await signToken(
      { sub: 'test', tenant_ids: ['t1'], scopes: ['admin'] },
      SECRET,
    );
    await expect(verifyToken(token, 'wrong-secret-that-is-long-enough!!')).rejects.toThrow();
  });

  test('verify rejects expired token', async () => {
    const token = await signToken(
      {
        sub: 'test',
        tenant_ids: ['t1'],
        scopes: ['admin'],
        expiresInSeconds: -10, // already expired
      },
      SECRET,
    );
    await expect(verifyToken(token, SECRET)).rejects.toThrow();
  });

  test('multi-tenant token', async () => {
    const token = await signToken(
      {
        sub: 'sales-agent-001',
        tenant_ids: [TENANT_IDS.TAYLOR_EVENTS, TENANT_IDS.MOUNTAIN_CABINS],
        scopes: [
          `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
          `tenant:${TENANT_IDS.MOUNTAIN_CABINS}:read`,
        ],
      },
      SECRET,
    );
    const claims = await verifyToken(token, SECRET);
    expect(claims.tenant_ids).toHaveLength(2);
    expect(claims.scopes).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// Scope matching — spec §4.8
// ═══════════════════════════════════════════════════════════════
describe('Scopes', () => {
  const T1 = TENANT_IDS.TAYLOR_EVENTS;

  test('exact match', () => {
    expect(hasScope([`tenant:${T1}:read`], `tenant:${T1}:read`)).toBe(true);
  });

  test('admin covers everything', () => {
    expect(hasScope(['admin'], `tenant:${T1}:read`)).toBe(true);
    expect(hasScope(['admin'], `tenant:${T1}:nodes:lead:write`)).toBe(true);
  });

  test('broad scope covers narrow (write)', () => {
    expect(
      hasScope([`tenant:${T1}:write`], `tenant:${T1}:nodes:lead:write`),
    ).toBe(true);
  });

  test('broad scope covers narrow (read)', () => {
    expect(
      hasScope([`tenant:${T1}:read`], `tenant:${T1}:nodes:campaign:read`),
    ).toBe(true);
  });

  test('read scope does NOT cover write', () => {
    expect(
      hasScope([`tenant:${T1}:read`], `tenant:${T1}:write`),
    ).toBe(false);
  });

  test('narrow scope does NOT cover broad', () => {
    expect(
      hasScope([`tenant:${T1}:nodes:lead:read`], `tenant:${T1}:read`),
    ).toBe(false);
  });

  test('wildcard tenant covers specific tenant', () => {
    expect(hasScope(['tenant:*:read'], `tenant:${T1}:read`)).toBe(true);
  });

  test('wrong tenant is denied', () => {
    const T2 = TENANT_IDS.MOUNTAIN_CABINS;
    expect(hasScope([`tenant:${T1}:read`], `tenant:${T2}:read`)).toBe(false);
  });

  // getAccessibleTypes
  test('admin sees all types (null)', () => {
    expect(getAccessibleTypes(['admin'], T1, 'read')).toBeNull();
  });

  test('broad tenant scope sees all types (null)', () => {
    expect(getAccessibleTypes([`tenant:${T1}:read`], T1, 'read')).toBeNull();
  });

  test('type-scoped returns specific types', () => {
    const scopes = [
      `tenant:${T1}:nodes:lead:read`,
      `tenant:${T1}:nodes:campaign:read`,
    ];
    const types = getAccessibleTypes(scopes, T1, 'read');
    expect(types).toEqual(['lead', 'campaign']);
  });

  test('no matching scopes returns empty array', () => {
    const scopes = [`tenant:${T1}:nodes:lead:read`];
    const types = getAccessibleTypes(scopes, T1, 'write');
    expect(types).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Actor resolution — spec §4.6
// ═══════════════════════════════════════════════════════════════
describe('Actor resolution', () => {
  test('finds existing actor by external_id', async () => {
    const actorId = await resolveActor(db, 'sales-agent-001', TENANT_IDS.TAYLOR_EVENTS);
    expect(actorId).toBe(IDS.ACTOR_SALES);
  });

  test('auto-creates actor for new sub', async () => {
    const actorId = await resolveActor(db, 'new-agent-xyz', TENANT_IDS.TAYLOR_EVENTS);
    expect(actorId).toBeTruthy();
    expect(actorId).not.toBe(IDS.ACTOR_SALES);

    // Second call returns same id (cached in DB)
    const actorId2 = await resolveActor(db, 'new-agent-xyz', TENANT_IDS.TAYLOR_EVENTS);
    expect(actorId2).toBe(actorId);
  });

  test('same sub gets different actors per tenant', async () => {
    const a1 = await resolveActor(db, 'cross-tenant-sub', TENANT_IDS.TAYLOR_EVENTS);
    const a2 = await resolveActor(db, 'cross-tenant-sub', TENANT_IDS.MOUNTAIN_CABINS);
    expect(a1).not.toBe(a2);
  });
});

// ═══════════════════════════════════════════════════════════════
// Grants — spec §4.5
// ═══════════════════════════════════════════════════════════════
describe('Grants', () => {
  test('Taylor can READ package from Nordic', async () => {
    const ok = await checkGrant(
      db,
      TENANT_IDS.TAYLOR_EVENTS,
      IDS.PACKAGE_MIDSOMMAR,
      'READ',
    );
    expect(ok).toBe(true);
  });

  test('Taylor can READ property from Mountain', async () => {
    const ok = await checkGrant(
      db,
      TENANT_IDS.TAYLOR_EVENTS,
      IDS.PROPERTY_BJORNEN,
      'READ',
    );
    expect(ok).toBe(true);
  });

  test('Nordic can TRAVERSE property from Mountain', async () => {
    const ok = await checkGrant(
      db,
      TENANT_IDS.NORDIC_TICKETS,
      IDS.PROPERTY_BJORNEN,
      'TRAVERSE',
    );
    expect(ok).toBe(true);
  });

  test('Taylor does NOT have WRITE on package', async () => {
    const ok = await checkGrant(
      db,
      TENANT_IDS.TAYLOR_EVENTS,
      IDS.PACKAGE_MIDSOMMAR,
      'WRITE',
    );
    expect(ok).toBe(false);
  });

  test('non-granted tenant is denied', async () => {
    const ok = await checkGrant(
      db,
      TENANT_IDS.PETTSON_HOLDING,
      IDS.PACKAGE_MIDSOMMAR,
      'READ',
    );
    expect(ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// AuthContext integration
// ═══════════════════════════════════════════════════════════════
describe('AuthContext', () => {
  test('resolveTenantId with single-tenant token', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'sales-agent-001',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS],
          scopes: [`tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    expect(ctx.resolveTenantId()).toBe(TENANT_IDS.TAYLOR_EVENTS);
  });

  test('resolveTenantId with explicit param', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'sales-agent-001',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS, TENANT_IDS.MOUNTAIN_CABINS],
          scopes: [
            `tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`,
            `tenant:${TENANT_IDS.MOUNTAIN_CABINS}:read`,
          ],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    expect(ctx.resolveTenantId(TENANT_IDS.MOUNTAIN_CABINS)).toBe(
      TENANT_IDS.MOUNTAIN_CABINS,
    );
  });

  test('resolveTenantId throws on multi-tenant without param', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'test',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS, TENANT_IDS.MOUNTAIN_CABINS],
          scopes: ['admin'],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    expect(() => ctx.resolveTenantId()).toThrow(McpError);
  });

  test('resolveTenantId rejects unauthorized tenant', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'test',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS],
          scopes: ['admin'],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    expect(() => ctx.resolveTenantId(TENANT_IDS.NORDIC_TICKETS)).toThrow(
      McpError,
    );
  });

  test('checkScope throws on missing scope', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'test',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS],
          scopes: [`tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    expect(() =>
      ctx.checkScope(`tenant:${TENANT_IDS.TAYLOR_EVENTS}:write`),
    ).toThrow(McpError);
  });

  test('getActorForTenant resolves and caches', async () => {
    const claims = await verifyToken(
      await signToken(
        {
          sub: 'sales-agent-001',
          tenant_ids: [TENANT_IDS.TAYLOR_EVENTS],
          scopes: [`tenant:${TENANT_IDS.TAYLOR_EVENTS}:read`],
        },
        SECRET,
      ),
      SECRET,
    );
    const ctx = await createAuthContext(claims, db);
    const actorId = await ctx.getActorForTenant(TENANT_IDS.TAYLOR_EVENTS);
    expect(actorId).toBe(IDS.ACTOR_SALES);

    // Second call uses cache
    const actorId2 = await ctx.getActorForTenant(TENANT_IDS.TAYLOR_EVENTS);
    expect(actorId2).toBe(actorId);
  });
});

// ═══════════════════════════════════════════════════════════════
// McpError
// ═══════════════════════════════════════════════════════════════
describe('McpError', () => {
  test('factory methods produce correct codes', () => {
    expect(McpError.validationError('bad').code).toBe('VALIDATION_ERROR');
    expect(McpError.notFound('node', 'x').code).toBe('NOT_FOUND');
    expect(McpError.authDenied('no').code).toBe('AUTH_DENIED');
    expect(McpError.conflict('e', 'v1', 'v2').code).toBe('CONFLICT');
    expect(McpError.crossTenantDenied('READ', 'n', 't').code).toBe('CROSS_TENANT_DENIED');
    expect(McpError.schemaViolation('lead', ['err']).code).toBe('SCHEMA_VIOLATION');
    expect(McpError.extractionFailed('fail').code).toBe('EXTRACTION_FAILED');
    expect(McpError.rateLimited(60).code).toBe('RATE_LIMITED');
    expect(McpError.internalError('oops').code).toBe('INTERNAL_ERROR');
  });

  test('toJSON output matches spec', () => {
    const err = McpError.notFound('node', 'abc');
    const json = err.toJSON();
    expect(json.error_code).toBe('NOT_FOUND');
    expect(json.message).toContain('abc');
    expect(json.details).toEqual({ resource_type: 'node', id: 'abc' });
  });

  test('httpStatus is correct', () => {
    expect(McpError.validationError('x').httpStatus).toBe(400);
    expect(McpError.authDenied('x').httpStatus).toBe(403);
    expect(McpError.notFound('x', 'y').httpStatus).toBe(404);
    expect(McpError.conflict('a', 'b', 'c').httpStatus).toBe(409);
    expect(McpError.rateLimited(10).httpStatus).toBe(429);
    expect(McpError.internalError('x').httpStatus).toBe(500);
  });
});
