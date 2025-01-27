import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[]
) {
  console.log('Processing message for role:', roleId);

  try {
    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError) throw new Error(`Error fetching role: ${roleError.message}`);
    if (!role) throw new Error('Role not found');

    // Get role's mind
    const { data: mindData } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .maybeSingle();

    // Get relevant memories for context with safe error handling
    let relevantMemories = [];
    try {
      const { data: memories, error: memoriesError } = await supabase
        .from('role_memories')
        .select('content, metadata')
        .eq('role_id', roleId)
        .order('importance_score', { ascending: false })
        .limit(5);

      if (!memoriesError && memories) {
        relevantMemories = memories;
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
      // Continue without memories rather than failing
    }

    console.log('Retrieved relevant memories:', relevantMemories?.length || 0);

    // Store message as memory with error handling
    try {
      await storeMessageMemory(supabase, roleId, threadId, userMessage);
    } catch (error) {
      console.error('Error storing memory:', error);
      // Continue processing even if memory storage fails
    }

    // Format previous responses for context with null checks
    const formattedResponses = (previousResponses || [])
      .map(msg => {
        const roleName = msg.role?.name || 'Unknown';
        return `${roleName}: ${msg.content}`;
      })
      .join('\n\n');

    // Create memory context string with null check
    const memoryContext = relevantMemories?.length 
      ? `Relevant memories:\n${relevantMemories.map(m => m.content).join('\n\n')}`
      : '';

    // Create the enhanced system prompt with null checks
    const systemPrompt = `You are ${role.name || 'an AI assistant'}, ${
      role.expertise_areas?.length 
        ? `an AI role with expertise in: ${role.expertise_areas.join(', ')}`
        : 'an AI assistant with general knowledge'
    }

${memoryContext}

Recent conversation:
${formattedResponses}

Your specific role instructions:
${role.instructions || 'Be helpful and informative.'}`;

    // Generate response with error handling
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.content }
      ],
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No response generated from OpenAI');
    }

    const responseContent = completion.choices[0].message.content;

    // Store response as memory with safe defaults and null checks
    try {
      await storeMessageMemory(supabase, roleId, threadId, {
        content: responseContent,
        metadata: {
          is_response: true,
          to_message_id: userMessage.id,
          importance_score: 1.0,  // Safe default
          confidence_score: 1.0,  // Safe default
          relevance_score: 1.0    // Safe default
        }
      });
    } catch (error) {
      console.error('Error storing response memory:', error);
      // Continue even if memory storage fails
    }

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}

async function storeMessageMemory(
  supabase: SupabaseClient,
  roleId: string,
  threadId: string,
  message: any
) {
  try {
    const { error } = await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: message.content,
        context_type: 'conversation',
        metadata: {
          thread_id: threadId,
          message_id: message.id,
          timestamp: new Date().toISOString(),
          memory_type: 'conversation',
          importance_score: 1.0,    // Safe default
          confidence_score: 1.0,    // Safe default
          relevance_score: 1.0,     // Safe default
          conversation_context: {
            is_response: message.metadata?.is_response || false,
            to_message_id: message.metadata?.to_message_id
          }
        }
      });

    if (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in storeMessageMemory:', error);
    throw error;
  }
}