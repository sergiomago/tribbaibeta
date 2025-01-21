import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent detection patterns
const ANALYSIS_INTENT = /analyze|examine|review|check|look at|what('s| is) in/i;
const SEARCH_INTENT = /search|find|look up|tell me about|what is|who is|where is|when|how to/i;
const FILE_REFERENCE = /this (file|document|pdf|image|photo)/i;

interface MessageIntent {
  type: 'analysis' | 'search' | 'conversation';
  fileReference?: boolean;
  taggedRoleId?: string;
}

function detectIntent(content: string, taggedRoleId?: string): MessageIntent {
  if (taggedRoleId) {
    return { type: 'conversation', taggedRoleId };
  }
  if (ANALYSIS_INTENT.test(content) && FILE_REFERENCE.test(content)) {
    return { type: 'analysis', fileReference: true };
  }
  if (SEARCH_INTENT.test(content)) {
    return { type: 'search' };
  }
  return { type: 'conversation' };
}

async function getConversationContext(supabase: any, threadId: string, chainId: string | null) {
  if (!chainId) return [];

  const { data: chainMessages } = await supabase
    .from('messages')
    .select(`
      content,
      role:roles(name, tag, instructions),
      created_at
    `)
    .eq('chain_id', chainId)
    .order('created_at', { ascending: true });

  return chainMessages || [];
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Detect message intent
    const intent = detectIntent(content, taggedRoleId);
    console.log('Detected intent:', intent);

    // Save user message with intent metadata
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        metadata: {
          intent: intent.type,
          fileReference: intent.fileReference || false
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    // Get conversation chain based on intent
    const { data: chain, error: chainError } = await supabase
      .rpc('get_conversation_chain', {
        p_thread_id: threadId,
        p_tagged_role_id: intent.type === 'analysis' ? 
          // Find analyst role
          (await supabase
            .from('thread_roles')
            .select('role_id')
            .eq('thread_id', threadId)
            .eq('roles.special_capabilities', '{doc_analysis}')
            .single()
          ).data?.role_id :
          intent.type === 'search' ?
          // Find researcher role
          (await supabase
            .from('thread_roles')
            .select('role_id')
            .eq('thread_id', threadId)
            .eq('roles.special_capabilities', '{web_search}')
            .single()
          ).data?.role_id :
          taggedRoleId
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

      // Get conversation context from the current chain
      const chainContext = await getConversationContext(supabase, threadId, userMessage.id);
      const contextMessages = chainContext.map(msg => ({
        role: msg.role ? 'assistant' : 'user',
        name: msg.role?.tag || undefined,
        content: msg.content
      }));

      // Get relevant memories for context
      const { data: memories } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: content,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: role_id
        });

      // Prepare conversation context
      const memoryContext = memories?.length 
        ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
        : '';

      // Add intent-specific instructions
      const intentInstructions = intent.type === 'analysis' 
        ? "\nThe user wants you to analyze a file or document. Look for file references in their message."
        : intent.type === 'search'
        ? "\nThe user wants you to search for information. Consider using web search capabilities if available."
        : "";

      // Generate response using chat completion
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\n${memoryContext}${intentInstructions}\n\nPrevious messages in this conversation:\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
          },
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
          chain_id: userMessage.id,
          metadata: {
            intent: intent.type,
            fileReference: intent.fileReference || false
          }
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
            timestamp: new Date().getTime(),
            chain_order: chain_order,
            intent: intent.type
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