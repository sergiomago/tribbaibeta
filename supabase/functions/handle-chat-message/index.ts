
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAIApi(new Configuration({ apiKey: openAIApiKey }));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { threadId, content, chain, taggedRoleId } = await req.json();
    
    console.log('Processing message:', { threadId, content, chain });

    // Process each role in the chain
    for (let i = 0; i < chain.length; i++) {
      const roleId = chain[i].role_id;
      
      // Get role details
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      // Get recent conversation context
      const { data: context, error: contextError } = await supabase
        .from('messages')
        .select('content, role_id, role:roles(name)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (contextError) throw contextError;

      // Get relevant memories
      const { data: memories, error: memoryError } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: await generateEmbedding(content),
          p_match_threshold: 0.7,
          p_match_count: 3,
          p_role_id: roleId
        });

      if (memoryError) throw memoryError;

      // Format conversation history for the AI
      const conversationHistory = context
        ? context.reverse().map(msg => ({
            role: msg.role_id === roleId ? "assistant" : "user",
            content: msg.content
          }))
        : [];

      // Format memories as context
      const memoryContext = memories?.length
        ? `Relevant context from my memory:\n${memories
            .map(m => `- ${m.content}`)
            .join('\n')}`
        : '';

      // Generate AI response
      const completion = await openai.createChatCompletion({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: `${role.instructions}\n\n${memoryContext}`
          },
          ...conversationHistory,
          { role: "user", content }
        ],
      });

      const responseContent = completion.data.choices[0].message?.content;
      if (!responseContent) throw new Error('No response generated');

      // Store the response
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          content: responseContent,
          role_id: roleId,
          is_bot: true,
          chain_position: i + 1,
          metadata: {
            context_type: 'response',
            memories_used: memories?.map(m => m.id) || [],
            role_name: role.name,
            chain_order: i + 1
          }
        });

      if (messageError) throw messageError;

      // Record the interaction
      const { error: interactionError } = await supabase
        .from('role_interactions')
        .insert({
          thread_id: threadId,
          initiator_role_id: roleId,
          responder_role_id: taggedRoleId || roleId,
          interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
          metadata: {
            context_type: 'conversation',
            chain_position: i + 1,
            memories_used: memories?.length || 0
          }
        });

      if (interactionError) throw interactionError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateEmbedding(text: string) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002'
    })
  });

  const { data } = await response.json();
  return data[0].embedding;
}
