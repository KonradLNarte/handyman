import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { countTokens } from "@anthropic-ai/tokenizer";
import { getLabelId } from "../labels";

const TOKEN_BUDGETS = {
  L1_PLATFORM: 500,
  L2_TENANT: 1000,
  L3_PROJECT: 2000,
  L4_DETAIL: 4000,
  L5_HISTORY: 2000,
} as const;

/**
 * Builds hierarchical AI context for a project, respecting token budgets.
 *
 * Levels (from docs/resonansia-spec.md section 5.1):
 * L1: Platform context (industry rules, label definitions)
 * L2: Tenant context (org info, product catalog summary)
 * L3: Project context (description, photos, address, scope)
 * L4: Detail context (events, assigned persons, quotes)
 * L5: History (similar past projects, if available)
 */
export async function buildProjectContext(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  purpose: string
): Promise<string> {
  const sections: string[] = [];

  // L1: Platform context
  const l1 = buildL1Context(purpose);
  sections.push(truncateToTokenBudget(l1, TOKEN_BUDGETS.L1_PLATFORM, "L1 Platform"));

  // L2: Tenant context
  const l2 = await buildL2Context(db, tenantId);
  sections.push(truncateToTokenBudget(l2, TOKEN_BUDGETS.L2_TENANT, "L2 Tenant"));

  // L3: Project context
  const l3 = await buildL3Context(db, tenantId, projectId);
  sections.push(truncateToTokenBudget(l3, TOKEN_BUDGETS.L3_PROJECT, "L3 Project"));

  // L4: Detail context
  const l4 = await buildL4Context(db, tenantId, projectId);
  sections.push(truncateToTokenBudget(l4, TOKEN_BUDGETS.L4_DETAIL, "L4 Detail"));

  // L5: History
  const l5 = await buildL5Context(db, tenantId, projectId);
  sections.push(truncateToTokenBudget(l5, TOKEN_BUDGETS.L5_HISTORY, "L5 History"));

  return sections.filter(Boolean).join("\n\n");
}

function buildL1Context(purpose: string): string {
  return `## Platform Context
Purpose: ${purpose}
Industry: Swedish construction and renovation
Currency: SEK
VAT: 25% standard rate
ROT deduction: 30% of labor, max 50,000 SEK/person/year
RUT deduction: 50% of labor, max 75,000 SEK/person/year
Units: hour, sqm (square meter), lm (linear meter), piece, kg, liter`;
}

async function buildL2Context(
  db: PgDatabase<any>,
  tenantId: string
): Promise<string> {
  // Fetch tenant org info
  const orgResult = await db.execute(sql`
    SELECT n.data
    FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'org'
    WHERE n.tenant_id = ${tenantId}
    LIMIT 1
  `);
  const orgRows = (Array.isArray(orgResult) ? orgResult : orgResult.rows) as any[];
  const org = orgRows[0]?.data;

  // Fetch product catalog summary
  const productResult = await db.execute(sql`
    SELECT n.data->>'name' AS name,
           n.data->>'default_price' AS price,
           n.data->>'sku' AS sku
    FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'product'
    WHERE n.tenant_id = ${tenantId}
    ORDER BY n.data->>'name'
    LIMIT 50
  `);
  const products = (Array.isArray(productResult) ? productResult : productResult.rows) as any[];

  let text = `## Tenant Context\n`;
  if (org) {
    text += `Company: ${org.name || "Unknown"}\n`;
    if (org.industry) text += `Industry: ${org.industry}\n`;
  }

  if (products.length > 0) {
    text += `\nProduct Catalog (${products.length} items):\n`;
    for (const p of products) {
      text += `- ${p.name}${p.sku ? ` (${p.sku})` : ""}${p.price ? ` — ${p.price} SEK` : ""}\n`;
    }
  }

  return text;
}

async function buildL3Context(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string
): Promise<string> {
  const result = await db.execute(sql`
    SELECT n.data
    FROM nodes n
    WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const rows = (Array.isArray(result) ? result : result.rows) as any[];
  const project = rows[0]?.data;

  if (!project) return "## Project Context\nNo project data found.";

  let text = `## Project Context\n`;
  text += `Name: ${project.name}\n`;
  if (project.description) text += `Description: ${project.description}\n`;
  if (project.address) {
    const addr = project.address;
    text += `Address: ${addr.street}, ${addr.postal_code} ${addr.city}\n`;
  }
  if (project.estimated_hours) text += `Estimated hours: ${project.estimated_hours}\n`;
  if (project.rot_applicable) text += `ROT applicable: yes\n`;
  if (project.rut_applicable) text += `RUT applicable: yes\n`;
  if (project.notes) text += `Notes: ${project.notes}\n`;

  // Fetch customer info
  const customerResult = await db.execute(sql`
    SELECT n.data
    FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId}
    LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
  if (customerRows[0]?.data) {
    const cust = customerRows[0].data;
    text += `\nCustomer: ${cust.name}\n`;
    if (cust.rot_rut_person_number) text += `Personnummer: ${cust.rot_rut_person_number}\n`;
  }

  return text;
}

async function buildL4Context(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string
): Promise<string> {
  // Fetch active events summary
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        COALESCE(e.ref_id, e.id) AS root_id,
        e.id,
        e.qty,
        e.unit_price,
        e.type_id,
        e.data,
        l.code AS type_code,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(e.ref_id, e.id)
          ORDER BY e.id DESC
        ) AS rn
      FROM events e
      JOIN labels l ON l.id = e.type_id AND l.domain = 'event_type'
      WHERE e.tenant_id = ${tenantId}
        AND e.node_id = ${projectId}
    )
    SELECT type_code, qty, unit_price, data
    FROM ranked
    WHERE rn = 1
    ORDER BY type_code, id
    LIMIT 100
  `);
  const events = (Array.isArray(result) ? result : result.rows) as any[];

  if (events.length === 0) return "## Detail Context\nNo events recorded yet.";

  let text = `## Detail Context\n`;
  text += `Events (${events.length} active):\n`;

  const grouped = new Map<string, any[]>();
  for (const ev of events) {
    const list = grouped.get(ev.type_code) || [];
    list.push(ev);
    grouped.set(ev.type_code, list);
  }

  for (const [type, evts] of grouped) {
    text += `\n### ${type} (${evts.length})\n`;
    for (const ev of evts.slice(0, 20)) {
      const desc = ev.data?.description || ev.data?.text || ev.data?.note || "";
      const qty = ev.qty ? `qty=${ev.qty}` : "";
      const price = ev.unit_price ? `price=${ev.unit_price}` : "";
      text += `- ${[desc, qty, price].filter(Boolean).join(", ")}\n`;
    }
    if (evts.length > 20) {
      text += `... and ${evts.length - 20} more\n`;
    }
  }

  return text;
}

async function buildL5Context(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string
): Promise<string> {
  // Fetch similar past projects (completed, with quote lines)
  const result = await db.execute(sql`
    SELECT n.id, n.data->>'name' AS name, n.data->>'description' AS description
    FROM nodes n
    JOIN labels lt ON lt.id = n.type_id AND lt.domain = 'node_type' AND lt.code = 'project'
    WHERE n.tenant_id = ${tenantId}
      AND n.id != ${projectId}
    ORDER BY n.id DESC
    LIMIT 5
  `);
  const projects = (Array.isArray(result) ? result : result.rows) as any[];

  if (projects.length === 0) return "## History\nNo similar past projects found.";

  let text = `## History\nSimilar past projects:\n`;
  for (const p of projects) {
    text += `\n### ${p.name}\n`;
    if (p.description) text += `Description: ${p.description}\n`;

    // Fetch quote lines for this project
    const linesResult = await db.execute(sql`
      WITH ranked AS (
        SELECT
          COALESCE(e.ref_id, e.id) AS root_id,
          e.id, e.qty, e.unit_price, e.data,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(e.ref_id, e.id)
            ORDER BY e.id DESC
          ) AS rn
        FROM events e
        JOIN labels l ON l.id = e.type_id AND l.domain = 'event_type' AND l.code = 'quote_line'
        WHERE e.tenant_id = ${tenantId}
          AND e.node_id = ${p.id}
      )
      SELECT qty, unit_price, data
      FROM ranked WHERE rn = 1
      LIMIT 10
    `);
    const lines = (Array.isArray(linesResult) ? linesResult : linesResult.rows) as any[];
    for (const line of lines) {
      const desc = line.data?.description || "";
      text += `- ${desc}: qty=${line.qty}, price=${line.unit_price}\n`;
    }
  }

  return text;
}

/**
 * Truncates a section to fit within a token budget.
 * If truncated, adds a notice.
 */
function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  levelName: string
): string {
  const tokens = countTokens(text);
  if (tokens <= maxTokens) return text;

  // Binary search for the right truncation point
  const lines = text.split("\n");
  let lo = 0;
  let hi = lines.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const candidate = lines.slice(0, mid).join("\n");
    if (countTokens(candidate) <= maxTokens - 30) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const truncated = lines.slice(0, lo).join("\n");
  const omitted = lines.length - lo;
  return `${truncated}\n[Truncated: ${omitted} items omitted from ${levelName}. Ask for specific details if needed.]`;
}
