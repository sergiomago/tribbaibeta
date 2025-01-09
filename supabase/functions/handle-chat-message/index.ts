import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize OpenAI with v2 headers
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { threadId, content, taggedRoleId, conversationChain } = await req.json();
    console.log('Processing message for thread:', threadId, 'with content:', content);

    // Get thread details
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (threadError) {
      console.error('Error fetching thread:', threadError);
      throw new Error(`Failed to fetch thread: ${threadError.message}`);
    }

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Create or get OpenAI thread with enhanced v2 configuration
    let openaiThreadId = thread.openai_thread_id;
    if (!openaiThreadId) {
      try {
        console.log('Creating new OpenAI thread with v2 configuration');
        const threadConfig = {
          tools: [
            { type: "code_interpreter" },
            { type: "retrieval" }
          ],
          metadata: {
            thread_id: threadId
          }
        };
        
        const openaiThread = await openai.beta.threads.create(threadConfig);
        console.log('Created OpenAI thread:', openaiThread);
        
        openaiThreadId = openaiThread.id;
        const { error: updateError } = await supabase
          .from('threads')
          .update({ openai_thread_id: openaiThreadId })
          .eq('id', threadId);

        if (updateError) {
          console.error('Error updating thread with OpenAI ID:', updateError);
          throw new Error(`Failed to update thread with OpenAI ID: ${updateError.message}`);
        }
      } catch (error) {
        console.error('Error creating OpenAI thread:', error);
        throw new Error(`Failed to create OpenAI thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add user message to OpenAI thread with v2 format
    let openaiMessage;
    try {
      const messageConfig = {
        role: 'user',
        content,
        file_ids: [], // Keeping for backward compatibility
        metadata: {
          source_message_id: threadId
        }
      };
      
      console.log('Creating message with config:', messageConfig);
      openaiMessage = await openai.beta.threads.messages.create(
        openaiThreadId,
        messageConfig
      );
    } catch (error) {
      console.error('Error creating OpenAI message:', error);
      throw new Error(`Failed to create OpenAI message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Save user message to database
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        openai_message_id: openaiMessage.id
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving user message:', messageError);
      throw new Error(`Failed to save user message: ${messageError.message}`);
    }

    // Generate a new chain ID for this conversation
    const chainId = crypto.randomUUID();
    
    // Process each role in the chain
    for (const { role_id, chain_order } of conversationChain) {
      try {
        // Get role details
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (roleError) {
          console.error('Error fetching role:', roleError);
          throw new Error(`Failed to fetch role: ${roleError.message}`);
        }

        if (!role?.assistant_id) {
          console.error('Role assistant not found for role:', role_id);
          continue;
        }

        // Get role's memory
        const { data: roleMemory, error: memoryError } = await supabase
          .from('messages_memory')
          .select('content')
          .eq('role_id', role_id)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (memoryError) {
          console.error('Error fetching role memory:', memoryError);
          throw new Error(`Failed to fetch role memory: ${memoryError.message}`);
        }

        // Prepare context from memory
        const memoryContext = roleMemory && roleMemory.length > 0
          ? `Previous relevant context:\n${roleMemory.map(m => m.content).join('\n')}`
          : '';

        // Get previous messages in the chain
        const { data: previousMessages, error: previousMessagesError } = await supabase
          .from('messages')
          .select('content, role_id')
          .eq('chain_id', chainId)
          .order('chain_order', { ascending: true });

        if (previousMessagesError) {
          console.error('Error fetching previous messages:', previousMessagesError);
          throw new Error(`Failed to fetch previous messages: ${previousMessagesError.message}`);
        }

        // Prepare conversation context
        const conversationContext = previousMessages && previousMessages.length > 0
          ? `Previous responses in this conversation:\n${previousMessages.map(m => m.content).join('\n')}`
          : '';

        try {
          // Run assistant with v2 format
          const run = await openai.beta.threads.runs.create(openaiThreadId, {
            assistant_id: role.assistant_id,
            tools: [{ type: "code_interpreter" }],
            tool_resources: {
              code_interpreter: {
                file_ids: []
              }
            },
            instructions: `${role.instructions}\n\n${memoryContext}\n\n${conversationContext}`,
          });

          // Wait for completion with enhanced v2 status handling
          let runStatus = await openai.beta.threads.runs.retrieve(
            openaiThreadId,
            run.id
          );

          while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus.status)) {
            console.log(`Run status: ${runStatus.status}`);
            
            if (runStatus.status === 'requires_action') {
              console.log('Run requires action:', runStatus.required_action);
              // Handle tool calls if needed
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(
              openaiThreadId,
              run.id
            );
          }

          if (runStatus.status !== 'completed') {
            console.error('Assistant run failed:', runStatus);
            throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
          }

          // Get assistant's response with v2 format
          const messages = await openai.beta.threads.messages.list(openaiThreadId, {
            order: 'desc',
            limit: 1
          });
          
          const lastMessage = messages.data[0];
          const responseContent = lastMessage.content[0].text.value;

          // Store response in role's memory
          const { error: memoryStoreError } = await supabase
            .from('messages_memory')
            .insert({
              role_id: role_id,
              thread_id: threadId,
              content: responseContent,
              context_type: 'conversation'
            });

          if (memoryStoreError) {
            console.error('Error storing response in memory:', memoryStoreError);
            throw new Error(`Failed to store response in memory: ${memoryStoreError.message}`);
          }

          // Save assistant's response
          const { data: responseMessage, error: responseError } = await supabase
            .from('messages')
            .insert({
              thread_id: threadId,
              role_id: role_id,
              content: responseContent,
              chain_id: chainId,
              chain_order: chain_order,
              reply_to_message_id: userMessage.id,
              openai_message_id: lastMessage.id,
            })
            .select()
            .single();

          if (responseError) {
            console.error('Error saving assistant response:', responseError);
            throw new Error(`Failed to save assistant response: ${responseError.message}`);
          }

          // Check if the assistant tagged another role
          const taggedRole = extractTaggedRole(responseContent);
          
          if (taggedRole) {
            // If a role was tagged, stop the current chain
            console.log('Role tagged another role:', taggedRole);
            break;
          }
        } catch (error) {
          console.error('Error processing role response:', error);
          throw new Error(`Error processing role response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error in role processing loop:', error);
        continue; // Continue with next role even if one fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractTaggedRole(content: string): string | null {
  const match = content.match(/@(\w+)/);
  return match ? match[1] : null;
}