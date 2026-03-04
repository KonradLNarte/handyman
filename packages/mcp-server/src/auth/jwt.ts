/**
 * JWT sign/verify — spec §4.1 token structure.
 * Uses jose library for HMAC-SHA256 (HS256) symmetric JWTs.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface TokenClaims {
  sub: string;
  iss: string;
  aud: string;
  tenant_ids: string[];
  scopes: string[];
  exp: number;
}

export async function signToken(
  claims: {
    sub: string;
    tenant_ids: string[];
    scopes: string[];
    expiresInSeconds?: number;
  },
  secret: string,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const expiresIn = claims.expiresInSeconds ?? 3600; // 1h default

  return new SignJWT({
    tenant_ids: claims.tenant_ids,
    scopes: claims.scopes,
  } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer('resonansia-admin')
    .setAudience('resonansia-mcp')
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setIssuedAt()
    .sign(key);
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenClaims> {
  const key = new TextEncoder().encode(secret);

  const { payload } = await jwtVerify(token, key, {
    issuer: 'resonansia-admin',
    audience: 'resonansia-mcp',
  });

  if (!payload.sub) throw new Error('Missing sub claim');

  const tenantIds = (payload as Record<string, unknown>).tenant_ids;
  const scopes = (payload as Record<string, unknown>).scopes;

  if (!Array.isArray(tenantIds)) throw new Error('Missing tenant_ids claim');
  if (!Array.isArray(scopes)) throw new Error('Missing scopes claim');

  return {
    sub: payload.sub,
    iss: payload.iss as string,
    aud: payload.aud as string,
    tenant_ids: tenantIds as string[],
    scopes: scopes as string[],
    exp: payload.exp as number,
  };
}
