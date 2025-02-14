
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Ensure the request is a POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Check content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    if (!openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const body = await req.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      throw new Error('Invalid JSON body');
    }

    const { type, name, description } = data;

    // Input validation
    if (!type || !name) {
      throw new Error('Type and name are required');
    }

    console.log('Processing request:', {
      type,
      name,
      hasDescription: !!description
    });

    let prompt = '';
    
    switch (type) {
      case 'tag':
        prompt = `Create a simple, lowercase tag for a role named "${name}". The tag should be one or two words, use underscores for spaces, and start with @. Example: for "Brand Strategist" return "@brand_strategist". Only return the tag, nothing else.`;
        break;
      case 'alias':
        prompt = `Create a creative, memorable alias for a role named "${name}". It should be a playful transformation of the role name into a person's name. Example: "Brand Strategist" becomes "Brad Strat". Only return the alias, nothing else.`;
        break;
      case 'instructions':
        if (!description) {
          throw new Error('Description is required for instructions generation');
        }
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

    console.log('Sending request to OpenAI:', {
      type,
      name,
      description: description?.substring(0, 100) + '...'
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: type === 'instructions' ? 2000 : 100,
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No content received from OpenAI');
    }

    const content = completion.choices[0].message.content.trim();
    
    console.log('Received response from OpenAI:', {
      type,
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...'
    });

    const responseData = JSON.stringify({ content });
    return new Response(responseData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Length': responseData.length.toString()
      }
    });
  } catch (error) {
    console.error('Error in generate-role-content:', error);
    const errorResponse = JSON.stringify({
      error: error.message,
      details: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(errorResponse, {
      status: error.status || 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Length': errorResponse.length.toString()
      }
    });
  }
});
