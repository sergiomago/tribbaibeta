import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function generateRoleResponse(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  memories: any[],
  openai: OpenAI
) {
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  const memoryContext = memories?.length 
    ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
    : '';

  console.log('Generating response with role:', role.name);
  console.log('Memory context:', memoryContext ? 'Present' : 'None');

  try {
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${role.instructions}\n\n${memoryContext}`
        },
        { role: 'user', content: userMessage.content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response successfully');

    const { data: savedMessage, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: roleId,
        content: responseContent,
        chain_id: userMessage.id,
      })
      .select()
      .single();

    if (error) throw error;

    return { savedMessage, role };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

export async function recordInteraction(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  taggedRoleId: string | null,
  analysis: string | null,
  memoryCount: number
) {
  await supabase
    .from('role_interactions')
    .insert({
      thread_id: threadId,
      initiator_role_id: roleId,
      responder_role_id: taggedRoleId || roleId,
      interaction_type: taggedRoleId ? 'direct_response' : 'analysis_based',
      metadata: {
        context_type: 'conversation',
        analysis: analysis || null,
        memory_count: memoryCount
      }
    });
}

export async function updateMemoryRelevance(
  supabase: SupabaseClient,
  memories: any[]
) {
  for (const memory of memories) {
    await supabase
      .from('role_memories')
      .update({ 
        context_relevance: memory.similarity,
        access_count: supabase.sql`access_count + 1`,
        last_accessed: new Date().toISOString()
      })
      .eq('id', memory.id);
  }
}