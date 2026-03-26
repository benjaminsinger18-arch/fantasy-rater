import { Router } from 'express';
import Stripe from 'stripe';
import { verifyToken } from '@clerk/backend';
import { clerk, getUserTier, invalidateTierCache } from '../middleware/requireAuth.js';

const router = Router();

// Lazy Stripe init — avoids module-level crash if env not loaded yet
let _stripe: Stripe | null = null;
function stripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

async function getClerkUser(req: import('express').Request, res: import('express').Response) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'login_required' }); return null; }
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const user = await clerk.users.getUser(payload.sub);
    return { userId: payload.sub, user };
  } catch {
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
}

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', async (req, res) => {
  const auth = await getClerkUser(req, res);
  if (!auth) return;

  try {
    const email = auth.user.emailAddresses[0]?.emailAddress;
    const existingCustomerId = auth.user.publicMetadata?.stripeCustomerId as string | undefined;

    let customerId = existingCustomerId;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email,
        metadata: { clerkUserId: auth.userId },
      });
      customerId = customer.id;
      await clerk.users.updateUserMetadata(auth.userId, {
        publicMetadata: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL}/`,
      metadata: { clerkUserId: auth.userId },
    });

    return res.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'checkout failed';
    return res.status(500).json({ error: message });
  }
});

// GET /api/billing/portal — Stripe billing portal (manage/cancel)
router.get('/portal', async (req, res) => {
  const auth = await getClerkUser(req, res);
  if (!auth) return;

  const customerId = auth.user.publicMetadata?.stripeCustomerId as string | undefined;
  if (!customerId) return res.status(400).json({ error: 'no_subscription' });

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.CLIENT_URL,
    });
    return res.json({ url: session.url });
  } catch {
    return res.status(500).json({ error: 'portal_failed' });
  }
});

// GET /api/billing/status — check current user's tier
router.get('/status', async (req, res) => {
  const auth = await getClerkUser(req, res);
  if (!auth) return;
  const tier = await getUserTier(auth.userId);
  return res.json({ tier });
});

// POST /api/billing/webhook — Stripe webhook (raw body, handled in index.ts)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    event = webhookSecret && sig
      ? stripe().webhooks.constructEvent(req.body as Buffer, sig, webhookSecret)
      : JSON.parse((req.body as Buffer).toString());
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      if (clerkUserId) {
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: {
            tier: 'pro',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });
        invalidateTierCache(clerkUserId);
        console.log(`User ${clerkUserId} upgraded to pro`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe().customers.retrieve(sub.customer as string) as Stripe.Customer;
      const clerkUserId = customer.metadata?.clerkUserId;
      if (clerkUserId) {
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: { tier: 'free' },
        });
        invalidateTierCache(clerkUserId);
        console.log(`User ${clerkUserId} downgraded to free`);
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  return res.json({ received: true });
});

export default router;
