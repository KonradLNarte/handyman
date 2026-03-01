import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@resonansia/db";
import { handleIncomingMessage } from "@resonansia/core";
import { SmsAdapter } from "@resonansia/integrations";

/**
 * Tracks processed SMS IDs for idempotency.
 */
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

/**
 * POST: Incoming SMS message processing (46elks or twin format)
 *
 * CRITICAL: This runs OUTSIDE normal auth context.
 * Uses the Drizzle DB client directly.
 * Tenant context is determined by sender phone number lookup.
 */
export async function POST(request: NextRequest) {
  try {
    let from: string;
    let text: string;
    let externalId: string;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // 46elks sends URL-encoded form data
      const formData = await request.formData();
      from = (formData.get("from") as string) ?? "";
      text = (formData.get("message") as string) ?? "";
      externalId = (formData.get("id") as string) ?? `sms-${Date.now()}`;
    } else {
      // JSON format (twin or other)
      const payload = await request.json();
      from = payload.from ?? "";
      text = payload.message ?? payload.text ?? payload.body ?? "";
      externalId = payload.id ?? `sms-${Date.now()}`;
    }

    if (!from) {
      return NextResponse.json({ error: "Missing sender" }, { status: 400 });
    }

    // Idempotency check
    if (processedMessages.has(externalId)) {
      return NextResponse.json({ status: "duplicate" });
    }
    if (processedMessages.size > MAX_CACHE_SIZE) {
      const firstKey = processedMessages.values().next().value;
      if (firstKey) processedMessages.delete(firstKey);
    }
    processedMessages.add(externalId);

    const db = getDb();

    const result = await handleIncomingMessage(db, {
      phoneNumber: from,
      text,
      hasMedia: false,
      channel: "sms",
      externalId,
    });

    // Send response via SMS
    if (result.response) {
      const adapter = createSmsAdapter();
      if (adapter) {
        await adapter.sendMessage(from, result.response);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("SMS webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

function createSmsAdapter(): SmsAdapter | null {
  const baseUrl = process.env.SMS_BASE_URL ?? "http://localhost:9999/sms";
  const apiUser = process.env.SMS_API_USER ?? "test-user";
  const apiPassword = process.env.SMS_API_PASSWORD ?? "test-password";

  return new SmsAdapter({ baseUrl, apiUser, apiPassword });
}
