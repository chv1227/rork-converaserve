import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400,
  credentials: true,
}));

app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const hasAuth = !!c.req.header("authorization");
  
  console.log(`[${new Date().toISOString()}] ${method} ${path} (auth: ${hasAuth})`);
  
  try {
    await next();
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${path} completed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[${new Date().toISOString()}] ${method} ${path} failed in ${duration}ms:`, error);
    throw error;
  }
});

const createTRPCErrorJson = (message: string, code: string = "INTERNAL_SERVER_ERROR", httpStatus: number = 500) => {
  return {
    error: {
      json: {
        message,
        code: -32603,
        data: {
          code,
          httpStatus,
          path: "",
        },
      },
    },
  };
};

app.onError((err, c) => {
  console.error("Server error:", err.message || err);
  const isTrpcRequest = c.req.path.includes("/trpc");
  
  if (isTrpcRequest) {
    return c.json(createTRPCErrorJson(err.message || "Internal server error"), 500);
  }
  
  return c.json(
    { 
      error: { 
        message: err.message || "Internal server error",
        code: "INTERNAL_SERVER_ERROR"
      } 
    },
    500
  );
});

app.all("/trpc/*", async (c) => {
  try {
    const url = new URL(c.req.url);
    const originalPath = url.pathname;
    
    if (originalPath.startsWith('/trpc/trpc/')) {
      url.pathname = originalPath.replace('/trpc/trpc/', '/trpc/');
      console.log(`Fixed double trpc path: ${originalPath} -> ${url.pathname}`);
    }
    
    const fixedRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    });
    
    const response = await fetchRequestHandler({
      endpoint: "/trpc",
      req: fixedRequest,
      router: appRouter,
      createContext: (opts) => createContext(opts),
      onError: ({ error, path }) => {
        console.error(`tRPC error on ${path}:`, error.message);
      },
    });
    return response;
  } catch (error) {
    console.error("tRPC handler error:", error);
    return c.json(
      createTRPCErrorJson(
        error instanceof Error ? error.message : "Internal server error"
      ),
      500
    );
  }
});

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Church Connect API is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.notFound((c) => {
  const isTrpcRequest = c.req.path.includes("/trpc");
  
  if (isTrpcRequest) {
    return c.json(createTRPCErrorJson("Endpoint not found", "NOT_FOUND", 404), 404);
  }
  
  return c.json(
    { 
      error: { 
        message: "Not Found",
        code: "NOT_FOUND"
      } 
    },
    404
  );
});

export default app;
