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

    const { threadId, content } = await req.json();
    console.log('Received request:', { threadId, content });

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
      console.log('Creating new OpenAI thread');
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

    // Add message to OpenAI thread
    console.log('Adding message to OpenAI thread:', openaiThreadId);
    const openaiMessage = await openai.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content,
    });

    // Save user message to database
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        openai_message_id: openaiMessage.id
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw new Error(`Failed to save user message: ${messageError.message}`);
    }

    // Get the first role for this thread
    const { data: threadRole, error: roleError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId)
      .limit(1)
      .single();

    if (roleError) {
      console.error('Error fetching thread role:', roleError);
      throw new Error(`Failed to fetch thread role: ${roleError.message}`);
    }

    // Get role details
    const { data: role, error: roleDetailsError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', threadRole.role_id)
      .single();

    if (roleDetailsError) {
      console.error('Error fetching role details:', roleDetailsError);
      throw new Error(`Failed to fetch role details: ${roleDetailsError.message}`);
    }

    // Create and run the assistant
    console.log('Creating run with assistant:', role.assistant_id);
    const run = await openai.beta.threads.runs.create(openaiThreadId, {
      assistant_id: role.assistant_id,
    });

    // Wait for completion
    console.log('Waiting for run completion:', run.id);
    let runStatus = await openai.beta.threads.runs.retrieve(openaiThreadId, run.id);
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      console.log('Run status:', runStatus.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(openaiThreadId, run.id);
    }

    if (runStatus.status !== 'completed') {
      console.error('Run failed:', runStatus);
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    // Get assistant's response
    console.log('Retrieving assistant response');
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
        role_id: threadRole.role_id,
        content: responseContent,
        openai_message_id: lastMessage.id,
      });

    if (responseError) {
      console.error('Error saving assistant response:', responseError);
      throw new Error(`Failed to save assistant response: ${responseError.message}`);
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