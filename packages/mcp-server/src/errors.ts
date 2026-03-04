/**
 * Error model — spec §3.5 error codes.
 */
export class McpError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'McpError';
  }

  toJSON() {
    return {
      error_code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  // Factory methods per spec error codes
  static validationError(detail: string) {
    return new McpError('VALIDATION_ERROR', detail, 400);
  }

  static notFound(resourceType: string, id: string) {
    return new McpError('NOT_FOUND', `${resourceType} ${id} not found`, 404, {
      resource_type: resourceType,
      id,
    });
  }

  static authDenied(reason: string) {
    return new McpError('AUTH_DENIED', reason, 403);
  }

  static conflict(entityId: string, expected: string, actual: string) {
    return new McpError(
      'CONFLICT',
      `Version conflict on ${entityId}: expected ${expected}, got ${actual}`,
      409,
      { entity_id: entityId, expected_version: expected, actual_version: actual },
    );
  }

  static crossTenantDenied(
    capability: string,
    nodeId: string,
    tenantId: string,
  ) {
    return new McpError(
      'CROSS_TENANT_DENIED',
      `No ${capability} grant for node ${nodeId} from tenant ${tenantId}`,
      403,
      { capability, node_id: nodeId, tenant_id: tenantId },
    );
  }

  static schemaViolation(entityType: string, errors: string[]) {
    return new McpError(
      'SCHEMA_VIOLATION',
      `Data does not match schema for ${entityType}: ${errors.join(', ')}`,
      400,
      { entity_type: entityType, errors },
    );
  }

  static extractionFailed(reason: string) {
    return new McpError('EXTRACTION_FAILED', reason, 500);
  }

  static rateLimited(retryAfterSeconds: number) {
    return new McpError('RATE_LIMITED', 'Rate limit exceeded', 429, {
      retry_after: retryAfterSeconds,
    });
  }

  static internalError(message: string, ref?: string) {
    return new McpError('INTERNAL_ERROR', message, 500, ref ? { ref } : undefined);
  }
}
