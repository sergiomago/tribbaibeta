import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      throw new Error('Unauthorized');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          hasSubscription: false,
          planType: null,
          trialEnd: null,
          currentPeriodEnd: null 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
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
      return new Response(
        JSON.stringify({ 
          hasSubscription: false,
          planType: null,
          trialEnd: null,
          currentPeriodEnd: null 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
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

    return new Response(
      JSON.stringify({
        hasSubscription: true,
        planType,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});