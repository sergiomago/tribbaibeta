import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleInitialAnalysis, saveUserMessage, storeRoleMemory } from "./messageProcessor.ts";
import { selectResponders, getRelevantMemories } from "./roleSelector.ts";
import { generateRoleResponse, recordInteraction, updateMemoryRelevance } from "./responseGenerator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to handle-chat-message');
    
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize conversation state if needed
    const { data: state } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('thread_id', threadId)
      .maybeSingle();

    console.log('Current conversation state:', state);

    if (!state) {
      console.log('Initializing new conversation state');
      await supabase
        .from('conversation_states')
        .insert({
          thread_id: threadId,
          current_state: 'initial_analysis'
        });
    }

    // Save user message
    console.log('Saving user message');
    const userMessage = await saveUserMessage(supabase, threadId, content, taggedRoleId);
    console.log('User message saved:', userMessage);

    // Handle conversation based on state
    let analysis;
    let selectedRoles;

    if (!taggedRoleId) {
      console.log('No role tagged, performing initial analysis');
      analysis = await handleInitialAnalysis(supabase, threadId, content, openai);
      console.log('Analysis complete:', analysis);
      
      selectedRoles = await selectResponders(supabase, threadId, analysis, openai);
      console.log('Selected roles:', selectedRoles);
    } else {
      console.log('Role tagged, using tagged role');
      selectedRoles = [taggedRoleId];
    }

    // Generate responses from selected roles
    console.log('Generating responses from selected roles');
    for (const roleId of selectedRoles) {
      try {
        console.log(`Processing role ${roleId}`);
        const memories = await getRelevantMemories(supabase, roleId, content);
        console.log(`Retrieved ${memories?.length || 0} relevant memories`);

        const { savedMessage, role } = await generateRoleResponse(
          supabase,
          threadId,
          roleId,
          userMessage,
          memories,
          openai
        );
        console.log(`Generated response for role ${role.name}`);

        // Store in role's memory
        await storeRoleMemory(supabase, roleId, savedMessage.content, {
          thread_id: threadId,
          user_message: content,
          message_id: savedMessage.id,
          timestamp: new Date().getTime(),
        });
        console.log(`Stored memory for role ${roleId}`);

        // Record interaction
        await recordInteraction(
          supabase,
          threadId,
          roleId,
          taggedRoleId,
          analysis,
          memories?.length || 0
        );
        console.log(`Recorded interaction for role ${roleId}`);

        // Update memory relevance
        if (memories?.length) {
          await updateMemoryRelevance(supabase, memories);
          console.log(`Updated memory relevance for ${memories.length} memories`);
        }
      } catch (error) {
        console.error(`Error processing role ${roleId}:`, error);
        throw error;
      }
    }

    // Update state to completion
    console.log('Updating conversation state to completion');
    await supabase
      .from('conversation_states')
      .update({
        current_state: 'completion',
        metadata: {
          last_message_id: userMessage.id,
          completion_time: new Date().toISOString(),
          memory_enhanced: true
        }
      })
      .eq('thread_id', threadId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});