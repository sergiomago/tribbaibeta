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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields');
    }

    // Check if user owns the thread
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      console.error('Thread error:', threadError);
      throw new Error('Thread not found');
    }

    if (thread.user_id !== user.id) {
      throw new Error('Unauthorized access to thread');
    }

    // Check message limits
    const canCreate = await supabase.rpc('can_create_message', { thread_id: threadId });
    if (!canCreate) {
      throw new Error('Message limit reached');
    }

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message error:', messageError);
      throw messageError;
    }

    // Get conversation chain
    const { data: chain, error: chainError } = await supabase
      .rpc('get_conversation_chain', {
        p_thread_id: threadId,
        p_tagged_role_id: taggedRoleId
      });

    if (chainError) {
      console.error('Chain error:', chainError);
      throw chainError;
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Process each role in the chain
    for (const { role_id, chain_order } of chain) {
      try {
        // Get role details
        const { data: role } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (!role) {
          console.error('Role not found:', role_id);
          continue;
        }

        // Get recent conversation history
        const { data: history } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles(name, tag, instructions),
            created_at,
            metadata
          `)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Generate response using chat completion
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: role.instructions
            },
            ...(history?.reverse().map(msg => ({
              role: msg.role ? 'assistant' : 'user',
              name: msg.role?.tag || undefined,
              content: msg.content
            })) || []),
            {
              role: 'user',
              content
            }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Save the role's response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            response_order: chain_order,
            chain_id: message.id
          });

        if (responseError) {
          console.error('Error saving response:', responseError);
          throw responseError;
        }
      } catch (error) {
        console.error(`Error processing role ${role_id}:`, error);
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
        details: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});