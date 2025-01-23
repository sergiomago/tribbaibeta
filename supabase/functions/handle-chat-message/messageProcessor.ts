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

  // Extract topic from user message (simplified)
  const extractedTopic = userMessage.content.slice(0, 100);

  // Create the system prompt
  const systemPrompt = `You are ${role.name}, an AI role with expertise in: ${role.expertise_areas?.join(', ') || 'general knowledge'}

Current conversation context:
- Topic: ${extractedTopic}
- You were specifically chosen to respond to this message
- Provide your expertise and insights directly

Recent context:
${formattedResponses}

Response Guidelines:
1. Since you were specifically chosen (either tagged or selected by the conversation chain):
   - Provide your expertise and insights directly
   - Do not defer to other roles
   - Focus on your area of expertise

2. Response Structure:
   - Keep responses focused and concise
   - Add your unique perspective
   - Stay within your expertise area

3. Tone:
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