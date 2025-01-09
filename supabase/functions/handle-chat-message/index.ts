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

    const { threadId, content, taggedRoleId } = await req.json();

    // Get thread details and roles
    const { data: thread } = await supabase
      .from('threads')
      .select('*, thread_roles(role_id)')
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
    const { data: message } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    let currentOrder = 1;
    let nextRoleId = taggedRoleId;

    // If no role is tagged, get the first role to respond
    if (!taggedRoleId) {
      const { data: nextRole } = await supabase.rpc(
        'get_next_responding_role',
        { thread_id: threadId, current_order: currentOrder }
      );
      nextRoleId = nextRole;
    }

    while (nextRoleId) {
      // Get role details
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', nextRoleId)
        .single();

      if (!role?.assistant_id) {
        throw new Error('Role assistant not found');
      }

      // Run assistant
      const run = await openai.beta.threads.runs.create(openaiThreadId, {
        assistant_id: role.assistant_id,
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(
        openaiThreadId,
        run.id
      );

      while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed') {
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

      // Save assistant's response
      const { data: responseMessage } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: nextRoleId,
          content: lastMessage.content[0].text.value,
          response_order: currentOrder,
          reply_to_message_id: message.id,
          openai_message_id: lastMessage.id,
        })
        .select()
        .single();

      // Check if the assistant tagged another role
      const taggedRole = extractTaggedRole(lastMessage.content[0].text.value);
      
      if (taggedRole) {
        // Get the tagged role ID
        const { data: nextTaggedRole } = await supabase
          .from('roles')
          .select('id')
          .eq('tag', taggedRole)
          .single();
          
        nextRoleId = nextTaggedRole?.id;
      } else if (!taggedRoleId) {
        // If no role was initially tagged, get the next role in order
        currentOrder++;
        const { data: nextRole } = await supabase.rpc(
          'get_next_responding_role',
          { thread_id: threadId, current_order: currentOrder }
        );
        nextRoleId = nextRole;
      } else {
        // If a role was tagged and no new role was tagged, end the chain
        nextRoleId = null;
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