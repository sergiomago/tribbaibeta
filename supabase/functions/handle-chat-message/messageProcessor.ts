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

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  // Create the enhanced system prompt
  const otherRoles = threadRoles?.map(tr => tr.roles.name).join(', ') || '';
  const systemPrompt = `You are ${role.name}${role.alias ? ` (${role.alias})` : ''}, an AI role with the following instructions:

${role.instructions}

You are in a conversation with other AI roles including: ${otherRoles}. When responding:
- Acknowledge previous speakers by name if they've spoken
- Reference and build upon specific points they made
- Add your unique perspective based on your expertise as ${role.name}
- Maintain a collaborative and constructive tone
- Stay true to your role's expertise and perspective

Previous responses in this conversation:
${formattedResponses}`;

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