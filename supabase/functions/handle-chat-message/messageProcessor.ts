
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { llongtermClient } from "./llongtermClient.ts";
import { LlongtermError } from "./errors.ts";

function formatResponseStyle(style: any) {
  if (!style) return '';
  
  return `Communication Style:
- Complexity: ${style.complexity || 'balanced'} (detailed/simple)
- Tone: ${style.tone || 'professional'} (technical/conversational)
- Format: ${style.format || 'flexible'} (structured/flexible)`;
}

async function getNextRespondingRole(
  supabase: SupabaseClient,
  threadId: string,
  lastMessageRole: string | null
): Promise<string | null> {
  const { data: responseOrder } = await supabase
    .from('thread_response_order')
    .select('*')
    .eq('thread_id', threadId)
    .order('response_position', { ascending: true });

  if (!responseOrder?.length) return null;

  if (!lastMessageRole) {
    return responseOrder[0].role_id;
  }

  const currentIndex = responseOrder.findIndex(r => r.role_id === lastMessageRole);
  if (currentIndex === -1) return responseOrder[0].role_id;

  const nextIndex = (currentIndex + 1) % responseOrder.length;
  return responseOrder[nextIndex].role_id;
}

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[],
  responseOrder: number = 1,
  totalResponders: number = 1,
  relevanceScore: number = 1.0,
  matchingDomains: string[] = []
) {
  console.log('Processing message for role:', roleId);

  try {
    // Check message depth before processing
    const currentDepth = userMessage.depth_level || 0;
    if (currentDepth >= 9) {
      console.log('Maximum conversation depth reached');
      return null;
    }

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError) throw roleError;
    if (!role) throw new Error('Role not found');

    // Get next responding role
    const nextRole = await getNextRespondingRole(
      supabase,
      threadId,
      previousResponses[previousResponses.length - 1]?.role_id || null
    );

    let mind = null;
    let memoryResponse = null;
    let knowledgeResponse = null;

    try {
      // Try to get existing mind or create new one
      mind = await llongtermClient.getMind(roleId);
      if (!mind) {
        console.log('No existing mind found, creating new one for role:', roleId);
        
        const expertiseAreas = extractExpertiseAreas(role.description || '');
        const interactionPrefs = extractInteractionPreferences(role.instructions || '');
        
        mind = await llongtermClient.createMind({
          specialism: role.name,
          specialismDepth: 8,
          metadata: {
            roleId,
            expertise: expertiseAreas,
            interaction: interactionPrefs,
            created: new Date().toISOString()
          }
        });
        console.log('Created new mind:', mind);
      }

      if (mind) {
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
        memoryResponse = await mind.remember(conversationHistory);
        console.log('Memory response:', memoryResponse);

        // Get relevant context from mind
        knowledgeResponse = await mind.ask(userMessage.content);
        console.log('Knowledge response:', knowledgeResponse);
      }
    } catch (error) {
      console.error('Error with Llongterm operations:', error);
      // Continue without memory features if Llongterm fails
    }

    // Create enhanced system prompt
    const systemPrompt = `You are ${role.name}, a specialized AI role in a collaborative team discussion.

RESPONSE POSITION AND RELEVANCE:
- You are responding in position ${responseOrder} of ${totalResponders}
- Next responding role: ${nextRole ? 'Another role will respond after you' : 'You are the last responder'}
- Your role: ${responseOrder === 1 ? 'Lead the discussion in your domain' : 'Build upon and complement previous insights'}

${role.instructions}

CURRENT CONVERSATION CONTEXT:
${formatResponseStyle(role.response_style)}

USER MESSAGE:
${userMessage.content}`;

    console.log('Generated system prompt:', systemPrompt);

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

    // Save response with updated fields
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: roleId,
        responding_role_id: nextRole,
        content: responseContent,
        is_bot: true,
        parent_message_id: userMessage.id,
        depth_level: (userMessage.depth_level || 0) + 1,
        chain_position: responseOrder,
        metadata: {
          response_quality: 1.0,
          response_time: Date.now() - new Date(userMessage.created_at).getTime(),
          role_performance: relevanceScore
        }
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}

// Helper functions (these can be moved to a separate file if needed)
function extractExpertiseAreas(description: string): string[] {
  const areas = description.match(/expertise in ([^.]+)/i);
  return areas ? areas[1].split(',').map(area => area.trim()) : [];
}

function extractInteractionPreferences(instructions: string): Record<string, unknown> {
  return {
    style: instructions.includes('formal') ? 'formal' : 'conversational',
    depth: instructions.includes('detailed') ? 'detailed' : 'concise'
  };
}
