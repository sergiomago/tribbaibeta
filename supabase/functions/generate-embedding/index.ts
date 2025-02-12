
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    if (!llongtermApiKey) {
      throw new Error('Llongterm API key is not configured');
    }

    const { text } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const response = await fetch('https://api.llongterm.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llongtermApiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-ada-002",
        encoding_format: "float"
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Llongterm API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`API error: ${response.statusText}`);
    }

    const { data } = await response.json();
    
    return new Response(
      JSON.stringify({ embedding: data[0].embedding }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-embedding:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while generating embedding.',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
