import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateRoleResponse, recordInteraction, updateMemoryRelevance } from "./responseGenerator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

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

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Get responding roles in order
    const { data: roles } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3,
        p_max_roles: 3
      }
    );

    if (!roles?.length) {
      console.log('No roles found for thread');
      return new Response(
        JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each role sequentially
    for (const roleData of roles) {
      try {
        // Get relevant memories for this role
        const { data: memories } = await supabase.rpc(
          'get_similar_memories',
          {
            p_embedding: content,
            p_match_threshold: 0.7,
            p_match_count: 5,
            p_role_id: roleData.role_id
          }
        );

        // Generate and save response for this role
        await generateRoleResponse(
          supabase,
          threadId,
          roleData.role_id,
          message,
          memories || [],
          openai
        );

        // Update memory relevance
        if (memories?.length) {
          await updateMemoryRelevance(supabase, memories);
        }

        // Record interaction
        await recordInteraction(
          supabase,
          threadId,
          roleData.role_id,
          taggedRoleId,
          null,
          memories?.length || 0
        );

      } catch (error) {
        console.error(`Error processing role ${roleData.role_id}:`, error);
        continue; // Continue with next role even if one fails
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