import { NextRequest, NextResponse } from "next/server";
import { verifyQuoteToken } from "@resonansia/core/src/quotes/token";
import { BankIdAdapter } from "@resonansia/integrations";

const BANKID_URL = process.env.BANKID_URL || "http://localhost:9999/bankid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, personNumber } = body;

    // Verify quote token
    const payload = verifyQuoteToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const adapter = new BankIdAdapter({ baseUrl: BANKID_URL });
    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await adapter.initiateAuth(
      personNumber || "199001011234", // Default for dev/twin
      userIp,
      `Godkänner offert för projekt ${payload.projectId}`
    );

    return NextResponse.json({
      orderRef: result.orderRef,
    });
  } catch (error) {
    console.error("BankID initiate error:", error);
    return NextResponse.json(
      { error: "Failed to initiate signing" },
      { status: 500 }
    );
  }
}
