
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { extractExpertiseAreas, extractInteractionPreferences } from '../handle-chat-message/roleDataExtractor.ts'
import { llongtermClient } from '../handle-chat-message/llongtermClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Ensure only POST requests are allowed
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    const { roleId } = await req.json()
    console.log(`Creating mind for role: ${roleId}`)

    if (!roleId) {
      throw new Error('Role ID is required')
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

    // Extract expertise areas and interaction preferences
    const expertiseAreas = extractExpertiseAreas(role.description || '')
    const interactionPrefs = extractInteractionPreferences(role.instructions || '')

    // First, create the mind in Llongterm with proper settings
    console.log('Creating mind in Llongterm...', {
      role: role.name,
      expertiseAreas,
      interactionPrefs
    })

    const mind = await llongtermClient.createMind({
      specialism: role.name,
      specialismDepth: 2,
      settings: {
        response_format: 'json',
        model: role.model === 'gpt-4o' ? 'gpt-4' : 'gpt-3.5-turbo',
        max_tokens: 2048
      },
      initialMemory: {
        summary: role.description || '',
        unstructured: {
          instructions: role.instructions,
          expertise: expertiseAreas,
          preferences: interactionPrefs
        },
        structured: {
          role_id: roleId,
          created_at: new Date().toISOString(),
          capabilities: role.special_capabilities || []
        }
      },
      metadata: {
        role_id: roleId,
        role_name: role.name,
        expertise_areas: expertiseAreas,
        created_at: new Date().toISOString()
      }
    })

    console.log('Mind created successfully:', mind.id)

    // Update role with extracted data
    const { error: updateError } = await supabase
      .from('roles')
      .update({
        expertise_areas: expertiseAreas,
        interaction_preferences: interactionPrefs,
        response_style: {
          style: interactionPrefs.style || 'professional',
          approach: interactionPrefs.approach || 'balanced',
          complexity: interactionPrefs.complexity || 'adaptive'
        }
      })
      .eq('id', roleId)

    if (updateError) {
      throw new Error(`Failed to update role with extracted data: ${updateError.message}`)
    }

    // Update role_minds with the actual Llongterm mind ID
    const { error: mindError } = await supabase
      .from('role_minds')
      .update({
        mind_id: mind.id,
        status: 'active',
        metadata: {
          role_name: role.name,
          role_description: role.description,
          expertise_areas: expertiseAreas,
          interaction_preferences: interactionPrefs,
          created_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString()
      })
      .eq('role_id', roleId)

    if (mindError) {
      throw new Error(`Failed to update role_minds: ${mindError.message}`)
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
    
    return new Response(
      JSON.stringify({ error: error.message }),
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
