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
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'  // Updated to v2
      }
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { threadId, content, taggedRoleId, conversationChain } = await req.json();
    console.log('Processing message for thread:', threadId, 'with content:', content);

    // Get thread details
    const { data: thread } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Create or get OpenAI thread
    let openaiThreadId = thread.openai_thread_id;
    if (!openaiThreadId) {
      const openaiThread = await openai.beta.threads.create();
      openaiThreadId = openaiThread.id;
      await supabase
        .from('threads')
        .update({ openai_thread_id: openaiThreadId })
        .eq('id', threadId);
    }

    // Add user message to OpenAI thread
    await openai.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content,
    });

    // Save user message to database
    const { data: userMessage } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    // Generate a new chain ID for this conversation
    const chainId = crypto.randomUUID();
    
    // Process each role in the chain
    for (const { role_id, chain_order } of conversationChain) {
      // Get role details
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (!role?.assistant_id) {
        console.error('Role assistant not found for role:', role_id);
        continue;
      }

      // Get role's memory
      const { data: roleMemory } = await supabase
        .from('messages_memory')
        .select('content')
        .eq('role_id', role_id)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Prepare context from memory
      const memoryContext = roleMemory && roleMemory.length > 0
        ? `Previous relevant context:\n${roleMemory.map(m => m.content).join('\n')}`
        : '';

      // Get previous messages in the chain
      const { data: previousMessages } = await supabase
        .from('messages')
        .select('content, role_id')
        .eq('chain_id', chainId)
        .order('chain_order', { ascending: true });

      // Prepare conversation context
      const conversationContext = previousMessages && previousMessages.length > 0
        ? `Previous responses in this conversation:\n${previousMessages.map(m => m.content).join('\n')}`
        : '';

      // Run assistant with memory and conversation context
      const run = await openai.beta.threads.runs.create(openaiThreadId, {
        assistant_id: role.assistant_id,
        instructions: `${role.instructions}\n\n${memoryContext}\n\n${conversationContext}`,
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(
        openaiThreadId,
        run.id
      );

      while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed') {
          console.error('Assistant run failed for role:', role_id);
          throw new Error('Assistant run failed');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(
          openaiThreadId,
          run.id
        );
      }

      // Get assistant's response
      const messages = await openai.beta.threads.messages.list(openaiThreadId);
      const lastMessage = messages.data[0];
      const responseContent = lastMessage.content[0].text.value;

      // Store response in role's memory
      await supabase
        .from('messages_memory')
        .insert({
          role_id: role_id,
          thread_id: threadId,
          content: responseContent,
          context_type: 'conversation'
        });

      // Save assistant's response
      const { data: responseMessage } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: role_id,
          content: responseContent,
          chain_id: chainId,
          chain_order: chain_order,
          reply_to_message_id: userMessage.id,
          openai_message_id: lastMessage.id,
        })
        .select()
        .single();

      // Check if the assistant tagged another role
      const taggedRole = extractTaggedRole(responseContent);
      
      if (taggedRole) {
        // If a role was tagged, stop the current chain and start a new one
        // with only the tagged role
        console.log('Role tagged another role:', taggedRole);
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractTaggedRole(content: string): string | null {
  const match = content.match(/@(\w+)/);
  return match ? match[1] : null;
}