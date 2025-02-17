
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import llongterm from 'npm:llongterm'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')
    if (!llongtermApiKey) {
      throw new Error('LLONGTERM_API_KEY is not set in environment variables')
    }

    // Initialize the client using the default export
    const client = llongterm({
      apiKey: llongtermApiKey,
    });

    // Test if client initialized correctly
    if (!client || !client.minds) {
      throw new Error('Failed to initialize Llongterm client');
    }

    // Return only necessary client data
    const clientData = {
      minds: client.minds,
      initialized: true
    };

    return new Response(
      JSON.stringify({ client: clientData }),
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
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
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
