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
    
    const { threadId, content, chain } = await req.json();

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    console.log('Processing message:', { threadId, content });

    // Extract tags using regex - looking for @tag format
    const tags = content.match(/@(\w+)\b/g)?.map(tag => tag.slice(1)) || [];
    console.log('Extracted tags:', tags);

    // Get roles to respond
    let rolesToRespond;
    
    if (tags.length > 0) {
      // If tags present, get only the tagged roles that exist in the thread
      const { data: threadRoles, error: threadRoleError } = await supabase
        .from('thread_roles')
        .select('roles(id, tag)')
        .eq('thread_id', threadId);

      if (threadRoleError) {
        console.error('Error looking up roles in thread:', threadRoleError);
        throw new Error(`Error looking up roles: ${threadRoleError.message}`);
      }

      // Validate tags against available roles
      const availableRoles = threadRoles?.map(tr => tr.roles?.tag) || [];
      const invalidTags = tags.filter(tag => !availableRoles.includes(tag));
      
      if (invalidTags.length > 0) {
        if (threadRoles?.length === 0) {
          throw new Error(`No roles found in this conversation. Please add roles before tagging them.`);
        }
        const availableRolesStr = availableRoles.map(tag => `@${tag}`).join(', ');
        throw new Error(`Invalid role tags: @${invalidTags.join(', @')}. Available roles are: ${availableRolesStr}`);
      }

      // Get role IDs for valid tags
      rolesToRespond = threadRoles
        ?.filter(tr => tags.includes(tr.roles?.tag))
        .map(tr => ({ role_id: tr.roles?.id }));

    } else if (chain) {
      // Use provided chain if no tags
      rolesToRespond = chain;
    } else {
      // Get all thread roles if no tags or chain
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

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: rolesToRespond[0]?.role_id || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

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