import { RoleScoringData } from "../types/roles";

export class RelevanceScorer {
  async calculateScore(role: RoleScoringData, content: string, threadId: string): Promise<number> {
    // Naive scoring implementation for demonstration
    let score = 0;

    // Increase score if role name or tag is present in the content
    if (content.toLowerCase().includes(role.name.toLowerCase()) || content.toLowerCase().includes(role.tag.toLowerCase())) {
      score += 0.3;
    }

    // Increase score if expertise areas are relevant to the content
    if (role.expertise_areas) {
      role.expertise_areas.forEach(area => {
        if (content.toLowerCase().includes(area.toLowerCase())) {
          score += 0.2 / role.expertise_areas.length;
        }
      });
    }

    // Increase score if primary topics are relevant to the content
    if (role.primary_topics) {
      role.primary_topics.forEach(topic => {
        if (content.toLowerCase().includes(topic.toLowerCase())) {
          score += 0.2 / role.primary_topics.length;
        }
      });
    }

    // Further implementations can include:
    // - Semantic similarity between content and role instructions
    // - Historical interaction data for the role in the thread
    // - Special capabilities of the role and their relevance to the content

    return score;
  }
}
