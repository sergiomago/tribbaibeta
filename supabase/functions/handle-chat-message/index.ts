
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processMessage } from "./messageProcessor.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

async function determineResponseOrder(
  supabase: any,
  threadId: string,
  content: string,
  roleIds: string[]
): Promise<{ roleId: string; score: number }[]> {
  try {
    // Get roles data
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, expertise_areas')
      .in('id', roleIds);

    if (rolesError) throw rolesError;
    if (!roles?.length) return [];

    // Classify the question domain
    const { data: domain, error: domainError } = await supabase
      .rpc('classify_question_domain', {
        content: content,
        expertise_areas: roles[0].expertise_areas
      });

    if (domainError) {
      console.error('Error classifying domain:', domainError);
      throw domainError;
    }

    console.log('Classified domain:', domain);

    // Calculate relevance scores for each role
    const scoredRoles = await Promise.all(
      roleIds.map(async (roleId) => {
        const { data: score, error: scoreError } = await supabase
          .rpc('calculate_role_relevance', {
            p_role_id: roleId,
            p_question_content: content,
            p_domain: domain
          });

        if (scoreError) {
          console.error('Error calculating role relevance:', scoreError);
          return { roleId, score: 0 };
        }

        return {
          roleId,
          score: score || 0
        };
      })
    );

    console.log('Scored roles:', scoredRoles);

    // Sort by score in descending order
    return scoredRoles.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error in determineResponseOrder:', error);
    // Return default ordering if something fails
    return roleIds.map(roleId => ({ roleId, score: 1 }));
  }
}

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
      .select('role_id')
      .eq('thread_id', threadId);

    if (rolesError) throw rolesError;
    if (!threadRoles?.length) throw new Error('No roles found for thread');

    let orderedRoles;
    if (taggedRoleId) {
      // If a role is tagged, it responds first
      orderedRoles = [{ roleId: taggedRoleId, score: 1 }];
    } else {
      // Use our new domain classification and scoring system
      orderedRoles = await determineResponseOrder(
        supabase,
        threadId,
        content,
        threadRoles.map(tr => tr.role_id)
      );
    }

    console.log('Processing with ordered roles:', orderedRoles);

    // Process responses one at a time based on the calculated order
    for (const { roleId } of orderedRoles) {
      try {
        console.log(`Processing response for role ${roleId}`);
        
        // Get previous responses in this chain
        const { data: previousResponses } = await supabase
          .from('messages')
          .select(`
            content,
            role:roles(name, expertise_areas),
            role_id,
            created_at
          `)
          .eq('thread_id', threadId)
          .eq('chain_id', message.id)
          .order('created_at', { ascending: true });

        // Generate response using enhanced message processor
        const responseContent = await processMessage(
          openai,
          supabase,
          threadId,
          roleId,
          message,
          previousResponses || []
        );

        // Save response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: roleId,
            content: responseContent,
            chain_id: message.id
          });

        if (responseError) {
          console.error(`Error saving response for role ${roleId}:`, responseError);
          throw responseError;
        }

      } catch (error) {
        console.error(`Error processing response for role ${roleId}:`, error);
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
