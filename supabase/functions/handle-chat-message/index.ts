
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
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    // Get all roles in the chain with their details
    const chainRoles = await Promise.all(chain.map(async ({ role_id }, index) => {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();
      return { ...role, position: index + 1 };
    }));

    console.log('Chain roles:', chainRoles);

    // Process responses sequentially
    for (const [index, { role_id }] of chain.entries()) {
      try {
        const currentRole = chainRoles[index];
        if (!currentRole) {
          console.error(`Role ${role_id} not found in chain roles`);
          continue;
        }

        // Build memory context for the current role
        const memoryContext = await buildMemoryContext(
          supabase,
          openai,
          threadId,
          role_id,
          content
        );

        console.log('Built memory context with relevance:', memoryContext.contextRelevance);

        // Format memory context in a conversational way
        const memoryPrompt = memoryContext.relevantMemories
          .map(memory => `Related memory: ${memory.content}`)
          .join('\n');

        const conversationContext = memoryContext.conversationHistory
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            const expertise = msg.role?.expertise_areas?.join(', ') || 'General';
            return `${roleName} (expert in ${expertise}): ${msg.content}`;
          })
          .join('\n\n');

        // Create an enhanced system prompt
        const systemPrompt = `You are ${currentRole.name}, an expert in ${currentRole.expertise_areas?.join(', ')}.

Previous conversation context:
${conversationContext}

Relevant memories and past discussions:
${memoryPrompt}

Your role instructions:
${currentRole.instructions}

Guidelines:
1. Reference relevant past discussions when appropriate
2. Build upon previous points made in the conversation
3. Stay within your expertise areas
4. Maintain conversation continuity
5. Be natural and conversational
6. Acknowledge and build upon others' contributions

Focus on making the conversation flow naturally while providing valuable expertise-based insights.`;

        // Generate response
        const completion = await openai.chat.completions.create({
          model: currentRole.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;
        console.log('Generated response:', responseContent.substring(0, 100) + '...');

        // Save response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_id: message.id
          });

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
