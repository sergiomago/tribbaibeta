
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { determineResponseOrder } from "./messageAnalyzer.ts";
import { handleResponseChain } from "./responseManager.ts";
import { handleError, ChatError } from "./errorHandler.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    if (!openAIApiKey) throw new ChatError('OpenAI API key is not configured');
    if (!supabaseUrl || !supabaseServiceKey) throw new ChatError('Supabase configuration is missing');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new ChatError('Missing required fields: threadId and content are required', 400);
    }

    let resolvedRoleId = null;
    if (taggedRoleId) {
      // If taggedRoleId is not a UUID, try to find the role by tag
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(taggedRoleId)) {
        // Normalize tag - remove @ if present and try both with and without @
        const normalizedTag = taggedRoleId.startsWith('@') ? taggedRoleId.substring(1) : taggedRoleId;
        const possibleTags = [`@${normalizedTag}`, normalizedTag];
        
        console.log('Looking for role with possible tags:', possibleTags);
        
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('id, name, tag')
          .or(`tag.eq.${possibleTags[0]},tag.eq.${possibleTags[1]}`)
          .single();

        if (roleError || !role) {
          console.error('Role lookup error:', roleError);
          throw new ChatError(`Role with tag "${taggedRoleId}" not found. Available tags should start with @ symbol.`, 404);
        }
        console.log('Found role:', role);
        resolvedRoleId = role.id;
      } else {
        resolvedRoleId = taggedRoleId;
      }
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: resolvedRoleId,
        depth_level: 0,
        chain_position: 0,
        metadata: {},
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    const { data: threadRoles, error: rolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (rolesError) throw rolesError;
    if (!threadRoles?.length) throw new ChatError('No roles found for thread', 404);

    let orderedRoles;
    if (resolvedRoleId) {
      orderedRoles = [{ roleId: resolvedRoleId, score: 1 }];
    } else {
      orderedRoles = await determineResponseOrder(
        supabase,
        threadId,
        content,
        threadRoles.map(tr => tr.role_id),
        openai
      );
    }

    await handleResponseChain(supabase, threadId, message, orderedRoles, openai);

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return handleError(error);
  }
});
