
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ANALYSIS_PROMPT } from "./analyzers/prompts.ts";
import { parseAnalysis } from "./analyzers/analysisParser.ts";
import { scoreRoles } from "./analyzers/roleScoring.ts";
import { RoleScore } from "./analyzers/types.ts";

export async function determineResponseOrder(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  roleIds: string[],
  openai: OpenAI
): Promise<RoleScore[]> {
  // Analyze the message content
  const analysis = await analyzeMessage(content, openai);
  console.log('Message analysis:', analysis);

  // Score roles based on analysis
  return await scoreRoles(supabase, roleIds, analysis);
}

async function analyzeMessage(
  content: string,
  openai: OpenAI
) {
  console.log('Analyzing message content:', content);
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: ANALYSIS_PROMPT
        },
        { role: 'user', content }
      ],
    });

    const analysis = completion.choices[0].message.content;
    console.log('Raw analysis:', analysis);

    // Parse the analysis into our structured format
    const parsedAnalysis = parseAnalysis(analysis);
    console.log('Structured analysis:', parsedAnalysis);

    return parsedAnalysis;
  } catch (error) {
    console.error('Error in message analysis:', error);
    // Return a basic analysis if OpenAI fails
    return {
      intent: 'general_query',
      domains: [{
        name: 'general',
        confidence: 1,
        requiredExpertise: []
      }],
      urgency: 0.5
    };
  }
}
