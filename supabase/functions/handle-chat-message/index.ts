import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

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

    // Process responses sequentially
    for (const [index, { role_id }] of chain.entries()) {
      try {
        // Get role's mind and details
        const [mindResult, roleResult] = await Promise.all([
          supabase
            .from('role_minds')
            .select('*')
            .eq('role_id', role_id)
            .eq('status', 'active')
            .single(),
          supabase
            .from('roles')
            .select('*')
            .eq('id', role_id)
            .single()
        ]);

        if (mindResult.error || !mindResult.data) {
          console.error(`Error fetching mind for role ${role_id}:`, mindResult.error);
          throw new Error(`No active mind found for role ${role_id}`);
        }

        if (roleResult.error) throw roleResult.error;
        const role = roleResult.data;

        // Get conversation history with enhanced context
        const { data: history, error: historyError } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles!messages_role_id_fkey (
              name,
              expertise_areas,
              special_capabilities
            ),
            conversation_context,
            created_at
          `)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) throw historyError;

        // Format conversation history for mind with enhanced context
        const conversationThread = history?.map(msg => ({
          role: msg.role ? 'assistant' : 'user',
          content: msg.content,
          name: msg.role?.name,
          expertise: msg.role?.expertise_areas,
          context: msg.conversation_context || {},
          capabilities: msg.role?.special_capabilities || []
        })) || [];

        // Use mind to enrich context and store memory with enhanced metadata
        const enrichedContext = await mindResult.data.remember({
          thread: conversationThread,
          content,
          metadata: {
            role_name: role.name,
            expertise_areas: role.expertise_areas,
            thread_id: threadId,
            interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
            chain_position: index + 1,
            special_capabilities: role.special_capabilities || [],
            conversation_depth: conversationThread.length,
            topic_context: history?.[0]?.conversation_context?.topic_context || {}
          }
        });

        console.log('Generated enriched context:', enrichedContext);

        // Generate response using enriched context
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are ${role.name}, an expert in ${role.expertise_areas?.join(', ')}.
                ${enrichedContext.systemContext || ''}
                
                Your role instructions:
                ${role.instructions}
                
                Guidelines:
                1. Use the provided context to maintain conversation continuity
                2. Stay within your expertise areas
                3. Be natural and conversational
                4. Acknowledge and build upon previous points
                ${role.special_capabilities?.length ? `5. Utilize your special capabilities: ${role.special_capabilities.join(', ')}` : ''}`
            },
            { role: 'user', content: enrichedContext.enrichedMessage || content }
          ],
        });

        const responseContent = completion.choices[0].message.content;
        console.log('Generated response:', responseContent.substring(0, 100) + '...');

        // Store response with enhanced context
        const { data: savedMessage, error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_id: chain[0].role_id,
            chain_position: index + 1,
            conversation_context: {
              enriched_context: enrichedContext,
              role_expertise: role.expertise_areas,
              chain_position: index + 1,
              topic_context: enrichedContext.topicContext || {},
              effectiveness_metrics: {
                context_relevance: enrichedContext.contextRelevance || 0,
                expertise_match: enrichedContext.expertiseMatch || 0,
                response_quality: enrichedContext.responseQuality || 0
              }
            }
          })
          .select()
          .single();

        if (responseError) {
          console.error(`Error saving response for role ${role_id}:`, responseError);
          throw responseError;
        }

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