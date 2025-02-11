
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { 
  analyzeMessageTopic, 
  calculateMemorySignificance,
  handleMemoryOperations 
} from "./processors/memoryProcessor.ts";
import { 
  formatConversationHistory,
  formatResponseStyle,
  generateSystemPrompt 
} from "./processors/conversationFormatter.ts";
import { getNextRespondingRole } from "./processors/responseChainProcessor.ts";
import { llongtermClient } from "./llongtermClient.ts";

async function storeConversationHistory(mind: any, conversationHistory: any[], roleId: string) {
  try {
    // Format messages for Llongterm storage
    const memoryMessages = conversationHistory.map(msg => ({
      author: msg.author,
      message: msg.message,
      timestamp: msg.timestamp,
      metadata: {
        ...msg.metadata,
        role_id: roleId,
        stored_at: Date.now()
      }
    }));

    console.log('Storing conversation history:', {
      messageCount: memoryMessages.length,
      roleId
    });

    // Store messages in Llongterm memory
    const memoryResponse = await mind.remember(memoryMessages);
    
    console.log('Memory storage response:', memoryResponse);
    return memoryResponse;
  } catch (error) {
    console.error('Error storing conversation history:', error);
    return null;
  }
}

async function enrichMessageWithContext(mind: any, content: string, previousResponses: Message[], roleId: string) {
  try {
    // Store conversation history first
    const conversationHistory = previousResponses.map(msg => ({
      author: msg.role_id ? 'assistant' : 'user',
      message: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: {
        role_id: msg.role_id,
        thread_id: msg.thread_id,
      }
    }));

    // Add current message to history
    conversationHistory.push({
      author: 'user',
      message: content,
      timestamp: Date.now(),
      metadata: {
        role_id: roleId,
      }
    });

    // First, store the conversation
    await storeConversationHistory(mind, conversationHistory, roleId);

    // Then, get direct context for the current message
    console.log('Retrieving direct context for:', content);
    const knowledgeResponse = await mind.ask(content);
    const directContext = knowledgeResponse?.relevantMemories || [];
    
    // Get context from previous message if this is a follow-up
    let followUpContext: string[] = [];
    if (previousResponses.length > 0) {
      const lastMessage = previousResponses[previousResponses.length - 1];
      console.log('Retrieving follow-up context for:', lastMessage.content);
      const followUpResponse = await mind.ask(
        `Context about: ${lastMessage.content}`
      );
      followUpContext = followUpResponse?.relevantMemories || [];
    }

    // Combine and deduplicate contexts
    const allContext = [...new Set([...directContext, ...followUpContext])];
    
    console.log('Enriched message context:', {
      directContextCount: directContext.length,
      followUpContextCount: followUpContext.length,
      totalUniqueContext: allContext.length
    });

    return allContext.join('\n');
  } catch (error) {
    console.error('Error enriching message context:', error);
    return '';
  }
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
    // Get role mind
    const { data: roleMind } = await supabase
      .from('role_minds')
      .select('mind_id, status')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .single();

    if (!roleMind?.mind_id) {
      console.log('No active mind found for role:', roleId);
    } else {
      console.log('Found mind for role:', roleMind.mind_id);
    }

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

    // Get enriched context from mind if available
    let mindContext = '';
    if (roleMind?.mind_id) {
      try {
        const mind = await llongtermClient.getMind(roleMind.mind_id);
        if (mind) {
          mindContext = await enrichMessageWithContext(
            mind,
            userMessage.content,
            previousResponses,
            roleId
          );
          console.log('Retrieved enriched mind context:', mindContext ? 'Present' : 'None');
        }
      } catch (error) {
        console.error('Error accessing mind:', error);
      }
    }

    // Create enhanced system prompt with context
    const conversationContext = await formatConversationHistory(previousResponses, role);
    const systemPrompt = generateSystemPrompt(
      role,
      conversationContext,
      mindContext,
      null,
      responseOrder,
      totalResponders,
      nextRole,
      relevanceScore,
      matchingDomains,
      userMessage.content
    );

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

    // Save response
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
            mind_id: roleMind?.mind_id,
            topic_classification: topicAnalysis
          }
        }
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Store response in mind if available
    if (roleMind?.mind_id && responseContent) {
      try {
        const mind = await llongtermClient.getMind(roleMind.mind_id);
        if (mind) {
          await mind.remember([{
            author: 'assistant',
            message: responseContent,
            timestamp: Date.now(),
            metadata: {
              role_id: roleId,
              thread_id: threadId,
              parent_message_id: userMessage.id,
              response_order: responseOrder,
              topic_classification: topicAnalysis,
              interaction_summary: {
                roles_involved: [roleId, nextRole].filter(Boolean),
                outcome: 'completed',
                effectiveness: relevanceScore
              }
            }
          }]);
          console.log('Stored response in mind');
        }
      } catch (error) {
        console.error('Error storing in mind:', error);
      }
    }

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
