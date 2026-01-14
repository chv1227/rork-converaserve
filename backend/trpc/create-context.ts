import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase credentials not configured");
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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
  
  // First try to verify with Supabase
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      console.log("Backend: Verifying token with Supabase...");
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        // Handle "User from sub claim in JWT does not exist" error
        if (error.message?.includes("User from sub claim") || 
            error.message?.includes("does not exist") ||
            error.message?.includes("invalid JWT") ||
            error.message?.includes("token is expired")) {
          console.log("Backend: Invalid JWT:", error.message);
          return null;
        }
        console.error("Backend: Supabase auth error:", error.message);
        return null;
      }
      
      if (supabaseUser) {
        console.log("Backend: Supabase user verified:", supabaseUser.id);
        
        // Check if user exists in persistent db
        let dbUser = await persistentDb.users.findById(supabaseUser.id);
        
        if (!dbUser) {
          // Also check by email
          dbUser = await persistentDb.users.findByEmail(supabaseUser.email || "");
        }
        
        if (!dbUser) {
          // Create user in persistent db
          const metadata = supabaseUser.user_metadata || {};
          const displayName = metadata.display_name || metadata.full_name || supabaseUser.email?.split("@")[0] || "User";
          const now = new Date().toISOString();
          
          const newUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || "",
            password: "",
            name: displayName,
            avatar: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A7B74&color=fff`,
            role: "member" as const,
            ministries: [],
            phone: metadata.phone || undefined,
            joinedDate: supabaseUser.created_at || now,
            isActive: true,
            createdAt: supabaseUser.created_at || now,
            updatedAt: now,
          };
          
          console.log("Backend: Creating new user in persistent db:", newUser.email);
          dbUser = await persistentDb.users.create(newUser);
        } else if (dbUser.id !== supabaseUser.id) {
          // Update the existing user's ID to match Supabase
          console.log("Backend: Updating user ID to match Supabase:", supabaseUser.id);
          await persistentDb.users.update(dbUser.id, { id: supabaseUser.id });
          dbUser = await persistentDb.users.findById(supabaseUser.id);
        }
        
        console.log("Backend: User authenticated:", dbUser?.name || dbUser?.email);
        return dbUser;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Backend: Supabase token verification failed:", errorMessage);
      return null;
    }
  } else {
    console.log("Backend: Supabase client not available, trying legacy auth");
  }
  
  // Fallback to legacy session-based auth
  try {
    const session = await persistentDb.sessions.findByToken(token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      console.log("Backend: No valid legacy session found");
      return null;
    }
    const user = await persistentDb.users.findById(session.userId);
    console.log("Backend: Legacy auth user:", user?.name || user?.email);
    return user;
  } catch (err) {
    console.error("Backend: Legacy session lookup failed:", err);
    return null;
  }
}
