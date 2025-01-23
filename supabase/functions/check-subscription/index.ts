import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user ID from the token without validation
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user ID (this doesn't validate the token)
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const userId = tokenData.sub;

    if (!userId) {
      throw new Error('No user ID found in token');
    }

    console.log('Checking subscription for user:', userId);

    // Get the most recent active subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error('Database error:', subscriptionError);
      throw subscriptionError;
    }

    console.log('Found subscription:', subscriptionData);

    // If we find an active subscription in the database
    if (subscriptionData) {
      return new Response(
        JSON.stringify({
          hasSubscription: true,
          planType: subscriptionData.plan_type,
          interval: subscriptionData.stripe_subscription_id ? 'month' : 'month', // Default to month if no Stripe ID
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

    // No active subscription found
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