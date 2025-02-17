
import { corsHeaders } from '../_shared/cors.ts';

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY') || '';

interface CreateMindRequest {
  roleId: string;
  roleName: string;
  roleDescription: string;
  roleTag: string;
  roleInstructions: string;
  expertiseAreas: string[];
  specialCapabilities: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    // Parse request body
    let payload: CreateMindRequest;
    try {
      const rawBody = await req.text();
      console.log('Received raw body:', rawBody);
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error(`Invalid JSON payload: ${e.message}`);
    }

    // Validate required fields
    if (!payload.roleId) {
      throw new Error('Role ID is required');
    }

    console.log('Creating mind with payload:', JSON.stringify(payload, null, 2));

    // Create mind in Llongterm with proper initialization parameters
    const mindResponse = await fetch(`https://api.llongterm.com/v1/minds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llongtermApiKey}`,
      },
      body: JSON.stringify({
        specialism: payload.roleName,
        specialismDepth: 2,
        metadata: {
          roleId: payload.roleId,
          name: payload.roleName,
          description: payload.roleDescription,
          tag: payload.roleTag,
          instructions: payload.roleInstructions,
          expertiseAreas: payload.expertiseAreas,
          specialCapabilities: payload.specialCapabilities,
          created: new Date().toISOString(),
        },
        initialMemory: {
          summary: `${payload.roleName} is an AI assistant with expertise in ${payload.expertiseAreas?.join(', ') || 'various areas'}. ${payload.roleDescription}`,
          structured: {
            instructions: payload.roleInstructions,
            capabilities: payload.specialCapabilities
          },
          unstructured: {}
        }
      }),
    });

    if (!mindResponse.ok) {
      const errorData = await mindResponse.text();
      console.error('Llongterm API error response:', errorData);
      throw new Error(`Failed to create mind: ${errorData}`);
    }

    const mind = await mindResponse.json();
    console.log('Mind created successfully:', mind.id);

    return new Response(
      JSON.stringify(mind),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-role-mind:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack // Adding stack trace for better debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
