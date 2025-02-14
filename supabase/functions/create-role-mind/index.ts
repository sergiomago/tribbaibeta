
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')!
const LLONGTERM_API_URL = 'https://api.llongterm.ai/v1'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { roleId } = await req.json()
    console.log(`Creating mind for role: ${roleId}`)

    if (!roleId) {
      throw new Error('Role ID is required')
    }

    if (!llongtermApiKey) {
      throw new Error('LLONGTERM_API_KEY is not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError || !role) {
      throw new Error(`Failed to fetch role: ${roleError?.message}`)
    }

    // Get pending mind record
    const { data: mindRecord, error: mindError } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .single()

    if (mindError || !mindRecord) {
      throw new Error(`No pending mind record found for role: ${roleId}`)
    }

    // Create structured memory from role data
    const structuredMemory = {
      summary: role.description || '',
      structured: {
        name: role.name,
        expertise: role.expertise_areas || [],
        primaryTopics: role.primary_topics || [],
        capabilities: role.special_capabilities || [],
      },
      unstructured: {
        instructions: role.instructions,
        responseStyle: role.response_style || {},
        interactionPreferences: role.interaction_preferences || {},
      }
    }

    // Create mind options
    const createOptions = {
      initialMemory: structuredMemory,
      metadata: {
        roleId: role.id,
        userId: role.user_id,
        created: new Date().toISOString(),
      },
      config: mindRecord.memory_configuration || {
        contextWindow: 10,
        maxMemories: 100,
        relevanceThreshold: 0.7
      }
    }

    console.log('Sending request to Llongterm API:', {
      url: `${LLONGTERM_API_URL}/minds`,
      options: createOptions
    })

    // Create mind using Llongterm API
    const response = await fetch(`${LLONGTERM_API_URL}/minds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llongtermApiKey}`,
      },
      body: JSON.stringify(createOptions),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Llongterm API error response:', errorData)
      throw new Error(`Llongterm API error: ${response.status} - ${errorData}`)
    }

    const mind = await response.json()
    console.log('Successfully created mind:', mind)

    // Update role_minds with success
    const { error: updateError } = await supabase
      .from('role_minds')
      .update({
        mind_id: mind.id,
        status: 'active',
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        structured_memory: structuredMemory
      })
      .eq('role_id', roleId)

    if (updateError) {
      console.error('Error updating role_minds:', updateError)
      throw new Error(`Failed to update role_minds: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, mindId: mind.id }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error creating mind:', error)
    
    // Update role_minds with error status if we can
    try {
      const { roleId } = await req.json()
      if (roleId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('role_minds')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('role_id', roleId)
      }
    } catch (updateError) {
      console.error('Failed to update mind status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
