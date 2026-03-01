import type { PgDatabase } from "drizzle-orm/pg-core";
import type {
  MessagingAdapter,
  EmailAdapter,
  StorageAdapter,
} from "@resonansia/integrations";
import { generateId } from "@resonansia/shared";
import { createEvent } from "../events/create";

interface DeliverQuoteInput {
  tenantId: string;
  projectId: string;
  channel: "sms" | "email" | "whatsapp";
  recipientPhone?: string;
  recipientEmail?: string;
  pdfBuffer: Buffer;
  quoteViewUrl: string;
  tenantName: string;
}

interface DeliverQuoteResult {
  success: boolean;
  messageEventId: string;
  error?: string;
}

/**
 * Delivers a quote to the customer via the chosen channel.
 *
 * Flow:
 * 1. Upload PDF to storage
 * 2. Send message via channel adapter
 * 3. Create message event
 */
export async function deliverQuote(
  db: PgDatabase<any>,
  input: DeliverQuoteInput,
  adapters: {
    sms?: MessagingAdapter;
    whatsapp?: MessagingAdapter;
    email?: EmailAdapter;
    storage: StorageAdapter;
  }
): Promise<DeliverQuoteResult> {
  // 1. Upload PDF to storage
  const pdfPath = `quotes/${input.projectId}/${generateId()}.pdf`;
  await adapters.storage.upload(
    "documents",
    pdfPath,
    input.pdfBuffer,
    "application/pdf"
  );

  let externalId: string | undefined;

  // 2. Send message via chosen channel
  try {
    if (input.channel === "sms" && adapters.sms && input.recipientPhone) {
      const smsText = `Offert från ${input.tenantName}. Se och godkänn här: ${input.quoteViewUrl}`;
      const result = await adapters.sms.sendMessage(input.recipientPhone, smsText);
      externalId = result.id;
    } else if (input.channel === "whatsapp" && adapters.whatsapp && input.recipientPhone) {
      const result = await adapters.whatsapp.sendTemplate(
        input.recipientPhone,
        "quote_notification",
        {
          company: input.tenantName,
          link: input.quoteViewUrl,
        }
      );
      externalId = result.id;
    } else if (input.channel === "email" && adapters.email && input.recipientEmail) {
      const result = await adapters.email.sendEmail({
        from: `${input.tenantName} <noreply@resonansia.se>`,
        to: [input.recipientEmail],
        subject: `Offert från ${input.tenantName}`,
        html: `
          <h2>Offert från ${input.tenantName}</h2>
          <p>Du har fått en ny offert. Klicka på länken nedan för att se och godkänna:</p>
          <p><a href="${input.quoteViewUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Se offert</a></p>
          <p>Offerten finns även bifogad som PDF.</p>
        `,
        attachments: [
          {
            filename: "offert.pdf",
            content: input.pdfBuffer.toString("base64"),
          },
        ],
      });
      externalId = result.id;
    } else {
      return {
        success: false,
        messageEventId: "",
        error: `No adapter available for channel: ${input.channel}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      messageEventId: "",
      error: err instanceof Error ? err.message : "Delivery failed",
    };
  }

  // 3. Create message event
  const event = await createEvent(db, input.tenantId, {
    nodeId: input.projectId,
    typeCode: "message",
    data: {
      text: `Offert skickad via ${input.channel}`,
      channel: input.channel,
      direction: "outbound",
      external_id: externalId ?? null,
    },
    origin: "system",
    occurredAt: new Date(),
  });

  return {
    success: true,
    messageEventId: event.id,
  };
}
