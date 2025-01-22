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

Recent context:
${formattedResponses}

Response Guidelines:
1. EXPERTISE CHECK:
   - If the topic matches your expertise: provide your insights
   - If outside your expertise: respond with "I'll defer to others more qualified in this area"

2. RESPONSE STRUCTURE:
   - Briefly acknowledge relevant points from previous speakers
   - Add your unique perspective (avoid repeating what others said)
   - Keep responses focused and concise

3. CONVERSATION FLOW:
   - If you're not the last speaker: focus on your contribution
   - If you're the last speaker: provide a brief summary of key points

4. TONE:
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