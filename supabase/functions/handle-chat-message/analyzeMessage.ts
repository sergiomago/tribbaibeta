
import { MessageAnalysis } from "./types.ts";

export async function analyzeMessage(content: string): Promise<MessageAnalysis> {
  // Simple analysis for now
  return {
    intent: "general",
    topics: [content.slice(0, 50)], // First 50 chars as topic
    sentiment: "neutral",
    complexity: 1
  };
}
