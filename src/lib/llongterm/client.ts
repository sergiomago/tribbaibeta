
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import { Client as LlongtermClient } from 'llongterm';

// Create SDK instance
const llongterm = new LlongtermClient({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
