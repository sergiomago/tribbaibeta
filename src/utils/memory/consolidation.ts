import { MemoryMetadata, JsonMetadata } from './types';
import { supabase } from '@/integrations/supabase/client';
import { createEmbedding } from '../embeddings';
import { summarizeMemories } from '../summarization';

const CONSOLIDATION_THRESHOLD = 5;
const SIMILARITY_THRESHOLD = 0.85;

async function findSimilarMemories(
  memories: any[],
  targetEmbedding: number[],
  threshold: number
): Promise<any[]> {
  return memories.filter((memory) => {
    if (!memory.embedding) return false;
    const similarity = cosineSimilarity(targetEmbedding, memory.embedding);
    return similarity > threshold;
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function consolidateMemories(roleId: string): Promise<void> {
  try {
    const { data: memories, error } = await supabase
      .from('role_memories')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert database JSON to MemoryMetadata
    const processedMemories = memories.map(memory => ({
      ...memory,
      metadata: {
        timestamp: Date.now(),
        ...(memory.metadata as JsonMetadata)
      } as MemoryMetadata
    }));

    // Check if consolidation is needed
    if (processedMemories.length < CONSOLIDATION_THRESHOLD) {
      return;
    }

    // Group similar memories
    const consolidatedGroups: any[][] = [];
    const processedIds = new Set<string>();

    for (const memory of processedMemories) {
      if (processedIds.has(memory.id)) continue;

      const embedding = memory.embedding || await createEmbedding(memory.content);
      const similarMemories = await findSimilarMemories(
        processedMemories.filter(m => !processedIds.has(m.id)),
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
      const oldestTimestamp = Math.min(...group.map(m => m.metadata.timestamp));

      // Create new consolidated memory
      const { error: insertError } = await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content: summary,
          metadata: {
            timestamp: oldestTimestamp,
            consolidated: true,
            source_count: group.length,
            source_ids: group.map(m => m.id)
          },
          embedding: await createEmbedding(summary)
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