import Llongterm from 'llongterm';
import { supabase } from '@/integrations/supabase/client';
import type { LlongtermClient } from '@/types/llongterm';

let llongtermClient: LlongtermClient | null = null;

export async function initializeLlongterm(userId: string): Promise<LlongtermClient> {
  if (llongtermClient) {
    return llongtermClient;
  }

  try {
    const { data: { key: llongtermKey }, error: llongtermError } = await supabase
      .functions.invoke('get-secret', { body: { name: 'LLONGTERM_API_KEY' } });
    
    const { data: { key: openaiKey }, error: openaiError } = await supabase
      .functions.invoke('get-secret', { body: { name: 'OPENAI_API_KEY' } });

    if (llongtermError || openaiError) {
      throw new Error('Failed to retrieve API keys');
    }

    llongtermClient = new Llongterm({
      username: userId,
      keys: {
        llongterm: llongtermKey,
        openai: openaiKey
      }
    }) as LlongtermClient;

    return llongtermClient;
  } catch (error) {
    console.error('Error initializing Llongterm:', error);
    throw error;
  }
}

export function getLlongtermClient(): LlongtermClient {
  if (!llongtermClient) {
    throw new Error('Llongterm client not initialized');
  }
  return llongtermClient;
}