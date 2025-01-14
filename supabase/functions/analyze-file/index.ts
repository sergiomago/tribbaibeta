import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
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
    const { fileId } = await req.json();

    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Get file details from database
    const { data: fileData, error: fileError } = await supabase
      .from('analyzed_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found');
    }

    // Update analysis status
    await supabase
      .from('analyzed_files')
      .update({ analysis_status: 'processing' })
      .eq('id', fileId);

    // Get file from storage
    const { data: fileContent, error: storageError } = await supabase
      .storage
      .from('analysis_files')
      .download(fileData.file_path);

    if (storageError) {
      throw new Error('Failed to retrieve file from storage');
    }

    // Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
    });
    reader.readAsDataURL(fileContent);
    const base64Data = await base64Promise;

    // Analyze file with GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a document and image analysis expert. Analyze the provided file and extract key information, themes, and insights."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this ${fileData.file_type} file and provide a detailed analysis. Focus on the main content, key points, and any notable elements.`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Data as string,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = response.choices[0].message.content;

    // Update database with analysis results
    const { error: updateError } = await supabase
      .from('analyzed_files')
      .update({
        analysis_status: 'completed',
        analysis_result: {
          content: analysis,
          analyzed_at: new Date().toISOString(),
        }
      })
      .eq('id', fileId);

    if (updateError) {
      throw new Error('Failed to update analysis results');
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        analysis 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-file function:', error);

    // Update file status to failed if we have the fileId
    try {
      const { fileId } = await req.json();
      if (fileId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('analyzed_files')
          .update({ 
            analysis_status: 'failed',
            analysis_result: {
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', fileId);
      }
    } catch (e) {
      console.error('Error updating file status:', e);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});