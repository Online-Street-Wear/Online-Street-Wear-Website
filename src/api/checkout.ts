import { Hono } from 'hono';
import Stripe from 'stripe';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const { items } = await c.req.json();

    if (!items || items.length === 0) {
      return c.json({ error: 'Cart is empty' }, 400);
    }

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: Math.round(parseFloat(item.price) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Get the origin for success/cancel URLs
    const origin = new URL(c.req.url).origin;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `R{origin}/cart?success=true`,
      cancel_url: `R{origin}/cart?canceled=true`,
    });

    return c.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return c.json({ error: error.message || 'Failed to create checkout session' }, 500);
  }
});

export default app;
