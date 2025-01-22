import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting
const rateLimiter = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // If no active subscription in database, check Stripe
    console.log('No active database subscription found, checking Stripe...');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    try {
      // Check if customer exists in Stripe
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        console.log('No Stripe customer found for:', user.email);
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
      }

      // Get active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        console.log('No active Stripe subscription found for customer:', customers.data[0].id);
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
      }

      const subscription = subscriptions.data[0];
      const planType = subscription.metadata.plan_type || 'unknown';

      // Update subscription in database
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customers.data[0].id,
          stripe_subscription_id: subscription.id,
          plan_type: planType,
          is_active: true,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('Error updating subscription in database:', updateError);
      }

      console.log('Successfully checked and updated subscription for user:', user.id);
      return new Response(
        JSON.stringify({
          hasSubscription: true,
          planType,
          interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          trialStarted: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (stripeError: any) {
      // Handle Stripe rate limiting specifically
      if (stripeError.type === 'rate_limit_error') {
        console.error('Stripe rate limit error:', stripeError);
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429
          }
        );
      }
      throw stripeError;
    }
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