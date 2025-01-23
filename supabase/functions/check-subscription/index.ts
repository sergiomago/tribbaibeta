import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

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

    // Check for active subscription in database
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (subscriptionError) {
      console.error('Database error:', subscriptionError);
    }

    // If we find an active subscription in the database
    if (subscriptionData) {
      console.log('Found active subscription in database:', subscriptionData);
      
      // If it's a development subscription or manual subscription (no Stripe ID)
      if (subscriptionData.is_development || !subscriptionData.stripe_subscription_id) {
        console.log('Using development/manual subscription');
        return new Response(
          JSON.stringify({
            hasSubscription: true,
            planType: subscriptionData.plan_type,
            interval: 'month',
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

      // For production with Stripe subscriptions, verify with Stripe
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      });

      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscriptionData.stripe_subscription_id
        );

        if (stripeSubscription.status === 'active') {
          return new Response(
            JSON.stringify({
              hasSubscription: true,
              planType: subscriptionData.plan_type,
              interval: stripeSubscription.items.data[0]?.price?.recurring?.interval || 'month',
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
      } catch (stripeError) {
        console.error('Stripe verification error:', stripeError);
      }
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