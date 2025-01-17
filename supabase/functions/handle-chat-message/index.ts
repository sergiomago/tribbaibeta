import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error('Missing required environment variables');
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Parse request
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId });

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
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Get thread roles
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (threadRolesError) {
      console.error('Error fetching thread roles:', threadRolesError);
      throw threadRolesError;
    }

    if (!threadRoles?.length) {
      throw new Error('No roles found for thread');
    }

    // Select a role to respond
    const selectedRoleId = taggedRoleId || threadRoles[Math.floor(Math.random() * threadRoles.length)].role_id;

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', selectedRoleId)
      .single();

    if (roleError || !role) {
      console.error('Error fetching role:', roleError);
      throw roleError || new Error('Role not found');
    }

    // Generate response
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: role.instructions
        },
        { role: 'user', content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response:', { roleId: selectedRoleId, contentLength: responseContent?.length });

    // Save role's response
    const { data: response, error: responseError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: selectedRoleId,
        content: responseContent,
        chain_id: message.id,
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error saving response:', responseError);
      throw responseError;
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