import { aiGenerateText } from "./complete";
import { getGlossaryTerms, type GlossaryTerm } from "./glossary";

export interface TranslateMessageInput {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  context?: string;
  glossaryTerms?: GlossaryTerm[];
}

/**
 * Translates text using AI with industry glossary support.
 * Uses cheap tier for short messages, as required by the spec.
 * If source and target are the same, returns the original text.
 */
export async function translateMessage(
  input: TranslateMessageInput
): Promise<string> {
  // No translation needed if same locale
  if (input.sourceLocale === input.targetLocale) {
    return input.text;
  }

  // Merge platform glossary with any provided terms (provided terms override)
  const platformTerms = getGlossaryTerms(input.sourceLocale, input.targetLocale);
  const allTerms = [...platformTerms, ...(input.glossaryTerms ?? [])];

  let glossarySection = "";
  if (allTerms.length > 0) {
    const termLines = allTerms
      .map((t) => `  "${t.source}" → "${t.target}"`)
      .join("\n");
    glossarySection = `\n\nINDUSTRY GLOSSARY (use these exact translations):\n${termLines}`;
  }

  let contextSection = "";
  if (input.context) {
    contextSection = `\nContext: ${input.context}`;
  }

  const system = `You are a professional translator for the Swedish construction and painting industry. Translate naturally using trade terminology, not generic words. Output ONLY the translated text, nothing else.`;

  const prompt = `Translate from ${getLanguageName(input.sourceLocale)} to ${getLanguageName(input.targetLocale)}.${contextSection}${glossarySection}

Text to translate:
${input.text}`;

  return aiGenerateText({
    tier: "cheap",
    system,
    prompt,
  });
}

function getLanguageName(locale: string): string {
  const names: Record<string, string> = {
    sv: "Swedish",
    ar: "Arabic",
    pl: "Polish",
    en: "English",
    fi: "Finnish",
    de: "German",
  };
  return names[locale] ?? locale;
}
