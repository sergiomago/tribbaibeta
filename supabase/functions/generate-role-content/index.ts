
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
        prompt = `As an expert in AI role design, create comprehensive instructions for an AI role with the following details:
Name: "${name}"
Description: "${description}"

Generate detailed instructions covering these key aspects:
1. Contextual Awareness: How should it adapt to conversations and user context?
2. Interaction Style: What communication approach (directive, collaborative, advisory) should it use?
3. Custom Scenarios: How should it handle specific situations related to its role?
4. Emotion Handling: How should it respond to different emotional states?
5. Problem-Solving: What approach should it take to challenges?
6. Role-Specific Examples: What concrete examples should guide its behavior?
7. Goal Adaptability: How should it adjust to different user objectives?
8. Personality: What human-like traits should it exhibit?
9. Role Models: What inspirational figures should influence its behavior?
10. Formatting: How should it structure its responses?

Format the response as a clear, cohesive set of instructions that flows naturally. Make it specific to the role while maintaining a conversational, easy-to-understand tone. Ensure the instructions are practical and actionable.`;
        break;
      default:
        throw new Error('Invalid generation type');
    }

    if (!openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Sending request to OpenAI:', {
      type,
      name,
      description: description?.substring(0, 100) + '...' // Log truncated description
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Fixed the model name from "gpt-4o" to "gpt-4"
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message.content.trim();
    console.log('Received response from OpenAI:', {
      type,
      contentLength: content.length
    });

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
