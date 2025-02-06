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

        // Get chain position information
        const { data: threadRoles } = await supabase
          .from('thread_roles')
          .select('role_id')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        const totalRoles = threadRoles?.length || 0;
        const currentPosition = threadRoles?.findIndex(tr => tr.role_id === role_id) + 1 || 0;
        
        // Get previous and next role information
        const previousRoleId = currentPosition > 1 ? threadRoles[currentPosition - 2]?.role_id : null;
        const nextRoleId = currentPosition < totalRoles ? threadRoles[currentPosition]?.role_id : null;

        // Get previous and next role details if they exist
        const [previousRole, nextRole] = await Promise.all([
          previousRoleId ? supabase.from('roles').select('name, expertise_areas').eq('id', previousRoleId).single() : null,
          nextRoleId ? supabase.from('roles').select('name, expertise_areas').eq('id', nextRoleId).single() : null,
        ]);

        // Get previous responses in this chain
        const { data: previousResponses } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles(name)
          `)
          .eq('thread_id', threadId)
          .eq('chain_id', message.id)
          .order('created_at', { ascending: true });

        // Get relevant memories
        const { data: memories } = await supabase
          .from('role_memories')
          .select('content')
          .eq('role_id', role_id)
          .order('importance_score', { ascending: false })
          .limit(5);

        // Format previous responses
        const formattedResponses = (previousResponses || [])
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            return `${roleName}: ${msg.content}`;
          })
          .join('\n\n');

        // Create the new system prompt
        const systemPrompt = `You are ${role.name}, a specialized AI role with expertise in: ${role.expertise_areas.join(', ')}. 
You are responding as position ${currentPosition} of ${totalRoles} roles in this conversation.

Your Core Expertise Areas:
${role.expertise_areas.map(area => `- ${area}`).join('\n')}

Role Context:
${previousRole ? 
  `- Previous response was from ${previousRole.data.name}, who specializes in: ${previousRole.data.expertise_areas?.join(', ')}` : 
  `- You are the first role to respond`}
${nextRole ? 
  `- After you, ${nextRole.data.name} will respond (expertise in: ${nextRole.data.expertise_areas?.join(', ')})` : 
  `- You are the last role to respond`}

Previous Responses in This Chain:
${previousResponses?.length > 0 ? 
  `${formattedResponses}` : 
  'You are the first to respond to this message.'}

Relevant Past Context:
${memories?.length > 0 ? 
  `${memories.map(m => `- ${m.content}`).join('\n')}` :
  'No relevant past context available.'}

Response Guidelines:
1. Primary Focus:
   - Address aspects matching your expertise first
   - Draw from your specialized knowledge in ${role.expertise_areas.join(', ')}

2. Building on Previous Responses:
   - Acknowledge valuable insights from previous roles
   - Add your unique expert perspective
   - Maintain conversation coherence
   - Avoid contradicting previous responses

3. Expertise Acknowledgment:
   - Recognize when topics align with other roles' expertise
   - Provide complementary insights from your perspective
   - Build upon the team's collective knowledge

4. Response Style:
   - Be clear, concise, and focused
   - Stay relevant to the user's query
   - Maintain a professional yet engaging tone

Your Specific Role Instructions:
${role.instructions}

Current User Query:
${content}

Remember: You are part of a collaborative AI team. Your goal is to provide expert insights while building upon the collective knowledge of all roles involved.`;

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