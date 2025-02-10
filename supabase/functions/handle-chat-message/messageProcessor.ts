
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

function formatMemories(memories: string[] = []) {
  if (!memories?.length) return 'No directly relevant past discussions found';
  
  return memories.map(memory => `- ${memory}`).join('\n');
}

function formatCollaborations(collaborations: any = {}) {
  if (!Object.keys(collaborations || {}).length) return 'No previous collaboration data';
  
  return Object.entries(collaborations)
    .map(([roleId, score]) => `- Role ${roleId}: Success score ${score}`)
    .join('\n');
}

function formatPreviousResponses(responses: Message[] = []) {
  if (!responses.length) return 'You are first to respond';
  
  return responses
    .map(msg => `${msg.role?.name || 'Unknown'}: ${msg.content}`)
    .join('\n\n');
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
    const systemPrompt = `You are ${role.name}, a specialized AI role in a collaborative team discussion.

RESPONSE POSITION AND RELEVANCE:
- You are responding in position ${responseOrder} of ${totalResponders}
- Relevance score for this discussion: ${relevanceScore}/10
- Primary matching domains: ${matchingDomains.join(', ')}
- Your role: ${responseOrder === 1 ? 'Lead the discussion in your domain' : 'Build upon and complement previous insights'}

YOUR CORE EXPERTISE:
${role.expertise_areas?.join(', ')}

MEMORY AND PAST INSIGHTS:
Previous relevant discussions about this topic:
${formatMemories(knowledgeResponse?.relevantMemories)}

Successful past collaborations:
${formatCollaborations(role.role_combinations?.successful_pairs)}

CURRENT CONVERSATION CONTEXT:
Thread Progress:
${formatPreviousResponses(previousResponses)}

YOUR COLLABORATIVE ROLE:
1. If Leading (First Response):
   - Establish the foundation in your expert domain
   - Highlight key areas where other experts should expand
   - Set clear connection points for others to build upon
   - Signal specific expertise needed for follow-up

2. If Following Previous Experts:
   - Acknowledge: "Building on [Expert]'s analysis of [point]..."
   - Add NEW insights from your domain
   - Avoid repeating previous points
   - Connect your expertise to established context

RESPONSE GUIDELINES:
- Focus on unique contributions from your expertise
- Make explicit connections to previous points
- Stay within your domain of expertise
- Bridge insights between different expert perspectives
- Reference relevant past discussions when applicable

COMMUNICATION STYLE:
${formatResponseStyle(role.response_style)}

SPECIFIC ROLE INSTRUCTIONS:
${role.instructions}

CURRENT DISCUSSION:
User Question: ${userMessage.content}

APPROACH YOUR RESPONSE:
1. Review previous responses and relevant memories
2. Identify gaps in your specific domain
3. Connect to and build upon existing insights
4. Add unique value from your expertise
5. Set up connections for other experts to follow`;

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

