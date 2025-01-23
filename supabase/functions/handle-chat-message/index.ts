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
    
    const { threadId, content, taggedRoleId, chain } = await req.json();

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    console.log('Processing message:', { threadId, content, taggedRoleId, chain });

    // If taggedRoleId is a string but not a UUID, assume it's a role tag and look up the ID
    let resolvedRoleId = taggedRoleId;
    if (taggedRoleId && !taggedRoleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('Looking up role ID for tag:', taggedRoleId);
      
      // First check if the role exists in the thread
      const { data: threadRole, error: threadRoleError } = await supabase
        .from('thread_roles')
        .select('roles(id, tag)')
        .eq('thread_id', threadId)
        .eq('roles.tag', taggedRoleId.replace('@', '')) // Remove @ prefix if present
        .maybeSingle();

      if (threadRoleError) {
        console.error('Error looking up role in thread:', threadRoleError);
        throw new Error(`Error looking up role: ${threadRoleError.message}`);
      }

      if (!threadRole) {
        // Check if the role exists at all
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('id, tag')
          .eq('tag', taggedRoleId.replace('@', '')) // Remove @ prefix if present
          .maybeSingle();

        if (roleError) {
          console.error('Error looking up role:', roleError);
          throw new Error(`Error looking up role: ${roleError.message}`);
        }

        if (!role) {
          throw new Error(`No role found with tag "@${taggedRoleId}". Please make sure you're using a valid role tag.`);
        } else {
          throw new Error(`The role "@${taggedRoleId}" exists but is not assigned to this conversation. Please add it to the conversation first.`);
        }
      }

      resolvedRoleId = threadRole.roles.id;
      console.log('Resolved role ID:', resolvedRoleId);
    }

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: resolvedRoleId || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

    // Get roles to respond
    let rolesToRespond;
    if (resolvedRoleId) {
      // If tagged, only that role responds
      rolesToRespond = [{ role_id: resolvedRoleId }];
    } else if (chain) {
      // Use provided chain
      rolesToRespond = chain;
    } else {
      // Get thread roles
      const { data: threadRoles, error: threadRolesError } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId);

      if (threadRolesError) throw threadRolesError;
      rolesToRespond = threadRoles;
    }

    if (!rolesToRespond?.length) {
      throw new Error('No roles found to respond');
    }

    console.log('Roles responding:', rolesToRespond);

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

    // Process responses for each role
    for (const { role_id } of rolesToRespond) {
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