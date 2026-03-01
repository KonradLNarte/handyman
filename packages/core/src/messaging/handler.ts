import { sql, eq, and, desc } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { events, edges, blobs } from "@resonansia/db";
import { computeTotal } from "@resonansia/db";
import { generateId, type MessageIntent } from "@resonansia/shared";
import { classifyMessage } from "../ai/classify-message";
import { translateMessage } from "../ai/translate";
import { aiGenerateText } from "../ai/complete";
import { createEvent, type CreateEventInput } from "../events/create";
import { getLabelId } from "../labels";
import { resolveSenderWithProjects } from "./sender";
import { calculateProjectEconomics } from "../economics/calculate";

export interface IncomingMessageInput {
  phoneNumber: string;
  text: string;
  hasMedia: boolean;
  mediaUrl?: string;
  channel: "whatsapp" | "sms";
  externalId: string;
}

export interface HandleResult {
  response: string | null;
  events: Array<Record<string, unknown>>;
}

/**
 * In-memory disambiguation state.
 * Key: normalized phone number, Value: { projects, originalText, originalIntent, timestamp }
 */
const disambiguationCache = new Map<
  string,
  {
    projects: Array<{ id: string; name: string }>;
    originalText: string;
    originalIntent: MessageIntent | null;
    timestamp: number;
  }
>();

// Clear stale disambiguation entries (older than 10 minutes)
function cleanDisambiguation() {
  const now = Date.now();
  for (const [key, val] of disambiguationCache) {
    if (now - val.timestamp > 10 * 60 * 1000) {
      disambiguationCache.delete(key);
    }
  }
}

/**
 * Central message handler. Processes an inbound message through the full pipeline:
 * 1. Resolve sender
 * 2. Log inbound message event
 * 3. Classify message
 * 4. Execute based on intent
 * 5. Log outbound response event
 */
export async function handleIncomingMessage(
  db: PgDatabase<any>,
  input: IncomingMessageInput
): Promise<HandleResult> {
  cleanDisambiguation();

  const createdEvents: Array<Record<string, unknown>> = [];

  // 1. Resolve sender
  const sender = await resolveSenderWithProjects(db, input.phoneNumber);

  // Unknown sender
  if (!sender.person || !sender.tenant) {
    const response = "This number is not registered. Contact your employer.";
    return { response, events: createdEvents };
  }

  const tenantId = sender.tenant.id;
  const personData = sender.person.data as Record<string, unknown>;
  const language = (personData.language as string) || "sv";
  const personName = (personData.name as string) || "Unknown";

  // Determine target node for events (project or tenant org)
  const targetNodeId = sender.activeProject?.id ?? sender.person.id;

  // 2. Log inbound message event
  const inboundEvent = await createEvent(db, tenantId, {
    nodeId: targetNodeId,
    typeCode: "message",
    data: {
      text: input.text || "",
      channel: input.channel,
      direction: "inbound",
      external_id: input.externalId,
    },
    origin: "human",
    occurredAt: new Date(),
    actorId: sender.person.id,
  });
  createdEvents.push(inboundEvent as Record<string, unknown>);

  // Check disambiguation state
  const disambig = disambiguationCache.get(input.phoneNumber);
  if (disambig) {
    const choice = parseInt(input.text?.trim(), 10);
    if (choice >= 1 && choice <= disambig.projects.length) {
      disambiguationCache.delete(input.phoneNumber);
      const chosen = disambig.projects[choice - 1];
      // Re-process with the chosen project
      // For now, handle as time report since that's the most common disambiguation case
      if (disambig.originalIntent && disambig.originalIntent.type === "time_report") {
        const result = await handleTimeReport(
          db,
          tenantId,
          sender.person,
          chosen.id,
          chosen.name,
          disambig.originalIntent.hours,
          language,
          input.channel,
          createdEvents
        );
        return result;
      }
    }
    // If not a valid choice, clear and continue with normal classification
    disambiguationCache.delete(input.phoneNumber);
  }

  // 3. Classify message
  const recentMessages = await getRecentMessages(db, tenantId, targetNodeId, sender.person.id);
  const projectName = sender.activeProject
    ? ((sender.activeProject.data as Record<string, unknown>).name as string)
    : undefined;

  const intent = await classifyMessage({
    text: input.text || "",
    hasMedia: input.hasMedia,
    senderLanguage: language,
    activeProjectName: projectName,
    recentMessages,
  });

  // 4. Execute based on intent
  switch (intent.type) {
    case "time_report": {
      // Check if disambiguation needed
      if (sender.activeProjects.length > 1) {
        const projects = sender.activeProjects.map((p) => ({
          id: p.id,
          name: ((p.data as Record<string, unknown>).name as string) || "Unknown",
        }));
        disambiguationCache.set(input.phoneNumber, {
          projects,
          originalText: input.text,
          originalIntent: intent,
          timestamp: Date.now(),
        });
        const projectList = projects
          .map((p, i) => `${i + 1}. ${p.name}`)
          .join("\n");
        const response = await translateIfNeeded(
          `You're on multiple projects. Which one?\n${projectList}`,
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      if (!sender.activeProject) {
        const response = await translateIfNeeded(
          "You're not assigned to any active project.",
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      return handleTimeReport(
        db,
        tenantId,
        sender.person,
        sender.activeProject.id,
        projectName!,
        intent.hours,
        language,
        input.channel,
        createdEvents
      );
    }

    case "correction": {
      if (!sender.activeProject) {
        const response = await translateIfNeeded(
          "You're not assigned to any active project.",
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      return handleCorrection(
        db,
        tenantId,
        sender.person,
        sender.activeProject.id,
        intent.hours,
        language,
        input.channel,
        createdEvents
      );
    }

    case "photo": {
      if (!sender.activeProject) {
        const response = await translateIfNeeded(
          "You're not assigned to any active project. Photo not saved.",
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      return handlePhoto(
        db,
        tenantId,
        sender.person,
        sender.activeProject.id,
        projectName!,
        input.mediaUrl,
        intent.caption,
        language,
        input.channel,
        createdEvents
      );
    }

    case "confirmation": {
      // No action needed, just log
      return { response: null, events: createdEvents };
    }

    case "completion": {
      if (!sender.activeProject) {
        const response = await translateIfNeeded(
          "You're not assigned to any active project.",
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      const response = await translateIfNeeded(
        `You want to mark ${projectName} as complete? Reply OK to confirm.`,
        language
      );
      return logOutboundAndReturn(
        db,
        tenantId,
        sender.activeProject.id,
        response,
        input.channel,
        createdEvents
      );
    }

    case "status_question": {
      if (!sender.activeProject) {
        const response = await translateIfNeeded(
          "You're not assigned to any active project.",
          language
        );
        return logOutboundAndReturn(
          db,
          tenantId,
          targetNodeId,
          response,
          input.channel,
          createdEvents
        );
      }

      return handleStatusQuestion(
        db,
        tenantId,
        sender.person,
        sender.activeProject.id,
        projectName!,
        intent.question,
        language,
        input.channel,
        createdEvents
      );
    }

    case "other":
    default: {
      const response = await translateIfNeeded(
        "I didn't understand that. Send a number for hours, a photo, or 'done' when finished.",
        language
      );
      return logOutboundAndReturn(
        db,
        tenantId,
        targetNodeId,
        response,
        input.channel,
        createdEvents
      );
    }
  }
}

async function handleTimeReport(
  db: PgDatabase<any>,
  tenantId: string,
  person: Record<string, unknown>,
  projectId: string,
  projectName: string,
  hours: number,
  language: string,
  channel: "whatsapp" | "sms",
  createdEvents: Array<Record<string, unknown>>
): Promise<HandleResult> {
  const personData = person.data as Record<string, unknown>;
  const unitPrice = await resolveUnitPrice(db, tenantId, person.id as string, projectId);

  const timeEvent = await createEvent(db, tenantId, {
    nodeId: projectId,
    typeCode: "time",
    data: { break_minutes: null, note: `Reported via ${channel}` },
    qty: hours,
    unitCode: "hour",
    unitPrice,
    origin: "human",
    occurredAt: new Date(),
    actorId: person.id as string,
  });
  createdEvents.push(timeEvent as Record<string, unknown>);

  const response = await translateIfNeeded(
    `✓ ${hours}h registered on ${projectName}.`,
    language
  );

  return logOutboundAndReturn(db, tenantId, projectId, response, channel, createdEvents);
}

async function handleCorrection(
  db: PgDatabase<any>,
  tenantId: string,
  person: Record<string, unknown>,
  projectId: string,
  newHours: number,
  language: string,
  channel: "whatsapp" | "sms",
  createdEvents: Array<Record<string, unknown>>
): Promise<HandleResult> {
  // Find the most recent time event by this person on this project
  const timeTypeId = await getLabelId(db, "event_type", "time", tenantId);
  const adjustmentTypeId = await getLabelId(db, "event_type", "adjustment", tenantId);

  const recentEvents = await db.execute(sql`
    SELECT id, ref_id, qty, unit_price, unit_id, occurred_at
    FROM events
    WHERE tenant_id = ${tenantId}
      AND node_id = ${projectId}
      AND actor_id = ${person.id as string}
      AND type_id IN (${sql`${timeTypeId}`}, ${sql`${adjustmentTypeId}`})
    ORDER BY id DESC
    LIMIT 10
  `);

  const rows = (Array.isArray(recentEvents) ? recentEvents : recentEvents.rows) as Array<{
    id: string;
    ref_id: string | null;
    qty: string | null;
    unit_price: string | null;
    unit_id: number | null;
    occurred_at: Date;
  }>;

  if (rows.length === 0) {
    const response = await translateIfNeeded(
      "No recent time entry found to correct.",
      language
    );
    return logOutboundAndReturn(db, tenantId, projectId, response, channel, createdEvents);
  }

  // Find the root event (follow ref_id chain)
  const mostRecent = rows[0];
  const rootId = mostRecent.ref_id ?? mostRecent.id;

  // Get root event details for unit_price
  const rootResult = await db.execute(sql`
    SELECT qty, unit_price, unit_id, occurred_at
    FROM events
    WHERE id = ${rootId} AND tenant_id = ${tenantId}
  `);
  const rootRows = (Array.isArray(rootResult) ? rootResult : rootResult.rows) as Array<{
    qty: string | null;
    unit_price: string | null;
    unit_id: number | null;
    occurred_at: Date;
  }>;
  const rootEvent = rootRows[0] ?? mostRecent;

  const unitPrice = rootEvent.unit_price ? parseFloat(rootEvent.unit_price) : 0;
  const total = computeTotal(newHours, unitPrice);

  const adjustmentEvent = await createEvent(db, tenantId, {
    nodeId: projectId,
    typeCode: "adjustment",
    data: { reason: `User corrected via ${channel}` },
    qty: newHours,
    unitCode: "hour",
    unitPrice,
    origin: "human",
    occurredAt: rootEvent.occurred_at,
    actorId: person.id as string,
    refId: rootId,
  });
  createdEvents.push(adjustmentEvent as Record<string, unknown>);

  const response = await translateIfNeeded(
    `✓ Changed to ${newHours}h.`,
    language
  );

  return logOutboundAndReturn(db, tenantId, projectId, response, channel, createdEvents);
}

async function handlePhoto(
  db: PgDatabase<any>,
  tenantId: string,
  person: Record<string, unknown>,
  projectId: string,
  projectName: string,
  mediaUrl: string | undefined,
  caption: string | undefined,
  language: string,
  channel: "whatsapp" | "sms",
  createdEvents: Array<Record<string, unknown>>
): Promise<HandleResult> {
  const photoUrl = mediaUrl ?? "";

  // Create blob entry
  const blobTypeId = await getLabelId(db, "blob_type", "photo", tenantId).catch(() =>
    // Fall back to a default if blob_type label doesn't exist
    getLabelId(db, "node_type", "project", tenantId)
  );

  const blobId = generateId();
  await db.insert(blobs).values({
    id: blobId,
    tenant_id: tenantId,
    node_id: projectId,
    type_id: blobTypeId,
    url: photoUrl,
    metadata: { caption: caption ?? null, uploaded_by: person.id },
  });

  // Create photo event
  const photoEvent = await createEvent(db, tenantId, {
    nodeId: projectId,
    typeCode: "photo",
    data: {
      url: photoUrl,
      caption: caption ?? null,
      thumbnail_url: null,
    },
    origin: "human",
    occurredAt: new Date(),
    actorId: person.id as string,
  });
  createdEvents.push(photoEvent as Record<string, unknown>);

  const response = await translateIfNeeded(
    `✓ Photo saved to ${projectName}.`,
    language
  );

  return logOutboundAndReturn(db, tenantId, projectId, response, channel, createdEvents);
}

async function handleStatusQuestion(
  db: PgDatabase<any>,
  tenantId: string,
  person: Record<string, unknown>,
  projectId: string,
  projectName: string,
  question: string,
  language: string,
  channel: "whatsapp" | "sms",
  createdEvents: Array<Record<string, unknown>>
): Promise<HandleResult> {
  // Build project context
  const economics = await calculateProjectEconomics(db, tenantId, projectId);

  const contextPrompt = `Project: ${projectName}
Quoted total: ${economics.quotedTotal} SEK
Time cost: ${economics.timeCost} SEK
Material cost: ${economics.materialCost} SEK
Margin: ${economics.margin} SEK (${economics.marginPercent.toFixed(1)}%)

Worker question: ${question}`;

  let answer = await aiGenerateText({
    tier: "cheap",
    system: `You are a helpful construction project assistant. Answer the worker's question briefly and naturally based on the project data. Keep it under 2 sentences. Respond in ${language === "sv" ? "Swedish" : language === "ar" ? "Arabic" : language === "pl" ? "Polish" : "English"}.`,
    prompt: contextPrompt,
  });

  return logOutboundAndReturn(db, tenantId, projectId, answer, channel, createdEvents);
}

/**
 * Resolves unit_price for a person on a project.
 * Priority: project-specific rate (edge data) → person default rate → 0
 */
async function resolveUnitPrice(
  db: PgDatabase<any>,
  tenantId: string,
  personId: string,
  projectId: string
): Promise<number> {
  // Check assigned_to edge for project-specific rate
  const assignedToTypeId = await getLabelId(db, "edge_type", "assigned_to", tenantId);
  const edgeRows = await db
    .select()
    .from(edges)
    .where(
      and(
        eq(edges.tenant_id, tenantId),
        eq(edges.source_id, personId),
        eq(edges.target_id, projectId),
        eq(edges.type_id, assignedToTypeId)
      )
    );

  if (edgeRows.length > 0 && edgeRows[0].data) {
    const edgeData = edgeRows[0].data as Record<string, unknown>;
    if (typeof edgeData.rate === "number" && edgeData.rate > 0) {
      return edgeData.rate;
    }
  }

  // Check subcontractor_of edge
  try {
    const subTypeId = await getLabelId(db, "edge_type", "subcontractor_of", tenantId);
    const subEdges = await db
      .select()
      .from(edges)
      .where(
        and(
          eq(edges.tenant_id, tenantId),
          eq(edges.source_id, personId),
          eq(edges.type_id, subTypeId)
        )
      );
    if (subEdges.length > 0 && subEdges[0].data) {
      const subData = subEdges[0].data as Record<string, unknown>;
      if (typeof subData.rate === "number" && subData.rate > 0) {
        return subData.rate;
      }
    }
  } catch {
    // Label might not exist
  }

  // Fall back to person's hourly_rate
  const personResult = await db.execute(sql`
    SELECT data->'hourly_rate' as hourly_rate
    FROM nodes
    WHERE id = ${personId} AND tenant_id = ${tenantId}
  `);
  const personRows = (Array.isArray(personResult) ? personResult : personResult.rows) as Array<{
    hourly_rate: number | null;
  }>;
  if (personRows.length > 0 && personRows[0].hourly_rate !== null) {
    return Number(personRows[0].hourly_rate);
  }

  // Last resort: 0 (admin will be warned via notification)
  return 0;
}

async function translateIfNeeded(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === "sv") return text;
  // Messages are written in a mix of Swedish/English - translate to target
  return translateMessage({
    text,
    sourceLocale: "sv",
    targetLocale: targetLanguage,
    context: "construction/painting worker messaging",
  });
}

async function logOutboundAndReturn(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  response: string,
  channel: "whatsapp" | "sms",
  createdEvents: Array<Record<string, unknown>>
): Promise<HandleResult> {
  const outboundEvent = await createEvent(db, tenantId, {
    nodeId,
    typeCode: "message",
    data: {
      text: response,
      channel,
      direction: "outbound",
      external_id: null,
    },
    origin: "system",
    occurredAt: new Date(),
  });
  createdEvents.push(outboundEvent as Record<string, unknown>);

  return { response, events: createdEvents };
}

async function getRecentMessages(
  db: PgDatabase<any>,
  tenantId: string,
  nodeId: string,
  personId: string
): Promise<{ role: "user" | "assistant"; text: string }[]> {
  try {
    const messageTypeId = await getLabelId(db, "event_type", "message", tenantId);
    const result = await db.execute(sql`
      SELECT data, origin
      FROM events
      WHERE tenant_id = ${tenantId}
        AND node_id = ${nodeId}
        AND type_id = ${messageTypeId}
      ORDER BY id DESC
      LIMIT 6
    `);
    const rows = (Array.isArray(result) ? result : result.rows) as Array<{
      data: Record<string, unknown>;
      origin: string;
    }>;

    return rows
      .reverse()
      .map((r) => ({
        role: (r.origin === "human" ? "user" : "assistant") as "user" | "assistant",
        text: (r.data?.text as string) || "",
      }))
      .filter((m) => m.text.length > 0);
  } catch {
    return [];
  }
}
