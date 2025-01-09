import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
      defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { threadId, content, taggedRoleId, conversationChain } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId, conversationChain });

    if (!threadId || !content) {
      console.error('Missing required fields:', { threadId, content });
      throw new Error('Missing required fields');
    }

    // Get thread details
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (threadError) {
      console.error('Error fetching thread:', threadError);
      throw new Error(`Failed to fetch thread: ${threadError.message}`);
    }

    // Create or get OpenAI thread
    let openaiThreadId = thread.openai_thread_id;
    if (!openaiThreadId) {
      const openaiThread = await openai.beta.threads.create();
      openaiThreadId = openaiThread.id;
      
      const { error: updateError } = await supabase
        .from('threads')
        .update({ openai_thread_id: openaiThreadId })
        .eq('id', threadId);

      if (updateError) {
        console.error('Error updating thread with OpenAI ID:', updateError);
        throw new Error(`Failed to update thread with OpenAI ID: ${updateError.message}`);
      }
    }

    // Add user message to OpenAI thread
    const openaiMessage = await openai.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content,
      metadata: { source_message_id: threadId }
    });

    // Save user message to database
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        openai_message_id: openaiMessage.id
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw new Error(`Failed to save user message: ${messageError.message}`);
    }

    // Process each role in the chain
    for (const { role_id, chain_order } of conversationChain) {
      try {
        // Get role details
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (roleError) {
          console.error('Error fetching role:', roleError);
          continue;
        }

        // Get similar memories
        const { data: memories, error: memoriesError } = await supabase
          .rpc('get_similar_memories', {
            p_embedding: content,
            p_match_threshold: 0.7,
            p_match_count: 5,
            p_role_id: role_id
          });

        if (memoriesError) {
          console.error('Error fetching memories:', memoriesError);
        }

        // Add context from memories to the instructions
        const memoryContext = memories?.length 
          ? `\n\nRelevant context from memory:\n${memories.map(m => m.content).join('\n')}`
          : '';

        const enhancedInstructions = `${role.instructions}${memoryContext}`;

        // Run assistant
        const run = await openai.beta.threads.runs.create(openaiThreadId, {
          assistant_id: role.assistant_id,
          instructions: enhancedInstructions
        });

        // Wait for completion
        let runStatus = await openai.beta.threads.runs.retrieve(openaiThreadId, run.id);
        while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await openai.beta.threads.runs.retrieve(openaiThreadId, run.id);
        }

        if (runStatus.status !== 'completed') {
          console.error('Assistant run failed:', runStatus);
          continue;
        }

        // Get assistant's response
        const messages = await openai.beta.threads.messages.list(openaiThreadId, {
          order: 'desc',
          limit: 1
        });
        
        const lastMessage = messages.data[0];
        const responseContent = lastMessage.content[0].text.value;

        // Save assistant's response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_id: crypto.randomUUID(),
            chain_order: chain_order,
            reply_to_message_id: userMessage.id,
            openai_message_id: lastMessage.id,
          });

        if (responseError) {
          console.error('Error saving assistant response:', responseError);
          continue;
        }

      } catch (error) {
        console.error('Error in role processing loop:', error);
        continue;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});