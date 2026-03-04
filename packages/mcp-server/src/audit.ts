/**
 * Audit logging — JSON to stdout.
 * Every tool call and auth event is logged for compliance.
 */

export interface AuditEntry {
  timestamp: string;
  event: string;
  tenant_id?: string;
  actor_id?: string;
  tool?: string;
  params?: Record<string, unknown>;
  result_summary?: string;
  error?: string;
  duration_ms?: number;
}

export function auditLog(entry: AuditEntry): void {
  const line = JSON.stringify({
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  });
  console.log(`[AUDIT] ${line}`);
}
