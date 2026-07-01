import Stripe from "stripe";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

const BASE_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "https://rork.com";

// ─── Subscription plan definitions ───────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    price: 0,
    features: [
      "Up to 50 members",
      "Basic announcements",
      "1 ministry group",
      "Community chat",
    ],
  },
  basic: {
    id: "basic" as const,
    name: "Basic",
    price: 29,
    features: [
      "Up to 200 members",
      "Announcements & events",
      "5 ministry groups",
      "Community chat",
      "Forms & media library",
      "Email support",
    ],
  },
  standard: {
    id: "standard" as const,
    name: "Standard",
    price: 79,
    features: [
      "Up to 1,000 members",
      "Announcements & events",
      "Unlimited ministries",
      "Community & ministry chat",
      "Forms & media library",
      "Giving & donations",
      "Priority support",
    ],
  },
  premium: {
    id: "premium" as const,
    name: "Premium",
    price: 149,
    features: [
      "Unlimited members",
      "Everything in Standard",
      "Custom branding",
      "Advanced analytics",
      "API access",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

function getPlanPriceId(planId: SubscriptionPlanId): string | undefined {
  if (planId === "free") return undefined;
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}`;
  return process.env[envKey];
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const stripeRouter = createTRPCRouter({
  // ── Giving (one-time donations) ────────────────────────────────────────────

  createCheckoutSession: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().default("usd"),
        donationType: z.string(),
        churchId: z.string(),
        userId: z.string(),
        ministryId: z.string().nullable().optional(),
        note: z.string().optional(),
        frequency: z.string().default("one_time"),
        churchName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();
      const amountInCents = Math.round(input.amount * 100);

      const productName = input.churchName
        ? `${input.churchName} — ${input.donationType}`
        : `Church Giving — ${input.donationType}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: input.currency,
              product_data: {
                name: productName,
                description: input.note || undefined,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${BASE_URL}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/api/payment-cancel`,
        metadata: {
          type: "donation",
          churchId: input.churchId,
          userId: input.userId,
          ministryId: input.ministryId ?? "",
          donationType: input.donationType,
          frequency: input.frequency,
          note: input.note ?? "",
          amount: String(input.amount),
        },
      });

      console.log("Stripe: Created donation checkout session", session.id);
      return { url: session.url, sessionId: session.id };
    }),

  verifySession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      console.log("Stripe: Verified session", session.id, "status:", session.payment_status);
      return {
        paid: session.payment_status === "paid",
        amount: session.amount_total ? session.amount_total / 100 : 0,
        metadata: session.metadata ?? {},
      };
    }),

  // ── Subscriptions ──────────────────────────────────────────────────────────

  getPlans: publicProcedure.query(() => {
    return Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      ...plan,
      features: [...plan.features],
    }));
  }),

  createSubscriptionCheckout: publicProcedure
    .input(
      z.object({
        planId: z.enum(["basic", "standard", "premium"]),
        churchId: z.string(),
        churchName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();
      const priceId = getPlanPriceId(input.planId);

      if (!priceId) {
        throw new Error(
          `Stripe price ID not configured for plan "${input.planId}". ` +
          `Set the STRIPE_PRICE_${input.planId.toUpperCase()} environment variable.`
        );
      }

      const plan = SUBSCRIPTION_PLANS[input.planId];

      // Look up existing church to get or create Stripe customer
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: church } = await supabase
        .from("churches")
        .select("id, stripe_customer_id, name")
        .eq("id", input.churchId)
        .single();

      let customerId = (church as any)?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: input.churchName || (church as any)?.name || "Church",
          metadata: { churchId: input.churchId },
        });
        customerId = customer.id;

        await supabase
          .from("churches")
          .update({ stripe_customer_id: customerId })
          .eq("id", input.churchId);
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${BASE_URL}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/api/pricing?canceled=true`,
        metadata: {
          type: "subscription",
          churchId: input.churchId,
          planId: input.planId,
        },
        subscription_data: {
          metadata: {
            churchId: input.churchId,
            planId: input.planId,
          },
        },
      });

      console.log("Stripe: Created subscription checkout session", session.id, "plan:", input.planId);
      return { url: session.url, sessionId: session.id };
    }),

  getSubscription: publicProcedure
    .input(z.object({ churchId: z.string() }))
    .query(async ({ input }) => {
      const stripe = getStripe();
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: church } = await supabase
        .from("churches")
        .select("id, subscription_plan, subscription_expires_at, stripe_customer_id, stripe_subscription_id")
        .eq("id", input.churchId)
        .single();

      const churchData = church as any;

      let stripeSub: any = null;
      if (churchData?.stripe_subscription_id) {
        try {
          stripeSub = await stripe.subscriptions.retrieve(
            churchData.stripe_subscription_id
          );
        } catch {
          // Subscription may have been deleted in Stripe
        }
      }

      const planId = (churchData?.subscription_plan || "free") as SubscriptionPlanId;
      const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;

      return {
        planId,
        planName: plan.name,
        price: plan.price,
        features: [...plan.features],
        status: stripeSub?.status ?? (planId === "free" ? "active" : "inactive"),
        currentPeriodEnd: stripeSub?.current_period_end
          ? new Date((stripeSub as any).current_period_end * 1000).toISOString()
          : churchData?.subscription_expires_at ?? null,
        cancelAtPeriodEnd: stripeSub?.cancel_at_period_end ?? false,
        stripeCustomerId: churchData?.stripe_customer_id ?? null,
      };
    }),

  createBillingPortalSession: publicProcedure
    .input(z.object({ churchId: z.string() }))
    .mutation(async ({ input }) => {
      const stripe = getStripe();
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: church } = await supabase
        .from("churches")
        .select("stripe_customer_id")
        .eq("id", input.churchId)
        .single();

      const churchData = church as any;
      if (!churchData?.stripe_customer_id) {
        throw new Error("No Stripe customer found for this church");
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: churchData.stripe_customer_id,
        return_url: `${BASE_URL}/api/pricing`,
      });

      return { url: session.url };
    }),

  cancelSubscription: publicProcedure
    .input(z.object({ churchId: z.string() }))
    .mutation(async ({ input }) => {
      const stripe = getStripe();
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: church } = await supabase
        .from("churches")
        .select("stripe_subscription_id")
        .eq("id", input.churchId)
        .single();

      const churchData = church as any;
      if (!churchData?.stripe_subscription_id) {
        throw new Error("No active subscription found");
      }

      await stripe.subscriptions.update(churchData.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      return { success: true };
    }),
});
