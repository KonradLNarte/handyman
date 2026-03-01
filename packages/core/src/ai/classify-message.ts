import { messageIntentSchema, type MessageIntent } from "@resonansia/shared";
import { aiGenerateObject } from "./complete";

export interface ClassifyMessageInput {
  text: string;
  hasMedia: boolean;
  senderLanguage: string;
  activeProjectName?: string;
  recentMessages?: { role: "user" | "assistant"; text: string }[];
}

const SYSTEM_PROMPT = `You are a message classifier for a construction/painting company's field worker messaging system.

Classify the incoming message into exactly ONE of these categories:

1. **time_report** — The worker is reporting hours worked today.
   Examples: "8", "7.5", "6", "٨" (Arabic 8), "osiem" (Polish 8)
   A single number or a number with a brief note means hours.

2. **correction** — The worker is correcting a previous time report.
   Examples: "nej 6", "nej, det var 6", "لا ٦" (Arabic "no, 6"), "nie, 6" (Polish)
   Keywords: nej, nej det var, fel, no, nie, لا, correction, rättning

3. **photo** — The message contains a photo/image (hasMedia=true with no other clear intent).
   If hasMedia is true and the text is empty or just a caption, classify as photo.

4. **status_question** — The worker is asking about project status or progress.
   Examples: "hur långt har vi kommit?", "how much time left?", "كم بقي؟"

5. **confirmation** — The worker is confirming/acknowledging something.
   Examples: "OK", "ok", "👍", "ja", "yes", "نعم", "tak"

6. **completion** — The worker says the project/task is finished.
   Examples: "klart", "klar", "done", "finished", "تم", "gotowe", "färdigt"

7. **other** — Anything that doesn't fit the above categories.

RULES:
- A bare number (like "8" or "7.5") is ALWAYS a time_report.
- Arabic numerals ٠١٢٣٤٥٦٧٨٩ map to 0123456789.
- If the message starts with a negation word followed by a number, it's a correction.
- If hasMedia is true and text is empty or just describes the photo, classify as photo.
- Return ONLY the classification. Do NOT take any action.`;

/**
 * Classifies an incoming message using AI (cheap tier).
 * Returns a structured MessageIntent validated by Zod schema.
 */
export async function classifyMessage(
  input: ClassifyMessageInput
): Promise<MessageIntent> {
  // Handle obvious photo case without AI
  if (input.hasMedia && (!input.text || input.text.trim().length === 0)) {
    return { type: "photo" };
  }

  // Build context for AI
  const contextParts: string[] = [];
  if (input.senderLanguage) {
    contextParts.push(`Sender's language: ${input.senderLanguage}`);
  }
  if (input.activeProjectName) {
    contextParts.push(`Active project: ${input.activeProjectName}`);
  }
  if (input.hasMedia) {
    contextParts.push("Message includes a photo/media attachment.");
  }

  let conversationContext = "";
  if (input.recentMessages && input.recentMessages.length > 0) {
    const recent = input.recentMessages.slice(-3);
    conversationContext =
      "\n\nRecent conversation:\n" +
      recent.map((m) => `${m.role}: ${m.text}`).join("\n");
  }

  const prompt = `${contextParts.join("\n")}

Message to classify: "${input.text}"${conversationContext}`;

  return aiGenerateObject({
    tier: "cheap",
    system: SYSTEM_PROMPT,
    prompt,
    schema: messageIntentSchema,
    schemaName: "MessageIntent",
  });
}
