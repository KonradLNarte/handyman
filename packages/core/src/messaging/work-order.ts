import { eq, and } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { nodes, blobs } from "@resonansia/db";
import type { MessagingAdapter } from "@resonansia/integrations";
import { translateMessage } from "../ai/translate";
import { getNode } from "../nodes";
import { sendMessage } from "./send";
import { getLabelId } from "../labels";

export interface GenerateWorkOrderInput {
  tenantId: string;
  projectId: string;
  personId: string;
  channel: "whatsapp" | "sms";
}

export interface WorkOrderResult {
  success: boolean;
  eventId: string;
}

/**
 * Generates and sends a work order to an assigned worker.
 * The work order includes project name, address, scope, and optional photos.
 * Translated to the worker's preferred language with industry glossary.
 */
export async function generateAndSendWorkOrder(
  db: PgDatabase<any>,
  adapter: MessagingAdapter,
  input: GenerateWorkOrderInput
): Promise<WorkOrderResult> {
  // Load project
  const project = await getNode(db, input.tenantId, input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }
  const projectData = project.data as Record<string, unknown>;

  // Load person
  const person = await getNode(db, input.tenantId, input.personId);
  if (!person) {
    throw new Error(`Person not found: ${input.personId}`);
  }
  const personData = person.data as Record<string, unknown>;
  const contact = personData.contact as Record<string, unknown> | undefined;
  const phone = contact?.phone as string;
  const language = (personData.language as string) || "sv";

  if (!phone) {
    throw new Error(`Person ${input.personId} has no phone number`);
  }

  // Build work order content
  const parts: string[] = [];

  // Project name
  const projectName = (projectData.name as string) || "Unnamed project";
  parts.push(`📋 Arbetsorder: ${projectName}`);

  // Address + map link
  const address = projectData.address as Record<string, unknown> | null;
  if (address) {
    const street = address.street ?? "";
    const city = address.city ?? "";
    const postalCode = address.postal_code ?? "";
    const fullAddress = [street, postalCode, city].filter(Boolean).join(", ");
    parts.push(`📍 ${fullAddress}`);

    // Google Maps link
    if (address.lat && address.lng) {
      parts.push(`🗺️ https://www.google.com/maps?q=${address.lat},${address.lng}`);
    } else if (fullAddress) {
      parts.push(
        `🗺️ https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`
      );
    }
  }

  // Scope of work
  const description = projectData.description as string | null;
  if (description) {
    parts.push(`\n🔧 Omfattning:\n${description}`);
  }

  // Notes
  const notes = projectData.notes as string | null;
  if (notes) {
    parts.push(`\n📝 ${notes}`);
  }

  const workOrderText = parts.join("\n");

  // Translate to worker's language
  const translated = await translateMessage({
    text: workOrderText,
    sourceLocale: "sv",
    targetLocale: language,
    context: "construction/painting work order",
  });

  // Send via channel
  const result = await sendMessage(db, adapter, {
    tenantId: input.tenantId,
    recipientPhone: phone,
    text: translated,
    channel: input.channel,
    projectId: input.projectId,
    actorId: input.personId,
  });

  return {
    success: result.success,
    eventId: result.eventId,
  };
}
