
/**
 * Extracts expertise areas from role description
 */
export function extractExpertiseAreas(description: string): string[] {
  // Split description into sentences
  const sentences = description.split(/[.!?]+/).map(s => s.trim());
  
  // Common expertise indicators
  const expertiseIndicators = [
    'expertise in',
    'specialized in',
    'focused on',
    'knowledge of',
    'experience with',
    'skilled in'
  ];

  let expertiseAreas: string[] = [];

  // Extract expertise areas from sentences
  sentences.forEach(sentence => {
    expertiseIndicators.forEach(indicator => {
      if (sentence.toLowerCase().includes(indicator)) {
        const afterIndicator = sentence
          .toLowerCase()
          .split(indicator)[1]
          .split(',')
          .map(area => area.replace(/and/g, ',').trim())
          .filter(area => area.length > 0);
        
        expertiseAreas.push(...afterIndicator);
      }
    });
  });

  // If no explicit expertise found, extract nouns as potential expertise areas
  if (expertiseAreas.length === 0) {
    const words = description.split(' ');
    const potentialExpertise = words.filter(word => 
      word.length > 3 && 
      !['with', 'that', 'this', 'from', 'your', 'will', 'can'].includes(word.toLowerCase())
    );
    expertiseAreas = [...new Set(potentialExpertise)].slice(0, 3);
  }

  // Ensure at least one expertise area
  if (expertiseAreas.length === 0) {
    expertiseAreas = ['general expertise'];
  }

  return [...new Set(expertiseAreas)].map(area => 
    area.trim()
      .replace(/^[^a-zA-Z]+/, '') // Remove leading non-letter chars
      .replace(/[^a-zA-Z\s]+$/, '') // Remove trailing non-letter chars
  );
}

/**
 * Extracts interaction preferences from role instructions
 */
export function extractInteractionPreferences(instructions: string): Record<string, string> {
  const preferences: Record<string, string> = {
    style: 'professional',
    approach: 'balanced',
    complexity: 'adaptive'
  };

  // Style detection
  if (instructions.toLowerCase().includes('friendly')) {
    preferences.style = 'friendly';
  } else if (instructions.toLowerCase().includes('technical')) {
    preferences.style = 'technical';
  }

  // Approach detection
  if (instructions.toLowerCase().includes('step by step')) {
    preferences.approach = 'structured';
  } else if (instructions.toLowerCase().includes('concise')) {
    preferences.approach = 'direct';
  }

  // Complexity detection
  if (instructions.toLowerCase().includes('simple') || instructions.toLowerCase().includes('basic')) {
    preferences.complexity = 'simple';
  } else if (instructions.toLowerCase().includes('detailed') || instructions.toLowerCase().includes('comprehensive')) {
    preferences.complexity = 'detailed';
  }

  return preferences;
}
