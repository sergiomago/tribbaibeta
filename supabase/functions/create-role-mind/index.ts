
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY')!
const LLONGTERM_API_URL = 'https://api.llongterm.ai/v1'

// Utility function for making API calls with retries
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      console.log(`Attempt ${i + 1} - Fetching ${url}`);
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout);
      
      if (response.ok) {
        return response;
      }
      
      // If response is not ok, read the error
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roleId } = await req.json();
    console.log(`Creating mind for role: ${roleId}`);

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    if (!llongtermApiKey) {
      throw new Error('LLONGTERM_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new Error(`Failed to fetch role: ${roleError?.message}`);
    }

    // Get pending mind record
    const { data: mindRecord, error: mindError } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .single();

    if (mindError || !mindRecord) {
      throw new Error(`No pending mind record found for role: ${roleId}`);
    }

    // Create structured memory from role data
    const structuredMemory = {
      summary: role.description || '',
      structured: {
        name: role.name,
        expertise: role.expertise_areas || [],
        primaryTopics: role.primary_topics || [],
        capabilities: role.special_capabilities || [],
      },
      unstructured: {
        instructions: role.instructions,
        responseStyle: role.response_style || {},
        interactionPreferences: role.interaction_preferences || {},
      }
    };

    // Create mind options
    const createOptions = {
      initialMemory: structuredMemory,
      metadata: {
        roleId: role.id,
        userId: role.user_id,
        created: new Date().toISOString(),
      },
      config: mindRecord.memory_configuration || {
        contextWindow: 10,
        maxMemories: 100,
        relevanceThreshold: 0.7
      }
    };

    console.log('Preparing request to Llongterm API:', {
      url: `${LLONGTERM_API_URL}/minds`,
      options: createOptions
    });

    try {
      const response = await fetchWithRetry(
        `${LLONGTERM_API_URL}/minds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llongtermApiKey}`,
            'Accept': 'application/json',
            'User-Agent': 'Supabase Edge Function'
          },
          body: JSON.stringify(createOptions)
        }
      );

      const mind = await response.json();
      console.log('Successfully created mind:', mind);

      // Update role_minds with success
      const { error: updateError } = await supabase
        .from('role_minds')
        .update({
          mind_id: mind.id,
          status: 'active',
          updated_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
          structured_memory: structuredMemory
        })
        .eq('role_id', roleId);

      if (updateError) {
        console.error('Error updating role_minds:', updateError);
        throw new Error(`Failed to update role_minds: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, mindId: mind.id }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    } catch (fetchError) {
      console.error('Fetch error details:', {
        error: fetchError,
        message: fetchError.message,
        stack: fetchError.stack
      });
      throw new Error(`Failed to create mind: ${fetchError.message}`);
    }

  } catch (error) {
    console.error('Error creating mind:', error);
    
    // Update role_minds with error status if we can
    try {
      const { roleId } = await req.json();
      if (roleId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('role_minds')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('role_id', roleId);
      }
    } catch (updateError) {
      console.error('Failed to update mind status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
