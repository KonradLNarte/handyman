import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

export interface Label {
  id: number;
  tenant_id: string | null;
  domain: string;
  code: string;
  parent_id: number | null;
  sort_order: number;
  is_system: boolean;
}

let cachedLabels: Label[] | null = null;
let cacheKey: string | null = null;

/**
 * Loads platform labels (tenant_id IS NULL) + tenant-specific labels.
 * Tenant labels override platform labels on same domain+code.
 */
export async function loadLabels(
  db: PgDatabase<any>,
  tenantId?: string
): Promise<Label[]> {
  const key = tenantId ?? "__platform__";
  if (cachedLabels && cacheKey === key) {
    return cachedLabels;
  }

  const result = await db.execute(sql`
    SELECT id, tenant_id, domain, code, parent_id, sort_order, is_system
    FROM labels
    WHERE tenant_id IS NULL
    ${tenantId ? sql`OR tenant_id = ${tenantId}` : sql``}
    ORDER BY domain, sort_order
  `);

  const allLabels = (Array.isArray(result) ? result : result.rows) as Label[];

  // Tenant labels override platform labels on same domain+code
  const labelMap = new Map<string, Label>();
  for (const label of allLabels) {
    const key = `${label.domain}:${label.code}`;
    const existing = labelMap.get(key);
    // Tenant-specific label overrides platform label
    if (!existing || (label.tenant_id !== null && existing.tenant_id === null)) {
      labelMap.set(key, label);
    }
  }

  cachedLabels = Array.from(labelMap.values());
  cacheKey = key;
  return cachedLabels;
}

/**
 * Cached lookup. Returns the SmallInt id for a given domain+code.
 * Throws if not found.
 */
export async function getLabelId(
  db: PgDatabase<any>,
  domain: string,
  code: string,
  tenantId?: string
): Promise<number> {
  const labels = await loadLabels(db, tenantId);
  const label = labels.find((l) => l.domain === domain && l.code === code);
  if (!label) {
    throw new Error(`Label not found: ${domain}:${code}`);
  }
  return label.id;
}

/**
 * Reverse lookup from id to domain+code.
 */
export async function getLabelCode(
  db: PgDatabase<any>,
  id: number,
  tenantId?: string
): Promise<{ domain: string; code: string }> {
  const labels = await loadLabels(db, tenantId);
  const label = labels.find((l) => l.id === id);
  if (!label) {
    throw new Error(`Label not found for id: ${id}`);
  }
  return { domain: label.domain, code: label.code };
}

/**
 * Clears the label cache. Call when labels are modified.
 */
export function clearLabelCache() {
  cachedLabels = null;
  cacheKey = null;
}
