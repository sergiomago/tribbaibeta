import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function handleInitialAnalysis(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  openai: OpenAI
) {
  console.log('Performing initial analysis...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the user message and determine the primary intent and any special requirements.'
      },
      { role: 'user', content }
    ],
  });

  const analysis = completion.choices[0].message.content;
  
  await supabase
    .from('conversation_states')
    .update({
      current_state: 'role_selection',
      metadata: { analysis, original_message: content }
    })
    .eq('thread_id', threadId);

  return analysis;
}

export async function saveUserMessage(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  taggedRoleId?: string
) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      content,
      tagged_role_id: taggedRoleId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return message;
}

export async function storeRoleMemory(
  supabase: SupabaseClient,
  roleId: string,
  content: string,
  metadata: any
) {
  // Store the memory with enhanced metadata
  const { error } = await supabase
    .from('role_memories')
    .insert({
      role_id: roleId,
      content,
      context_type: 'conversation',
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        memory_type: 'conversation',
        importance_score: 1.0,
      },
      relevance_score: 1.0,
      confidence_score: 1.0,
    });

  if (error) {
    console.error('Error storing role memory:', error);
    throw error;
  }

  // Reinforce similar memories
  const { data: similarMemories } = await supabase.rpc(
    'get_similar_memories',
    {
      p_embedding: content,
      p_match_threshold: 0.7,
      p_match_count: 5,
      p_role_id: roleId
    }
  );

  if (similarMemories?.length) {
    for (const memory of similarMemories) {
      await supabase
        .from('role_memories')
        .update({
          reinforcement_count: supabase.sql`reinforcement_count + 1`,
          last_reinforced: new Date().toISOString(),
        })
        .eq('id', memory.id);
    }
  }
}