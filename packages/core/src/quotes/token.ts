import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.QUOTE_TOKEN_SECRET || "resonansia-quote-token-secret-change-me";
const DEFAULT_EXPIRY_DAYS = 30;

interface TokenPayload {
  projectId: string;
  tenantId: string;
  exp: number; // Unix timestamp
}

/**
 * Generates a signed token that grants read-only access to a specific quote.
 * No auth session required — possession = access to view this quote.
 *
 * INVARIANT token_expiry: tokens expire after the specified period.
 * The token MUST NOT contain sensitive data.
 */
export function generateQuoteToken(
  projectId: string,
  tenantId: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const payload: TokenPayload = { projectId, tenantId, exp };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(data);
  return `${data}.${signature}`;
}

/**
 * Verifies a quote token's signature and expiry.
 * Returns the payload if valid, null otherwise.
 */
export function verifyQuoteToken(
  token: string
): { projectId: string; tenantId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = sign(data);

  // Timing-safe comparison
  try {
    const sigBuf = Buffer.from(signature, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload: TokenPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return { projectId: payload.projectId, tenantId: payload.tenantId };
  } catch {
    return null;
  }
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}
