
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import Llongterm from "https://esm.sh/llongterm@1.0.36"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!llongtermApiKey || !openaiApiKey) {
      console.error('Missing required API keys')
      throw new Error('LLONGTERM_API_KEY and OPENAI_API_KEY must be set')
    }

    console.log('Initializing Llongterm client')

    // Get request body
    const { specialism, specialismDepth, metadata, customStructure } = await req.json()
    console.log('Received request parameters:', { specialism, customStructure })

    // Initialize Llongterm with both API keys
    const llongterm = new Llongterm({
      keys: {
        llongterm: llongtermApiKey,
        openai: openaiApiKey
      }
    });

    // Create mind with correct parameter structure
    const mindParams = specialism 
      ? { specialism, specialismDepth: specialismDepth || 2 }
      : { customStructuredKeys: customStructure };

    console.log('Creating mind with params:', mindParams)
    const mind = await llongterm.create(mindParams);

    if (!mind?.mind?.id) {
      console.error('Invalid mind object returned:', mind)
      throw new Error('Failed to create valid mind object')
    }

    console.log('Mind created successfully with ID:', mind.mind.id)

    return new Response(
      JSON.stringify({ id: mind.mind.id }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in create-mind:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
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
