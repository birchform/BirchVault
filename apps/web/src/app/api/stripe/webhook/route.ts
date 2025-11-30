import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan IDs
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '']: 'premium',
  [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || '']: 'premium',
  [process.env.STRIPE_FAMILIES_MONTHLY_PRICE_ID || '']: 'families',
  [process.env.STRIPE_FAMILIES_YEARLY_PRICE_ID || '']: 'families',
  [process.env.STRIPE_TEAMS_MONTHLY_PRICE_ID || '']: 'teams',
  [process.env.STRIPE_TEAMS_YEARLY_PRICE_ID || '']: 'teams',
  [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '']: 'enterprise',
  [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '']: 'enterprise',
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) return;

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await updateSubscription(userId, subscription);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  await updateSubscription(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  // Downgrade to free plan
  await supabase
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', userId);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  // Ensure subscription is active after successful payment
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  if (sub?.status === 'past_due') {
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('user_id', userId);
  }
}

async function updateSubscription(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const planId = PRICE_TO_PLAN[priceId] || 'free';
  
  // Determine billing cycle
  const interval = subscription.items.data[0]?.price.recurring?.interval;
  const billingCycle = interval === 'year' ? 'yearly' : 'monthly';

  // Map Stripe status to our status
  let status: string;
  switch (subscription.status) {
    case 'active':
      status = 'active';
      break;
    case 'trialing':
      status = 'trialing';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    case 'paused':
      status = 'paused';
      break;
    default:
      status = 'active';
  }

  await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_customer_id: subscription.customer as string,
      billing_cycle: billingCycle,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })
    .eq('user_id', userId);
}


