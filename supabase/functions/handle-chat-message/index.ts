import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { analyzeMessage, saveMessageAnalysis } from "./messageAnalyzer.ts";
import { buildResponseChain, validateChainOrder, updateChainProgress } from "./responseChainManager.ts";
import { compileMessageContext, updateContextualMemory } from "./contextCompiler.ts";
import { ChatMessage } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to handle-chat-message');
    
    const { threadId, content, taggedRoleId } = await req.json() as ChatMessage;
    console.log('Request payload:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: threadId and content are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    console.log('Initialized Supabase and OpenAI clients');

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    console.log('Saved user message:', message);

    // Analyze message
    const analysis = await analyzeMessage(content, openai);
    await saveMessageAnalysis(supabase, threadId, message.id, analysis);
    console.log('Message analysis completed');

    // Build response chain
    const chain = await buildResponseChain(supabase, threadId, taggedRoleId);
    console.log('Response chain built:', chain);

    // Process each role in the chain
    for (const { roleId, chainOrder } of chain) {
      console.log('Processing role:', { roleId, chainOrder });
      
      // Validate chain order
      const isValidOrder = await validateChainOrder(supabase, threadId, roleId, chainOrder);
      if (!isValidOrder) {
        console.log('Invalid chain order, skipping role:', roleId);
        continue;
      }

      // Compile context
      const context = await compileMessageContext(supabase, threadId, roleId, content);
      console.log('Context compiled for role:', roleId);

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

      // Generate response
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\nRelevant context:\n${
              context.memories?.map(m => m.content).join('\n') || 'No relevant memories found.'
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
        })
        .select()
        .single();

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw responseError;
      }

      console.log('Saved response:', response);

      // Update chain progress
      await updateChainProgress(supabase, threadId, response.id, chainOrder);

      // Update contextual memory
      await updateContextualMemory(supabase, roleId, responseContent, context);

      // Record interaction
      await supabase
        .from('role_interactions')
        .insert({
          thread_id: threadId,
          initiator_role_id: roleId,
          responder_role_id: taggedRoleId || roleId,
          interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
          metadata: {
            message_id: message.id,
            response_id: response.id,
            memory_count: context.memories?.length || 0,
            conversation_depth: context.conversationDepth
          }
        });
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