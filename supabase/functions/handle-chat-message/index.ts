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
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { threadId, content, taggedRoleId, conversationChain } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields');
    }

    // Get thread details
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (threadError) throw threadError;
    if (!thread) throw new Error('Thread not found');

    // Store the message and get its ID
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content: content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Create embedding for memory storage
    if (taggedRoleId) {
      try {
        console.log('Creating embedding for memory:', content);
        const { data: embedding, error: embeddingError } = await supabase.functions.invoke(
          'create-embedding',
          {
            body: { content }
          }
        );

        if (embeddingError) throw embeddingError;

        // Store in role_memories with embedding
        const { error: memoryError } = await supabase
          .from('role_memories')
          .insert({
            role_id: taggedRoleId,
            content,
            embedding: embedding.vector,
            context_type: 'conversation',
            metadata: {
              thread_id: threadId,
              message_id: userMessage.id,
              timestamp: new Date().toISOString()
            }
          });

        if (memoryError) {
          console.error('Error storing memory:', memoryError);
          throw memoryError;
        }

        console.log('Successfully stored memory with embedding');
      } catch (error) {
        console.error('Error in memory storage:', error);
        // Continue execution even if memory storage fails
      }
    }

    // Process the message with OpenAI
    let openaiThreadId = thread.openai_thread_id;
    if (!openaiThreadId) {
      const openaiThread = await openai.beta.threads.create({
        metadata: { thread_id: threadId }
      });
      openaiThreadId = openaiThread.id;
      
      await supabase
        .from('threads')
        .update({ openai_thread_id: openaiThreadId })
        .eq('id', threadId);
    }

    // Add message to OpenAI thread
    await openai.beta.threads.messages.create(
      openaiThreadId,
      {
        role: 'user',
        content,
        metadata: { source_message_id: threadId }
      }
    );

    // Process responses for each role in the conversation chain
    for (const { role_id, chain_order } of conversationChain) {
      try {
        // Get role details
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (roleError) throw roleError;
        if (!role?.assistant_id) continue;

        // Run assistant
        const run = await openai.beta.threads.runs.create(
          openaiThreadId,
          {
            assistant_id: role.assistant_id,
            instructions: role.instructions
          }
        );

        // Wait for completion
        let runStatus = await openai.beta.threads.runs.retrieve(
          openaiThreadId,
          run.id
        );

        while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await openai.beta.threads.runs.retrieve(
            openaiThreadId,
            run.id
          );
        }

        if (runStatus.status !== 'completed') {
          console.error('Assistant run failed:', runStatus);
          continue;
        }

        // Get assistant's response
        const messages = await openai.beta.threads.messages.list(
          openaiThreadId,
          {
            order: 'desc',
            limit: 1
          }
        );
        
        const lastMessage = messages.data[0];
        const responseContent = lastMessage.content[0].text.value;

        // Save assistant's response
        await supabase
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

      } catch (error) {
        console.error('Error processing role response:', error);
        continue;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
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