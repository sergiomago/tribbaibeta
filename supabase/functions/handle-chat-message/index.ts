import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPreviousResponses(supabase: any, threadId: string, chainId: string | null) {
  if (!chainId) return [];
  
  const { data: responses, error } = await supabase
    .from('messages')
    .select(`
      content,
      role:roles (name, tag, instructions)
    `)
    .eq('thread_id', threadId)
    .eq('chain_id', chainId)
    .order('response_order', { ascending: true });
    
  if (error) {
    console.error('Error fetching previous responses:', error);
    return [];
  }
    
  return responses || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    if (!openai.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const { threadId, content, taggedRoleId, messageType = 'text', metadata = null } = await req.json();
    console.log('Received request:', { threadId, content, taggedRoleId, messageType, metadata });

    if (!threadId || !content) {
      throw new Error('Missing required parameters: threadId or content');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate metadata based on message type
    if (messageType !== 'text' && (!metadata || !metadata.file_id)) {
      throw new Error(`Invalid metadata for message type: ${messageType}`);
    }

    // Save user message with appropriate metadata
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        message_type: messageType,
        metadata: messageType === 'text' ? 
          { intent: 'conversation' } : 
          { ...metadata, intent: 'conversation' }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    // Get conversation chain based on tagged role
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

    // Get previous responses in this chain
    const previousResponses = await getPreviousResponses(supabase, threadId, userMessage.id);
    
    // Process each role in the chain
    for (const { role_id, chain_order } of chain) {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (roleError || !role) {
        console.error('Error fetching role:', roleError);
        continue;
      }

      // Build context from previous responses
      const responseContext = previousResponses.length > 0 
        ? `Previous responses in this conversation:\n${previousResponses.map(r => 
            `${r.role.name} (${r.role.tag}): ${r.content}`
          ).join('\n')}`
        : '';

      try {
        // Generate response using chat completion
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `${role.instructions}\n\n${responseContext}`
            },
            { role: 'user', content }
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
            chain_id: userMessage.id,
            message_type: 'text',
            metadata: {
              intent: 'conversation',
              previousResponses: previousResponses.length
            }
          });

        if (responseError) {
          console.error('Error saving response:', responseError);
          throw responseError;
        }
      } catch (error) {
        console.error(`Error processing role ${role.name}:`, error);
        continue;
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