import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Received request:', { threadId, content, taggedRoleId });

    // Get thread details and roles
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save user message
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    // Get conversation chain (roles that should respond)
    const { data: chain, error: chainError } = await supabase
      .rpc('get_conversation_chain', {
        p_thread_id: threadId,
        p_tagged_role_id: taggedRoleId
      });

    if (chainError) {
      console.error('Error getting conversation chain:', chainError);
      throw chainError;
    }

    console.log('Conversation chain:', chain);

    // Process each role in the chain
    for (const { role_id, chain_order } of chain) {
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

      // Get relevant memories for context
      const { data: memories } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: content,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: role_id
        });

      // Get recent conversation history
      const { data: history } = await supabase
        .from('messages')
        .select('content, role:roles(name, tag)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Prepare conversation context
      const memoryContext = memories?.length 
        ? `Relevant context from your memory: ${memories.map(m => m.content).join(' | ')}`
        : '';

      const conversationHistory = history?.reverse().map(msg => ({
        role: msg.role ? 'assistant' : 'user',
        name: msg.role?.tag || undefined,
        content: msg.content
      })) || [];

      // Generate response using chat completion
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\n${memoryContext}`
          },
          ...conversationHistory,
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
          chain_id: userMessage.id
        });

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw responseError;
      }

      // Store response in role's memory
      const { error: memoryError } = await supabase
        .from('role_memories')
        .insert({
          role_id: role_id,
          content: responseContent,
          context_type: 'conversation',
          metadata: {
            thread_id: threadId,
            user_message: content,
            timestamp: new Date().getTime()
          }
        });

      if (memoryError) {
        console.error('Error storing memory:', memoryError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});