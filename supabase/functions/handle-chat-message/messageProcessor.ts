
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { llongtermClient } from "./llongtermClient.ts";
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
      console.error('No active mind found for role:', roleId);
      throw new Error('Role mind not found or inactive');
    }

    console.log('Found mind for role:', roleMind.mind_id);

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

    // Initialize or get existing mind
    console.log('Initializing mind:', roleMind.mind_id);
    const mind = await llongtermClient.getMind(roleMind.mind_id);
    if (!mind) {
      console.log('Mind not found, creating new one');
      // Update mind status to processing
      await supabase.rpc('update_mind_status', {
        p_role_id: roleId,
        p_status: 'processing'
      });

      const newMind = await llongtermClient.createMind({
        specialism: role.name || 'AI Assistant'
      });

      if (!newMind) {
        throw new Error('Failed to create new mind');
      }

      // Update mind_id in database
      await supabase
        .from('role_minds')
        .update({ 
          mind_id: newMind.id,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('role_id', roleId);

      console.log('New mind created and stored:', newMind.id);
    }

    // Store user message immediately
    console.log('Storing user message in mind');
    await mind.remember([{
      author: 'user',
      message: userMessage.content,
      timestamp: Date.now(),
      metadata: {
        thread_id: threadId,
        message_id: userMessage.id
      }
    }]);

    // Get relevant context from previous interactions
    console.log('Retrieving context for:', userMessage.content);
    const knowledgeResponse = await mind.ask(userMessage.content);
    console.log('Retrieved knowledge response:', knowledgeResponse);

    // Format conversation history with enhanced metadata
    const conversationHistory = previousResponses.map(msg => ({
      author: msg.role_id ? 'assistant' : 'user',
      message: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: {
        role_id: msg.role_id,
        role_name: msg.role?.name,
        thread_id: threadId,
        message_id: msg.id
      }
    }));

    // Add current message to history
    conversationHistory.push({
      author: 'user',
      message: userMessage.content,
      timestamp: Date.now(),
      metadata: { 
        thread_id: threadId,
        message_id: userMessage.id
      }
    });

    // Create enhanced system prompt with context
    const conversationContext = await formatConversationHistory(previousResponses, role);
    const systemPrompt = generateSystemPrompt(
      role,
      conversationContext,
      knowledgeResponse.relevantMemories.join('\n'),
      knowledgeResponse,
      responseOrder,
      totalResponders,
      nextRole,
      relevanceScore,
      matchingDomains,
      userMessage.content
    );

    console.log('Generated system prompt with memory context');

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

    // Save response to database
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
          response_quality: knowledgeResponse.confidence,
          response_time: Date.now() - new Date(userMessage.created_at).getTime(),
          role_performance: relevanceScore,
          memory_context: knowledgeResponse.relevantMemories
        }
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Store AI response in mind
    console.log('Storing AI response in mind');
    await mind.remember([{
      author: 'assistant',
      message: responseContent,
      timestamp: Date.now(),
      metadata: {
        role_id: roleId,
        thread_id: threadId,
        message_id: savedMessage.id,
        parent_message_id: userMessage.id,
        response_order: responseOrder,
        confidence: knowledgeResponse.confidence
      }
    }]);

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
