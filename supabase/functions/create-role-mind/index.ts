
import { corsHeaders } from '../_shared/cors.ts';

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY') || '';

const llongtermClient = {
  apiKey: llongtermApiKey,
  baseURL: 'https://api.llongterm.com/v1',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Add content type validation
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }

    const { roleId } = body;

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    console.log('Creating mind for role:', roleId); // Add logging

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
      console.error('Llongterm API error:', error); // Add logging
      throw new Error(`Failed to create mind: ${JSON.stringify(error)}`);
    }

    const mind = await mindResponse.json();
    console.log('Mind created successfully:', mind.id); // Add logging

    return new Response(JSON.stringify(mind), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in create-role-mind:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create mind'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
        status: 400,
      }
    );
  }
});
