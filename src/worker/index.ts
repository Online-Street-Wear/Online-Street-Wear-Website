import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import checkout from "../api/checkout";
import stripeWebhook from "../api/webhooks/stripe";
import payments from "../api/payments";

const app = new Hono<{ Bindings: Env }>();

// Mount Stripe routes
app.route("/api/checkout", checkout);
app.route("/api/webhooks/stripe", stripeWebhook);
app.route("/api/payments", payments);

// Newsletter subscription endpoint
const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

app.post("/api/newsletter/subscribe", zValidator("json", subscribeSchema), async (c) => {
  const { email } = c.req.valid("json");

  try {
    await c.env.DB.prepare(
      "INSERT INTO newsletter_subscriptions (email) VALUES (?)"
    )
      .bind(email.toLowerCase())
      .run();

    return c.json({ success: true, message: "Successfully subscribed to newsletter!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return c.json(
        { success: false, message: "This email is already subscribed." },
        400
      );
    }
    
    console.error("Newsletter subscription error:", error);
    return c.json(
      { success: false, message: "Failed to subscribe. Please try again." },
      500
    );
  }
});

export default app;
