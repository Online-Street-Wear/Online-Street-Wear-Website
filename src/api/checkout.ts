import { Hono } from 'hono';
import Stripe from 'stripe';

const app = new Hono<{ Bindings: Env }>();

interface CheckoutItem {
  name: string;
  image: string;
  price: string | number;
  quantity: number;
}

interface CheckoutRequestBody {
  items?: CheckoutItem[];
}

app.post('/', async (c) => {
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const { items } = await c.req.json<CheckoutRequestBody>();

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Cart is empty' }, 400);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const unitAmount = Math.round(Number(item.price) * 100);
      const hasValidQuantity = Number.isInteger(item.quantity) && item.quantity > 0;

      if (!item.name || !item.image || !Number.isFinite(unitAmount) || unitAmount <= 0 || !hasValidQuantity) {
        return c.json({ error: 'Invalid cart item data' }, 400);
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      });
    }

    // Get the origin for success/cancel URLs
    const origin = new URL(c.req.url).origin;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/cart?success=true`,
      cancel_url: `${origin}/cart?canceled=true`,
    });

    return c.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    console.error('Checkout error:', error);
    return c.json({ error: message }, 500);
  }
});

export default app;
