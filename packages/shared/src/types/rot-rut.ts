export type RotRutType = "rot" | "rut" | "none";

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
