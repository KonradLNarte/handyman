/**
 * 3-tier deduplication — spec §3.2.
 * Tier 1: Exact data match
 * Tier 2: Embedding similarity (>0.9)
 * Tier 3: LLM disambiguation (future — skipped in gen1)
 * [FEEDBACK:gen1-impl] Tier 3 LLM disambiguation deferred.
 */
import type { PGlite } from '../db/connection.js';

export interface DeduplicationResult {
  match: { nodeId: string; similarity: number } | null;
  tier: 'exact' | 'embedding' | 'none';
}

/**
 * Check for duplicate entities.
 * Tier 1: Exact name match within same type and tenant.
 * Tier 2: Embedding similarity (placeholder — requires vectors).
 */
export async function deduplicateEntity(
  db: PGlite,
  tenantId: string,
  typeNodeId: string,
  data: Record<string, unknown>,
): Promise<DeduplicationResult> {
  // Tier 1: Exact match on name field
  const name = data.name as string | undefined;
  if (name) {
    const exact = await db.query<{ node_id: string }>(
      `SELECT node_id FROM nodes
       WHERE tenant_id = $1
         AND type_node_id = $2
         AND data->>'name' = $3
         AND is_deleted = false
         AND valid_to = 'infinity'
       LIMIT 1`,
      [tenantId, typeNodeId, name],
    );

    if (exact.rows.length > 0) {
      return {
        match: { nodeId: exact.rows[0]!.node_id, similarity: 1.0 },
        tier: 'exact',
      };
    }
  }

  // Tier 2: Embedding similarity
  // [FEEDBACK:gen1-impl] Embedding-based dedup requires populated vector columns.
  // Skipped when embeddings haven't been generated yet.

  return { match: null, tier: 'none' };
}
