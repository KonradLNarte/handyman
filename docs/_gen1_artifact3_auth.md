## 4. ARTIFACT 3 — AUTH & AUTHORIZATION

This artifact specifies the complete authentication and authorization layer for the Resonansia MCP Server.
The MCP server is a **Resource Server only** — it validates tokens and enforces access control, but never issues tokens.
Token issuance is delegated to Supabase Auth (the OAuth 2.1 Authorization Server).

### 4.1 Architecture overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐     ┌───────────────────────────┐
│   MCP Client    │     │         Resonansia MCP Server                │     │     Supabase Auth         │
│  (Claude, etc.) │     │        (Resource Server)                     │     │  (Authorization Server)   │
│                 │     │                                              │     │                           │
│  1. Discover ───┼────>│  /.well-known/oauth-protected-resource       │     │                           │
│     PRM         │<────┼── Returns: AS URL, scopes_supported          │     │                           │
│                 │     │                                              │     │                           │
│  2. Obtain ─────┼─────┼──────────────────────────────────────────────┼────>│  /auth/v1/token           │
│     token       │<────┼──────────────────────────────────────────────┼─────│  Issues JWT with claims   │
│                 │     │                                              │     │                           │
│  3. Call tool ──┼────>│  Authorization: Bearer <JWT>                 │     │                           │
│     with token  │     │  ┌────────────────────────────────────────┐  │     │                           │
│                 │     │  │ Layer 1: JWT Validation (jose)         │  │     │  /.well-known/jwks.json   │
│                 │     │  │  - Verify signature via JWKS  ────────┼──┼────>│  Returns signing keys     │
│                 │     │  │  - Validate iss, aud, exp             │  │     │                           │
│                 │     │  │  - Extract tenant_ids, scopes         │  │     └───────────────────────────┘
│                 │     │  └────────────┬───────────────────────────┘  │
│                 │     │               │ pass                         │
│                 │     │  ┌────────────▼───────────────────────────┐  │     ┌───────────────────────────┐
│                 │     │  │ Layer 2: Scope Check (in-memory)      │  │     │     Supabase PostgreSQL   │
│                 │     │  │  - hasScope(scopes, requirement)      │  │     │                           │
│                 │     │  └────────────┬───────────────────────────┘  │     │                           │
│                 │     │               │ pass                         │     │                           │
│                 │     │  ┌────────────▼───────────────────────────┐  │     │                           │
│                 │     │  │ Layer 3: Grant Check (DB, cross-tenant)│  │     │  grants table             │
│                 │     │  │  - Only for cross-tenant operations   ├──┼────>│  + RLS policies            │
│                 │     │  │  - Temporal validity check             │  │     │                           │
│                 │     │  └────────────┬───────────────────────────┘  │     │                           │
│                 │     │               │ pass                         │     │                           │
│                 │     │  ┌────────────▼───────────────────────────┐  │     │                           │
│  4. Response <──┼─────│  │ Tool Execution                        │  │     │                           │
│                 │     │  │  - RLS enforces tenant isolation      ├──┼────>│  nodes, edges, events     │
│                 │     │  │  - Service-role for cross-tenant      │  │     │  + RLS policies            │
│                 │     │  │  - Audit event (fire-and-forget)      │  │     │                           │
│                 │     │  └────────────────────────────────────────┘  │     └───────────────────────────┘
└─────────────────┘     └──────────────────────────────────────────────┘
```

**Two-layer access control model:**

| Layer | Gate | Storage | Latency | Checked when |
|---|---|---|---|---|
| **Scopes** (outer gate) | JWT claims | In-memory (token payload) | ~0ms | Every tool call |
| **Grants** (inner gate) | Database rows | PostgreSQL query | ~5ms | Cross-tenant operations only |

Both layers must pass for an operation to succeed. Scopes provide fast, coarse-grained tenant-level access control.
Grants provide fine-grained, node-level access control with temporal validity. The design ensures that even if
application code has bugs, PostgreSQL RLS provides a third safety net at the database level.

**Security boundaries:**
- JWT signature verification prevents token forgery.
- Scope checking prevents unauthorized operations within valid tokens.
- Grant checking prevents unauthorized cross-tenant access.
- RLS prevents data leakage even if all application-level checks fail.
- Service-role bypass is used ONLY for cross-tenant queries where grants have been validated at the application layer (D-006).

---

### 4.2 RFC 9728 Protected Resource Metadata endpoint

The MCP specification (June 2025 revision) requires every MCP server acting as a Resource Server to implement
RFC 9728 Protected Resource Metadata (PRM). This endpoint tells MCP clients where to obtain tokens and what
scopes are supported.

#### 4.2.1 Well-known URL path

```
GET /.well-known/oauth-protected-resource
```

Per RFC 9728 Section 3, the path is `/.well-known/oauth-protected-resource` appended to the resource server's
base URL. If the MCP server is deployed at `https://mcp.resonansia.se/`, the full URL is:

```
https://mcp.resonansia.se/.well-known/oauth-protected-resource
```

If the MCP server is deployed as a Supabase Edge Function at a path like `/functions/v1/mcp`, the URL is:

```
https://<project>.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource
```

#### 4.2.2 PRM response JSON

```json
{
  "resource": "https://<project>.supabase.co/functions/v1/mcp",
  "authorization_servers": [
    "https://<project>.supabase.co/auth/v1"
  ],
  "scopes_supported": [
    "tenant:*:read",
    "tenant:*:write",
    "tenant:{tenant_id}:read",
    "tenant:{tenant_id}:write",
    "tenant:{tenant_id}:nodes:{type}:read",
    "tenant:{tenant_id}:nodes:{type}:write",
    "admin"
  ],
  "bearer_methods_supported": [
    "header"
  ],
  "resource_signing_alg_values_supported": [
    "RS256"
  ],
  "resource_name": "Resonansia MCP Server",
  "resource_documentation": "https://resonansia.se/docs/mcp"
}
```

**Field reference (RFC 9728 Section 2):**

| Field | Required | Description |
|---|---|---|
| `resource` | REQUIRED | The resource server's base URL. MUST match the URL the client used to discover this metadata. |
| `authorization_servers` | REQUIRED | Array of AS issuer URLs. Supabase Auth's issuer URL. |
| `scopes_supported` | RECOMMENDED | Scopes the resource server understands. Listed as templates — clients substitute `{tenant_id}` and `{type}` with actual values. |
| `bearer_methods_supported` | RECOMMENDED | How tokens are presented. We support `header` only (Authorization: Bearer). |
| `resource_signing_alg_values_supported` | OPTIONAL | Algorithms the RS accepts for JWT signatures. Supabase Auth uses RS256 by default (asymmetric). |
| `resource_name` | OPTIONAL | Human-readable name. |
| `resource_documentation` | OPTIONAL | URL to API documentation. |

#### 4.2.3 Implementation via @hono/mcp

The `@hono/mcp` package provides `mcpAuthRouter` which can serve this endpoint. However, given our need
for custom scope templates and deployment flexibility, we implement it as a manual Hono route.

```typescript
// src/auth/prm.ts
import { Hono } from "hono";

/**
 * Protected Resource Metadata endpoint (RFC 9728).
 *
 * Tells MCP clients where to get tokens and what scopes are supported.
 * This is a static JSON response — no auth required on this endpoint.
 */
export function createPrmRoute(config: {
  resourceUrl: string;
  supabaseUrl: string;
}): Hono {
  const app = new Hono();

  app.get("/.well-known/oauth-protected-resource", (c) => {
    return c.json({
      resource: config.resourceUrl,
      authorization_servers: [`${config.supabaseUrl}/auth/v1`],
      scopes_supported: [
        "admin",
        "tenant:*:read",
        "tenant:*:write",
        "tenant:{tenant_id}:read",
        "tenant:{tenant_id}:write",
        "tenant:{tenant_id}:nodes:{type}:read",
        "tenant:{tenant_id}:nodes:{type}:write",
      ],
      bearer_methods_supported: ["header"],
      resource_signing_alg_values_supported: ["RS256"],
      resource_name: "Resonansia MCP Server",
      resource_documentation: "https://resonansia.se/docs/mcp",
    });
  });

  return app;
}
```

**Deployment note:** This endpoint MUST be publicly accessible (no auth). MCP clients call it _before_
they have a token. The response is cacheable (add `Cache-Control: public, max-age=3600`).

---

### 4.3 JWT validation middleware

#### 4.3.1 JWKS endpoint

Supabase Auth exposes a JWKS endpoint at:

```
https://<project>.supabase.co/auth/v1/.well-known/jwks.json
```

This endpoint returns the public keys used to sign JWTs. The `jose` library fetches and caches these keys
automatically via `createRemoteJWKSet`. Supabase's edge CDN caches the JWKS response for 10 minutes.

#### 4.3.2 Validated claims type

```typescript
// src/auth/types.ts

/** Token types distinguished by intended use and lifetime. */
export type TokenType = "user_token" | "agent_token" | "partner_token";

/**
 * Validated JWT claims extracted from a Supabase Auth token.
 * Set on the Hono context after successful JWT validation.
 */
export interface AuthClaims {
  /** User or agent UUID (JWT `sub` claim). */
  sub: string;

  /** Token issuer URL (JWT `iss` claim). Must match Supabase Auth URL. */
  iss: string;

  /** Intended audience (JWT `aud` claim). Must be "resonansia-mcp". */
  aud: string;

  /** Tenant UUIDs this token can access. Extracted from custom claim. */
  tenant_ids: string[];

  /** Fine-grained permission scopes. Extracted from custom claim. */
  scopes: string[];

  /** Token expiration as Unix timestamp. */
  exp: number;

  /** Token issued-at as Unix timestamp. */
  iat: number;

  /**
   * Token type, inferred from claims:
   * - "agent_token": has `agent_id` claim
   * - "partner_token": has `partner` claim or only read scopes + exp > 7d
   * - "user_token": default
   */
  token_type: TokenType;
}

/**
 * Hono context variables set by the auth middleware.
 * Access via c.get("auth") in route handlers.
 */
export interface AuthVariables {
  auth: AuthClaims;
}
```

#### 4.3.3 Middleware implementation

```typescript
// src/auth/middleware.ts
import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthClaims, AuthVariables, TokenType } from "./types.ts";

// JWKS is cached in-memory by jose. createRemoteJWKSet handles refetch on key rotation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

/**
 * Infer token type from JWT claims.
 *
 * Rules:
 * 1. If `agent_id` custom claim is present → agent_token
 * 2. If `partner` claim is present, OR all scopes are read-only AND exp > 7 days → partner_token
 * 3. Otherwise → user_token
 */
function inferTokenType(payload: JWTPayload): TokenType {
  if (payload.agent_id) return "agent_token";

  if (payload.partner) return "partner_token";

  const scopes = (payload.scopes as string[]) || [];
  const allReadOnly = scopes.length > 0 && scopes.every(
    (s) => s.endsWith(":read") || s === "admin"
  );
  const exp = payload.exp ?? 0;
  const iat = payload.iat ?? 0;
  const lifetimeDays = (exp - iat) / 86400;

  if (allReadOnly && lifetimeDays > 7) return "partner_token";

  return "user_token";
}

/**
 * JWT validation middleware for Hono.
 *
 * Validates the Bearer token from the Authorization header:
 * 1. Extracts token from "Authorization: Bearer <token>" header
 * 2. Verifies JWT signature against Supabase JWKS
 * 3. Validates issuer, audience, and expiration
 * 4. Extracts tenant_ids and scopes from custom claims
 * 5. Sets validated claims on Hono context as c.get("auth")
 *
 * Returns 401 with WWW-Authenticate header on failure.
 *
 * @param config.supabaseUrl - Supabase project URL (e.g., "https://xyz.supabase.co")
 * @param config.resourceUrl - This MCP server's URL (for PRM link in WWW-Authenticate)
 */
export function jwtAuth(config: {
  supabaseUrl: string;
  resourceUrl: string;
}) {
  const expectedIssuer = `${config.supabaseUrl}/auth/v1`;
  const expectedAudience = "resonansia-mcp";

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // --- Step 1: Extract Bearer token ---
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication required",
            data: {
              type: "UNAUTHENTICATED",
              detail: "Missing or malformed Authorization header. Expected: Bearer <token>",
              prm_url: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp"`,
        }
      );
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // --- Step 2: Verify JWT signature and standard claims ---
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, getJwks(config.supabaseUrl), {
        issuer: expectedIssuer,
        audience: expectedAudience,
        clockTolerance: 30, // 30-second clock skew tolerance
      });
      payload = result.payload;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Token verification failed";

      // Distinguish between expired and invalid tokens
      const isExpired = message.includes("expired") || message.includes("exp");
      const errorType = isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
      const detail = isExpired
        ? "Token has expired. Obtain a new token from the authorization server."
        : `Token validation failed: ${message}`;

      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication failed",
            data: {
              type: errorType,
              detail,
              prm_url: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp", error="${isExpired ? "invalid_token" : "invalid_token"}", error_description="${detail}"`,
        }
      );
    }

    // --- Step 3: Extract and validate custom claims ---
    const tenantIds = Array.isArray(payload.tenant_ids)
      ? (payload.tenant_ids as string[])
      : [];

    if (tenantIds.length === 0) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication failed",
            data: {
              type: "INVALID_CLAIMS",
              detail:
                "Token has no tenant_ids claim. Every valid token must specify at least one tenant.",
            },
          },
          id: null,
        },
        401,
        {
          "WWW-Authenticate": `Bearer resource="${config.resourceUrl}", realm="resonansia-mcp", error="insufficient_scope"`,
        }
      );
    }

    const scopes = Array.isArray(payload.scopes)
      ? (payload.scopes as string[])
      : [];

    // --- Step 4: Build AuthClaims and set on context ---
    const claims: AuthClaims = {
      sub: payload.sub as string,
      iss: payload.iss as string,
      aud: expectedAudience,
      tenant_ids: tenantIds,
      scopes,
      exp: payload.exp as number,
      iat: payload.iat as number,
      token_type: inferTokenType(payload),
    };

    c.set("auth", claims);

    await next();
  });
}
```

#### 4.3.4 Middleware registration

The middleware is applied to all MCP tool routes but NOT to the PRM endpoint or health check:

```typescript
// src/index.ts (excerpt)
import { Hono } from "hono";
import { createPrmRoute } from "./auth/prm.ts";
import { jwtAuth } from "./auth/middleware.ts";

const app = new Hono();

const config = {
  supabaseUrl: Deno.env.get("SUPABASE_URL")!,
  resourceUrl: Deno.env.get("MCP_RESOURCE_URL")!,
};

// Public routes (no auth)
app.route("/", createPrmRoute(config));
app.get("/health", (c) => c.json({ status: "ok" }));

// Protected routes (auth required)
app.use("/mcp/*", jwtAuth(config));

// MCP tool routes are registered under /mcp/...
```

#### 4.3.5 Claims validation rules

| Claim | Validation | Error on failure |
|---|---|---|
| `iss` | Must equal `https://<project>.supabase.co/auth/v1` | `TOKEN_INVALID` |
| `aud` | Must equal `"resonansia-mcp"` | `TOKEN_INVALID` |
| `exp` | Must be in the future (with 30s clock tolerance) | `TOKEN_EXPIRED` |
| `sub` | Must be a non-empty string | `TOKEN_INVALID` |
| `tenant_ids` | Must be a non-empty array of UUID strings | `INVALID_CLAIMS` |
| `scopes` | Must be an array of strings (may be empty for admin-only tokens) | Valid but grants all operations denied except if `admin` scope present |

---

### 4.4 Scope resolution

#### 4.4.1 Scope syntax

Scopes follow the hierarchical pattern: `tenant:{tenant_id}:{resource}:{action}`

Where segments are progressively more specific:

| Scope pattern | Meaning |
|---|---|
| `admin` | Full access to everything. Superuser. |
| `tenant:*:read` | Read access to all tenants (holding company owner). |
| `tenant:*:write` | Write access to all tenants (holding company owner). |
| `tenant:{id}:read` | Read everything in a specific tenant. |
| `tenant:{id}:write` | Write everything in a specific tenant. |
| `tenant:{id}:nodes:{type}:read` | Read only entities of a specific type in a tenant. |
| `tenant:{id}:nodes:{type}:write` | Write only entities of a specific type in a tenant. |

**Hierarchy:** A broader scope implicitly grants all narrower scopes beneath it.

```
admin
 ├── tenant:*:write
 │    ├── tenant:*:read
 │    ├── tenant:{id}:write
 │    │    ├── tenant:{id}:read
 │    │    ├── tenant:{id}:nodes:{type}:write
 │    │    │    └── tenant:{id}:nodes:{type}:read
 │    │    └── ...
 │    └── ...
 └── ...
```

#### 4.4.2 Scope requirement type

```typescript
// src/auth/scopes.ts

/**
 * A scope requirement that a tool call must satisfy.
 * The tool declares what it needs; the auth layer checks if the token provides it.
 */
export interface ScopeRequirement {
  /** The tenant UUID the operation targets. */
  tenant_id: string;

  /**
   * The action required.
   * - "read": query, list, search, explore, get_schema, get_stats
   * - "write": store_entity, connect_entities, remove_entity, propose_event, capture_thought
   */
  action: "read" | "write";

  /**
   * Optional entity type restriction.
   * If set, the scope must cover this specific type (or a broader scope that covers all types).
   * Example: "lead", "campaign", "booking"
   */
  entity_type?: string;
}
```

#### 4.4.3 Scope matching algorithm

```typescript
// src/auth/scopes.ts

/**
 * Check if a set of scopes authorizes a given operation.
 *
 * Algorithm:
 * 1. If scopes includes "admin" → always authorized.
 * 2. If scopes includes "tenant:*:{action}" or "tenant:*:write" (write implies read) → authorized.
 * 3. If scopes includes "tenant:{tenant_id}:{action}" or "tenant:{tenant_id}:write" → authorized.
 * 4. If entity_type is specified:
 *    a. If scopes includes "tenant:{tenant_id}:nodes:{entity_type}:{action}" → authorized.
 *    b. If scopes includes "tenant:{tenant_id}:nodes:{entity_type}:write" and action is "read" → authorized.
 * 5. Otherwise → denied.
 *
 * "write" scopes always imply "read" for the same scope path.
 *
 * @param scopes - The scopes from the validated JWT token.
 * @param required - The scope requirement for the current operation.
 * @returns true if the scopes authorize the operation.
 *
 * @example
 * hasScope(["tenant:T1:read"], { tenant_id: "T1", action: "read" })              // true
 * hasScope(["tenant:T1:write"], { tenant_id: "T1", action: "read" })             // true (write implies read)
 * hasScope(["tenant:T1:nodes:lead:write"], { tenant_id: "T1", action: "write", entity_type: "lead" }) // true
 * hasScope(["tenant:T1:nodes:lead:read"], { tenant_id: "T1", action: "write", entity_type: "lead" })  // false
 * hasScope(["tenant:*:read"], { tenant_id: "T1", action: "read" })               // true
 * hasScope(["admin"], { tenant_id: "T1", action: "write" })                      // true
 */
export function hasScope(
  scopes: string[],
  required: ScopeRequirement
): boolean {
  const { tenant_id, action, entity_type } = required;

  for (const scope of scopes) {
    // 1. Admin — full access
    if (scope === "admin") return true;

    // 2. Wildcard tenant — "tenant:*:{action}"
    if (scope === "tenant:*:write") return true; // write implies everything
    if (scope === "tenant:*:read" && action === "read") return true;

    // Parse scope segments: "tenant:{id}:{rest...}"
    const parts = scope.split(":");
    if (parts[0] !== "tenant") continue;

    const scopeTenantId = parts[1];
    if (scopeTenantId !== "*" && scopeTenantId !== tenant_id) continue;

    // 3. Tenant-level scope — "tenant:{id}:read" or "tenant:{id}:write"
    if (parts.length === 3) {
      const scopeAction = parts[2];
      if (scopeAction === "write") return true; // write implies read
      if (scopeAction === action) return true;
      continue;
    }

    // 4. Type-level scope — "tenant:{id}:nodes:{type}:{action}"
    if (parts.length === 5 && parts[2] === "nodes") {
      const scopeType = parts[3];
      const scopeAction = parts[4];

      // If no entity_type required, a type-specific scope does NOT satisfy a broad requirement.
      // The caller must have a tenant-level scope for untyped operations.
      if (!entity_type) continue;

      if (scopeType !== entity_type) continue;

      if (scopeAction === "write") return true; // write implies read
      if (scopeAction === action) return true;
    }
  }

  return false;
}

/**
 * Check if scopes grant access to ANY tenant for the given action.
 * Used by tools that auto-resolve tenant_id from the token (single-tenant tokens).
 */
export function hasScopeForAnyTenant(
  scopes: string[],
  action: "read" | "write"
): boolean {
  for (const scope of scopes) {
    if (scope === "admin") return true;
    if (scope === "tenant:*:write") return true;
    if (scope === `tenant:*:${action}`) return true;

    const parts = scope.split(":");
    if (parts[0] === "tenant" && parts.length >= 3) {
      const scopeAction = parts[2];
      if (scopeAction === "write") return true;
      if (scopeAction === action) return true;
    }
  }
  return false;
}
```

#### 4.4.4 Tool scope requirements

Every tool declares its minimum required scope. The `requireScope` helper is called at the start of
each tool handler, before any database access.

```typescript
// src/auth/scopes.ts

/**
 * Check scope and throw an MCP error if insufficient.
 * Call at the start of every tool handler.
 *
 * @throws MCP error with code -32003 (FORBIDDEN) if scope is insufficient.
 */
export function requireScope(
  scopes: string[],
  required: ScopeRequirement
): void {
  if (!hasScope(scopes, required)) {
    const neededScope = required.entity_type
      ? `tenant:${required.tenant_id}:nodes:${required.entity_type}:${required.action}`
      : `tenant:${required.tenant_id}:${required.action}`;

    throw {
      code: -32003,
      message: "Insufficient scope",
      data: {
        type: "FORBIDDEN",
        detail: `This operation requires scope "${neededScope}" or a broader scope that includes it.`,
        required_scope: neededScope,
        available_scopes: scopes,
      },
    };
  }
}
```

**Tool scope table:**

| Tool | Action | Entity type | Minimum scope example |
|---|---|---|---|
| `find_entities` | `read` | from `entity_types[0]` if provided | `tenant:{id}:read` or `tenant:{id}:nodes:{type}:read` |
| `store_entity` | `write` | from `entity_type` param | `tenant:{id}:nodes:{type}:write` |
| `connect_entities` | `write` | — (edge, not node-typed) | `tenant:{id}:write` |
| `explore_graph` | `read` | — | `tenant:{id}:read` (per-node check during traversal) |
| `remove_entity` | `write` | looked up from entity | `tenant:{id}:write` |
| `query_at_time` | `read` | looked up from entity | `tenant:{id}:read` |
| `get_timeline` | `read` | looked up from entity | `tenant:{id}:read` |
| `capture_thought` | `write` | — (multi-type, determined by LLM) | `tenant:{id}:write` |
| `get_schema` | `read` | — | `tenant:{id}:read` |
| `get_stats` | `read` | — | `tenant:{id}:read` |
| `propose_event` | `write` | — | `tenant:{id}:write` |
| `verify_lineage` | `read` | — | `tenant:{id}:read` |
| `store_blob` | `write` | — | `tenant:{id}:write` |
| `get_blob` | `read` | — | `tenant:{id}:read` |
| `lookup_dict` | `read` | — | `tenant:{id}:read` |

**Notes:**
- `find_entities` with `entity_types` param: if the token has a type-specific scope (e.g., `tenant:T1:nodes:lead:read`),
  results are filtered to only return entities of types the token can access. No error is raised for inaccessible types;
  they are silently excluded.
- `explore_graph`: scope is checked per-node during traversal. If a connected node is in a tenant the token cannot
  access, it is silently omitted from results (not an error). Cross-tenant nodes additionally require a grant check.
- `connect_entities`: requires `write` scope on the edge's `tenant_id`. For cross-tenant edges, also requires
  `read` scope on both source and target tenants (or grants — see 4.5).
- `capture_thought`: requires broad `write` scope because the LLM determines entity types dynamically. A type-specific
  write scope is not sufficient for `capture_thought`.

---

### 4.5 Grants consultation

#### 4.5.1 When to check grants

Grants are checked ONLY for cross-tenant operations — that is, when a tool call accesses data in a tenant
that is different from the token's primary tenant or from the edge's own tenant. Specifically:

1. **`explore_graph`** — When traversal encounters a node whose `tenant_id` differs from the starting node's tenant.
2. **`connect_entities`** — When `source_id` and `target_id` belong to different tenants.
3. **`find_entities`** — When results include nodes from multiple tenants (if the token's `tenant_ids` spans multiple tenants, cross-tenant results from the same search may reference granted nodes).

Grants are NOT checked for:
- Same-tenant operations (scopes are sufficient).
- `get_schema` / `get_stats` (always tenant-scoped, no cross-tenant).
- `store_entity` / `remove_entity` (always operate on a single tenant).
- `store_blob` / `get_blob` / `lookup_dict` (always tenant-scoped).

#### 4.5.2 Grant check algorithm

Both scopes AND grants must pass. The check order is:

```
1. Does the token have scope for the target tenant?
   YES → proceed to step 2
   NO  → Does a grant exist for this specific node/type?
          YES → proceed to step 2 (grant substitutes for scope on cross-tenant access)
          NO  → DENY (silently omit node, or return 403 for explicit operations)

2. Is the grant temporally valid?
   YES → ALLOW
   NO  → DENY
```

**Important clarification on scope + grant interaction:**
- For cross-tenant **traversal** (explore_graph), a grant can substitute for a missing scope. A token
  for tenant T1 can traverse into tenant T2 nodes if a TRAVERSE or READ grant exists from T2 to T1 for
  the target node or its type.
- For cross-tenant **explicit access** (connect_entities), the token MUST have scope for its own tenant,
  and a grant must exist for access to the other tenant's node.

#### 4.5.3 SQL query for grant check

```sql
-- Check if subject_tenant has a valid grant for object_node.
-- Called with: $1 = subject_tenant_id, $2 = object_node_id, $3 = required_capability, $4 = check_time
--
-- object_node_id can match either:
--   a) The specific node (for node-level grants)
--   b) The node's type_node_id (for type-level grants)
--
-- Capability hierarchy: WRITE > READ > TRAVERSE
-- A WRITE grant satisfies a READ requirement. A READ grant satisfies a TRAVERSE requirement.
SELECT EXISTS (
  SELECT 1
  FROM grants g
  WHERE g.subject_tenant_id = $1
    AND (
      g.object_node_id = $2                         -- direct node grant
      OR g.object_node_id = (                       -- type-level grant
        SELECT n.type_node_id
        FROM nodes n
        WHERE n.node_id = $2
          AND n.valid_to = 'infinity'
          AND n.is_deleted = false
        LIMIT 1
      )
    )
    AND (
      g.capability = $3                             -- exact capability match
      OR (g.capability = 'WRITE' AND $3 IN ('READ', 'TRAVERSE'))  -- WRITE > READ > TRAVERSE
      OR (g.capability = 'READ' AND $3 = 'TRAVERSE')              -- READ > TRAVERSE
    )
    AND g.valid_from <= $4
    AND g.valid_to > $4
) AS has_grant;
```

#### 4.5.4 TypeScript implementation

```typescript
// src/auth/grants.ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Capability levels with implicit hierarchy. */
export type GrantCapability = "READ" | "WRITE" | "TRAVERSE";

/**
 * Check if a cross-tenant grant exists allowing subject_tenant to access object_node.
 *
 * Uses the service-role Supabase client to bypass RLS (D-006), since the caller
 * may not have RLS access to the granting tenant's data.
 *
 * @param serviceClient - Supabase client with service-role key (bypasses RLS).
 * @param subjectTenantId - The tenant requesting access.
 * @param objectNodeId - The node being accessed.
 * @param requiredCapability - The minimum capability needed.
 * @param atTime - The point in time to check temporal validity. Default: now.
 * @returns true if a valid grant exists.
 */
export async function checkGrant(
  serviceClient: SupabaseClient,
  subjectTenantId: string,
  objectNodeId: string,
  requiredCapability: GrantCapability,
  atTime: Date = new Date()
): Promise<boolean> {
  const { data, error } = await serviceClient.rpc("check_grant", {
    p_subject_tenant_id: subjectTenantId,
    p_object_node_id: objectNodeId,
    p_capability: requiredCapability,
    p_at_time: atTime.toISOString(),
  });

  if (error) {
    // Log error but deny access on failure (fail-closed).
    console.error("Grant check failed:", error.message);
    return false;
  }

  return data === true;
}
```

#### 4.5.5 SQL function for grant checking (called via RPC)

```sql
-- RPC function for grant checking. Called from application layer via supabase.rpc().
-- Uses SECURITY DEFINER to bypass RLS (the caller may not have access to the
-- granting tenant's rows).
CREATE OR REPLACE FUNCTION check_grant(
  p_subject_tenant_id UUID,
  p_object_node_id UUID,
  p_capability TEXT,
  p_at_time TIMESTAMPTZ DEFAULT now()
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM grants g
    WHERE g.subject_tenant_id = p_subject_tenant_id
      AND (
        g.object_node_id = p_object_node_id
        OR g.object_node_id = (
          SELECT n.type_node_id
          FROM nodes n
          WHERE n.node_id = p_object_node_id
            AND n.valid_to = 'infinity'
            AND n.is_deleted = false
          LIMIT 1
        )
      )
      AND (
        g.capability = p_capability
        OR (g.capability = 'WRITE' AND p_capability IN ('READ', 'TRAVERSE'))
        OR (g.capability = 'READ' AND p_capability = 'TRAVERSE')
      )
      AND g.valid_from <= p_at_time
      AND g.valid_to > p_at_time
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION check_grant IS
  'Check if a cross-tenant grant exists. SECURITY DEFINER to bypass RLS. '
  'Capability hierarchy: WRITE > READ > TRAVERSE. '
  'Checks both direct node grants and type-level grants.';
```

#### 4.5.6 Grant temporal validity

Grants have `valid_from` and `valid_to` timestamps. The grant check includes a temporal predicate:

```sql
g.valid_from <= $check_time AND g.valid_to > $check_time
```

This means:
- Grants can be pre-dated (set `valid_from` in the future to schedule access).
- Grants can be revoked by setting `valid_to` to the revocation time (creates a new event, inserts a new grant row with `valid_to` set).
- A grant with `valid_to = 'infinity'` is perpetually valid until explicitly revoked.
- Grant revocation takes effect immediately (no token re-issue needed) because grants are checked at query time, not cached in the JWT.

---

### 4.6 Audit events

#### 4.6.1 Audit principle

Every tool call creates an audit event in the `events` table, regardless of whether the call succeeds or fails.
This provides a complete audit trail of all MCP server interactions.

Audit events are **non-blocking** — they are emitted as fire-and-forget after the tool response is sent.
A failed audit write does not cause the tool call to fail.

#### 4.6.2 Audit event structure

```typescript
// src/auth/audit.ts

/** Audit event payload for tool invocations. */
export interface AuditEventPayload {
  /** The MCP tool that was invoked. */
  tool_name: string;

  /** Hash of the tool parameters (SHA-256 of JSON-serialized params). Privacy-safe. */
  params_hash: string;

  /** Result status of the tool call. */
  result_status: "success" | "denied" | "error";

  /** If denied: the reason. */
  denial_reason?: string;

  /** If denied: the scope that was required but missing. */
  required_scope?: string;

  /** If error: the error code. */
  error_code?: string;

  /** Token type used for this call. */
  token_type: "user_token" | "agent_token" | "partner_token";

  /** Duration of the tool call in milliseconds. */
  duration_ms: number;

  /** Tenant IDs involved in this operation. */
  tenant_ids_involved: string[];

  /** Whether this was a cross-tenant operation. */
  is_cross_tenant: boolean;
}
```

#### 4.6.3 Audit event creation

```typescript
// src/auth/audit.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "./types.ts";

/**
 * Emit an audit event for a tool call. Non-blocking.
 *
 * Creates an event with intent_type = "tool_invoked" in the events table.
 * Uses the first tenant_id from the involved tenants as the event's tenant_id.
 *
 * Fire-and-forget: errors are logged but do not propagate.
 */
export function emitAuditEvent(
  serviceClient: SupabaseClient,
  claims: AuthClaims,
  payload: AuditEventPayload
): void {
  // Use the first tenant_id from the token as the event's owning tenant.
  // For cross-tenant operations, the audit event is owned by the caller's primary tenant.
  const tenantId = claims.tenant_ids[0];

  // Fire and forget — do not await.
  serviceClient
    .from("events")
    .insert({
      tenant_id: tenantId,
      intent_type: "tool_invoked",
      payload: payload as unknown as Record<string, unknown>,
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      created_by: claims.sub,
      node_ids: [],
      edge_ids: [],
    })
    .then(({ error }) => {
      if (error) {
        console.error("Audit event write failed:", error.message);
      }
    });
}

/**
 * Compute a SHA-256 hash of tool parameters for audit logging.
 * Hashing preserves privacy while enabling correlation.
 */
export async function hashParams(
  params: Record<string, unknown>
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(params));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

#### 4.6.4 Audit middleware pattern

The audit event is emitted by a wrapper around each tool handler:

```typescript
// src/tools/wrapper.ts

import { emitAuditEvent, hashParams, type AuditEventPayload } from "../auth/audit.ts";
import { requireScope, type ScopeRequirement } from "../auth/scopes.ts";
import type { AuthClaims } from "../auth/types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wraps a tool handler with scope checking and audit event emission.
 *
 * @param toolName - The MCP tool name.
 * @param scopeResolver - Function that computes the required scope from the tool's params.
 * @param handler - The actual tool implementation.
 * @returns A wrapped handler that adds auth + audit.
 */
export function withAuth<TParams extends Record<string, unknown>, TResult>(
  toolName: string,
  scopeResolver: (params: TParams, claims: AuthClaims) => ScopeRequirement,
  handler: (params: TParams, claims: AuthClaims, client: SupabaseClient) => Promise<TResult>
): (params: TParams, claims: AuthClaims, serviceClient: SupabaseClient) => Promise<TResult> {
  return async (params, claims, serviceClient) => {
    const startTime = performance.now();
    let resultStatus: AuditEventPayload["result_status"] = "success";
    let denialReason: string | undefined;
    let requiredScopeStr: string | undefined;
    let errorCode: string | undefined;

    try {
      // Resolve and check scope
      const required = scopeResolver(params, claims);
      try {
        requireScope(claims.scopes, required);
      } catch (scopeError: unknown) {
        resultStatus = "denied";
        const err = scopeError as { data?: { required_scope?: string; detail?: string } };
        requiredScopeStr = err.data?.required_scope;
        denialReason = err.data?.detail;
        throw scopeError;
      }

      // Execute tool
      return await handler(params, claims, serviceClient);
    } catch (err: unknown) {
      if (resultStatus !== "denied") {
        resultStatus = "error";
        const mcpErr = err as { code?: number; message?: string };
        errorCode = String(mcpErr.code ?? "UNKNOWN");
      }
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      const paramsHashValue = await hashParams(params);

      // Determine involved tenants
      const involvedTenants = new Set(claims.tenant_ids);
      if ("tenant_id" in params && typeof params.tenant_id === "string") {
        involvedTenants.add(params.tenant_id);
      }
      const involvedArray = [...involvedTenants];

      emitAuditEvent(serviceClient, claims, {
        tool_name: toolName,
        params_hash: paramsHashValue,
        result_status: resultStatus,
        denial_reason: denialReason,
        required_scope: requiredScopeStr,
        error_code: errorCode,
        token_type: claims.token_type,
        duration_ms: Math.round(duration),
        tenant_ids_involved: involvedArray,
        is_cross_tenant: involvedArray.length > 1,
      });
    }
  };
}
```

---

### 4.7 Permission matrix

The complete permission matrix for all 15 tools across all 4 Pettson agent roles.

**Legend:**
- `ALLOW` — Operation succeeds.
- `DENY` — Returns MCP error -32003 (Insufficient scope).
- `FILTERED` — Operation succeeds but results are filtered to accessible entities only. Inaccessible entities are silently omitted.
- `GRANT-DEP` — Allowed only if a corresponding grant exists in the grants table.

**Tenant UUIDs:**
- T1 = Taylor Events (`10000000-0000-7000-8000-000000000002`)
- T2 = Mountain Cabins (`10000000-0000-7000-8000-000000000003`)
- T3 = Nordic Tickets (`10000000-0000-7000-8000-000000000004`)

#### 4.7.1 Sales agent

Scopes: `tenant:T1:read`, `tenant:T3:read`, `tenant:T2:read`, `tenant:T1:nodes:lead:write`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` | ALLOW | ALLOW | ALLOW | FILTERED (results from all 3) |
| `store_entity` (lead) | ALLOW | DENY | DENY | — |
| `store_entity` (campaign) | DENY | DENY | DENY | — |
| `connect_entities` | DENY (no broad write) | DENY | DENY | DENY |
| `explore_graph` | ALLOW | ALLOW | ALLOW | GRANT-DEP |
| `remove_entity` | DENY (no broad write) | DENY | DENY | — |
| `query_at_time` | ALLOW | ALLOW | ALLOW | — |
| `get_timeline` | ALLOW | ALLOW | ALLOW | — |
| `capture_thought` | DENY (needs broad write) | DENY | DENY | — |
| `get_schema` | ALLOW | ALLOW | ALLOW | — |
| `get_stats` | ALLOW | ALLOW | ALLOW | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` | ALLOW | ALLOW | ALLOW | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | ALLOW | ALLOW | ALLOW | — |
| `lookup_dict` | ALLOW | ALLOW | ALLOW | — |

**Notes:**
- `store_entity(entity_type="lead")` in T1 is ALLOW because `tenant:T1:nodes:lead:write` covers it.
- `store_entity(entity_type="campaign")` in T1 is DENY because the scope is limited to leads.
- `capture_thought` requires broad `tenant:{id}:write` because entity types are determined dynamically.
- `connect_entities` requires broad write scope (not type-specific) because edges are not node-typed.

#### 4.7.2 Content agent

Scopes: `tenant:T1:nodes:campaign:write`, `tenant:T1:nodes:campaign:read`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` (campaigns) | ALLOW | DENY | DENY | — |
| `find_entities` (leads) | DENY | DENY | DENY | — |
| `find_entities` (no type filter) | DENY (type-specific scope cannot satisfy untyped read) | DENY | DENY | — |
| `store_entity` (campaign) | ALLOW | DENY | DENY | — |
| `store_entity` (lead) | DENY | DENY | DENY | — |
| `connect_entities` | DENY | DENY | DENY | — |
| `explore_graph` | DENY (no broad read) | DENY | DENY | — |
| `remove_entity` (campaign) | DENY (remove needs broad write) | DENY | DENY | — |
| `query_at_time` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `get_timeline` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `capture_thought` | DENY | DENY | DENY | — |
| `get_schema` | DENY | DENY | DENY | — |
| `get_stats` | DENY | DENY | DENY | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` (campaign) | ALLOW (if entity is a campaign) | DENY | DENY | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | DENY | DENY | DENY | — |
| `lookup_dict` | DENY | DENY | DENY | — |

**Notes:**
- The content agent has the most restrictive scope. It can only read and write campaigns in T1.
- `find_entities` without `entity_types` filter is DENY because a type-specific scope cannot satisfy a broad tenant-level read requirement. The agent must specify `entity_types: ["campaign"]` to get results.
- `remove_entity` requires broad write scope (`tenant:{id}:write`) even for campaigns because removal is a structural operation, not a type-specific one.
- `explore_graph` requires broad read scope for traversal safety — traversal may encounter any entity type.

#### 4.7.3 Booking agent

Scopes: `tenant:T2:write`, `tenant:T3:read`

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` | DENY | ALLOW | ALLOW | FILTERED (T2 + T3) |
| `store_entity` | DENY | ALLOW | DENY | — |
| `connect_entities` | DENY | ALLOW | DENY | GRANT-DEP (T2→T3) |
| `explore_graph` | DENY | ALLOW | ALLOW | GRANT-DEP |
| `remove_entity` | DENY | ALLOW | DENY | — |
| `query_at_time` | DENY | ALLOW | ALLOW | — |
| `get_timeline` | DENY | ALLOW | ALLOW | — |
| `capture_thought` | DENY | ALLOW | DENY | — |
| `get_schema` | DENY | ALLOW | ALLOW | — |
| `get_stats` | DENY | ALLOW | ALLOW | — |
| `propose_event` | DENY | ALLOW | DENY | — |
| `verify_lineage` | DENY | ALLOW | ALLOW | — |
| `store_blob` | DENY | ALLOW | DENY | — |
| `get_blob` | DENY | ALLOW | ALLOW | — |
| `lookup_dict` | DENY | ALLOW | ALLOW | — |

**Notes:**
- `capture_thought` is ALLOW for T2 because `tenant:T2:write` is a broad write scope.
- `connect_entities` for a cross-tenant edge (e.g., booking→package) requires write scope on the edge's tenant (T2) plus a grant from T3 for the package node.

#### 4.7.4 Partner travel agency

Scopes: `tenant:T3:nodes:package:read`, `tenant:T2:nodes:property:read`
Token type: `partner_token` (30-day lifetime, non-refreshable)

| Tool | T1 context | T2 context | T3 context | Cross-tenant |
|---|---|---|---|---|
| `find_entities` (packages) | DENY | DENY | ALLOW | — |
| `find_entities` (properties) | DENY | ALLOW | DENY | — |
| `find_entities` (no type filter) | DENY | DENY | DENY | — |
| `store_entity` | DENY | DENY | DENY | — |
| `connect_entities` | DENY | DENY | DENY | — |
| `explore_graph` | DENY | DENY | DENY | — |
| `remove_entity` | DENY | DENY | DENY | — |
| `query_at_time` (package) | DENY | DENY | ALLOW | — |
| `query_at_time` (property) | DENY | ALLOW | DENY | — |
| `get_timeline` (package) | DENY | DENY | ALLOW | — |
| `get_timeline` (property) | DENY | ALLOW | DENY | — |
| `capture_thought` | DENY | DENY | DENY | — |
| `get_schema` | DENY | DENY | DENY | — |
| `get_stats` | DENY | DENY | DENY | — |
| `propose_event` | DENY | DENY | DENY | — |
| `verify_lineage` (package) | DENY | DENY | ALLOW | — |
| `verify_lineage` (property) | DENY | ALLOW | DENY | — |
| `store_blob` | DENY | DENY | DENY | — |
| `get_blob` | DENY | DENY | DENY | — |
| `lookup_dict` | DENY | DENY | DENY | — |

**Notes:**
- Partner tokens are the most restricted. Read-only, type-specific, no structural operations.
- All write operations are DENY regardless of scope because the token only has read scopes.
- `explore_graph` is DENY because traversal requires broad read scope.
- `get_schema` is DENY because it requires broad tenant-level read scope.

#### 4.7.5 Acceptance test coverage

| Test | Agent | Auth assertion |
|---|---|---|
| T01 | sales_agent | Cross-tenant search — results from T1+T2+T3, filtered by scopes + grants |
| T02 | content_agent | `store_entity(campaign)` in T1 — ALLOW |
| T03 | content_agent | `find_entities(entity_types=["lead"])` — DENY (no lead read scope) |
| T04 | booking_agent | `explore_graph` cross-tenant — ALLOW with TRAVERSE grant |
| T05 | partner_travel_agency | `store_entity` — DENY (read-only token) |
| T06 | any | Audit event created for every tool call |

---

### 4.8 Error responses

All auth errors use the JSON-RPC 2.0 error format as required by the MCP specification.
Auth errors use custom error codes in the range -32001 to -32003.

#### 4.8.1 Error code registry

| HTTP Status | JSON-RPC Code | Type | When |
|---|---|---|---|
| 401 | -32001 | `UNAUTHENTICATED` | No Authorization header or malformed Bearer token |
| 401 | -32001 | `TOKEN_EXPIRED` | JWT `exp` claim is in the past |
| 401 | -32001 | `TOKEN_INVALID` | JWT signature verification failed, or `iss`/`aud` mismatch |
| 401 | -32001 | `INVALID_CLAIMS` | Token is valid but missing required claims (`tenant_ids`) |
| 403 | -32003 | `FORBIDDEN` | Valid token but insufficient scope for the requested operation |
| 403 | -32003 | `GRANT_DENIED` | Valid token and scope, but no cross-tenant grant exists |

#### 4.8.2 401 Unauthorized — missing/invalid/expired token

All 401 responses include a `WWW-Authenticate` header pointing to the PRM endpoint so the client
can discover the Authorization Server.

**Missing token:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication required",
    "data": {
      "type": "UNAUTHENTICATED",
      "detail": "Missing or malformed Authorization header. Expected: Bearer <token>",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp"
Content-Type: application/json
```

**Expired token:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication failed",
    "data": {
      "type": "TOKEN_EXPIRED",
      "detail": "Token has expired. Obtain a new token from the authorization server.",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp", error="invalid_token", error_description="Token has expired."
Content-Type: application/json
```

**Invalid token (signature, issuer, or audience failure):**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication failed",
    "data": {
      "type": "TOKEN_INVALID",
      "detail": "Token validation failed: signature verification failed",
      "prm_url": "https://<host>/.well-known/oauth-protected-resource"
    }
  },
  "id": null
}
```

HTTP headers:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource="https://<host>", realm="resonansia-mcp", error="invalid_token", error_description="Token validation failed: signature verification failed"
Content-Type: application/json
```

#### 4.8.3 403 Forbidden — insufficient scope

403 responses include the required scope so the MCP client (or agent) can understand what permission
is needed and potentially request a re-scoped token.

**Insufficient scope:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32003,
    "message": "Insufficient scope",
    "data": {
      "type": "FORBIDDEN",
      "detail": "This operation requires scope \"tenant:10000000-0000-7000-8000-000000000002:nodes:lead:read\" or a broader scope that includes it.",
      "required_scope": "tenant:10000000-0000-7000-8000-000000000002:nodes:lead:read",
      "available_scopes": [
        "tenant:10000000-0000-7000-8000-000000000002:nodes:campaign:write",
        "tenant:10000000-0000-7000-8000-000000000002:nodes:campaign:read"
      ]
    }
  },
  "id": "req-123"
}
```

**Cross-tenant grant denied:**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32003,
    "message": "Cross-tenant access denied",
    "data": {
      "type": "GRANT_DENIED",
      "detail": "No active grant allows tenant 10000000-0000-7000-8000-000000000002 to READ node 40000000-0000-7000-8000-000000000005 in tenant 10000000-0000-7000-8000-000000000003.",
      "subject_tenant_id": "10000000-0000-7000-8000-000000000002",
      "object_node_id": "40000000-0000-7000-8000-000000000005",
      "required_capability": "READ"
    }
  },
  "id": "req-456"
}
```

#### 4.8.4 Error response type

```typescript
// src/auth/errors.ts

/** MCP-compatible auth error structure. */
export interface AuthError {
  code: number;
  message: string;
  data: {
    type: "UNAUTHENTICATED" | "TOKEN_EXPIRED" | "TOKEN_INVALID" | "INVALID_CLAIMS" | "FORBIDDEN" | "GRANT_DENIED";
    detail: string;
    prm_url?: string;
    required_scope?: string;
    available_scopes?: string[];
    subject_tenant_id?: string;
    object_node_id?: string;
    required_capability?: string;
  };
}

/**
 * Create a standardized auth error for MCP JSON-RPC responses.
 */
export function createAuthError(
  type: AuthError["data"]["type"],
  detail: string,
  extra?: Partial<AuthError["data"]>
): AuthError {
  const isUnauth = ["UNAUTHENTICATED", "TOKEN_EXPIRED", "TOKEN_INVALID", "INVALID_CLAIMS"].includes(type);
  return {
    code: isUnauth ? -32001 : -32003,
    message: isUnauth ? "Authentication failed" : "Insufficient permissions",
    data: {
      type,
      detail,
      ...extra,
    },
  };
}
```

#### 4.8.5 Error behavior summary

| Scenario | HTTP | Error code | Self-correction hint |
|---|---|---|---|
| No `Authorization` header | 401 | -32001 | `prm_url` to discover AS |
| `Authorization: Bearer <malformed>` | 401 | -32001 | `prm_url` to discover AS |
| Token signature invalid | 401 | -32001 | "Token validation failed" — re-obtain token |
| Token expired | 401 | -32001 | "Token has expired" — re-obtain token |
| Token missing `tenant_ids` | 401 | -32001 | "No tenant_ids claim" — request token with tenant access |
| Valid token, wrong tenant | 403 | -32003 | `required_scope` tells agent what scope to request |
| Valid token, wrong entity type | 403 | -32003 | `required_scope` shows the type-specific scope needed |
| Valid token, no cross-tenant grant | 403 | -32003 | `subject_tenant_id`, `object_node_id`, `required_capability` — agent can explain to user what access is needed |
| Valid token, write on read-only | 403 | -32003 | `required_scope` ends in `:write`, agent sees it needs write access |

All error messages are designed to enable **agent self-correction** (design principle 6 from gen0 section 3.1).
An MCP agent receiving a 403 can inspect the `required_scope` and either adjust its request or explain to the
user what permission is needed.
