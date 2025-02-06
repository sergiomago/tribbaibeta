
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { p_user_id, p_role_id } = await req.json();
    console.log('Creating thread for user:', p_user_id, 'with role:', p_role_id);

    if (!p_user_id) {
      throw new Error('User ID is required');
    }

    // Start a transaction
    const { data: threadData, error: threadError } = await supabaseClient
      .from('threads')
      .insert({
        user_id: p_user_id,
        name: 'New Chat',
      })
      .select()
      .single();

    if (threadError) {
      console.error('Error creating thread:', threadError);
      throw threadError;
    }

    console.log('Thread created:', threadData.id);

    // Create conversation state
    const { error: stateError } = await supabaseClient
      .from('conversation_states')
      .insert({
        thread_id: threadData.id,
        current_state: 'initial_analysis',
        active_roles: [],
        metadata: {}
      });

    if (stateError) {
      console.error('Error creating conversation state:', stateError);
      throw stateError;
    }

    console.log('Conversation state created');

    // If a role ID was provided, associate it with the thread
    if (p_role_id) {
      const { error: roleError } = await supabaseClient
        .from('thread_roles')
        .insert({
          thread_id: threadData.id,
          role_id: p_role_id,
        });

      if (roleError) {
        console.error('Error associating role:', roleError);
        throw roleError;
      }
      console.log('Role associated with thread');
    }

    return new Response(
      JSON.stringify(threadData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-thread-with-state:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating the thread',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
