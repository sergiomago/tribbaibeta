
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import { Llongterm } from 'llongterm';

// Create SDK instance
const llongterm = new Llongterm({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
