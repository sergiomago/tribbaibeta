
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import * as llongtermModule from 'llongterm';

let llongterm;

try {
  // Create SDK instance with our API key
  const factory = (llongtermModule.default || llongtermModule) as (config: { apiKey: string }) => any;
  llongterm = factory({
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

