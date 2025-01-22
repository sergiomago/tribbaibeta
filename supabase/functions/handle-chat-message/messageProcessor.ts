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
  const allRoles = threadRoles?.map(tr => tr.roles) || [];
  const currentPosition = allRoles.findIndex(r => r.id === roleId) + 1;
  const previousRole = currentPosition > 1 ? allRoles[currentPosition - 2]?.name : 'none';
  const nextRole = currentPosition < allRoles.length ? allRoles[currentPosition]?.name : 'none';
  
  // Format role sequence
  const roleSequence = allRoles.map(r => r.name).join('\n');

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  const systemPrompt = `You are ${role.name}. You're participating in a conversation with other AI roles in this sequence:

${roleSequence}

Your position in this conversation is #${currentPosition}. You are speaking after ${previousRole} and will be followed by ${nextRole}.

Previous responses in this conversation:
${formattedResponses}

When responding, please follow these guidelines:
1. Acknowledge previous speakers by name and briefly reference the points they made.
2. Contribute your unique perspective based on your expertise as ${role.name}.
3. Add to the conversation only if you have relevant knowledge about the topic. If not, politely mention that you don't have additional insights, or that another role might be more knowledgeable.
4. If you are not the last speaker, you can hint that ${nextRole} may have further insights to offer.
5. If you are the last speaker, synthesize the conversation in a concise way, ensuring all major points are covered.

Maintain a collaborative, constructive tone, staying true to your role's expertise and personality. As ${role.name}, build on what's already been said while avoiding unnecessary repetition.`;

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