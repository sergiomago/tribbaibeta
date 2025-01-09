import { Memory } from "./types";

export class MemoryScoring {
  private static readonly INTERACTION_WEIGHT = 0.4;
  private static readonly RECENCY_WEIGHT = 0.3;
  private static readonly RELEVANCE_WEIGHT = 0.3;

  static calculateImportanceScore(memory: Memory): number {
    const interactions = memory.metadata.interaction_count || 0;
    const lastAccessed = memory.metadata.last_accessed ? new Date(memory.metadata.last_accessed) : new Date(0);
    const relevance = memory.metadata.relevance_score || 0;

    const recencyScore = Math.exp(-Math.max(0, Date.now() - lastAccessed.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const interactionScore = Math.min(1, interactions / 10);

    return (
      this.INTERACTION_WEIGHT * interactionScore +
      this.RECENCY_WEIGHT * recencyScore +
      this.RELEVANCE_WEIGHT * relevance
    );
  }
}