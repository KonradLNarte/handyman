import { NextRequest, NextResponse } from "next/server";
import { verifyQuoteToken } from "@resonansia/core/src/quotes/token";
import { BankIdAdapter } from "@resonansia/integrations";
import { onSigningComplete } from "@resonansia/core/src/signing/bankid";
import { getDb } from "@resonansia/db";

const BANKID_URL = process.env.BANKID_URL || "http://localhost:9999/bankid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderRef, token, projectId, tenantId } = body;

    // Verify quote token
    const payload = verifyQuoteToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const adapter = new BankIdAdapter({ baseUrl: BANKID_URL });
    const result = await adapter.collect(orderRef);

    if (result.status === "complete" && result.completionData) {
      // Create state_change event
      const db = getDb();
      await onSigningComplete(
        db,
        payload.tenantId,
        payload.projectId,
        result.completionData.personalNumber
      );

      return NextResponse.json({
        status: "complete",
        name: result.completionData.name,
      });
    }

    return NextResponse.json({
      status: result.status,
      hintCode: result.hintCode,
    });
  } catch (error) {
    console.error("BankID poll error:", error);
    return NextResponse.json(
      { error: "Failed to poll signing status" },
      { status: 500 }
    );
  }
}
