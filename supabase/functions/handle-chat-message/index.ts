
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
    
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

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

    // Get thread roles
    const { data: threadRoles, error: rolesError } = await supabase
      .from('thread_roles')
      .select('role:roles(*)')
      .eq('thread_id', threadId);

    if (rolesError) throw rolesError;

    let chain;
    if (taggedRoleId) {
      // If a role is tagged, use just that role
      chain = [{ role_id: taggedRoleId }];
    } else {
      // Score and order roles
      const scoredRoles = await Promise.all(
        threadRoles.map(async (tr) => {
          const role = tr.role;
          const score = await calculateRoleScore(role, content, threadId, supabase, openai);
          return { role_id: role.id, score };
        })
      );

      chain = scoredRoles
        .sort((a, b) => b.score - a.score)
        .map(sr => ({ role_id: sr.role_id }));
    }

    console.log('Processing with chain:', chain);

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

        // Format previous responses
        const formattedResponses = (previousResponses || [])
          .map(msg => {
            const roleName = msg.role?.name || 'Unknown';
            const expertise = msg.role?.expertise_areas?.join(', ') || 'General';
            return `${roleName} (${expertise}): ${msg.content}`;
          })
          .join('\n\n');

        // Create the system prompt
        const systemPrompt = `You are ${role.name}, a specialized AI role with expertise in: ${role.expertise_areas?.join(', ')}. 

Your Specific Instructions:
${role.instructions}

Previous Responses in Chain:
${previousResponses?.length > 0 ? formattedResponses : 'You are first to respond'}

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

// Helper function to calculate role relevance score
async function calculateRoleScore(
  role: any,
  content: string,
  threadId: string,
  supabase: any,
  openai: OpenAI
): Promise<number> {
  try {
    // Generate embedding for content
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: content,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Calculate context relevance using embeddings
    const { data: memories } = await supabase
      .rpc('get_similar_memories', {
        p_embedding: embedding,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: role.id
      });

    const contextScore = memories?.length ? 
      memories.reduce((acc: number, mem: any) => acc + mem.similarity, 0) / memories.length : 
      0;

    // Calculate interaction history score
    const { count } = await supabase
      .from('role_interactions')
      .select('*', { count: 'exact' })
      .eq('thread_id', threadId)
      .or(`initiator_role_id.eq.${role.id},responder_role_id.eq.${role.id}`);

    const interactionScore = count ? Math.min(count / 10, 1) : 0;

    // Calculate capability match score
    let capabilityScore = 0;
    if (role.special_capabilities?.length) {
      const keywords: Record<string, string[]> = {
        'web_search': ['search', 'find', 'lookup', 'research'],
        'doc_analysis': ['analyze', 'document', 'read', 'extract']
      };

      let matches = 0;
      role.special_capabilities.forEach((cap: string) => {
        if (keywords[cap]?.some(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase())
        )) {
          matches++;
        }
      });

      capabilityScore = matches / role.special_capabilities.length;
    }

    // Return weighted score
    return (
      contextScore * 0.4 +
      interactionScore * 0.3 +
      capabilityScore * 0.3
    );
  } catch (error) {
    console.error('Error calculating role score:', error);
    return 0;
  }
}
