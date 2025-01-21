import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { Message, ResponseChain } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function processUserMessage(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  content: string,
  taggedRoleId: string | null
): Promise<Message> {
  console.log('Processing user message:', { threadId, content, taggedRoleId });

  const { data: userMessage, error: messageError } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      content,
      tagged_role_id: taggedRoleId || null,
    })
    .select('id, thread_id, content, tagged_role_id')
    .single();

  if (messageError) throw messageError;
  console.log('User message saved:', userMessage);

  return userMessage;
}

export async function generateRoleResponse(
  supabase: ReturnType<typeof createClient>,
  openai: OpenAI,
  threadId: string,
  roleId: string,
  userMessage: Message,
  chainOrder: number
) {
  console.log('Generating role response:', { threadId, roleId, chainOrder });

  try {
    // Get role details
    const { data: role } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (!role) {
      console.log(`Role ${roleId} not found, skipping`);
      return null;
    }

    // Get conversation history
    const { data: history } = await supabase.rpc(
      'get_conversation_history',
      {
        p_thread_id: threadId,
        p_limit: 10
      }
    );

    // Get relevant memories
    const { data: memories } = await supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: userMessage.content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: role.id
      }
    );

    // Prepare context
    const memoryContext = memories?.length 
      ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
      : '';

    const historyContext = history?.length
      ? `Recent conversation history:\n${history.map(m => 
          `${m.role ? 'Assistant' : 'User'}: ${m.content}`
        ).join('\n')}`
      : '';

    // Generate response
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${role.instructions}\n\n${memoryContext}\n\n${historyContext}`
        },
        { role: 'user', content: userMessage.content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response:', responseContent);

    // Save role's response
    const { data: savedResponse, error: responseError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: roleId,
        content: responseContent,
        chain_id: userMessage.id,
        chain_order: chainOrder
      })
      .select('id')
      .single();

    if (responseError) throw responseError;

    // Store memory
    await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: responseContent,
        context_type: 'conversation',
        metadata: {
          message_id: savedResponse.id,
          thread_id: threadId,
          chain_order: chainOrder,
          user_message: userMessage.content
        }
      });

    return savedResponse;
  } catch (error) {
    console.error(`Error processing response for role ${roleId}:`, error);
    return null;
  }
}