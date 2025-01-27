import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')!

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update status to processing
    await supabase
      .from('role_minds')
      .update({ status: 'processing' })
      .eq('role_id', roleId)

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError || !role) {
      throw new Error(`Failed to fetch role: ${roleError?.message}`)
    }

    // Simulate mind creation with Llongterm (replace with actual API call)
    const mindId = crypto.randomUUID()
    console.log(`Created mind with ID: ${mindId}`)

    // Update role_minds with success
    const { error: updateError } = await supabase
      .from('role_minds')
      .update({
        mind_id: mindId,
        status: 'active',
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString()
      })
      .eq('role_id', roleId)

    if (updateError) {
      throw new Error(`Failed to update role_minds: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, mindId }),
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