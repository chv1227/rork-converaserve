import { createTRPCRouter } from "./create-context";
import { stripeRouter } from "./routes/stripe";

export const appRouter = createTRPCRouter({
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
