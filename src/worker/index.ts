import { Hono } from "hono";
import checkout from "../api/checkout";
import stripeWebhook from "../api/webhooks/stripe";
import payments from "../api/payments";
import { OrderStore } from "../server/order-store";
import { retryOrderEmails } from "../server/order-email";

const app = new Hono<{ Bindings: Env }>();

// Mount Stripe routes
app.route("/api/checkout", checkout);
app.route("/api/webhooks/stripe", stripeWebhook);
app.route("/", payments);

export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(retryOrderEmails(new OrderStore(env.DB), env));
  },
};
