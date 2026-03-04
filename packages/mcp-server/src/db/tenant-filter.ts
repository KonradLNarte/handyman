/**
 * Tenant isolation SQL helpers.
 * [FEEDBACK:gen1-impl] No RLS — all tenant filtering is application-level.
 */

/**
 * Get the current active version of a node.
 */
export const CURRENT_NODE_SQL = `
  SELECT node_id, tenant_id, type_node_id, data, epistemic, valid_from, embedding
  FROM nodes
  WHERE node_id = $1
    AND is_deleted = false
    AND valid_to = 'infinity'
  LIMIT 1
`;

/**
 * Get the current active version of a node with tenant isolation.
 */
export const CURRENT_NODE_TENANT_SQL = `
  SELECT node_id, tenant_id, type_node_id, data, epistemic, valid_from, embedding
  FROM nodes
  WHERE node_id = $1
    AND tenant_id = $2
    AND is_deleted = false
    AND valid_to = 'infinity'
  LIMIT 1
`;

/**
 * Get an active edge by ID.
 */
export const CURRENT_EDGE_SQL = `
  SELECT edge_id, tenant_id, type_node_id, source_id, target_id, data
  FROM edges
  WHERE edge_id = $1
    AND is_deleted = false
    AND valid_to = 'infinity'
  LIMIT 1
`;

/**
 * Count versions of a node (for monotonic version number).
 */
export const VERSION_COUNT_SQL = `
  SELECT COUNT(*)::int AS version_count
  FROM nodes
  WHERE node_id = $1
`;
