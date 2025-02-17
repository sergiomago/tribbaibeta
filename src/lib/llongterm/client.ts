
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import { default as createLlongterm } from 'llongterm';

// Create SDK instance with our API key
const llongterm = createLlongterm({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
