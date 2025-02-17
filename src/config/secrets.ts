
export const LLONGTERM_API_KEY = (() => {
  const apiKey = import.meta.env.LLONGTERM_API_KEY;  // Changed back to LLONGTERM_API_KEY to match Supabase secrets
  if (!apiKey) {
    console.error('LLONGTERM_API_KEY is not set in environment variables');
    throw new Error('LLONGTERM_API_KEY is required');
  }
  return apiKey;
})();
