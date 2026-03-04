/**
 * In-memory async embedding queue.
 * Processes embedding generation outside the transaction boundary.
 * [FEEDBACK:gen1-impl] In-memory queue — not durable, D-008 bulk strategy untested.
 */
import type { PGlite } from '../db/connection.js';
import type { EmbeddingService } from './embeddings.js';

interface QueueItem {
  nodeId: string;
  text: string;
}

export class EmbeddingQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  constructor(
    private db: PGlite,
    private embeddings: EmbeddingService,
  ) {}

  enqueue(nodeId: string, text: string) {
    this.queue.push({ nodeId, text });
    this.processNext();
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const vector = await this.embeddings.embed(item.text);
        await this.db.query(
          `UPDATE nodes SET embedding = $2
           WHERE node_id = $1 AND valid_to = 'infinity' AND is_deleted = false`,
          [item.nodeId, JSON.stringify(vector)],
        );
      } catch (e) {
        console.error(`[embedding-queue] Failed for ${item.nodeId}:`, e);
        // Don't re-queue — log and move on
      }
    }

    this.processing = false;
  }

  get pending(): number {
    return this.queue.length;
  }
}
