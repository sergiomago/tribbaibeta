import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { processMessage } from "./messageProcessor.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, taggedRoleId } = await req.json();

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

    // Get thread roles based on tagging
    const rolesQuery = supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    // If a role is tagged, only get that specific role
    if (taggedRoleId) {
      rolesQuery.eq('role_id', taggedRoleId);
    }

    const { data: threadRoles, error: threadRolesError } = await rolesQuery;

    if (threadRolesError) throw threadRolesError;
    if (!threadRoles?.length) throw new Error('No roles found for thread');

    // Get previous messages for context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select(`
        *,
        role:roles(
          name,
          tag
        )
      `)
      .eq('thread_id', threadId)
      .eq('chain_id', message.id)
      .order('created_at', { ascending: true });

    console.log(`Processing responses for ${threadRoles.length} roles. Tagged role: ${taggedRoleId || 'none'}`);

    // Process responses for each role
    for (const { role_id } of threadRoles) {
      try {
        const responseContent = await processMessage(
          openai,
          supabase,
          threadId,
          role_id,
          message,
          previousMessages || []
        );

        // Save role's response
        await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_id: message.id,
          });

      } catch (error) {
        console.error(`Error processing response for role ${role_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred',
        details: error.stack
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});