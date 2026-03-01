import type { PgDatabase } from "drizzle-orm/pg-core";
import type { MessagingAdapter } from "@resonansia/integrations";
import { createEvent } from "../events/create";

export interface SendMessageInput {
  tenantId: string;
  recipientPhone: string;
  text: string;
  channel: "whatsapp" | "sms";
  projectId?: string;
  mediaUrls?: string[];
  actorId?: string;
}

export interface SendMessageResult {
  success: boolean;
  externalId: string;
  eventId: string;
}

/**
 * Sends an outbound message via the appropriate channel adapter
 * and logs it as a message event. Never throws — caller decides retry strategy.
 */
export async function sendMessage(
  db: PgDatabase<any>,
  adapter: MessagingAdapter,
  input: SendMessageInput
): Promise<SendMessageResult> {
  let externalId = "";
  let success = false;

  try {
    const result = await adapter.sendMessage(input.recipientPhone, input.text);
    externalId = result.id ?? "";
    success = true;
  } catch (error) {
    console.error(`Failed to send ${input.channel} message:`, error);
  }

  // Log outbound message event (even on failure, for audit)
  const nodeId = input.projectId ?? input.actorId ?? input.tenantId;
  const event = await createEvent(db, input.tenantId, {
    nodeId,
    typeCode: "message",
    data: {
      text: input.text,
      channel: input.channel,
      direction: "outbound",
      external_id: externalId || null,
    },
    origin: "system",
    occurredAt: new Date(),
    actorId: input.actorId ?? null,
  });

  return {
    success,
    externalId,
    eventId: event.id,
  };
}
