import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if content is a URL
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const isUrl = urlPattern.test(content);

    // If it's a URL, we'll analyze it (for now just return it as is)
    // In the future, we can add URL content fetching and analysis
    if (isUrl) {
      return new Response(
        JSON.stringify({ 
          type: 'url',
          url: content,
          analysis: 'URL detected and will be analyzed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, treat it as a search query
    const searchApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(content)}`

    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('Google Search API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to perform search', details: data.error?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const formattedResults = data.items?.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
    })) || []

    return new Response(
      JSON.stringify({ 
        type: 'search',
        results: formattedResults,
        searchInformation: {
          totalResults: data.searchInformation?.totalResults,
          searchTime: data.searchInformation?.searchTime,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in web-search function:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
