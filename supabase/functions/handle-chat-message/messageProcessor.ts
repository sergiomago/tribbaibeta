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
  // Get role details
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error('Role not found');

  // Get other roles in the thread
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('roles(*)')
    .eq('thread_id', threadId)
    .neq('role_id', roleId);

  // Get the sequence of roles
  const roleSequence = threadRoles?.map(tr => tr.roles.name).join('\n') || '';

  // Find current role's position and adjacent roles
  const allRoles = threadRoles?.map(tr => tr.roles) || [];
  const currentPosition = allRoles.findIndex(r => r.id === roleId) + 1;
  const previousRole = currentPosition > 1 ? allRoles[currentPosition - 2]?.name : 'none';
  const nextRole = currentPosition < allRoles.length ? allRoles[currentPosition]?.name : 'none';

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  // Extract topic from user message (simplified for now)
  const extractedTopic = userMessage.content.slice(0, 100);

  // Create the enhanced system prompt
  const systemPrompt = `You are ${role.name}, an AI role with expertise in: ${role.expertise_areas?.join(', ') || 'general knowledge'}

Current conversation context:
- Topic: ${extractedTopic}
- Previous speakers: ${roleSequence}
- Your position: #${currentPosition} (after ${previousRole}, before ${nextRole})
- Total roles in conversation: ${threadRoles?.length || 0}

Recent context:
${formattedResponses}

Response Guidelines:

1. TAGGING BEHAVIOR:
   - If a specific role is tagged (e.g., @RoleName):
     * If you are the tagged role: Provide your expertise and response
     * If you are NOT the tagged role: Do not respond at all, remain silent
   - If no role is tagged: Follow standard expertise check below

2. EXPERTISE CHECK:
   - If the topic matches your expertise: provide your insights
   - If outside your expertise: respond with "I'll defer to others more qualified in this area"

3. RESPONSE STRUCTURE:
   - Integrate previous speakers' insights with your expertise, building upon their points to create a comprehensive response
   - Add your unique perspective (avoid repeating what others said)
   - Keep responses focused and concise
   - Guide the conversation forward by mentioning which role(s) could contribute next and what valuable insights they might add

4. CONVERSATION FLOW:
   - If you're not the last speaker (your position < total ${threadRoles?.length || 0} roles): focus on your contribution
   - If you're the last speaker (your position = ${threadRoles?.length || 0}): synthesize the discussion and provide concluding insights

5. TONE:
   - Maintain a collaborative, constructive tone
   - Stay true to your role's expertise and personality

Your specific role instructions:
${role.instructions}`;

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage.content }
    ],
  });

  return completion.choices[0].message.content;
}