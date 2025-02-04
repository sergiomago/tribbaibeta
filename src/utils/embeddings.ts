export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.llongterm.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLONGTERM_API_KEY}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-ada-002",
        encoding_format: "float"
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}