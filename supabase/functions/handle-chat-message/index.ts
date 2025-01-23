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

    // Extract all tags using regex - looking for single @
    const tags = content.match(/@(\w+)/g)?.map(tag => tag.slice(1)) || [];
    console.log('Extracted tags:', tags);

    // If we have a legacy taggedRoleId, add it to tags if it's not a UUID
    if (taggedRoleId && !taggedRoleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      tags.push(taggedRoleId.replace('@', ''));
    }

    // Resolve all tags to role IDs
    let resolvedRoleIds: string[] = [];
    if (tags.length > 0) {
      console.log('Resolving tags to role IDs');
      
      // Get all roles in the thread that match the tags
      const { data: threadRoles, error: threadRoleError } = await supabase
        .from('thread_roles')
        .select('roles(id, tag)')
        .eq('thread_id', threadId);

      if (threadRoleError) {
        console.error('Error looking up roles in thread:', threadRoleError);
        throw new Error(`Error looking up roles: ${threadRoleError.message}`);
      }

      // Map tags to role IDs
      for (const tag of tags) {
        const matchingRole = threadRoles?.find(tr => tr.roles?.tag === tag);
        if (!matchingRole) {
          if (threadRoles?.length === 0) {
            throw new Error(`No roles found in this conversation. Please add roles before tagging them.`);
          }
          // Format available roles with single @ in error message
          const availableRoles = threadRoles?.map(tr => `@${tr.roles?.tag}`).join(', ');
          throw new Error(`The role "@${tag}" is not assigned to this conversation. Available roles are: ${availableRoles}`);
        }
        resolvedRoleIds.push(matchingRole.roles.id);
      }
    }

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: resolvedRoleIds[0] || null, // Maintain backward compatibility
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

    // Get roles to respond
    let rolesToRespond;
    if (resolvedRoleIds.length > 0) {
      // If roles were tagged, only they respond
      rolesToRespond = resolvedRoleIds.map(id => ({ role_id: id }));
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