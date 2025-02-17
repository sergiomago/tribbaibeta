
import { supabase } from "@/integrations/supabase/client";
import { MemoryMetadata, DatabaseMemory } from "./types";
import { createEmbedding } from "../embeddings";
import { summarizeMemories } from "../summarization";

const CONSOLIDATION_THRESHOLD = 5;
const SIMILARITY_THRESHOLD = 0.85;

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function findSimilarMemories(
  memories: DatabaseMemory[],
  targetEmbedding: number[],
  threshold: number
): Promise<DatabaseMemory[]> {
  return memories.filter((memory) => {
    if (!memory.embedding) return false;
    const embedding = JSON.parse(memory.embedding) as number[];
    const similarity = cosineSimilarity(targetEmbedding, embedding);
    return similarity > threshold;
  });
}

export async function consolidateMemories(roleId: string): Promise<void> {
  try {
    const { data: memories, error } = await supabase
      .from('role_memories')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!memories || memories.length < CONSOLIDATION_THRESHOLD) return;

    const processedIds = new Set<string>();
    const consolidatedGroups: DatabaseMemory[][] = [];

    for (const memory of memories) {
      if (processedIds.has(memory.id)) continue;

      const embedding = memory.embedding ? JSON.parse(memory.embedding) as number[] : await createEmbedding(memory.content);
      const similarMemories = await findSimilarMemories(
        memories.filter(m => !processedIds.has(m.id)),
        embedding,
        SIMILARITY_THRESHOLD
      );

      if (similarMemories.length > 1) {
        consolidatedGroups.push(similarMemories);
        similarMemories.forEach(m => processedIds.add(m.id));
      }
    }

    // Consolidate each group
    for (const group of consolidatedGroups) {
      const contents = group.map(m => m.content);
      const summary = await summarizeMemories(contents);
      const summaryEmbedding = await createEmbedding(summary);
      const oldestTimestamp = Math.min(...group.map(m => new Date(m.created_at).getTime()));

      // Create new consolidated memory
      const { error: insertError } = await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content: summary,
          context_type: 'consolidated',
          embedding: JSON.stringify(summaryEmbedding),
          metadata: {
            timestamp: oldestTimestamp,
            consolidated: true,
            source_count: group.length,
            source_ids: group.map(m => m.id)
          }
        });

      if (insertError) throw insertError;

      // Delete old memories
      const { error: deleteError } = await supabase
        .from('role_memories')
        .delete()
        .in('id', group.map(m => m.id));

      if (deleteError) throw deleteError;
    }
  } catch (error) {
    console.error('Error consolidating memories:', error);
    throw error;
  }
}
