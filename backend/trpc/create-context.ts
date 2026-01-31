import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

const SUPER_ADMIN_EMAILS = [
  "chv1227@gmail.com",
  "coreytmoss@gmail.com",
];

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  return {
    req: opts.req,
    token,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  const user = await getUserFromToken(ctx.token);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return next({ ctx });
});

async function getUserFromToken(token: string) {
  if (!token || token.length < 10) {
    console.log("Backend: Invalid token format");
    return null;
  }

  const { persistentDb } = await import("@/backend/db/persistent");
  
  try {
    const session = await persistentDb.sessions.findByToken(token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      console.log("Backend: No valid session found");
      return null;
    }
    
    const user = await persistentDb.users.findById(session.userId);
    
    if (user) {
      if (SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === (user.email || "").toLowerCase())) {
        if (user.role !== "super_admin" && user.role !== "admin") {
          console.log("Backend: Promoting user to super_admin:", user.email);
          await persistentDb.users.update(user.id, { role: "super_admin" });
          user.role = "super_admin";
        }
      }
      
      console.log("Backend: User authenticated:", user.name || user.email, "role:", user.role);
    }
    
    return user;
  } catch (err) {
    console.error("Backend: Session lookup failed:", err);
    return null;
  }
}
