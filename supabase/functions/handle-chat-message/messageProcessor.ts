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

  // Get all roles in the thread in order
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('roles(*)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (!threadRoles) throw new Error('No roles found in thread');

  // Find current role's position and adjacent roles
  const rolesList = threadRoles.map(tr => ({
    name: tr.roles.name,
    alias: tr.roles.alias
  }));
  
  const currentIndex = rolesList.findIndex(r => r.name === role.name);
  const previousRole = currentIndex > 0 ? rolesList[currentIndex - 1] : null;
  const nextRole = currentIndex < rolesList.length - 1 ? rolesList[currentIndex + 1] : null;

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const respRole = threadRoles.find(tr => tr.roles.id === msg.role_id)?.roles;
      const roleName = respRole?.name || 'Unknown';
      const roleAlias = respRole?.alias ? ` (${respRole.alias})` : '';
      return `${roleName}${roleAlias}: ${msg.content}`;
    })
    .join('\n\n');

  // Create the enhanced system prompt
  const positionInfo = `You are #${currentIndex + 1} in a conversation of ${rolesList.length} roles.`;
  const adjacentRolesInfo = [
    previousRole ? `You're following ${previousRole.name}${previousRole.alias ? ` (${previousRole.alias})` : ''}` : 'You're starting the conversation',
    nextRole ? `You'll be followed by ${nextRole.name}${nextRole.alias ? ` (${nextRole.alias})` : ''}` : 'You're concluding the conversation'
  ].join(' and ');

  const roleSequence = rolesList
    .map((r, i) => `${i + 1}. ${r.name}${r.alias ? ` (${r.alias})` : ''}`)
    .join('\n');

  const systemPrompt = `You are ${role.name}${role.alias ? ` (${role.alias})` : ''}, participating in a conversation with the following sequence of roles:

${roleSequence}

${positionInfo} ${adjacentRolesInfo}.

${role.instructions}

When responding:
1. Acknowledge previous speakers by name and reference their specific points
2. Add your unique perspective based on your expertise as ${role.name}
3. ${nextRole ? `Consider mentioning that ${nextRole.name} might have additional insights to add` : 'Try to synthesize the complete conversation as you\'re the last speaker'}
4. Maintain a collaborative and constructive tone

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