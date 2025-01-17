import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildResponseChain, validateChainOrder, updateChainProgress } from "./responseChainManager.ts";
import { compileMessageContext, updateContextualMemory } from "./contextCompiler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'user_message'
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Build response chain with enhanced role selection
    const chain = await buildResponseChain(supabase, threadId, content, taggedRoleId);
    console.log('Response chain built:', chain);

    if (!chain.length) {
      console.warn('No roles selected for response');
      return new Response(
        JSON.stringify({ warning: 'No roles available to respond' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let previousResponse = content;
    let previousRoleName = "User";

    // Process each role sequentially
    for (const { roleId, chainOrder } of chain) {
      console.log('Processing role:', { roleId, chainOrder });
      
      const isValidOrder = await validateChainOrder(supabase, threadId, roleId, chainOrder);
      if (!isValidOrder) {
        console.log('Invalid chain order, skipping role:', roleId);
        continue;
      }

      // Get role details
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (!role) {
        console.error('Role not found:', roleId);
        continue;
      }

      // Compile context for this role
      const context = await compileMessageContext(supabase, threadId, roleId, content);

      // Generate response with enhanced context
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\nPrevious response from ${previousRoleName}: ${previousResponse}\n\nYou must acknowledge and build upon the previous response while maintaining your role's perspective and expertise. Consider this context from previous interactions:\n${
              context.memories.map(m => `- ${m.content}`).join('\n')
            }`
          },
          { role: 'user', content }
        ],
      });

      const responseContent = completion.choices[0].message.content;
      console.log('Generated response for role:', roleId);

      // Save role's response
      const { data: response, error: responseError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: roleId,
          content: responseContent,
          chain_id: message.id,
          chain_order: chainOrder,
          response_order: chainOrder,
          metadata: {
            timestamp: new Date().toISOString(),
            previous_role: previousRoleName,
            conversation_depth: chainOrder,
            context_used: context
          }
        })
        .select()
        .single();

      if (responseError) throw responseError;
      console.log('Saved response:', response);

      await updateChainProgress(supabase, threadId, response.id, chainOrder);

      // Record interaction and update memory
      await Promise.all([
        supabase
          .from('role_interactions')
          .insert({
            thread_id: threadId,
            initiator_role_id: roleId,
            responder_role_id: taggedRoleId || roleId,
            interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
            metadata: {
              message_id: message.id,
              response_id: response.id,
              conversation_depth: chainOrder,
              relevance_score: context.relevance_score
            }
          }),
        updateContextualMemory(supabase, roleId, responseContent, context)
      ]);

      // Update context for next role
      previousResponse = responseContent;
      previousRoleName = role.name;
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});