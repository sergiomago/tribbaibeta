
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
  const timeDiff = (now - timestamp) / (24 * 60 * 60 * 1000);
  const timeFactor = Math.exp(-timeDiff / 30);
  
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
  let mind = null;
  let memoryResponse = null;
  let knowledgeResponse = null;

  try {
    mind = await llongtermClient.getMind(roleId);
    if (!mind) {
      console.log('Creating new mind for role:', roleId);
      
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
      
      mind = await llongtermClient.createMind({
        specialism: role.name,
        specialismDepth: 8,
        metadata: {
          roleId,
          expertise: role.expertise_areas || [],
          interaction: {
            style: role.response_style || {},
            preferences: role.interaction_preferences || {}
          },
          created: new Date().toISOString()
        }
      });
    }

    if (mind) {
      memoryResponse = await mind.remember(conversationHistory);
      console.log('Memory response:', memoryResponse);

      knowledgeResponse = await mind.ask(content);
      console.log('Knowledge response:', knowledgeResponse);

      const significance = await calculateMemorySignificance(
        knowledgeResponse?.confidence || 0.5,
        conversationHistory.length,
        Date.now()
      );

      if (memoryResponse?.memoryId) {
        await supabase
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
      }
    }
  } catch (error) {
    console.error('Error with memory operations:', error);
  }

  return { mind, memoryResponse, knowledgeResponse };
}
