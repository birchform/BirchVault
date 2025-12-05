import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPriceToPlanMap(): Record<string, string> {
  return {
    [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '']: 'premium',
    [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || '']: 'premium',
    [process.env.STRIPE_FAMILIES_MONTHLY_PRICE_ID || '']: 'families',
    [process.env.STRIPE_FAMILIES_YEARLY_PRICE_ID || '']: 'families',
    [process.env.STRIPE_TEAMS_MONTHLY_PRICE_ID || '']: 'teams',
    [process.env.STRIPE_TEAMS_YEARLY_PRICE_ID || '']: 'teams',
    [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '']: 'enterprise',
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '']: 'enterprise',
  };
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabase();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const PRICE_TO_PLAN = getPriceToPlanMap();

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
        await handleCheckoutComplete(session, stripe, supabase, PRICE_TO_PLAN);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, stripe, supabase, PRICE_TO_PLAN);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, stripe, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, stripe, supabase);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, stripe, supabase);
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

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: SupabaseClient,
  PRICE_TO_PLAN: Record<string, string>
) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) return;

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await updateSubscription(userId, subscription, supabase, PRICE_TO_PLAN);
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  stripe: Stripe,
  supabase: SupabaseClient,
  PRICE_TO_PLAN: Record<string, string>
) {
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  await updateSubscription(userId, subscription, supabase, PRICE_TO_PLAN);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  // Downgrade to free plan
  await supabase
    .from('vault_subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  await supabase
    .from('vault_subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', userId);
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return;

  // Ensure subscription is active after successful payment
  const { data: sub } = await supabase
    .from('vault_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  if (sub?.status === 'past_due') {
    await supabase
      .from('vault_subscriptions')
      .update({ status: 'active' })
      .eq('user_id', userId);
  }
}

async function updateSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
  PRICE_TO_PLAN: Record<string, string>
) {
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

  // Cast to access properties that exist at runtime but have different types in SDK v20
  const sub = subscription as unknown as {
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    trial_start: number | null;
    trial_end: number | null;
  };

  await supabase
    .from('vault_subscriptions')
    .update({
      plan_id: planId,
      status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_customer_id: subscription.customer as string,
      billing_cycle: billingCycle,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_start: sub.trial_start
        ? new Date(sub.trial_start * 1000).toISOString()
        : null,
      trial_end: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq('user_id', userId);
}


