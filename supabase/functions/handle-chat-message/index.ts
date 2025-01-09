import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MemoryManager } from "../shared/memoryManager.ts";
import { OpenAIManager } from "../shared/openAIManager.ts";
import { ConversationChainItem, Message, Thread, Role } from "../shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const memoryManager = new MemoryManager(supabaseUrl, supabaseKey);
    const openAIManager = new OpenAIManager(openAIKey);

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

    // Store user message
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

    // Handle memory storage for tagged role
    let embedding;
    if (taggedRoleId) {
      try {
        console.log('Processing memory for tagged role');
        embedding = await memoryManager.createEmbedding(content);
        await memoryManager.storeMemory(
          taggedRoleId,
          content,
          threadId,
          userMessage.id,
          embedding.vector
        );
        console.log('Memory stored successfully');
      } catch (error) {
        console.error('Error in memory storage:', error);
        // Continue execution even if memory storage fails
      }
    }

    // Ensure OpenAI thread exists
    let openaiThreadId = thread.openai_thread_id;
    if (!openaiThreadId) {
      openaiThreadId = await openAIManager.createThread();
      await supabase
        .from('threads')
        .update({ openai_thread_id: openaiThreadId })
        .eq('id', threadId);
    }

    // Add user message to OpenAI thread
    await openAIManager.addMessageToThread(
      openaiThreadId,
      content,
      { source_message_id: threadId }
    );

    // Process each role in the conversation chain
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

        // Get relevant memories if we have an embedding
        let memoryContext = '';
        if (embedding?.vector) {
          try {
            const memories = await memoryManager.retrieveRelevantMemories(role_id, embedding.vector);
            memoryContext = memoryManager.formatMemoryContext(memories);
            console.log('Retrieved and formatted memories for context');
          } catch (error) {
            console.error('Error retrieving memories:', error);
            // Continue without memories if retrieval fails
          }
        }

        // Get assistant's response
        const assistantMessage = await openAIManager.runAssistant(
          openaiThreadId,
          role,
          memoryContext
        );

        // Save assistant's response
        await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: assistantMessage.content[0].text.value,
            chain_id: crypto.randomUUID(),
            chain_order: chain_order,
            reply_to_message_id: userMessage.id,
            openai_message_id: assistantMessage.id,
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