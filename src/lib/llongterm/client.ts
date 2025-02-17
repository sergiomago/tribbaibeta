
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import llongtermFactory from 'llongterm';

let llongterm;

try {
  // Create SDK instance with our API key
  llongterm = llongtermFactory({
    apiKey: LLONGTERM_API_KEY,
  });

  // Test if the client was initialized correctly
  if (!llongterm || !llongterm.minds) {
    throw new Error('Failed to initialize Llongterm client');
  }
} catch (error) {
  console.error('Error initializing Llongterm client:', error);
  throw new LlongtermError('Failed to initialize Llongterm client: ' + error.message);
}

export { llongterm };

