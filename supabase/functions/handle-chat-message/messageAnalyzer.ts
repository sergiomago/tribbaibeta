import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AnalysisResult } from "./types.ts";

export async function analyzeMessage(
  content: string,
  openai: OpenAI
): Promise<AnalysisResult> {
  console.log('Analyzing message content:', content);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the user message and determine the primary intent, context, and any special requirements.'
      },
      { role: 'user', content }
    ],
  });

  const analysis = completion.choices[0].message.content;
  
  try {
    // Parse the analysis into structured data
    const structuredAnalysis: AnalysisResult = {
      intent: '',
      context: '',
      specialRequirements: [],
      suggestedRoles: []
    };

    // Extract key information from the analysis
    const lines = analysis.split('\n');
    lines.forEach(line => {
      if (line.toLowerCase().includes('intent:')) {
        structuredAnalysis.intent = line.split(':')[1].trim();
      } else if (line.toLowerCase().includes('context:')) {
        structuredAnalysis.context = line.split(':')[1].trim();
      } else if (line.toLowerCase().includes('requirements:')) {
        structuredAnalysis.specialRequirements = line
          .split(':')[1]
          .split(',')
          .map(r => r.trim())
          .filter(Boolean);
      } else if (line.toLowerCase().includes('roles:')) {
        structuredAnalysis.suggestedRoles = line
          .split(':')[1]
          .split(',')
          .map(r => r.trim())
          .filter(Boolean);
      }
    });

    console.log('Structured analysis:', structuredAnalysis);
    return structuredAnalysis;
  } catch (error) {
    console.error('Error parsing analysis:', error);
    return {
      intent: analysis,
      context: 'Error parsing structured analysis'
    };
  }
}

export async function saveMessageAnalysis(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
  analysis: AnalysisResult
): Promise<void> {
  console.log('Saving message analysis:', { threadId, messageId, analysis });
  
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        metadata: {
          analysis,
          analyzed_at: new Date().toISOString()
        }
      })
      .eq('id', messageId);

    if (error) throw error;
    console.log('Analysis saved successfully');
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}