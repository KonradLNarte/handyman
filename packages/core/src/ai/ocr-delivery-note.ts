import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId, aiDeliveryNoteSchema } from "@resonansia/shared";
import type { AiDeliveryNote } from "@resonansia/shared";
import type { TransientProposal, ProposalLine } from "@resonansia/shared";
import { computeTotal } from "@resonansia/db";
import { aiComplete } from "./client";

interface ExtractDeliveryNoteInput {
  tenantId: string;
  projectId: string;
  imageUrl: string;
  createdBy: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  defaultPrice: number | null;
  unitId: number;
}

/**
 * Extracts line items from a delivery note image using AI OCR.
 *
 * INVARIANT ocr_is_transient:
 * Extracted data is a transient proposal.
 * User MUST review and confirm before events are created.
 *
 * INVARIANT ai_no_arithmetic_in_prompt:
 * AI returns article name, quantity, unit price.
 * System computes all totals.
 */
export async function extractDeliveryNote(
  db: PgDatabase<any>,
  input: ExtractDeliveryNoteInput
): Promise<TransientProposal> {
  // Fetch catalog products for matching
  const catalogProducts = await fetchCatalogProducts(db, input.tenantId);

  const catalogText = catalogProducts.length > 0
    ? `\nProduct Catalog for matching:\n${catalogProducts.map((p) => `- ${p.name}${p.sku ? ` (SKU: ${p.sku})` : ""}`).join("\n")}`
    : "";

  const systemPrompt = `You are an OCR system for Swedish construction delivery notes (följesedlar).
Extract line items from the delivery note image.

IMPORTANT RULES:
- Return article name, quantity, and unit price for each line
- DO NOT compute totals — the system does that
- Match articles to the product catalog when possible (set catalogMatch to the product name)
- Use appropriate units: st (piece), m² (sqm), lm (linear meter), kg, l (liter)
- Extract supplier name, delivery note number, and date if visible

${catalogText}`;

  const userPrompt = `Extract line items from this delivery note image: ${input.imageUrl}

Return structured data with article names, quantities, unit prices, and units.`;

  const result = await aiComplete({
    tier: "medium",
    system: systemPrompt,
    prompt: userPrompt,
    schema: aiDeliveryNoteSchema,
  });

  if (!result.success) {
    return {
      id: generateId(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      type: "quote",
      status: "draft",
      createdAt: new Date(),
      createdBy: input.createdBy,
      lines: [],
      aiModel: result.model,
      aiContextSummary: `OCR Error: ${result.error}`,
      reasoning: `OCR extraction failed: ${result.error}`,
    };
  }

  const aiOutput: AiDeliveryNote = result.data;

  // Build proposal lines
  const lines: ProposalLine[] = aiOutput.lines.map((aiLine, index) => {
    const catalogMatch = aiLine.catalogMatch
      ? findCatalogMatch(catalogProducts, aiLine.catalogMatch)
      : findCatalogMatch(catalogProducts, aiLine.articleName);

    const unitPrice = catalogMatch?.defaultPrice ?? aiLine.unitPrice;
    const unitId = catalogMatch?.unitId ?? resolveUnitId(aiLine.unit);

    return {
      tempId: generateId(),
      description: aiLine.articleName,
      qty: aiLine.qty,
      unitId,
      unitPrice,
      total: computeTotal(aiLine.qty, unitPrice) ?? 0,
      isLabor: false, // Materials from delivery notes
      vatRate: 0.25,
      sortOrder: index,
      catalogProductId: catalogMatch?.id,
    };
  });

  return {
    id: generateId(),
    tenantId: input.tenantId,
    projectId: input.projectId,
    type: "quote",
    status: "draft",
    createdAt: new Date(),
    createdBy: input.createdBy,
    lines,
    aiModel: result.model,
    aiContextSummary: `OCR extraction from delivery note${aiOutput.supplierName ? ` (${aiOutput.supplierName})` : ""}${aiOutput.deliveryNoteNumber ? ` #${aiOutput.deliveryNoteNumber}` : ""}`,
    reasoning: `Extracted ${lines.length} line items from delivery note`,
  };
}

async function fetchCatalogProducts(
  db: PgDatabase<any>,
  tenantId: string
): Promise<CatalogProduct[]> {
  const result = await db.execute(sql`
    SELECT n.id, n.data
    FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'product'
    WHERE n.tenant_id = ${tenantId}
    ORDER BY n.data->>'name'
  `);
  const rows = (Array.isArray(result) ? result : result.rows) as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.data?.name || "",
    sku: row.data?.sku || null,
    defaultPrice: row.data?.default_price ?? null,
    unitId: row.data?.unit_id ?? 5,
  }));
}

function findCatalogMatch(
  catalog: CatalogProduct[],
  name: string
): CatalogProduct | null {
  const normalized = name.toLowerCase().trim();
  return (
    catalog.find((p) => p.name.toLowerCase() === normalized) ||
    catalog.find(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        normalized.includes(p.name.toLowerCase())
    ) ||
    catalog.find((p) => p.sku && p.sku.toLowerCase() === normalized) ||
    null
  );
}

function resolveUnitId(unit: string): number {
  const unitMap: Record<string, number> = {
    st: 5,
    piece: 5,
    "m²": 3,
    sqm: 3,
    lm: 4,
    kg: 6,
    l: 7,
    liter: 7,
  };
  return unitMap[unit.toLowerCase()] ?? 5;
}
