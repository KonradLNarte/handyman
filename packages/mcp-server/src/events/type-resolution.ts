/**
 * Type resolution — maps entity_type name to type_node_id.
 * Also validates data against label_schema if present.
 * Spec §3.4 pre_validate.
 */
import type { PGlite } from '../db/connection.js';
import { SYSTEM_TENANT_ID, METATYPE_ID } from '../db/migrate.js';
import { McpError } from '../errors.js';

export interface ResolvedType {
  typeNodeId: string;
  labelSchema: Record<string, unknown> | null;
}

/**
 * Resolve an entity type name to its type_node_id.
 * Searches the given tenant + system tenant.
 */
export async function resolveEntityType(
  db: PGlite,
  tenantId: string,
  entityType: string,
): Promise<ResolvedType> {
  const result = await db.query<{
    node_id: string;
    label_schema: Record<string, unknown> | null;
  }>(
    `SELECT node_id, data->'label_schema' AS label_schema
     FROM nodes
     WHERE (tenant_id = $1 OR tenant_id = $2)
       AND type_node_id = $3
       AND data->>'name' = $4
       AND data->>'kind' = 'entity_type'
       AND is_deleted = false
       AND valid_to = 'infinity'
     LIMIT 1`,
    [tenantId, SYSTEM_TENANT_ID, METATYPE_ID, entityType],
  );

  if (result.rows.length === 0) {
    throw McpError.validationError(`Invalid entity_type: '${entityType}'`);
  }

  return {
    typeNodeId: result.rows[0]!.node_id,
    labelSchema: result.rows[0]!.label_schema,
  };
}

/**
 * Resolve an edge type name to its type_node_id.
 * Edge types live in the system tenant.
 */
export async function resolveEdgeType(
  db: PGlite,
  tenantId: string,
  edgeType: string,
): Promise<string> {
  const result = await db.query<{ node_id: string }>(
    `SELECT node_id
     FROM nodes
     WHERE (tenant_id = $1 OR tenant_id = $2)
       AND type_node_id = $3
       AND data->>'name' = $4
       AND data->>'kind' = 'edge_type'
       AND is_deleted = false
       AND valid_to = 'infinity'
     LIMIT 1`,
    [tenantId, SYSTEM_TENANT_ID, METATYPE_ID, edgeType],
  );

  if (result.rows.length === 0) {
    throw McpError.validationError(`Invalid edge_type: '${edgeType}'`);
  }

  return result.rows[0]!.node_id;
}

/**
 * Get entity type name from type_node_id.
 */
export async function getTypeName(
  db: PGlite,
  typeNodeId: string,
): Promise<string> {
  const result = await db.query<{ name: string }>(
    `SELECT data->>'name' AS name
     FROM nodes
     WHERE node_id = $1
       AND is_deleted = false
       AND valid_to = 'infinity'
     LIMIT 1`,
    [typeNodeId],
  );

  return result.rows[0]?.name ?? 'unknown';
}

/**
 * Validate data against a JSON Schema (simplified validation).
 * Checks required fields and basic type matching.
 * [FEEDBACK:gen1-impl] Full JSON Schema validation deferred — using simplified checks.
 */
export function validateSchema(
  data: Record<string, unknown>,
  schema: Record<string, unknown>,
  entityType: string,
): void {
  const errors: string[] = [];

  // Check required fields
  const required = schema.required as string[] | undefined;
  if (required) {
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check property types (basic validation)
  const properties = schema.properties as
    | Record<string, { type?: string }>
    | undefined;
  if (properties) {
    for (const [key, propSchema] of Object.entries(properties)) {
      const value = data[key];
      if (value === undefined || value === null) continue;

      if (propSchema.type === 'string' && typeof value !== 'string') {
        errors.push(`Field '${key}' must be a string`);
      }
      if (propSchema.type === 'number' && typeof value !== 'number') {
        errors.push(`Field '${key}' must be a number`);
      }
      if (propSchema.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) {
        errors.push(`Field '${key}' must be an integer`);
      }
      if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field '${key}' must be a boolean`);
      }
      if (propSchema.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${key}' must be an array`);
      }
    }
  }

  if (errors.length > 0) {
    throw McpError.schemaViolation(entityType, errors);
  }
}
