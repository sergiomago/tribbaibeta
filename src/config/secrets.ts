
export const LLONGTERM_API_KEY = (() => {
  const apiKey = import.meta.env.VITE_LLONGTERM_KEY;  // Changed from VITE_LLONGTERM_API_KEY to VITE_LLONGTERM_KEY
  if (!apiKey) {
    console.error('LLONGTERM_API_KEY is not set in environment variables');
    throw new Error('LLONGTERM_API_KEY is required');
  }
  return apiKey;
})();
