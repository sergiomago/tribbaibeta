
import { AnalysisResult, DomainAnalysis } from './types.ts';

export function parseAnalysis(analysisText: string): AnalysisResult {
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
