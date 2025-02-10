
export class ChatError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
    this.details = details;
  }
}

export function handleError(error: unknown): Response {
  console.error('Error in handle-chat-message:', error);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (error instanceof ChatError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.details
      }),
      {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
