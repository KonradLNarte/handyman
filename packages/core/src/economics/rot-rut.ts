/**
 * ROT/RUT Calculation Engine
 *
 * Pure deterministic calculation — no AI involvement.
 * Same inputs always produce same outputs.
 *
 * Swedish tax deduction rules:
 * - ROT (Renovation): 30% of labor cost, max 50,000 SEK/person/year
 * - RUT (Housework): 50% of labor cost, max 75,000 SEK/person/year
 * - Overall max per person per year: 75,000 SEK
 */

export type RotRutType = "rot" | "rut" | "none";

export interface RotRutConfig {
  rotRate: number; // 0.30 for Sweden
  rutRate: number; // 0.50 for Sweden
  maxPerPersonPerYear: number; // 75_000 SEK
  maxRotPerPersonPerYear: number; // 50_000 SEK
}

export interface RotRutLineInput {
  total: number; // Line total (qty × unitPrice)
  isLabor: boolean; // From EventData_QuoteLine.is_labor
  rotRutType: RotRutType;
}

export interface RotRutResult {
  laborTotal: number;
  materialTotal: number;
  deductionAmount: number;
  customerPays: number;
  deductionType: RotRutType;
  deductionRate: number;
  cappedByYearlyMax: boolean;
  remainingAllowance: number;
}

const SWEDISH_DEFAULTS: RotRutConfig = {
  rotRate: 0.3,
  rutRate: 0.5,
  maxPerPersonPerYear: 75_000,
  maxRotPerPersonPerYear: 50_000,
};

/**
 * Calculates ROT/RUT deduction from line items.
 *
 * ALL arithmetic in TypeScript. No rounding until final display.
 * This is a pure function: same inputs → same outputs.
 */
export function calculateRotRut(
  lines: RotRutLineInput[],
  previouslyClaimedThisYear: number,
  personNumber: string,
  config: RotRutConfig = SWEDISH_DEFAULTS
): RotRutResult {
  // Determine the deduction type from lines (all lines must have the same type)
  let deductionType: RotRutType = "none";
  for (const line of lines) {
    if (line.rotRutType !== "none") {
      deductionType = line.rotRutType;
      break;
    }
  }

  // Sum labor and material totals
  let laborTotal = 0;
  let materialTotal = 0;
  for (const line of lines) {
    if (line.isLabor) {
      laborTotal += line.total;
    } else {
      materialTotal += line.total;
    }
  }

  // No labor = no deduction
  if (laborTotal === 0 || deductionType === "none") {
    return {
      laborTotal,
      materialTotal,
      deductionAmount: 0,
      customerPays: laborTotal + materialTotal,
      deductionType,
      deductionRate: 0,
      cappedByYearlyMax: false,
      remainingAllowance:
        deductionType === "rot"
          ? config.maxRotPerPersonPerYear - previouslyClaimedThisYear
          : config.maxPerPersonPerYear - previouslyClaimedThisYear,
    };
  }

  // Determine rate and applicable cap
  const rate = deductionType === "rot" ? config.rotRate : config.rutRate;
  const grossDeduction = laborTotal * rate;

  // Apply yearly cap
  let available = config.maxPerPersonPerYear - previouslyClaimedThisYear;
  if (deductionType === "rot") {
    const rotAvailable =
      config.maxRotPerPersonPerYear - previouslyClaimedThisYear;
    available = Math.min(available, rotAvailable);
  }
  available = Math.max(0, available);

  const deductionAmount = Math.min(grossDeduction, available);
  const cappedByYearlyMax = grossDeduction > available;
  const customerPays = laborTotal + materialTotal - deductionAmount;
  const remainingAllowance = available - deductionAmount;

  return {
    laborTotal,
    materialTotal,
    deductionAmount,
    customerPays,
    deductionType,
    deductionRate: rate,
    cappedByYearlyMax,
    remainingAllowance,
  };
}
