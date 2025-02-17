
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import { Client } from 'llongterm';

// Create SDK instance
const llongterm = new Client({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
