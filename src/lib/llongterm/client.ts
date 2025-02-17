
import { supabase } from '@/integrations/supabase/client';
import { LlongtermError } from './errors';

let llongterm;

try {
  // Initialize llongterm through Edge Function
  const { data, error } = await supabase.functions.invoke('init-llongterm');
  
  if (error) {
    throw new Error(`Failed to initialize Llongterm client: ${error.message}`);
  }

  llongterm = data.client;

  // Test if the client was initialized correctly
  if (!llongterm || !llongterm.minds) {
    throw new Error('Failed to initialize Llongterm client');
  }
} catch (error) {
  console.error('Error initializing Llongterm client:', error);
  throw new LlongtermError('Failed to initialize Llongterm client: ' + error.message);
}

export { llongterm };
