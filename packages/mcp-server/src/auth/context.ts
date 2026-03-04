/**
 * Per-request auth context — created from JWT for each MCP request.
 * Provides scope checking, tenant resolution, and actor resolution.
 */
import type { PGlite } from '../db/connection.js';
import type { TokenClaims } from './jwt.js';
import { hasScope, getAccessibleTypes } from './scopes.js';
import { resolveActor } from './actor.js';
import { McpError } from '../errors.js';

export interface AuthContext {
  claims: TokenClaims;
  /** Cached actor node_id per tenant */
  actorIds: Map<string, string>;
  /** Resolve or create actor node for a tenant */
  getActorForTenant(tenantId: string): Promise<string>;
  /** Resolve tenant_id from params or single-tenant token */
  resolveTenantId(paramTenantId?: string): string;
  /** Check scope, throw AUTH_DENIED if missing */
  checkScope(required: string): void;
  /** Check if has scope without throwing */
  hasScopeFor(required: string): boolean;
  /** Get accessible tenant IDs */
  getAccessibleTenantIds(): string[];
  /** Get accessible entity types for a tenant (null = all) */
  getAccessibleTypes(tenantId: string, action: 'read' | 'write'): string[] | null;
}

export async function createAuthContext(
  claims: TokenClaims,
  db: PGlite,
): Promise<AuthContext> {
  const actorIds = new Map<string, string>();

  const ctx: AuthContext = {
    claims,
    actorIds,

    async getActorForTenant(tenantId: string): Promise<string> {
      let actorId = actorIds.get(tenantId);
      if (!actorId) {
        actorId = await resolveActor(db, claims.sub, tenantId);
        actorIds.set(tenantId, actorId);
      }
      return actorId;
    },

    resolveTenantId(paramTenantId?: string): string {
      if (paramTenantId) {
        if (!claims.tenant_ids.includes(paramTenantId)) {
          throw McpError.authDenied(
            `Token does not include tenant ${paramTenantId}`,
          );
        }
        return paramTenantId;
      }
      if (claims.tenant_ids.length === 1) {
        return claims.tenant_ids[0]!;
      }
      throw McpError.validationError(
        'tenant_id is required when token has multiple tenants',
      );
    },

    checkScope(required: string): void {
      if (!hasScope(claims.scopes, required)) {
        throw McpError.authDenied(`Missing scope: ${required}`);
      }
    },

    hasScopeFor(required: string): boolean {
      return hasScope(claims.scopes, required);
    },

    getAccessibleTenantIds(): string[] {
      return claims.tenant_ids;
    },

    getAccessibleTypes(
      tenantId: string,
      action: 'read' | 'write',
    ): string[] | null {
      return getAccessibleTypes(claims.scopes, tenantId, action);
    },
  };

  return ctx;
}
