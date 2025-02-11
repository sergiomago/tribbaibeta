
import { Message } from "../types.ts";

export async function formatConversationHistory(
  messages: Message[],
  role: any
): Promise<string> {
  if (!messages.length) return '';
  
  return messages
    .map(msg => {
      const rolePrefix = msg.role_id ? msg.role?.name || 'Assistant' : 'User';
      const confidenceInfo = msg.confidence_score ? ` (Confidence: ${msg.confidence_score.toFixed(2)})` : '';
      return `${rolePrefix}: ${msg.content}${confidenceInfo}`;
    })
    .join('\n');
}

export function formatResponseStyle(style: any) {
  if (!style) return '';
  
  return `Communication Style:
- Complexity: ${style.complexity || 'balanced'} (detailed/simple)
- Tone: ${style.tone || 'professional'} (technical/conversational)
- Format: ${style.format || 'flexible'} (structured/flexible)`;
}

export function generateSystemPrompt(
  role: any,
  conversationContext: string,
  memoryContext: string,
  knowledgeResponse: any,
  responseOrder: number,
  totalResponders: number,
  nextRole: string | null,
  relevanceScore: number,
  matchingDomains: string[],
  userMessage: string
): string {
  // Format memory confidence if available
  const memoryConfidence = knowledgeResponse?.confidence 
    ? `(Confidence: ${(knowledgeResponse.confidence * 100).toFixed(1)}%)`
    : '(No confidence score available)';

  return `You are ${role.name}, a specialized AI role in a collaborative team discussion.

ROLE CONTEXT AND EXPERTISE:
${role.description || ''}
${role.instructions || ''}

CONVERSATION HISTORY:
${conversationContext}

${memoryContext ? `RELEVANT MEMORIES ${memoryConfidence}:
${memoryContext}` : ''}

RESPONSE POSITION AND RELEVANCE:
- You are responding in position ${responseOrder} of ${totalResponders}
- Next responding role: ${nextRole ? 'Another role will respond after you' : 'You are the last responder'}
- Your relevance score for this topic: ${relevanceScore}
- Matching domains: ${matchingDomains.join(', ')}

${formatResponseStyle(role.response_style)}

USER MESSAGE:
${userMessage}`;
}
