import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { DbUser } from "@/backend/db";
import { hashPassword, verifyPassword, generateSecureToken, isTokenExpired } from "@/backend/utils/crypto";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export type SafeUser = Omit<DbUser, "password">;

function sanitizeUser(user: DbUser): SafeUser {
  const { password: _, ...safeUser } = user;
  return safeUser;
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      console.log("Login attempt for:", input.email);
      
      try {
        let user = null;
        try {
          user = await persistentDb.users.findByEmail(input.email.toLowerCase());
        } catch (dbError) {
          console.error("Database error finding user:", dbError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to verify credentials. Please try again.",
          });
        }
        
        if (!user) {
          console.log("User not found with email:", input.email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }
        
        let isValidPassword = false;
        try {
          isValidPassword = await verifyPassword(input.password, user.password);
        } catch (verifyError) {
          console.error("Password verification error:", verifyError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to verify credentials. Please try again.",
          });
        }
        
        if (!isValidPassword) {
          console.log("Password mismatch for user:", input.email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        if (!user.isActive) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been deactivated. Please contact an administrator.",
          });
        }

        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        let session = null;
        try {
          session = await persistentDb.sessions.create({
            id: generateId(),
            userId: user.id,
            token,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
          });
        } catch (sessionError) {
          console.error("Database error creating session:", sessionError);
        }

        if (!session) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create session. Please try again.",
          });
        }

        console.log("Login successful for:", user.name);

        return {
          user: sanitizeUser(user),
          token,
        };
      } catch (error) {
        console.error("Login error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Login failed. Please try again.",
        });
      }
    }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      console.log("Registration attempt for:", input.email);

      try {
        let existingUser = null;
        try {
          existingUser = await persistentDb.users.findByEmail(input.email.toLowerCase());
        } catch (dbError) {
          console.error("Database error checking existing user:", dbError);
        }

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        let hashedPassword: string;
        try {
          hashedPassword = await hashPassword(input.password);
        } catch (hashError) {
          console.error("Password hashing error:", hashError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process password. Please try again.",
          });
        }
        
        const userId = generateId();
        const newUser: DbUser = {
          id: userId,
          email: input.email.toLowerCase(),
          password: hashedPassword,
          name: input.name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff`,
          role: "member",
          ministries: [],
          phone: input.phone,
          joinedDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        let createdUser = null;
        try {
          createdUser = await persistentDb.users.create(newUser);
        } catch (createError) {
          console.error("Database error creating user:", createError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user account. Please try again.",
          });
        }
        
        if (!createdUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user account. Please try again.",
          });
        }

        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        let session = null;
        try {
          session = await persistentDb.sessions.create({
            id: generateId(),
            userId: newUser.id,
            token,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
          });
        } catch (sessionError) {
          console.error("Database error creating session:", sessionError);
        }

        if (!session) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Account created but failed to create session. Please try logging in.",
          });
        }

        try {
          await persistentDb.notifications.create({
            id: generateId(),
            userId: newUser.id,
            title: "Welcome!",
            message: "Welcome to our community! Explore ministries and events to get connected.",
            type: "success",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } catch (notifError) {
          console.error("Failed to create welcome notification (non-blocking):", notifError);
        }

        console.log("Registration successful for:", newUser.name);

        return {
          user: sanitizeUser(newUser),
          token,
        };
      } catch (error) {
        console.error("Registration error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed. Please try again.",
        });
      }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.token) {
      await persistentDb.sessions.deleteByToken(ctx.token);
      console.log("Session removed successfully");
    }
    console.log("Logout successful");
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return sanitizeUser(ctx.user);
  }),

  validateSession: publicProcedure.mutation(async ({ ctx }) => {
    console.log("=== SESSION VALIDATION START ===");
    
    if (!ctx.token) {
      console.log("No token provided for validation");
      return { valid: false, user: null };
    }

    try {
      const session = await persistentDb.sessions.findByToken(ctx.token);
      if (!session) {
        console.log("Session not found for token");
        return { valid: false, user: null };
      }

      if (isTokenExpired(session.expiresAt)) {
        console.log("Session expired, cleaning up");
        await persistentDb.sessions.delete(session.id).catch(err => {
          console.error("Failed to delete expired session:", err);
        });
        return { valid: false, user: null };
      }

      const user = await persistentDb.users.findById(session.userId);
      if (!user) {
        console.log("User not found for session");
        return { valid: false, user: null };
      }
      
      if (!user.isActive) {
        console.log("User is inactive");
        return { valid: false, user: null };
      }

      console.log("Session validated successfully for:", user.name);
      return { valid: true, user: sanitizeUser(user) };
    } catch (error) {
      console.error("Session validation error:", error);
      return { valid: false, user: null };
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Partial<DbUser> = {};
      if (input.name) updates.name = input.name;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.avatar) updates.avatar = input.avatar;

      const updatedUser = await persistentDb.users.update(ctx.user.id, updates);
      
      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      console.log("Profile updated for:", ctx.user.name);

      return sanitizeUser(updatedUser);
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await persistentDb.users.findById(ctx.user.id);
      
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const isValidPassword = await verifyPassword(input.currentPassword, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const hashedNewPassword = await hashPassword(input.newPassword);
      const updatedUser = await persistentDb.users.update(ctx.user.id, {
        password: hashedNewPassword,
      });

      if (!updatedUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update password",
        });
      }

      console.log("Password changed for:", ctx.user.name);

      return { success: true };
    }),
});
