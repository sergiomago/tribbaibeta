
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Llongterm from "https://esm.sh/llongterm@1.0.36"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')
    if (!llongtermApiKey) {
      console.error('LLONGTERM_API_KEY is not set in environment variables')
      throw new Error('LLONGTERM_API_KEY is not set')
    }

    console.log('Initializing Llongterm with API key length:', llongtermApiKey.length)

    // Get request body
    const { specialism, specialismDepth, metadata } = await req.json()
    console.log('Received request parameters:', { specialism, specialismDepth })

    // Create a Llongterm client instance
    const llongterm = new Llongterm(llongtermApiKey)

    if (!llongterm?.minds) {
      console.error('llongterm.minds is undefined after initialization')
      throw new Error('Invalid Llongterm client state: minds property is undefined')
    }

    console.log('Llongterm initialized successfully')

    // Create mind with validation
    const mind = await llongterm.minds.create({
      specialism,
      specialismDepth,
      metadata
    })

    // Validate mind object
    if (!mind || !mind.id) {
      console.error('Invalid mind object returned:', mind)
      throw new Error('Failed to create valid mind object')
    }

    console.log('Mind created successfully with ID:', mind.id)

    return new Response(
      JSON.stringify({ id: mind.id }),
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
