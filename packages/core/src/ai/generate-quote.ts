import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId, aiQuoteOutputSchema } from "@resonansia/shared";
import type { AiQuoteOutput } from "@resonansia/shared";
import type { TransientProposal, ProposalLine } from "@resonansia/shared";
import { computeTotal } from "@resonansia/db";
import { aiComplete } from "./client";
import { buildProjectContext } from "./context";
import { calculateRotRut } from "../economics/rot-rut";
import type { RotRutLineInput, RotRutType } from "../economics/rot-rut";
import { getLabelId } from "../labels";

interface GenerateQuoteInput {
  tenantId: string;
  projectId: string;
  description: string;
  photoUrls?: string[];
  rotRutType?: RotRutType;
  previouslyClaimedThisYear?: number;
  personNumber?: string;
  createdBy: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  defaultPrice: number | null;
  unitId: number;
  coverageSqm: number | null;
}

/**
 * Generates a quote proposal using AI.
 *
 * INVARIANT ai_no_arithmetic_in_prompt:
 * AI returns structured data (descriptions, quantities, unit prices).
 * The APPLICATION computes all totals, sums, VAT, ROT/RUT deductions.
 *
 * INVARIANT catalog_price_overrides_ai:
 * If AI returns a unit_price but the line matches a catalog product,
 * the catalog product's default_price is used instead.
 */
export async function generateQuoteProposal(
  db: PgDatabase<any>,
  input: GenerateQuoteInput
): Promise<TransientProposal> {
  // 1. Build project context
  const context = await buildProjectContext(
    db,
    input.tenantId,
    input.projectId,
    "quote_generation"
  );

  // 2. Fetch product catalog
  const catalogProducts = await fetchCatalogProducts(db, input.tenantId);

  // 3. Build AI prompt
  const catalogText = catalogProducts.length > 0
    ? `\nProduct Catalog:\n${catalogProducts.map((p) => `- ${p.name}${p.sku ? ` (${p.sku})` : ""}: ${p.defaultPrice ?? "N/A"} SEK/${getUnitName(p.unitId)}${p.coverageSqm ? ` (covers ${p.coverageSqm} sqm)` : ""}`).join("\n")}`
    : "";

  const photoText = input.photoUrls?.length
    ? `\nPhotos attached: ${input.photoUrls.length} photos of the project site.`
    : "";

  const systemPrompt = `You are a Swedish construction estimator for painting and renovation projects.
Generate a detailed quote with line items for the described project.

IMPORTANT RULES:
- Return qty and unit_price for each line. DO NOT calculate totals — the system does that.
- For labor: use unitCode "hour" and estimate realistic hours for professional painters.
- For materials: use appropriate units (sqm, liter, piece, etc.)
- Set isLabor=true for work/labor lines, isLabor=false for material lines.
- Match materials to the product catalog when possible (set catalogMatch to the product name).
- Use realistic Swedish market prices.
- Include all necessary preparation, painting coats, and finishing work.

${context}
${catalogText}`;

  const userPrompt = `Generate a quote for this project:

${input.description}
${photoText}

Return structured quote lines with descriptions, quantities, unit prices, and whether each line is labor or material.`;

  // 4. Call AI with structured output
  const result = await aiComplete({
    tier: "expensive",
    system: systemPrompt,
    prompt: userPrompt,
    schema: aiQuoteOutputSchema,
  });

  if (!result.success) {
    // Return empty proposal with error
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
      aiContextSummary: `Error: ${result.error}`,
      reasoning: `AI generation failed: ${result.error}`,
    };
  }

  const aiOutput: AiQuoteOutput = result.data;

  // 5. Build proposal lines
  const lines: ProposalLine[] = aiOutput.lines.map((aiLine, index) => {
    // Match against catalog products
    const catalogMatch = aiLine.catalogMatch
      ? findCatalogMatch(catalogProducts, aiLine.catalogMatch)
      : null;

    // INVARIANT: catalog price overrides AI price
    const unitPrice = catalogMatch?.defaultPrice ?? aiLine.unitPrice;
    const unitId = catalogMatch?.unitId ?? resolveUnitId(aiLine.unitCode);

    return {
      tempId: generateId(),
      description: aiLine.description,
      qty: aiLine.qty,
      unitId,
      unitPrice,
      total: computeTotal(aiLine.qty, unitPrice) ?? 0,
      isLabor: aiLine.isLabor,
      vatRate: 0.25,
      sortOrder: aiLine.sortOrder,
      catalogProductId: catalogMatch?.id,
    };
  });

  // 6. Calculate ROT/RUT
  const rotRutType = input.rotRutType ?? "none";
  let rotRut = undefined;
  if (rotRutType !== "none" && input.personNumber) {
    const rotRutLines: RotRutLineInput[] = lines.map((line) => ({
      total: line.total,
      isLabor: line.isLabor,
      rotRutType,
    }));
    rotRut = calculateRotRut(
      rotRutLines,
      input.previouslyClaimedThisYear ?? 0,
      input.personNumber
    );
  }

  // 7. Build proposal
  const proposal: TransientProposal = {
    id: generateId(),
    tenantId: input.tenantId,
    projectId: input.projectId,
    type: "quote",
    status: "draft",
    createdAt: new Date(),
    createdBy: input.createdBy,
    lines,
    rotRut,
    aiModel: result.model,
    aiContextSummary: `Context: ${context.substring(0, 200)}...`,
    reasoning: aiOutput.reasoning,
  };

  return proposal;
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
    unitId: row.data?.unit_id ?? 5, // default to 'piece'
    coverageSqm: row.data?.coverage_sqm ?? null,
  }));
}

function findCatalogMatch(
  catalog: CatalogProduct[],
  aiMatch: string
): CatalogProduct | null {
  const normalizedMatch = aiMatch.toLowerCase().trim();

  // Exact name match first
  const exact = catalog.find(
    (p) => p.name.toLowerCase() === normalizedMatch
  );
  if (exact) return exact;

  // Partial match (contains)
  const partial = catalog.find(
    (p) =>
      p.name.toLowerCase().includes(normalizedMatch) ||
      normalizedMatch.includes(p.name.toLowerCase())
  );
  if (partial) return partial;

  // SKU match
  const skuMatch = catalog.find(
    (p) => p.sku && p.sku.toLowerCase() === normalizedMatch
  );
  return skuMatch || null;
}

function resolveUnitId(unitCode: string): number {
  const unitMap: Record<string, number> = {
    hour: 1,
    minute: 2,
    sqm: 3,
    lm: 4,
    piece: 5,
    kg: 6,
    liter: 7,
  };
  return unitMap[unitCode.toLowerCase()] ?? 5;
}

function getUnitName(unitId: number): string {
  const unitNames: Record<number, string> = {
    1: "hour",
    2: "minute",
    3: "sqm",
    4: "lm",
    5: "piece",
    6: "kg",
    7: "liter",
  };
  return unitNames[unitId] ?? "piece";
}
