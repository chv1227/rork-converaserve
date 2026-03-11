import Stripe from "stripe";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

const BASE_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "https://rork.com";

export const stripeRouter = createTRPCRouter({
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
          churchId: input.churchId,
          userId: input.userId,
          ministryId: input.ministryId ?? "",
          donationType: input.donationType,
          frequency: input.frequency,
          note: input.note ?? "",
          amount: String(input.amount),
        },
      });

      console.log("Stripe: Created checkout session", session.id);
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
});
