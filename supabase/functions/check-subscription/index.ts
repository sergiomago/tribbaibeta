import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting with cleanup
const rateLimiter = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimiter.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimiter.delete(key);
    }
  }
}, 300000);

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRateLimit = rateLimiter.get(userId);

  if (!userRateLimit) {
    rateLimiter.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userRateLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimiter.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (userRateLimit.count >= MAX_REQUESTS) {
    return true;
  }

  userRateLimit.count++;
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.email) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Check rate limiting
    if (isRateLimited(user.id)) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          },
          status: 429
        }
      );
    }

    console.log('Checking subscription for user:', user.id);

    // First check for active subscription in database
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (subscriptionError) {
      console.error('Database error:', subscriptionError);
    }

    // If we find an active subscription in the database, return it immediately
    if (subscriptionData) {
      console.log('Found active subscription in database:', subscriptionData);
      return new Response(
        JSON.stringify({
          hasSubscription: true,
          planType: subscriptionData.plan_type,
          interval: subscriptionData.stripe_subscription_id ? 'month' : 'manual',
          trialEnd: subscriptionData.trial_end,
          currentPeriodEnd: subscriptionData.current_period_end,
          trialStarted: subscriptionData.trial_started
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // If no subscription found, return no subscription
    console.log('No active subscription found for user:', user.id);
    return new Response(
      JSON.stringify({ 
        hasSubscription: false,
        planType: null,
        trialEnd: null,
        currentPeriodEnd: null,
        trialStarted: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error checking subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});