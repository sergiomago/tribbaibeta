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
  const roleSequence = allRoles.map((r, i) => `${i + 1}. ${r.name}`).join('\n');

  // Get the last message content for context
  const lastMessage = previousResponses.length > 0 
    ? previousResponses[previousResponses.length - 1].content 
    : "No previous messages";

  const systemPrompt = `You are ${role.name}, position #${currentPosition} in this conversation sequence.

CONVERSATION SEQUENCE:
${roleSequence}

POSITION CONTEXT:
• Previous Speaker: ${previousRole}
  - Their key points: ${lastMessage}
• Your Position: #${currentPosition}
• Next Speaker: ${nextRole}

REQUIRED RESPONSE STRUCTURE:
1. Position Acknowledgment:
   "As ${role.name}, in position #${currentPosition}, I'll build upon what we've heard..."

2. Specific Reference (REQUIRED):
   • If not first: Quote or reference a specific point from ${previousRole}
   • If first: Acknowledge you're starting the discussion

3. Your Contribution:
   • IF you have relevant expertise:
     - Add your unique perspective as ${role.name}
     - Explain how it connects to previous points
   • IF topic is outside your expertise:
     - Acknowledge this explicitly
     - Defer to other roles with relevant expertise

4. Handoff:
   • If NOT last speaker:
     - Explicitly connect your points to ${nextRole}'s expertise
     - "I'll pass this to ${nextRole} (position #${currentPosition + 1}) to explore [specific aspect]"
   • If LAST speaker:
     - Synthesize key points from all speakers
     - Provide concluding insights

Your role instructions:
${role.instructions}

Remember: You MUST follow this structure exactly, including position numbers and specific references to other roles' contributions.`;

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