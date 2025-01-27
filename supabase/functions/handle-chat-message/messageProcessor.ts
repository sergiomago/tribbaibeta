import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";

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
    // Get role details with error handling
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching role:', roleError);
      throw new Error(`Error fetching role: ${roleError.message}`);
    }
    if (!role) {
      console.error('Role not found:', roleId);
      throw new Error('Role not found');
    }

    // Get role's mind with safe defaults
    const { data: mindData } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .maybeSingle();

    // Get relevant memories with error handling
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

    // Format previous responses with null checks
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
      await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content: responseContent,
          context_type: 'conversation',
          metadata: {
            message_id: userMessage.id,
            thread_id: threadId,
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