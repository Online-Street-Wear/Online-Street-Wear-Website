import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import checkout from "../api/checkout";
import stripeWebhook from "../api/webhooks/stripe";

const app = new Hono<{ Bindings: Env }>();

// Mount Stripe routes
app.route("/api/checkout", checkout);
app.route("/api/webhooks/stripe", stripeWebhook);

// Authentication endpoints
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  // Get user role from database
  const roleResult = await c.env.DB.prepare(
    "SELECT role FROM user_roles WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  // If user doesn't have a role yet, create one with default 'user' role
  if (!roleResult) {
    await c.env.DB.prepare(
      "INSERT INTO user_roles (user_id, role) VALUES (?, ?)"
    )
      .bind(user.id, "user")
      .run();

    return c.json({ ...user, role: "user" });
  }

  return c.json({ ...user, role: roleResult.role });
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

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
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
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
