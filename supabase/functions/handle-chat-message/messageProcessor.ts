
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { llongtermClient } from "./llongtermClient.ts";

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[]
) {
  console.log('Processing message for role:', roleId);

  try {
    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError) throw roleError;
    if (!role) throw new Error('Role not found');

    console.log('Retrieved role:', role);

    // Try to get existing mind or create new one
    let mind = await llongtermClient.getMind(roleId);
    if (!mind) {
      console.log('No existing mind found, creating new one for role:', roleId);
      mind = await llongtermClient.createMind({
        specialism: role.name,
        specialismDepth: 2,
        metadata: {
          roleId,
          expertise: role.expertise_areas,
          created: new Date().toISOString()
        }
      });
      console.log('Created new mind:', mind);
    }

    // Format previous responses for memory
    const conversationHistory = previousResponses.map(msg => ({
      author: msg.role_id ? 'assistant' : 'user',
      message: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: {
        role_id: msg.role_id,
        role_name: msg.role?.name,
        expertise: msg.role?.expertise_areas
      }
    }));

    // Add current message to history
    conversationHistory.push({
      author: 'user',
      message: userMessage.content,
      timestamp: Date.now(),
      metadata: { thread_id: threadId }
    });

    console.log('Storing conversation in mind');
    // Store conversation in mind
    const memoryResponse = await mind.remember(conversationHistory);
    console.log('Memory response:', memoryResponse);

    // Get relevant context from mind
    const knowledgeResponse = await mind.ask(userMessage.content);
    console.log('Knowledge response:', knowledgeResponse);

    // Create enriched system prompt
    const systemPrompt = `You are ${role.name}, a specialized AI role with expertise in: ${role.expertise_areas?.join(', ')}.

Your Specific Instructions:
${role.instructions}

Relevant Context from Your Memory:
${knowledgeResponse.relevantMemories.join('\n')}

Previous Responses in Chain:
${previousResponses?.length > 0 
  ? previousResponses.map(msg => `${msg.role?.name || 'Unknown'}: ${msg.content}`).join('\n\n')
  : 'You are first to respond'}

Remember: Focus on what makes your expertise unique while building upon the collective insights of the team.

Current Discussion:
${userMessage.content}`;

    // Generate response
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response:', responseContent.substring(0, 100) + '...');

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
