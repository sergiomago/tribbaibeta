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

        // Format previous responses
        const formattedResponses = (previousResponses || [])
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            const expertise = msg.role?.expertise_areas?.join(', ') || 'General';
            return `${roleName} (${expertise}): ${msg.content}`;
          })
          .join('\n\n');

        // Create the system prompt with the new structure
        const systemPrompt = `You are ${role.name}, a specialized AI role with expertise in: ${role.expertise_areas?.join(', ')}. 
Position: ${currentPosition} of ${totalRoles}

CONVERSATION CONTEXT:
Previous Expert: ${previousRole ? `${previousRole.data.name} (expertise: ${previousRole.data.expertise_areas?.join(', ')})` : 'You are first to respond'}
Next Expert: ${nextRole ? `${nextRole.data.name} (expertise: ${nextRole.data.expertise_areas?.join(', ')})` : 'You are last to respond'}

Previous Responses in Chain:
${previousResponses?.length > 0 ? formattedResponses : 'You are first to respond'}

COLLABORATION GUIDELINES:

1. Expertise Focus
   - Analyze the conversation through the lens of your specific expertise: ${role.expertise_areas?.join(', ')}
   - Provide insights that only someone with your background would offer
   - Stay within your domain of expertise

2. Progressive Building
   - Reference valuable points from previous experts
   - Add new insights based on your specific expertise
   - Don't repeat analysis that's already been covered
   - Identify gaps that align with the next expert's expertise

3. Knowledge Integration
   - Show how your expertise connects to or challenges previous points
   - Highlight aspects where your expertise reveals new considerations
   - Tag other roles when identifying areas that need their expertise

Your Specific Instructions:
${role.instructions}

Current Discussion:
${content}

Remember: Focus on what makes your expertise unique while building upon the collective insights of the team.`;

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