import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import Stripe from "stripe";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "ConveraServe API is running" });
});

app.get("/payment-success", (c) => {
  const sessionId = c.req.query('session_id') ?? '';
  const deepLink = `rork-app://payment-success?session_id=${sessionId}&status=success`;
  return c.html(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="1;url=${deepLink}">
        <script>setTimeout(function(){ window.location.href = '${deepLink}'; }, 500);</script>
      </head>
      <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0F2557;">
        <div style="text-align: center; padding: 2rem; max-width: 400px;">
          <div style="font-size: 5rem; margin-bottom: 1.5rem;">🙏</div>
          <h1 style="color: #F4BE37; font-size: 1.75rem; margin-bottom: 0.75rem;">Thank You!</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem;">Your gift has been received. Returning to the app...</p>
          <a href="${deepLink}" style="display: inline-block; background: #F4BE37; color: #0F2557; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">Return to App</a>
        </div>
      </body>
    </html>
  `);
});

app.get("/payment-cancel", (c) => {
  return c.html(`
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
        <div style="text-align: center; padding: 2rem; max-width: 400px;">
          <div style="font-size: 5rem; margin-bottom: 1.5rem;">✕</div>
          <h1 style="color: #666; font-size: 1.75rem; margin-bottom: 0.75rem;">Payment Cancelled</h1>
          <p style="color: #888; font-size: 1rem; line-height: 1.6;">No charge was made. You may close this window and return to the app.</p>
        </div>
      </body>
    </html>
  `);
});

// ─── Stripe Webhook ──────────────────────────────────────────────────────────

app.post("/api/stripe/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Stripe Webhook: Missing signature or webhook secret");
    return c.json({ error: "Missing signature or webhook secret" }, 400);
  }

  let event: Stripe.Event;
  try {
    const body = await c.req.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe Webhook: Signature verification failed:", err.message);
    return c.json({ error: `Webhook signature verification failed: ${err.message}` }, 400);
  }

  console.log("Stripe Webhook: Received event", event.type);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};
        const type = metadata.type;

        if (type === "subscription" && session.subscription) {
          const churchId = metadata.churchId;
          const planId = metadata.planId || "basic";

          console.log("Stripe Webhook: Subscription checkout completed for church", churchId, "plan:", planId);

          await supabase
            .from("churches")
            .update({
              subscription_plan: planId,
              stripe_subscription_id: session.subscription as string,
              subscription_expires_at: null,
            })
            .eq("id", churchId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const churchId = subscription.metadata?.churchId;

        if (!churchId) {
          console.log("Stripe Webhook: No churchId in subscription metadata, skipping");
          break;
        }

        const planId = subscription.metadata?.planId || "basic";
        const status = subscription.status;

        console.log("Stripe Webhook: Subscription updated for church", churchId, "status:", status, "plan:", planId);

        if (status === "active" || status === "trialing") {
          const periodEnd = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000).toISOString()
            : null;

          await supabase
            .from("churches")
            .update({
              subscription_plan: planId,
              stripe_subscription_id: subscription.id,
              subscription_expires_at: periodEnd,
            })
            .eq("id", churchId);
        } else if (status === "past_due" || status === "unpaid") {
          await supabase
            .from("churches")
            .update({
              subscription_plan: "free",
              subscription_expires_at: null,
            })
            .eq("id", churchId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const churchId = subscription.metadata?.churchId;

        if (churchId) {
          console.log("Stripe Webhook: Subscription deleted for church", churchId);
          await supabase
            .from("churches")
            .update({
              subscription_plan: "free",
              stripe_subscription_id: null,
              subscription_expires_at: null,
            })
            .eq("id", churchId);
        }
        break;
      }

      default:
        console.log("Stripe Webhook: Unhandled event type:", event.type);
    }
  } catch (err: any) {
    console.error("Stripe Webhook: Error processing event:", err.message);
    return c.json({ error: "Internal error processing webhook" }, 500);
  }

  return c.json({ received: true });
});

export default app;
