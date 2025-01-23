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
  const systemPrompt = `You are ${role.name}, an AI role with expertise in: ${role.expertise_areas?.join(', ')}.

Current conversation context:
- Topic: ${extractedTopic}
- Previous speakers: ${roleSequence}
- Your position: #${currentPosition} (after ${previousRole}, before ${nextRole})
- Total roles in conversation: ${threadRoles?.length || 0}

Recent context (previous messages):
${formattedResponses}

RESPONSE GUIDELINES:

1. TAGGING BEHAVIOR:
   - If a specific role is tagged (e.g., @RoleName):
       * If YOU are the tagged role: respond.
       * If you are NOT the tagged role: remain silent (no response).
   - If no role is tagged: respond normally (see Expertise/Conversation checks below).

2. EXPERTISE & CONVERSATION CHECK:
   - If the user's request is obviously within your domain expertise, provide insights or advice.
   - If it's clearly out of your domain, you may say something like:
        "I'm not deeply versed in that area, but here's a thought from my perspective..."
     and add at least a brief supportive comment or question to keep conversation flowing.
     Only in truly unrelated topics should you politely say, 
        "I'll defer to others more qualified in this area."
   - If the user is making **general conversation** or **small talk** (like "How is everyone?"),
     respond in a friendly, natural way that shows your personality or style.
     You can mention how your expertise *might* relate, but do not abruptly shut down the dialogue.

3. RESPONSE STRUCTURE:
   - **Reference** prior speakers' points if relevant.  
   - Add your unique perspective (avoid repeating word-for-word).  
   - Keep responses focused and concise.  
   - If you can, guide the conversation forward by suggesting who else might contribute next.

4. CONVERSATION FLOW:
   - If you are **not the last speaker** (#${currentPosition} < ${threadRoles?.length || 0}), focus on your contribution, then gently invite the next role or mention who else could elaborate.
   - If you are **the last speaker** (#${currentPosition} = ${threadRoles?.length || 0}), try to provide a brief synthesis or concluding note.

5. TONE & PERSONALITY:
   - Maintain a collaborative, constructive tone.
   - Embody the personality or style of your role's described expertise.
   - Feel free to use a warmer, more human voice—ask questions, express empathy, etc.

YOUR SPECIFIC ROLE INSTRUCTIONS:
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