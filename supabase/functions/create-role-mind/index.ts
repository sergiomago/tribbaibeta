import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface RoleData {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tag: string;
}

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roleId } = await req.json();
    console.log(`Creating mind for role: ${roleId}`);

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    // Update status to creating
    await supabase
      .from('role_minds')
      .update({ status: 'creating' })
      .eq('role_id', roleId);

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new Error(`Failed to fetch role: ${roleError?.message}`);
    }

    // Create mind in Llongterm
    const mindResponse = await fetch('https://api.llongterm.com/v1/minds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llongtermApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        specialism: role.tag,
        specialismDepth: 2,
        initialMemory: {
          summary: role.description || '',
          unstructured: {
            instructions: role.instructions,
            name: role.name,
            tag: role.tag,
          },
          structured: {}
        },
        metadata: {
          role_id: role.id,
          created_at: new Date().toISOString()
        }
      })
    });

    if (!mindResponse.ok) {
      throw new Error(`Llongterm API error: ${mindResponse.statusText}`);
    }

    const mind = await mindResponse.json();
    console.log(`Mind created successfully: ${mind.id}`);

    // Update role_minds with success
    const { error: updateError } = await supabase
      .from('role_minds')
      .update({
        mind_id: mind.id,
        status: 'active',
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString()
      })
      .eq('role_id', roleId);

    if (updateError) {
      throw new Error(`Failed to update role_minds: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, mindId: mind.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating mind:', error);
    
    // Update role_minds with error
    if (req.body) {
      const { roleId } = await req.json();
      await supabase
        .from('role_minds')
        .update({
          status: 'failed',
          error_message: error.message,
          last_error_at: new Date().toISOString()
        })
        .eq('role_id', roleId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});