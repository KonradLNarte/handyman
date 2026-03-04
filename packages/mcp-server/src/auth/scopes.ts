/**
 * Scope matching — spec §4.8 pseudocode.
 *
 * Scope syntax: "tenant:{tenant_id}:{resource}:{action}"
 * Examples:
 *   "tenant:T1:read"                → read everything in T1
 *   "tenant:T1:write"               → write everything in T1
 *   "tenant:T1:nodes:lead:read"     → read only leads in T1
 *   "tenant:*:read"                 → cross-tenant read (owner)
 *   "admin"                         → full access
 */

/**
 * Check if the token scopes include the required scope.
 * Broader scopes cover narrower ones:
 *   "tenant:T1:write" covers "tenant:T1:nodes:lead:write"
 *   "admin" covers everything
 */
export function hasScope(scopes: string[], required: string): boolean {
  return scopes.some((s) => {
    if (s === 'admin') return true;
    if (s === required) return true;

    // Check if the scope is broader: remove trailing action and see if required starts with it
    // "tenant:T1:write" → "tenant:T1:" covers "tenant:T1:nodes:lead:write"
    const broadScope = s.replace(/:(?:read|write)$/, ':');
    const requiredBase = required.replace(/:(?:read|write)$/, ':');

    // Broader scope check: scope without action is a prefix of required without action,
    // AND they share the same action
    const scopeAction = s.match(/:(?:read|write)$/)?.[0];
    const requiredAction = required.match(/:(?:read|write)$/)?.[0];

    if (scopeAction && requiredAction && scopeAction === requiredAction) {
      if (requiredBase.startsWith(broadScope)) return true;
    }

    // Wildcard tenant
    if (s.startsWith('tenant:*:')) {
      const wildcardRest = s.slice('tenant:*:'.length);
      const requiredParts = required.match(/^tenant:[^:]+:(.+)$/);
      if (requiredParts && requiredParts[1] === wildcardRest) return true;
    }

    return false;
  });
}

/**
 * Get entity types accessible to a token for a specific tenant and action.
 * Returns null if all types are accessible, or an array of type names.
 *
 * Spec §4.8: "Type-scoped read behavior: results are SILENTLY FILTERED to only
 * return entities of types the token has read access to."
 */
export function getAccessibleTypes(
  scopes: string[],
  tenantId: string,
  action: 'read' | 'write',
): string[] | null {
  // Check if any scope grants broad access to this tenant
  for (const s of scopes) {
    if (s === 'admin') return null; // all types
    if (s === `tenant:${tenantId}:${action}`) return null; // all types in tenant
    if (s === `tenant:*:${action}`) return null; // all types cross-tenant
  }

  // Collect type-scoped permissions
  const types: string[] = [];
  const prefix = `tenant:${tenantId}:nodes:`;
  for (const s of scopes) {
    if (s.startsWith(prefix) && s.endsWith(`:${action}`)) {
      const typeName = s.slice(prefix.length, -(action.length + 1));
      if (typeName) types.push(typeName);
    }
  }

  return types.length > 0 ? types : [];
}
