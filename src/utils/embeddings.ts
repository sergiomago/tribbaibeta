
import { supabase } from '@/integrations/supabase/client';

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text }
    });

    if (error) throw error;
    if (!data?.embedding) throw new Error('No embedding returned');

    return data.embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}
