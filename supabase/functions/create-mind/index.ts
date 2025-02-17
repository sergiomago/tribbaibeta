
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import Llongterm from "https://esm.sh/llongterm@latest"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')
    if (!llongtermApiKey) {
      throw new Error('LLONGTERM_API_KEY is not set')
    }

    // Get request body
    const { specialism, specialismDepth, metadata } = await req.json()

    // Initialize Llongterm
    const llongterm = new Llongterm({
      keys: { llongterm: llongtermApiKey }
    })

    // Create mind
    const mind = await llongterm.minds.create({
      specialism,
      specialismDepth,
      metadata
    })

    // Return only the necessary mind data
    return new Response(
      JSON.stringify({
        id: mind.id,
        status: 'created'
      }),
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
