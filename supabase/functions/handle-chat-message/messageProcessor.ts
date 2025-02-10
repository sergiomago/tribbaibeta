
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { llongtermClient } from "./llongtermClient.ts";
import { LlongtermError } from "./errors.ts";

async function formatConversationHistory(
  messages: Message[],
  role: any
): Promise<string> {
  if (!messages.length) return '';
  
  return messages
    .map(msg => `${msg.role_id ? msg.role?.name || 'Assistant' : 'User'}: ${msg.content}`)
    .join('\n');
}

function formatResponseStyle(style: any) {
  if (!style) return '';
  
  return `Communication Style:
- Complexity: ${style.complexity || 'balanced'} (detailed/simple)
- Tone: ${style.tone || 'professional'} (technical/conversational)
- Format: ${style.format || 'flexible'} (structured/flexible)`;
}

async function analyzeMessageTopic(content: string): Promise<{
  primary_topic: string;
  related_topics: string[];
  confidence: number;
}> {
  // Simple topic analysis based on content
  const topics = content.toLowerCase().split(' ');
  const uniqueTopics = [...new Set(topics)];
  
  return {
    primary_topic: uniqueTopics[0] || 'general',
    related_topics: uniqueTopics.slice(1, 4),
    confidence: 0.8
  };
}

async function calculateMemorySignificance(
  relevance: number,
  interactionCount: number,
  timestamp: number
): Promise<number> {
  const now = Date.now();
  const timeDiff = (now - timestamp) / (24 * 60 * 60 * 1000); // Convert to days
  const timeFactor = Math.exp(-timeDiff / 30); // Exponential decay over 30 days
  
  return relevance * 0.4 + 
         Math.min(interactionCount / 10, 1) * 0.3 + 
         timeFactor * 0.3;
}

async function getNextRespondingRole(
  supabase: SupabaseClient,
  threadId: string,
  lastMessageRole: string | null
): Promise<string | null> {
  const { data: responseOrder } = await supabase
    .from('thread_response_order')
    .select('*')
    .eq('thread_id', threadId)
    .order('response_position', { ascending: true });

  if (!responseOrder?.length) return null;

  if (!lastMessageRole) {
    return responseOrder[0].role_id;
  }

  const currentIndex = responseOrder.findIndex(r => r.role_id === lastMessageRole);
  if (currentIndex === -1) return responseOrder[0].role_id;

  const nextIndex = (currentIndex + 1) % responseOrder.length;
  return responseOrder[nextIndex].role_id;
}

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[],
  responseOrder: number = 1,
  totalResponders: number = 1,
  relevanceScore: number = 1.0,
  matchingDomains: string[] = []
) {
  console.log('Processing message for role:', roleId);

  try {
    // Check message depth before processing
    const currentDepth = userMessage.depth_level || 0;
    if (currentDepth >= 9) {
      console.log('Maximum conversation depth reached');
      return null;
    }

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError) throw roleError;
    if (!role) throw new Error('Role not found');

    // Get next responding role
    const nextRole = await getNextRespondingRole(
      supabase,
      threadId,
      previousResponses[previousResponses.length - 1]?.role_id || null
    );

    let mind = null;
    let memoryResponse = null;
    let knowledgeResponse = null;

    try {
      // Get or create mind
      mind = await llongtermClient.getMind(roleId);
      if (!mind) {
        console.log('Creating new mind for role:', roleId);
        
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

      // Analyze message topic
      const topicAnalysis = await analyzeMessageTopic(userMessage.content);

      // Format conversation history with enhanced metadata
      const conversationHistory = previousResponses.map(msg => ({
        author: msg.role_id ? 'assistant' : 'user',
        message: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        metadata: {
          role_id: msg.role_id,
          role_name: msg.role?.name,
          expertise: msg.role?.expertise_areas,
          topic_classification: topicAnalysis,
          interaction_depth: msg.depth_level || 0
        }
      }));

      // Add current message
      conversationHistory.push({
        author: 'user',
        message: userMessage.content,
        timestamp: Date.now(),
        metadata: { 
          thread_id: threadId,
          topic_classification: topicAnalysis
        }
      });

      if (mind) {
        // Store conversation in memory with enhanced metadata
        memoryResponse = await mind.remember(conversationHistory);
        console.log('Memory response:', memoryResponse);

        // Get relevant context with improved retrieval
        knowledgeResponse = await mind.ask(userMessage.content);
        console.log('Knowledge response:', knowledgeResponse);

        // Calculate memory significance
        const significance = await calculateMemorySignificance(
          knowledgeResponse?.confidence || 0.5,
          previousResponses.length,
          Date.now()
        );

        // Store memory significance
        if (memoryResponse?.memoryId) {
          await supabase
            .from('role_memories')
            .update({
              memory_significance: significance,
              topic_classification: topicAnalysis,
              interaction_summary: {
                roles_involved: [roleId, nextRole].filter(Boolean),
                outcome: null, // Will be updated after response
                effectiveness: relevanceScore
              }
            })
            .eq('id', memoryResponse.memoryId);
        }
      }
    } catch (error) {
      console.error('Error with memory operations:', error);
      // Continue without memory if it fails
    }

    // Create enhanced system prompt with context
    const conversationContext = await formatConversationHistory(previousResponses, role);
    const memoryContext = knowledgeResponse?.relevantMemories
      ?.filter(memory => memory.includes(userMessage.content.substring(0, 10)))
      ?.join('\n') || '';
    
    const systemPrompt = `You are ${role.name}, a specialized AI role in a collaborative team discussion.

ROLE CONTEXT AND EXPERTISE:
${role.description || ''}
${role.instructions || ''}

CONVERSATION HISTORY:
${conversationContext}

${memoryContext ? `RELEVANT MEMORIES (Confidence: ${knowledgeResponse?.confidence || 'N/A'}):
${memoryContext}` : ''}

RESPONSE POSITION AND RELEVANCE:
- You are responding in position ${responseOrder} of ${totalResponders}
- Next responding role: ${nextRole ? 'Another role will respond after you' : 'You are the last responder'}
- Your relevance score for this topic: ${relevanceScore}
- Matching domains: ${matchingDomains.join(', ')}

${formatResponseStyle(role.response_style)}

USER MESSAGE:
${userMessage.content}`;

    console.log('Generated system prompt:', systemPrompt);

    // Generate response
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response:', responseContent.substring(0, 100) + '...');

    // Save response with updated fields
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: roleId,
        responding_role_id: nextRole,
        content: responseContent,
        is_bot: true,
        parent_message_id: userMessage.id,
        depth_level: (userMessage.depth_level || 0) + 1,
        chain_position: responseOrder,
        metadata: {
          response_quality: 1.0,
          response_time: Date.now() - new Date(userMessage.created_at).getTime(),
          role_performance: relevanceScore,
          memory_context: {
            used_memories: knowledgeResponse?.relevantMemories || [],
            memory_id: memoryResponse?.memoryId,
            context_summary: memoryResponse?.summary,
            topic_classification: topicAnalysis
          }
        }
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Store the response in memory with enhanced metadata
    if (mind) {
      try {
        const responseTopicAnalysis = await analyzeMessageTopic(responseContent);
        
        await mind.remember([{
          author: 'assistant',
          message: responseContent,
          timestamp: Date.now(),
          metadata: {
            role_id: roleId,
            thread_id: threadId,
            parent_message_id: userMessage.id,
            response_order: responseOrder,
            topic_classification: responseTopicAnalysis,
            interaction_summary: {
              roles_involved: [roleId, nextRole].filter(Boolean),
              outcome: 'completed',
              effectiveness: relevanceScore
            }
          }
        }]);
      } catch (error) {
        console.error('Error storing response in memory:', error);
      }
    }

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
