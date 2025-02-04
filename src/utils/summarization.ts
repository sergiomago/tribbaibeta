export async function summarizeMemories(contents: string[]): Promise<string> {
  // For now, just concatenate with a simple delimiter
  // This will be replaced with actual AI summarization later
  return contents.join(' | ');
}