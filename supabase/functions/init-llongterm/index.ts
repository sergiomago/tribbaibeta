
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createLlongterm } from 'npm:llongterm'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')
    if (!llongtermApiKey) {
      throw new Error('LLONGTERM_API_KEY is not set in environment variables')
    }

    // Create SDK instance with API key
    const client = createLlongterm({
      apiKey: llongtermApiKey,
    });

    // Test if client initialized correctly
    if (!client || !client.minds) {
      throw new Error('Failed to initialize Llongterm client');
    }

    return new Response(
      JSON.stringify({ client }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in init-llongterm:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    )
  }
})
