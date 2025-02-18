
import { ResponseData } from "./types.ts";

export async function generateResponse({ roleId, content, context, analysis }: ResponseData): Promise<string> {
  // Simple response for now
  return `Role ${roleId} responding to: ${content.slice(0, 100)}...`;
}
