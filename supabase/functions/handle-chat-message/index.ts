
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a single supabase client for interacting with your database
const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const { threadId, content, roles } = await req.json();

    if (!threadId || !content || !roles) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Processing message for thread:', threadId);
    console.log('Roles:', roles);

    // Process each role's response
    for (const role of roles) {
      try {
        // Update placeholder message with actual content
        const { error: updateError } = await supabaseClient
          .from('messages')
          .update({
            content: `Response from ${role.name}: Processing the question about ${content.substring(0, 30)}...`,
            metadata: {
              role_name: role.name,
              streaming: false,
              processed: true
            }
          })
          .eq('thread_id', threadId)
          .eq('role_id', role.id)
          .eq('metadata->streaming', true);

        if (updateError) {
          console.error('Error updating message:', updateError);
          throw updateError;
        }

      } catch (error) {
        console.error(`Error processing role ${role.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
