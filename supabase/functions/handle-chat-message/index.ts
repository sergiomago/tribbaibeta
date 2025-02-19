
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { threadId, content, roles } = await req.json();

    if (!threadId || !content || !roles) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Processing message for thread:', threadId);
    console.log('Roles:', roles);

    // Process each role's response
    for (const role of roles) {
      try {
        // Generate AI response
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `${role.instructions}\n\nYou are ${role.name}. Respond in character.` 
            },
            { role: 'user', content: content }
          ],
        });

        const aiResponse = completion.choices[0].message.content;

        // Update message with AI response
        const { error: updateError } = await supabaseClient
          .from('messages')
          .update({
            content: aiResponse,
            metadata: {
              role_name: role.name,
              streaming: false,
              processed: true
            }
          })
          .eq('thread_id', threadId)
          .eq('role_id', role.id)
          .eq('metadata->streaming', true);

        if (updateError) {
          console.error('Error updating message:', updateError);
          throw updateError;
        }

      } catch (error) {
        console.error(`Error processing role ${role.name}:`, error);
        
        // Update message with error state
        await supabaseClient
          .from('messages')
          .update({
            content: `Error: Unable to generate response. Please try again.`,
            metadata: {
              role_name: role.name,
              streaming: false,
              processed: false,
              error: error.message
            }
          })
          .eq('thread_id', threadId)
          .eq('role_id', role.id)
          .eq('metadata->streaming', true);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
