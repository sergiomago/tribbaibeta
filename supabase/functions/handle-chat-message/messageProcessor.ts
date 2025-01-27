import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any
) {
  console.log('Processing message for role:', roleId);

  try {
    // Get role details
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

    // Get recent conversation history - limit to last 5 messages for context
    const { data: history } = await supabase
      .from('messages')
      .select('content, roles(name)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    const conversationContext = history 
      ? history.reverse().map(msg => `${msg.roles?.name || 'User'}: ${msg.content}`).join('\n\n')
      : '';

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are ${role.name}, ${role.description || 'an AI assistant'}.\n\n${role.instructions}` 
        },
        { 
          role: 'system', 
          content: `Recent conversation:\n${conversationContext}` 
        },
        { role: 'user', content: userMessage.content }
      ],
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No response generated from OpenAI');
    }

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}