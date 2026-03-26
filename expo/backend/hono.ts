import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

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

export default app;
