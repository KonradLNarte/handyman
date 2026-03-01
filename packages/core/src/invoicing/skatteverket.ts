import type { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { TaxAdapter } from "@resonansia/integrations";
import { createEvent } from "../events/create";
import type { RotRutType } from "../economics/rot-rut";

interface SubmitRotRutInput {
  tenantId: string;
  projectId: string;
  invoiceEventIds: string[];
  customerPersonNumber: string;
  deductionAmount: number;
  deductionType: RotRutType;
}

interface SubmitRotRutResult {
  submissionId: string;
  status: string;
}

/**
 * Submits a ROT/RUT claim to Skatteverket.
 *
 * Flow:
 * 1. Validate inputs
 * 2. Call tax adapter (twin in dev)
 * 3. Create system event logging the submission
 */
export async function submitRotRutClaim(
  db: PgDatabase<any>,
  input: SubmitRotRutInput,
  taxAdapter: TaxAdapter
): Promise<SubmitRotRutResult> {
  // 1. Validate person number format (YYYYMMDDNNNN or YYYYMMDD-NNNN)
  const cleanPN = input.customerPersonNumber.replace("-", "");
  if (cleanPN.length !== 12) {
    throw new Error(`Invalid personnummer format: ${input.customerPersonNumber}`);
  }

  if (input.deductionType === "none") {
    throw new Error("Cannot submit ROT/RUT claim with deduction type 'none'");
  }

  if (input.deductionAmount <= 0) {
    throw new Error("Deduction amount must be positive");
  }

  // 2. Get tenant org number
  const orgResult = await db.execute(sql`
    SELECT n.data->>'org_number' AS org_number
    FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'org'
    WHERE n.tenant_id = ${input.tenantId} LIMIT 1
  `);
  const orgRows = (Array.isArray(orgResult) ? orgResult : orgResult.rows) as any[];
  const orgNumber = orgRows[0]?.org_number || "";

  // 3. Calculate labor amount in öre (minor units)
  const deductionAmountOre = Math.round(input.deductionAmount * 100);
  const laborAmountOre = Math.round(
    input.deductionType === "rot"
      ? input.deductionAmount / 0.30 * 100
      : input.deductionAmount / 0.50 * 100
  );

  // 4. Submit to Skatteverket
  const result = await taxAdapter.submitRotRut({
    orgNumber,
    personalNumber: input.customerPersonNumber,
    invoiceNumber: input.invoiceEventIds[0]?.substring(0, 8).toUpperCase() || "UNKNOWN",
    laborAmount: laborAmountOre,
    deductionType: input.deductionType.toUpperCase() as "ROT" | "RUT",
    deductionAmount: deductionAmountOre,
    year: new Date().getFullYear(),
  });

  // 5. Log submission event
  const statusText = result.status === "mottagen"
    ? `ROT/RUT-ansökan mottagen av Skatteverket (ärende: ${result.caseNumber || "N/A"})`
    : `ROT/RUT-ansökan avvisad: ${result.message || result.errorCode || "Okänt fel"}`;

  await createEvent(db, input.tenantId, {
    nodeId: input.projectId,
    typeCode: "note",
    data: { text: statusText },
    origin: "external_api",
    occurredAt: new Date(),
  });

  return {
    submissionId: result.caseNumber || "",
    status: result.status,
  };
}
