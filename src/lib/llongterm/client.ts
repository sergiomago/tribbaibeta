
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import LlongtermSDK from 'llongterm';

// Create SDK instance with our API key
const llongterm = LlongtermSDK({
  apiKey: LLONGTERM_API_KEY,
});

export { llongterm };
