/**
 * Embedding service — OpenAI text-embedding-3-small or mock.
 * [FEEDBACK:gen1-impl] Mock embeddings used when OPENAI_API_KEY not set.
 */

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Mock embedding service — generates deterministic pseudo-embeddings.
 * Uses a simple hash-based approach for consistent test behavior.
 */
export function createMockEmbeddingService(dimensions = 256): EmbeddingService {
  function hashEmbed(text: string): number[] {
    const vec = new Array(dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % dimensions] += text.charCodeAt(i) / 1000;
    }
    // Normalize
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return magnitude > 0 ? vec.map((v) => v / magnitude) : vec;
  }

  return {
    async embed(text: string) {
      return hashEmbed(text);
    },
    async embedBatch(texts: string[]) {
      return texts.map(hashEmbed);
    },
  };
}

/**
 * OpenAI embedding service (requires OPENAI_API_KEY).
 */
export function createOpenAIEmbeddingService(apiKey: string): EmbeddingService {
  return {
    async embed(text: string) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return data.data[0]!.embedding;
    },

    async embedBatch(texts: string[]) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return data.data.map((d) => d.embedding);
    },
  };
}
