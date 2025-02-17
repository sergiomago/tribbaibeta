
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import llongtermFactory from 'llongterm';

// Create SDK instance with our API key
const llongterm = llongtermFactory({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };

