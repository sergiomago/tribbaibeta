
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
        
        const currentRole = chainRoles[index];
        if (!currentRole) {
          console.error(`Role ${role_id} not found in chain roles`);
          continue;
        }

        // Format chain roles information with clear expertise areas
        const chainRolesInfo = chainRoles
          .map(role => `${role.position}. ${role.name} (Expert in: ${role.expertise_areas?.join(', ')})`)
          .join('\n');

        // Get previous responses in this chain with enhanced formatting
        const { data: previousResponses } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles(name, expertise_areas)
          `)
          .eq('thread_id', threadId)
          .eq('chain_id', message.id)
          .order('created_at', { ascending: true });

        // Enhanced formatting for previous responses
        const formattedResponses = (previousResponses || [])
          .map((msg, idx) => {
            const roleName = msg.role?.name || 'Unknown';
            const expertise = msg.role?.expertise_areas?.join(', ') || 'General';
            return `Response #${idx + 1} - ${roleName} (${expertise}):\n${msg.content}`;
          })
          .join('\n\n');

        // Enhanced system prompt with new collaboration rules
        const systemPrompt = `You are ${currentRole.name}, responding as position ${currentPosition} of ${chainRoles.length} roles in this conversation.

Role Chain Information:
${chainRolesInfo}

Your Expertise Areas: ${currentRole.expertise_areas?.join(', ')}
Your Role Instructions: ${currentRole.instructions}

${previousResponses?.length > 0 ? `Previous Responses:\n${formattedResponses}` : 'You are opening the discussion'}

Response Format Requirements:
1. Opening:
   - Acknowledge previous responses using "@[Role Name]"
   - Summarize key relevant points from previous experts
   - State how your expertise relates to the question

2. Main Contribution:
   - Build upon previous insights
   - Add new, expertise-based perspectives
   - Make clear connections to the overall question

3. Closing:
   ${currentPosition < chainRoles.length ? 
     `- Identify areas where @${chainRoles[currentPosition].name} can expand
   - Bridge to their expertise in ${chainRoles[currentPosition].expertise_areas?.join(', ')}`
     : 
     '- Provide final synthesis and recommendations\n   - Ensure all key points are addressed'}

Collaboration Rules:
1. Direct Referencing
   - Use "@[Role Name]" when referring to other experts
   - Explicitly connect to previous points
   - Show how insights build on each other

2. Value Addition
   - Only add insights within your expertise
   - Build upon, don't repeat, previous points
   - Fill identified knowledge gaps

3. Discussion Connectivity
   - Maintain clear link to original question
   - Connect insights across different experts
   - Create bridges between different perspectives

4. Expertise Boundaries
   - If the topic is outside your expertise, state this clearly
   - Only contribute meaningful, expertise-based insights
   - If previous experts have fully covered your domain, acknowledge this
   - Defer to other experts when appropriate, using "This aspect would be better addressed by @[Role Name]..."

Position-Specific Guidelines:
${currentPosition === 1 ? 
  '- Set a strong foundation\n- Identify key areas for other experts\n- Frame the scope of discussion' 
  : currentPosition < chainRoles.length ? 
  `- Build upon insights from @${chainRoles[currentPosition - 2].name}\n- Add your unique perspective\n- Bridge to @${chainRoles[currentPosition].name}'s expertise`
  : '- Synthesize key insights\n- Add final expert perspective\n- Provide concluding recommendations'}`;

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

