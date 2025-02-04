import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_KEY,
  // purposefully allowing browser usage if needed
  dangerouslyAllowBrowser: true,
});

/**
 * Generates embeddings for the provided text using the text-embedding-ada-002 model.
 * @param text The text to generate an embedding for.
 * @returns A Promise that resolves to an array of numbers representing the embedding vector.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    // Assuming response.data is an array and taking the embedding from the first result.
    if (response && response.data && response.data.length > 0) {
      return response.data[0].embedding;
    } else {
      console.error('No embedding data returned');
      return [];
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
};
