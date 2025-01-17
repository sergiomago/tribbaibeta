import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Received request:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    });

    // Get thread owner
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', threadId)
      .single();

    if (threadError) {
      console.error('Error fetching thread:', threadError);
      throw threadError;
    }

    // Save user message with initial metadata
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        metadata: {
          verification_status: 'needs_verification',
          verification_score: 0,
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Get conversation chain
    const { data: chain, error: chainError } = await supabase
      .rpc('get_conversation_chain', {
        p_thread_id: threadId,
        p_tagged_role_id: taggedRoleId
      });

    if (chainError) {
      console.error('Error getting conversation chain:', chainError);
      throw chainError;
    }

    // Process each role in the chain
    for (const { role_id, chain_order } of chain) {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (!role) continue;

      // Get relevant memories
      const { data: memories } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: content,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: role_id
        });

      // Generate response using OpenAI
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\nRelevant context:\n${
              memories?.map(m => m.content).join('\n') || 'No relevant memories found.'
            }`
          },
          { role: 'user', content }
        ],
      });

      const responseContent = completion.choices[0].message.content;

      // Save role's response with verification metadata
      const { error: responseError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: role_id,
          content: responseContent,
          chain_id: message.id,
          chain_order,
          response_order: chain_order,
          metadata: {
            verification_status: 'needs_verification',
            verification_score: 0,
            message_id: message.id
          }
        });

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw responseError;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});