
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AnalysisResult, DomainAnalysis } from "./types.ts";

const ANALYSIS_PROMPT = `Analyze the following message and provide:
1. Main intent of the message
2. Primary domains involved (user_experience, business_strategy, technical, market_intelligence, etc.)
3. Required expertise for a proper response
4. Urgency/priority level (0-1)

Respond in a structured format focused on identifying expertise requirements.`;

export async function determineResponseOrder(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  roleIds: string[],
  openai: OpenAI
): Promise<{ roleId: string; score: number }[]> {
  // Analyze the message content
  const analysis = await analyzeMessage(content, openai);
  console.log('Message analysis:', analysis);

  // Get roles information
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, expertise_areas, instructions')
    .in('id', roleIds);

  if (!roles) {
    console.log('No roles found for scoring');
    return roleIds.map(id => ({ roleId: id, score: 1 }));
  }

  // Score each role based on analysis
  const scoredRoles = roles.map(role => {
    let score = 0;

    // Match expertise areas with domains
    const expertise = role.expertise_areas || [];
    analysis.domains.forEach(domain => {
      if (expertise.some(exp => 
        domain.name.toLowerCase().includes(exp.toLowerCase()) ||
        exp.toLowerCase().includes(domain.name.toLowerCase())
      )) {
        score += domain.confidence;
      }
    });

    // Adjust score based on required expertise match
    analysis.domains.forEach(domain => {
      domain.requiredExpertise.forEach(req => {
        if (expertise.some(exp => exp.toLowerCase().includes(req.toLowerCase()))) {
          score += 0.5;
        }
      });
    });

    return {
      roleId: role.id,
      score: score / (analysis.domains.length * 1.5) // Normalize score
    };
  });

  // Sort by score descending
  return scoredRoles.sort((a, b) => b.score - a.score);
}

async function analyzeMessage(
  content: string,
  openai: OpenAI
): Promise<AnalysisResult> {
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

function parseAnalysis(analysisText: string): AnalysisResult {
  try {
    // Extract intent (usually first line after "intent" or "purpose")
    const intentMatch = analysisText.match(/intent|purpose:?\s*([^\n]+)/i);
    const intent = intentMatch ? intentMatch[1].trim() : 'general_query';

    // Extract domains and their confidence
    const domains: DomainAnalysis[] = [];
    const domainMatches = analysisText.matchAll(/domain|area:?\s*([^\n]+)(?:\s*confidence:?\s*([\d.]+))?/gi);
    
    for (const match of domainMatches) {
      domains.push({
        name: match[1].trim().toLowerCase(),
        confidence: match[2] ? parseFloat(match[2]) : 0.5,
        requiredExpertise: []
      });
    }

    // Extract expertise requirements
    const expertiseMatch = analysisText.match(/expertise|requires?:?\s*([^\n]+)/i);
    if (expertiseMatch) {
      const expertise = expertiseMatch[1].split(',').map(e => e.trim());
      // Add expertise to most relevant domain
      if (domains.length > 0) {
        domains[0].requiredExpertise = expertise;
      }
    }

    // Extract urgency
    const urgencyMatch = analysisText.match(/urgency|priority:?\s*([\d.]+)/i);
    const urgency = urgencyMatch ? parseFloat(urgencyMatch[1]) : 0.5;

    return {
      intent,
      domains: domains.length > 0 ? domains : [{
        name: 'general',
        confidence: 1,
        requiredExpertise: []
      }],
      urgency
    };
  } catch (error) {
    console.error('Error parsing analysis:', error);
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
