import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";

const createMinistrySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  color: z.string(),
  icon: z.string(),
  image: z.string().url().optional(),
  organizationId: z.string(),
});

const updateMinistrySchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().url().optional(),
});

export const ministriesRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const orgId = input?.organizationId;
      console.log("Fetching ministries for organization:", orgId || "all");
      if (orgId) {
        return await persistentDb.ministries.findByOrganization(orgId);
      }
      return await persistentDb.ministries.getAll();
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const ministry = await persistentDb.ministries.findById(input.id);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }
      return ministry;
    }),

  getMembers: protectedProcedure
    .input(z.object({ ministryId: z.string() }))
    .query(async ({ input }) => {
      const allUsers = await persistentDb.users.getAll();
      const members = allUsers.filter((u) => u.ministries.includes(input.ministryId));
      return members.map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.role,
      }));
    }),

  create: adminProcedure
    .input(createMinistrySchema)
    .mutation(async ({ input }) => {
      console.log("Creating new ministry:", input.name);

      const newMinistry = {
        id: generateId(),
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        memberCount: 0,
        image: input.image || `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop`,
      };

      const created = await persistentDb.ministries.create(newMinistry);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ministry",
        });
      }
      
      console.log("Ministry created:", newMinistry.id);
      return newMinistry;
    }),

  update: adminProcedure
    .input(updateMinistrySchema)
    .mutation(async ({ input }) => {
      const ministry = await persistentDb.ministries.findById(input.id);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.color) updates.color = input.color;
      if (input.icon) updates.icon = input.icon;
      if (input.image) updates.image = input.image;

      const updated = await persistentDb.ministries.update(input.id, updates);
      console.log("Ministry updated:", input.id);

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const ministry = await persistentDb.ministries.findById(input.id);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      await persistentDb.ministries.delete(input.id);
      console.log("Ministry deleted:", input.id);

      return { success: true };
    }),

  join: protectedProcedure
    .input(z.object({ ministryId: z.string(), organizationId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const user = await persistentDb.users.findById(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this ministry",
        });
      }

      const orgId = input.organizationId || ministry.organizationId;
      await persistentDb.workflowRequests.create({
        id: generateId(),
        organizationId: orgId,
        type: "join_ministry",
        requesterId: ctx.user.id,
        targetId: input.ministryId,
        data: { ministryName: ministry.name },
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("Join request created for ministry:", input.ministryId);

      return { success: true, message: "Your request to join has been submitted for approval" };
    }),

  leave: protectedProcedure
    .input(z.object({ ministryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await persistentDb.users.findById(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this ministry",
        });
      }

      const updatedMinistries = user.ministries.filter(id => id !== input.ministryId);
      await persistentDb.users.update(ctx.user.id, { ministries: updatedMinistries });

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (ministry) {
        await persistentDb.ministries.update(input.ministryId, {
          memberCount: Math.max(0, ministry.memberCount - 1),
        });
      }

      console.log("User left ministry:", input.ministryId);

      return { success: true };
    }),

  getUserMinistries: protectedProcedure.query(async ({ ctx }) => {
    const allMinistries = await persistentDb.ministries.getAll();
    return allMinistries.filter((m) => ctx.user.ministries.includes(m.id));
  }),
});
