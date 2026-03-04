/**
 * Cross-tenant grant verification — spec §4.5.
 * Grants are checked for cross-tenant edge traversal operations.
 */
import type { PGlite } from '../db/connection.js';

/**
 * Check if a subject tenant has a specific capability on a node.
 * Capability: 'READ' | 'WRITE' | 'TRAVERSE'
 */
export async function checkGrant(
  db: PGlite,
  subjectTenantId: string,
  objectNodeId: string,
  capability: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM grants
     WHERE subject_tenant_id = $1
       AND object_node_id = $2
       AND capability = $3
       AND is_deleted = false
       AND valid_to > now()
       AND valid_from <= now()`,
    [subjectTenantId, objectNodeId, capability],
  );
  return result.rows.length > 0;
}
