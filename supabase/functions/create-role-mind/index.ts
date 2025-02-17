
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY') || '';

const llongtermClient = {
  apiKey: llongtermApiKey,
  baseURL: 'https://api.llongterm.com/v1', // Changed from .ai to .com
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roleId } = await req.json();

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    // Create mind in Llongterm
    const mindResponse = await fetch(`${llongtermClient.baseURL}/minds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llongtermClient.apiKey}`,
      },
      body: JSON.stringify({
        id: roleId,
        metadata: {
          roleId,
          created: new Date().toISOString(),
        },
      }),
    });

    if (!mindResponse.ok) {
      const error = await mindResponse.json();
      throw new Error(`Failed to create mind: ${JSON.stringify(error)}`);
    }

    const mind = await mindResponse.json();

    return new Response(JSON.stringify(mind), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
