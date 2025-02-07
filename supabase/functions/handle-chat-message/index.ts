
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
  // Handle CORS preflight requests
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

    // Get all roles in the chain with their details upfront
    const chainRoles = await Promise.all(chain.map(async ({ role_id }, index) => {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();
      return { ...role, position: index + 1 };
    }));

    console.log('Chain roles:', chainRoles);

    // Process responses one at a time
    for (const [index, { role_id }] of chain.entries()) {
      try {
        const currentPosition = index + 1;
        console.log(`Processing response for role ${role_id} at position ${currentPosition}`);
        
        // Get current role details
        const currentRole = chainRoles[index];
        if (!currentRole) {
          console.error(`Role ${role_id} not found in chain roles`);
          continue;
        }

        // Format chain roles information
        const chainRolesInfo = chainRoles
          .map(role => `${role.position}. ${role.name} (Expert in: ${role.expertise_areas?.join(', ')})`)
          .join('\n');

        // Get previous responses in this chain
        const { data: previousResponses } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles(name, expertise_areas)
          `)
          .eq('thread_id', threadId)
          .eq('chain_id', message.id)
          .order('created_at', { ascending: true });

        // Format previous responses
        const formattedResponses = (previousResponses || [])
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            const expertise = msg.role?.expertise_areas?.join(', ') || 'General';
            return `${roleName} (${expertise}): ${msg.content}`;
          })
          .join('\n\n');

        // Enhanced system prompt with collaboration focus
        const systemPrompt = `You are ${currentRole.name}, responding as position ${currentPosition} of ${chainRoles.length} roles in this conversation.

Conversation roles in order:
${chainRolesInfo}

Your expertise: ${currentRole.expertise_areas?.join(', ')}
Your role instructions: ${currentRole.instructions}

${previousResponses?.length > 0 ? `Previous responses in this chain:\n${formattedResponses}` : 'You are opening the discussion'}

Your Response Strategy:
${currentPosition === 1 ? 
  '- As the first expert, set a strong foundation that others can build upon\n- Provide clear points that invite complementary perspectives\n- Highlight areas where other experts can add value' 
  : currentPosition < chainRoles.length ? 
  `- Build upon insights from previous experts\n- Connect your expertise to points raised by ${chainRoles[currentPosition - 2].name}\n- Identify gaps you can uniquely address`
  : '- Synthesize key insights from all previous experts\n- Address any remaining gaps\n- Provide concluding recommendations that integrate all perspectives'}

Collaboration Rules:
1. Direct Referencing
   - Explicitly mention relevant points from previous experts
   - Explain how your expertise enhances or complements these points
   - Highlight connections between different experts' perspectives

2. Value Addition
   - Avoid restating previous points; instead, build upon them
   - Fill knowledge gaps with your unique expertise
   - Provide new angles or deeper insights to existing points

3. Discussion Connectivity
   - Maintain a clear link to the original question
   - Show how your contribution fits into the broader discussion
   - Connect insights across different areas of expertise

${currentPosition < chainRoles.length ? 
  `Next Expert: ${chainRoles[currentPosition].name} will focus on ${chainRoles[currentPosition].expertise_areas?.join(', ')}. Consider how your insights can support their perspective.` 
  : 'As the final expert, ensure you provide clear, actionable conclusions that synthesize the entire discussion.'}`;

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

