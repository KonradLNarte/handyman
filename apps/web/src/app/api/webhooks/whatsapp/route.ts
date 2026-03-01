import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@resonansia/db";
import { handleIncomingMessage } from "@resonansia/core";
import { WhatsAppAdapter } from "@resonansia/integrations";
import crypto from "crypto";

/**
 * Tracks processed message IDs to ensure idempotency.
 * WhatsApp may deliver the same webhook multiple times.
 */
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 10000;

/**
 * GET: WhatsApp webhook verification (hub.challenge handshake)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "resonansia-verify";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST: Incoming WhatsApp message processing
 *
 * CRITICAL: This runs OUTSIDE normal auth context.
 * Uses the Drizzle DB client directly (not Supabase user sessions).
 * Tenant context is determined by sender phone number lookup.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate signature (skip for twin/dev)
    const validationEnabled = process.env.WEBHOOK_VALIDATION_ENABLED !== "false";
    if (validationEnabled) {
      const signature = request.headers.get("x-hub-signature-256");
      const body = await request.text();
      if (!verifyWhatsAppSignature(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      // Re-parse body after reading as text
      var payload = JSON.parse(body);
    } else {
      var payload = await request.json();
    }

    // Parse WhatsApp payload
    const messages = extractMessages(payload);
    if (messages.length === 0) {
      // Status update or non-message event — acknowledge
      return NextResponse.json({ status: "ok" });
    }

    const db = getDb();
    const adapter = createWhatsAppAdapter();

    for (const msg of messages) {
      // Idempotency check
      if (processedMessages.has(msg.externalId)) {
        continue;
      }

      // Prevent unbounded growth
      if (processedMessages.size > MAX_CACHE_SIZE) {
        const firstKey = processedMessages.values().next().value;
        if (firstKey) processedMessages.delete(firstKey);
      }
      processedMessages.add(msg.externalId);

      const result = await handleIncomingMessage(db, {
        phoneNumber: msg.from,
        text: msg.text,
        hasMedia: msg.hasMedia,
        mediaUrl: msg.mediaUrl,
        channel: "whatsapp",
        externalId: msg.externalId,
      });

      // Send response
      if (result.response && adapter) {
        await adapter.sendMessage(msg.from, result.response);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    // Always return 200 to prevent WhatsApp retries on transient errors
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

interface ParsedMessage {
  from: string;
  text: string;
  hasMedia: boolean;
  mediaUrl?: string;
  externalId: string;
}

function extractMessages(payload: any): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // WhatsApp Cloud API format
  const entries = payload.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const value = change.value ?? {};
      const msgs = value.messages ?? [];
      for (const msg of msgs) {
        const parsed: ParsedMessage = {
          from: msg.from ?? "",
          text: "",
          hasMedia: false,
          externalId: msg.id ?? "",
        };

        if (msg.type === "text") {
          parsed.text = msg.text?.body ?? "";
        } else if (msg.type === "image" || msg.type === "video" || msg.type === "document") {
          parsed.hasMedia = true;
          parsed.mediaUrl = msg[msg.type]?.id ?? "";
          parsed.text = msg[msg.type]?.caption ?? "";
        } else if (msg.type === "interactive") {
          parsed.text = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
        }

        if (parsed.from) {
          messages.push(parsed);
        }
      }
    }
  }

  // Twin/simple format: { from, text, id, hasMedia, mediaUrl }
  if (messages.length === 0 && payload.from) {
    messages.push({
      from: payload.from,
      text: payload.text ?? payload.body ?? "",
      hasMedia: payload.hasMedia ?? false,
      mediaUrl: payload.mediaUrl ?? undefined,
      externalId: payload.id ?? payload.messageId ?? `twin-${Date.now()}`,
    });
  }

  return messages;
}

function verifyWhatsAppSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(body);
  const expectedSignature = "sha256=" + hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function createWhatsAppAdapter(): WhatsAppAdapter | null {
  const baseUrl = process.env.WHATSAPP_BASE_URL ?? "http://localhost:9999/whatsapp";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "test-phone-id";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "test-token";

  return new WhatsAppAdapter({ baseUrl, phoneNumberId, accessToken });
}
