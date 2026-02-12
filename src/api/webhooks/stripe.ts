import { Hono } from 'hono';
import Stripe from 'stripe';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const body = await c.req.text();
    const sig = c.req.header('stripe-signature') || '';

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        c.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return c.text('Invalid signature', 400);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment successful:', session.id);
      // Here you could update your database, send confirmation emails, etc.
    }

    return c.text('ok', 200);
  } catch (error: any) {
    console.error('Webhook error:', error);
    return c.text('Webhook error', 500);
  }
});

export default app;
