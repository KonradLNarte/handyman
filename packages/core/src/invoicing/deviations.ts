import type { ProjectEconomics } from "../economics/calculate";
import type { Deviation } from "@resonansia/shared";

/**
 * Detects deviations between quoted and actual project economics.
 *
 * INVARIANT deviations_before_approval:
 * Deviations MUST be presented in the proposal UI BEFORE approval.
 */
export function detectDeviations(
  quotedEconomics: ProjectEconomics,
  actualEconomics: { timeCost: number; materialCost: number },
  threshold: number = 0.05
): Deviation[] {
  const deviations: Deviation[] = [];

  // Time/labor cost deviation
  if (quotedEconomics.quotedTotal > 0) {
    const quotedLabor = getQuotedLabor(quotedEconomics);
    if (quotedLabor > 0) {
      const laborDiff = actualEconomics.timeCost - quotedLabor;
      const laborPct = laborDiff / quotedLabor;
      if (Math.abs(laborPct) > threshold) {
        const direction = laborPct > 0 ? "högre" : "lägre";
        deviations.push({
          field: "time_cost",
          message: `Arbetskostnad ${Math.abs(Math.round(laborPct * 100))}% ${direction} än offert (${formatSEK(actualEconomics.timeCost)} vs ${formatSEK(quotedLabor)})`,
          quotedValue: quotedLabor,
          actualValue: actualEconomics.timeCost,
          percentageDiff: Math.round(laborPct * 100),
        });
      }
    }

    // Material cost deviation
    const quotedMaterial = getQuotedMaterial(quotedEconomics);
    if (quotedMaterial > 0) {
      const materialDiff = actualEconomics.materialCost - quotedMaterial;
      const materialPct = materialDiff / quotedMaterial;
      if (Math.abs(materialPct) > threshold) {
        const direction = materialPct > 0 ? "högre" : "lägre";
        deviations.push({
          field: "material_cost",
          message: `Materialkostnad ${Math.abs(Math.round(materialPct * 100))}% ${direction} än offert (${formatSEK(actualEconomics.materialCost)} vs ${formatSEK(quotedMaterial)})`,
          quotedValue: quotedMaterial,
          actualValue: actualEconomics.materialCost,
          percentageDiff: Math.round(materialPct * 100),
        });
      }
    }

    // Total deviation
    const quotedTotal = quotedEconomics.quotedTotal;
    const actualTotal = actualEconomics.timeCost + actualEconomics.materialCost;
    const totalDiff = actualTotal - quotedTotal;
    const totalPct = totalDiff / quotedTotal;
    if (Math.abs(totalPct) > threshold) {
      const direction = totalPct > 0 ? "högre" : "lägre";
      deviations.push({
        field: "total",
        message: `Totalkostnad ${Math.abs(Math.round(totalPct * 100))}% ${direction} än offert (${formatSEK(actualTotal)} vs ${formatSEK(quotedTotal)})`,
        quotedValue: quotedTotal,
        actualValue: actualTotal,
        percentageDiff: Math.round(totalPct * 100),
      });
    }
  }

  return deviations;
}

function getQuotedLabor(economics: ProjectEconomics): number {
  // In our economics model, quotedTotal includes both labor and material.
  // We approximate labor as timeCost-like proportion, or use the full quotedTotal.
  // Since we don't have separate quoted labor/material in ProjectEconomics,
  // we'll use timeCost and materialCost from actual events for comparison.
  return economics.timeCost || economics.quotedTotal * 0.667; // fallback estimate
}

function getQuotedMaterial(economics: ProjectEconomics): number {
  return economics.materialCost || economics.quotedTotal * 0.333; // fallback estimate
}

function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE").format(Math.round(amount)) + " kr";
}
