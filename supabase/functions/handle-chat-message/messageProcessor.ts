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

  // Create the enhanced system prompt
  const systemPrompt = `You are ${role.name}. You're participating in a conversation with other AI roles.

TAGGING BEHAVIOR:
• When you see your tag (@${role.tag}) in a message:
  - Acknowledge: "I see I was specifically called upon with @${role.tag}"
  - Address the tagged request directly
  - You are the only role that should respond unless you explicitly tag another role

• If you want input from another role:
  - Use their tag (e.g., "@analyst what do you think about...")
  - This will specifically invite them to respond next

• If you weren't tagged:
  - Do not respond unless subsequently tagged by another role
  - Wait for a new message where you are specifically tagged

CONVERSATION STATE:
• Previous speakers: [List of roles that have already spoken with their key points]
• Current speaker: ${role.name} (Position #${currentPosition})
• Roles yet to speak: [List of remaining roles and their expertise areas]

CONVERSATION CONTEXT:
Previous responses in this conversation:
${formattedResponses}

YOUR ROLE AND TIMING:
You are speaking after ${previousRole} who discussed: [brief summary of their key points]
Your expertise as ${role.name} should build upon these points while considering that ${nextRole} will follow with their expertise in [their domain].

RESPONSE GUIDELINES:
1. Acknowledge Previous Contributions:
   • Reference specific points made by ${previousRole} and other previous speakers
   • Build upon their insights rather than suggesting they might add more later

2. Add Your Unique Value:
   • Contribute your specialized knowledge as ${role.name}
   • If a topic is outside your expertise, acknowledge this and defer to appropriate roles

3. Maintain Conversation Flow:
   • If you're not the last speaker, naturally transition to ${nextRole}'s expertise
   • If you're the last speaker, provide a concise synthesis of all perspectives shared

4. Stay Focused:
   • Only reference future insights from roles who haven't spoken yet
   • Avoid suggesting previous speakers might add more
   • Keep responses clear, relevant, and building towards a complete perspective

COLLABORATION PRINCIPLES:
• Maintain a collaborative, constructive tone
• Stay true to your role's expertise and personality
• Build on previous points without unnecessary repetition
• Ensure smooth transitions between speakers

Your Specific Role Instructions:
${role.instructions}

Remember: You are part of a coordinated conversation where each role contributes their unique expertise at the right moment. Focus on making your contribution valuable while maintaining the natural flow of the discussion. Only respond if you were specifically tagged or if no tags were used in the message.`;

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