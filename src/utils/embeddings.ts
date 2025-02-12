
import { generateEmbedding } from '@/services/embedding-generator';

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}
