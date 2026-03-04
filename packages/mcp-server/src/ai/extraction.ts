/**
 * LLM entity extraction — spec §3.2.
 * Calls OpenAI gpt-4o-mini or uses mock for tests.
 */

export interface ExtractionResult {
  primary_entity: {
    type: string;
    data: Record<string, unknown>;
  };
  mentioned_entities: Array<{
    type: string;
    data: Record<string, unknown>;
    existing_match_id: string | null;
    match_confidence: number;
  }>;
  relationships: Array<{
    edge_type: string;
    source: string | number;
    target: string | number;
    data?: Record<string, unknown>;
  }>;
  action_items: string[];
}

export interface ExtractionService {
  extract(
    content: string,
    source: string,
    entityTypes: Array<{ name: string; description?: string; label_schema?: Record<string, unknown> }>,
    edgeTypes: Array<{ name: string; description?: string }>,
    existingEntities: Array<{ id: string; type: string; name: string }>,
  ): Promise<ExtractionResult>;
}

/**
 * Mock extraction service — deterministic extraction for tests.
 */
export function createMockExtractionService(): ExtractionService {
  return {
    async extract(content, source, entityTypes, edgeTypes) {
      // Simple keyword-based extraction
      const firstType = entityTypes.find((t) => t.name !== 'note')?.name ?? 'note';

      return {
        primary_entity: {
          type: firstType,
          data: { name: content.slice(0, 50), content, source },
        },
        mentioned_entities: [],
        relationships: [],
        action_items: [],
      };
    },
  };
}

/**
 * OpenAI extraction service (requires OPENAI_API_KEY).
 */
export function createOpenAIExtractionService(apiKey: string): ExtractionService {
  return {
    async extract(content, source, entityTypes, edgeTypes, existingEntities) {
      const entityTypesBlock = entityTypes
        .map(
          (t) =>
            `- ${t.name}: ${t.description ?? 'No description'}${t.label_schema ? `\n  Schema: ${JSON.stringify(t.label_schema)}` : ''}`,
        )
        .join('\n');

      const edgeTypesBlock = edgeTypes
        .map((t) => `- ${t.name}: ${t.description ?? 'No description'}`)
        .join('\n');

      const existingBlock =
        existingEntities.length > 0
          ? existingEntities
              .map((e) => `- [${e.type}] ${e.name} (id: ${e.id})`)
              .join('\n')
          : '(none)';

      const systemPrompt = `You are a structured entity extraction agent for a knowledge graph.
Your task: given free-text input, extract structured entities, relationships, and action items.

RULES:
- Output ONLY valid JSON. No markdown, no explanation, no commentary.
- Classify entities using ONLY the types listed below. If no type fits, use "note".
- Map text attributes to the type's schema fields. Omit fields you cannot confidently extract.
- Relationships MUST use edge types from the AVAILABLE EDGE TYPES list.
- All extracted data reflects what the text STATES. Do not infer facts not present in the input.

AVAILABLE ENTITY TYPES:
${entityTypesBlock}

AVAILABLE EDGE TYPES:
${edgeTypesBlock}

EXISTING ENTITIES (potential deduplication targets):
${existingBlock}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Extract structured data from:\n---\n${content}\n---\nSource: ${source}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const resultText = data.choices[0]!.message.content;
      return JSON.parse(resultText) as ExtractionResult;
    },
  };
}
