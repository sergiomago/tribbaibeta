import OpenAI from "https://esm.sh/openai@4.26.0";
import { buildSystemPrompt } from "./PromptManager.ts";

export async function generateResponse(
  openai: OpenAI,
  role: any,
  roleSequence: string,
  currentPosition: number,
  previousRole: string,
  nextRole: string,
  formattedResponses: string,
  userMessage: string
) {
  // Extract topic from user message (simplified for now)
  const extractedTopic = userMessage.slice(0, 100);

  // Generate the system prompt
  const systemPrompt = buildSystemPrompt(
    role,
    roleSequence,
    currentPosition,
    previousRole,
    nextRole,
    formattedResponses,
    extractedTopic
  );

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
  });

  return completion.choices[0].message.content;
}