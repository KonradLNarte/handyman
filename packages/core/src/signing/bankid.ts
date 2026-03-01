import type { PgDatabase } from "drizzle-orm/pg-core";
import type { SigningAdapter } from "@resonansia/integrations";
import { createEvent } from "../events/create";
import { sql } from "drizzle-orm";

export type SigningStatus = "pending" | "complete" | "failed" | "expired";

export interface SigningInitResult {
  orderRef: string;
  autoStartToken: string;
}

export interface SigningPollResult {
  status: SigningStatus;
  personalNumber?: string;
  name?: string;
}

/**
 * Initiates BankID signing for a quote.
 * Returns orderRef for polling and autoStartToken for mobile BankID launch.
 */
export async function initiateSigning(
  adapter: SigningAdapter,
  personNumber: string,
  userIp: string
): Promise<SigningInitResult> {
  const result = await adapter.initiateAuth(personNumber, userIp);
  return {
    orderRef: result.orderRef,
    autoStartToken: result.orderRef, // Twin uses orderRef as autoStartToken
  };
}

/**
 * Polls BankID collect endpoint for signing status.
 */
export async function pollSigningStatus(
  adapter: SigningAdapter,
  orderRef: string
): Promise<SigningPollResult> {
  const result = await adapter.collect(orderRef);

  if (result.status === "complete" && result.completionData) {
    return {
      status: "complete",
      personalNumber: result.completionData.personalNumber,
      name: result.completionData.name,
    };
  }

  return {
    status: result.status === "pending" ? "pending" : "failed",
  };
}

/**
 * Handles signing completion: creates state_change event.
 *
 * INVARIANT signing_creates_event:
 * A successful BankID signing creates a state_change event.
 * This is the audit trail that proves the customer accepted.
 *
 * INVARIANT signing_verifies_person:
 * The personnummer returned by BankID must match the customer's
 * rot_rut_person_number. Mismatch = signing rejected.
 */
export async function onSigningComplete(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  signedByPersonNumber: string
): Promise<void> {
  // Verify person number matches the customer
  const customerResult = await db.execute(sql`
    SELECT n.data->>'rot_rut_person_number' AS person_number
    FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId}
    LIMIT 1
  `);
  const rows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
  const expectedPersonNumber = rows[0]?.person_number;

  if (
    expectedPersonNumber &&
    expectedPersonNumber !== signedByPersonNumber
  ) {
    throw new Error(
      `Person number mismatch: BankID returned ${signedByPersonNumber}, expected ${expectedPersonNumber}`
    );
  }

  // Get current project state
  const stateResult = await db.execute(sql`
    WITH ranked AS (
      SELECT
        COALESCE(e.ref_id, e.id) AS root_id,
        e.data,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(e.ref_id, e.id)
          ORDER BY e.id DESC
        ) AS rn
      FROM events e
      JOIN labels l ON l.id = e.type_id AND l.domain = 'event_type' AND l.code = 'state_change'
      WHERE e.tenant_id = ${tenantId} AND e.node_id = ${projectId}
    )
    SELECT data FROM ranked WHERE rn = 1 ORDER BY root_id DESC LIMIT 1
  `);
  const stateRows = (Array.isArray(stateResult) ? stateResult : stateResult.rows) as any[];
  const currentState = stateRows[0]?.data?.to_state || "draft";

  // Create state_change event
  await createEvent(db, tenantId, {
    nodeId: projectId,
    typeCode: "state_change",
    data: {
      from_state: currentState,
      to_state: "active",
      trigger: "customer_signing",
    },
    origin: "system",
    occurredAt: new Date(),
  });
}
