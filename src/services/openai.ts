import OpenAI from 'openai';
import type { AI_Role } from '../types/database';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_KEY,
  dangerouslyAllowBrowser: true
});

export const generateRoleResponse = async (
  role: AI_Role,
  message: string,
  context: string[]
): Promise<string> => {
  try {
    const systemPrompt = role.system_prompt || role.instructions || 'You are a helpful assistant.';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.map(content => ({ role: 'user', content })),
      { role: 'user', content: message }
    ];

    console.log('OpenAI API Request Messages:', messages);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      temperature: 0.7,
    });

    console.log('OpenAI API Response:', completion);
    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return 'Error generating response';
  }
};
