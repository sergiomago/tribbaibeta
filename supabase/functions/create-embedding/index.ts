import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    console.log('Generating embedding for content:', content.substring(0, 100) + '...');

    const response = await fetch('https://api.llongterm.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llongtermApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: "llongterm-embedding-1"
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Llongterm API error:', error);
      throw new Error(`Llongterm API error: ${error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Successfully generated embedding');

    return new Response(JSON.stringify({ vector: data.data[0].embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-embedding function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});