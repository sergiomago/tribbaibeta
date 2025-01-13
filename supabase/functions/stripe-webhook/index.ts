import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })
    
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('No signature provided', { status: 400 })
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('Webhook secret not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const planType = subscription.items.data[0]?.price?.lookup_key || null
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        // Get user_id from subscriptions table using stripe_customer_id
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError)
          return new Response('Error processing subscription update', { status: 500 })
        }

        // Update subscription status
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan_type: planType,
            is_active: status === 'active' || status === 'trialing',
            trial_end: trialEnd,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscriptionData.user_id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new Response('Error updating subscription', { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user_id from subscriptions table
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError)
          return new Response('Error processing subscription deletion', { status: 500 })
        }

        // Update subscription status
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscriptionData.user_id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new Response('Error updating subscription', { status: 500 })
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        // Here you could implement trial ending notification logic
        console.log(`Trial will end for subscription: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Here you could implement payment failure notification logic
        console.log(`Payment failed for invoice: ${invoice.id}`)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice: ${invoice.id}`)
        break
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        console.log(`Payment method attached: ${paymentMethod.id}`)
        break
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        console.log(`Payment method detached: ${paymentMethod.id}`)
        break
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})