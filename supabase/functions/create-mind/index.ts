
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

class LlongtermMindClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async create(options: {
    specialism: string;
    specialismDepth: number;
    metadata: Record<string, any>;
  }) {
    console.log('Creating mind with options:', options);

    // Here you would make the actual API call to Llongterm's API
    // Using the apiKey for authentication
    const response = await fetch('https://api.llongterm.com/v1/minds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Llongterm API error:', error);
      throw new Error(`Failed to create mind: ${error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Mind created successfully:', data);

    return {
      id: data.id,
      // Add other properties that match the Mind interface
    };
  }
}

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

    console.log('Initializing Llongterm client')

    // Get request body
    const { specialism, specialismDepth, metadata } = await req.json()
    console.log('Received request parameters:', { specialism, specialismDepth })

    // Create client instance using our own implementation
    const llongterm = {
      minds: new LlongtermMindClient(llongtermApiKey)
    };

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
