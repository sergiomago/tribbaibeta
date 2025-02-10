import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { llongtermClient } from "./llongtermClient.ts";
import { LlongtermError } from "./errors.ts";
import { extractExpertiseAreas, extractInteractionPreferences } from "./roleDataExtractor.ts";

function formatResponseStyle(style: any) {
  if (!style) return '';
  
  return `Communication Style:
- Complexity: ${style.complexity || 'balanced'} (detailed/simple)
- Tone: ${style.tone || 'professional'} (technical/conversational)
- Format: ${style.format || 'flexible'} (structured/flexible)`;
}

function formatExpertiseBoundaries(role: any) {
  return `Your Core Responsibilities:
- Focus exclusively on your expertise areas: ${role.expertise_areas?.join(', ')}
- For questions outside your expertise, acknowledge and defer to relevant roles
- Maintain consistent depth of analysis in your domain
- Only answer questions that align with your expertise`;
}

function formatPrimaryTopics(topics: string[] = []) {
  if (!topics.length) return '';
  
  return `Primary Focus Areas:
${topics.map(topic => `- ${topic}`).join('\n')}`;
}

function formatPreviousResponses(responses: Message[] = []) {
  if (!responses.length) return 'You are first to respond';
  
  return responses
    .map(msg => `${msg.role?.name || 'Unknown'}: ${msg.content}`)
    .join('\n\n');
}

async function determineResponseOrder(
  supabase: SupabaseClient,
  threadId: string,
  messageContent: string,
  roleIds: string[]
): Promise<{ roleId: string; score: number }[]> {
  const { data: roles } = await supabase
    .from('roles')
    .select('id, expertise_areas')
    .in('id', roleIds);

  const firstRole = roles?.[0];
  if (!firstRole) return [];

  const { data: domain } = await supabase
    .rpc('classify_question_domain', {
      content: messageContent,
      expertise_areas: firstRole.expertise_areas
    });

  const scoredRoles = await Promise.all(
    roleIds.map(async (roleId) => {
      const { data: score } = await supabase
        .rpc('calculate_role_relevance', {
          p_role_id: roleId,
          p_question_content: messageContent,
          p_domain: domain
        });

      return {
        roleId,
        score: score || 0
      };
    })
  );

  return scoredRoles.sort((a, b) => b.score - a.score);
}

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
    const systemPrompt = `You are ${role.name}, a specialized AI role with deep expertise in: ${role.expertise_areas?.join(', ')}.

${formatPrimaryTopics(role.primary_topics)}

${formatResponseStyle(role.response_style)}

${formatExpertiseBoundaries(role)}

Your Specific Instructions:
${role.instructions}

${knowledgeResponse ? `Relevant Context from Your Memory:
${knowledgeResponse.relevantMemories.join('\n')}` : ''}

Previous Responses in Chain:
${formatPreviousResponses(previousResponses)}

Current Discussion:
${userMessage.content}

Remember:
1. Stay within your expertise boundaries
2. If a question is outside your expertise, acknowledge this and defer to other roles
3. Maintain consistent depth and style in your responses
4. Build upon previous responses when relevant`;

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

    return responseContent;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
