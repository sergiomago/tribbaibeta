import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function selectResponders(
  supabase: SupabaseClient,
  threadId: string,
  analysis: string,
  openai: OpenAI
) {
  console.log('Selecting responders based on analysis...');
  
  const { data: availableRoles } = await supabase
    .from('thread_roles')
    .select('role_id, roles(*)') 
    .eq('thread_id', threadId);

  // If no roles are found, return empty array instead of throwing error
  if (!availableRoles?.length) {
    console.log('No roles found for thread:', threadId);
    return [];
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Select the most appropriate roles to handle this conversation from: ${
          availableRoles.map(r => `${r.roles.name} (${r.roles.tag})`).join(', ')
        }`
      },
      { role: 'user', content: analysis }
    ],
  });

  const selectedRoles = availableRoles
    .filter(role => completion.choices[0].message.content.includes(role.roles.tag))
    .map(role => role.role_id);

  await supabase
    .from('conversation_states')
    .update({
      current_state: 'response_generation',
      active_roles: selectedRoles
    })
    .eq('thread_id', threadId);

  return selectedRoles;
}

export async function getRelevantMemories(
  supabase: SupabaseClient,
  roleId: string,
  content: string
) {
  const { data: memories } = await supabase
    .rpc('get_similar_memories', {
      p_embedding: content,
      p_match_threshold: 0.7,
      p_match_count: 5,
      p_role_id: roleId
    });

  return memories || [];
}