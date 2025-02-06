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
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Save user message first
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

    // Process responses one at a time
    for (const { role_id } of chain) {
      try {
        console.log(`Processing response for role ${role_id}`);
        
        // Get role details
        const { data: role } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (!role) {
          console.error(`Role ${role_id} not found`);
          continue;
        }

        // Format previous responses
        const formattedResponses = previousResponses
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            return `${roleName}: ${msg.content}`;
          })
          .join('\n\n');

        // Create the enhanced system prompt
        const systemPrompt = `You are ${role.name}, a specialized AI role with expertise in: ${role.expertise_areas?.join(', ')}. 
You are responding as position ${currentPosition} of ${totalRoles} roles in this conversation.

Role Context:
${previousRole ? 
  `- Previous response was from ${previousRole.data.name}, who specializes in: ${previousRole.data.expertise_areas?.join(', ')}` : 
  `- You are the first role to respond`}
${nextRole ? 
  `- After you, ${nextRole.data.name} will respond (expertise in: ${nextRole.data.expertise_areas?.join(', ')})` : 
  `- You are the last role to respond`}

Previous Responses:
${previousResponses.length > 0 ? 
  `${formattedResponses}` : 
  'You are the first to respond to this message.'}

Response Guidelines:
1. Focus first on aspects that match your primary expertise areas
2. When building upon previous responses:
   - Acknowledge valuable points made by previous roles
   - Add your unique expertise and perspective
   - Avoid contradicting previous responses
3. If a topic aligns with another role's expertise:
   - Acknowledge their expertise in that area
   - Provide your complementary perspective
4. Keep responses clear, focused, and relevant to the user's query
5. Maintain a consistent tone and conversation flow

Your Specific Role Instructions:
${role.instructions}

Current User Query:
${content}`;

        // Generate response
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
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