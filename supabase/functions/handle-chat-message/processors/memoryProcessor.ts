
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "../types.ts";
import { llongtermClient } from "../llongtermClient.ts";

export async function analyzeMessageTopic(content: string): Promise<{
  primary_topic: string;
  related_topics: string[];
  confidence: number;
}> {
  const topics = content.toLowerCase().split(' ');
  const uniqueTopics = [...new Set(topics)];
  
  return {
    primary_topic: uniqueTopics[0] || 'general',
    related_topics: uniqueTopics.slice(1, 4),
    confidence: 0.8
  };
}

export async function calculateMemorySignificance(
  relevance: number,
  interactionCount: number,
  timestamp: number
): Promise<number> {
  const now = Date.now();
  const timeDiff = (now - timestamp) / (24 * 60 * 60 * 1000); // Convert to days
  const timeFactor = Math.exp(-timeDiff / 30); // Decay over 30 days
  
  // Weighted combination of factors
  return relevance * 0.4 + 
         Math.min(interactionCount / 10, 1) * 0.3 + 
         timeFactor * 0.3;
}

export async function handleMemoryOperations(
  supabase: SupabaseClient,
  roleId: string, 
  content: string,
  conversationHistory: any[],
  topicAnalysis: any
) {
  console.log('Starting memory operations for role:', roleId);
  let mind = null;
  let memoryResponse = null;
  let knowledgeResponse = null;

  try {
    // Get or create mind
    mind = await llongtermClient.getMind(roleId);
    if (!mind) {
      console.log('No mind found for role:', roleId);
      return { mind: null, memoryResponse: null, knowledgeResponse: null };
    }

    console.log('Retrieved mind for role:', roleId);

    // Store conversation in memory
    if (conversationHistory.length > 0) {
      memoryResponse = await mind.remember(conversationHistory);
      console.log('Memory storage response:', memoryResponse);
    }

    // Query for relevant context
    knowledgeResponse = await mind.ask(content);
    console.log('Knowledge response:', knowledgeResponse);

    // Calculate memory significance
    const significance = await calculateMemorySignificance(
      knowledgeResponse?.confidence || 0.5,
      conversationHistory.length,
      Date.now()
    );

    // Update memory metadata if we have a memory ID
    if (memoryResponse?.memoryId) {
      const { error: updateError } = await supabase
        .from('role_memories')
        .update({
          memory_significance: significance,
          topic_classification: topicAnalysis,
          interaction_summary: {
            roles_involved: [roleId],
            outcome: null,
            effectiveness: 1.0
          }
        })
        .eq('id', memoryResponse.memoryId);

      if (updateError) {
        console.error('Error updating memory metadata:', updateError);
      }
    }

    return { mind, memoryResponse, knowledgeResponse };
  } catch (error) {
    console.error('Error in handleMemoryOperations:', error);
    return { mind: null, memoryResponse: null, knowledgeResponse: null };
  }
}
