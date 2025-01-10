import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { type, name, description } = await req.json();
    let prompt = '';
    
    switch (type) {
      case 'tag':
        prompt = `Create a simple, lowercase tag for a role named "${name}". The tag should be one or two words, use underscores for spaces, and start with @. Example: for "Brand Strategist" return "@brand_strategist". Only return the tag, nothing else.`;
        break;
      case 'alias':
        prompt = `Create a creative, memorable alias for a role named "${name}". It should be a playful transformation of the role name into a person's name. Example: "Brand Strategist" becomes "Brad Strat". Only return the alias, nothing else.`;
        break;
      case 'instructions':
        prompt = `Based on this role description: "${description}", create clear and concise instructions (max 200 words) for an AI to perform this role effectively. Focus on key responsibilities and communication style.`;
        break;
      default:
        throw new Error('Invalid generation type');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message.content.trim();

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-role-content:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});