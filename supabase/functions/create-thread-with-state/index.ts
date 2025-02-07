import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { p_user_id, p_role_id } = await req.json();

    // Start a transaction
    const { data: threadData, error: threadError } = await supabaseClient
      .from('threads')
      .insert({
        user_id: p_user_id,
        name: 'New Chat',
      })
      .select()
      .single();

    if (threadError) throw threadError;

    // Create conversation state
    const { error: stateError } = await supabaseClient
      .from('conversation_states')
      .insert({
        thread_id: threadData.id,
        current_state: 'initial_analysis',
        active_roles: [],
        metadata: {}
      });

    if (stateError) throw stateError;

    // If a role ID was provided, associate it with the thread
    if (p_role_id) {
      const { error: roleError } = await supabaseClient
        .from('thread_roles')
        .insert({
          thread_id: threadData.id,
          role_id: p_role_id,
        });

      if (roleError) throw roleError;
    }

    return new Response(
      JSON.stringify(threadData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});