
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { buildMemoryContext } from "./memoryContextBuilder.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    if (!openAIApiKey) throw new Error('OpenAI API key is not configured');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase configuration is missing');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, chain, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, chain, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Get all roles in the chain with their details and minds
    const chainRoles = await Promise.all(chain.map(async ({ role_id }, index) => {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select(`
          *,
          mind:role_minds!inner(
            mind_id,
            status
          )
        `)
        .eq('id', role_id)
        .single();
      
      if (roleError) {
        console.error(`Error fetching role ${role_id}:`, roleError);
        throw roleError;
      }
      
      return { ...roleData, position: index + 1 };
    }));

    console.log('Chain roles with minds:', chainRoles);

    // Process responses sequentially
    for (const [index, { role_id }] of chain.entries()) {
      try {
        const currentRole = chainRoles[index];
        if (!currentRole?.mind?.mind_id) {
          console.error(`No active mind found for role ${role_id}`);
          continue;
        }

        // Get conversation history
        const { data: history, error: historyError } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles!messages_role_id_fkey (
              name,
              expertise_areas
            ),
            created_at
          `)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) throw historyError;

        // Format conversation history
        const conversationThread = history?.map(msg => ({
          role: msg.role ? 'assistant' : 'user',
          content: msg.content,
          name: msg.role?.name,
          expertise: msg.role?.expertise_areas
        })) || [];

        // Build memory context
        const memoryContext = await buildMemoryContext(
          supabase,
          openai,
          threadId,
          role_id,
          content
        );

        // Create completion with memory context
        const completion = await openai.chat.completions.create({
          model: currentRole.model || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are ${currentRole.name}, an expert in ${currentRole.expertise_areas?.join(', ')}.
                ${memoryContext.systemContext || ''}
                
                Your role instructions:
                ${currentRole.instructions}
                
                Previous context and memories:
                ${memoryContext.enrichedMessage || ''}
                
                Guidelines:
                1. Use the provided context and memories to maintain conversation continuity
                2. Stay within your expertise areas
                3. Be natural and conversational
                4. Acknowledge and build upon previous points from memory`
            },
            ...conversationThread.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            })),
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;
        console.log('Generated response:', responseContent.substring(0, 100) + '...');

        // Store response in database
        const { data: savedMessage, error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_position: index + 1,
            conversation_context: {
              memory_context: memoryContext,
              depth_level: conversationThread.length,
              role_expertise: currentRole.expertise_areas
            }
          })
          .select()
          .single();

        if (responseError) {
          console.error(`Error saving response for role ${role_id}:`, responseError);
          throw responseError;
        }

        // Update role's memory
        await updateMemoryForRole(supabase, role_id, {
          thread_id: threadId,
          content: responseContent,
          user_message: content,
          context_type: 'conversation',
          metadata: {
            timestamp: new Date().toISOString(),
            conversation_depth: conversationThread.length,
            chain_position: index + 1,
            interaction_type: taggedRoleId ? 'direct_response' : 'chain_response'
          }
        });

      } catch (error) {
        console.error(`Error processing response for role ${role_id}:`, error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request.',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function updateMemoryForRole(
  supabase: any,
  roleId: string,
  memory: {
    thread_id: string;
    content: string;
    user_message: string;
    context_type: string;
    metadata: Record<string, any>;
  }
) {
  try {
    const { error } = await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: memory.content,
        context_type: memory.context_type,
        metadata: memory.metadata,
        conversation_context: {
          user_message: memory.user_message,
          thread_id: memory.thread_id,
          created_at: new Date().toISOString()
        }
      });

    if (error) throw error;
    console.log(`Memory stored for role ${roleId}`);
  } catch (error) {
    console.error('Error storing memory:', error);
    throw error;
  }
}
