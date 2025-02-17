
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import * as Llongterm from 'llongterm';

// Create SDK instance with our API key
const llongterm = Llongterm.default({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
