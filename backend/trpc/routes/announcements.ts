import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";

const createAnnouncementSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  isPinned: z.boolean().default(false),
  ministryId: z.string().optional(),
  organizationId: z.string().optional(),
});

const updateAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().min(2).optional(),
  content: z.string().min(10).optional(),
  priority: z.enum(["high", "normal", "low"]).optional(),
  isPinned: z.boolean().optional(),
});

export const announcementsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        ministryId: z.string().optional(),
        limit: z.number().optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Fetching announcements with filters:", input);

      let announcements = input?.organizationId
        ? await persistentDb.announcements.findByOrganization(input.organizationId)
        : await persistentDb.announcements.getAll();

      if (input?.ministryId) {
        announcements = announcements.filter(
          (a) => a.ministryId === input.ministryId || !a.ministryId
        );
      }

      announcements.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      return input?.limit ? announcements.slice(0, input.limit) : announcements;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const announcement = await persistentDb.announcements.findById(input.id);
      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }
      return announcement;
    }),

  create: protectedProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating new announcement:", input.title);

      const isAdminOrLeader = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "leader";

      let ministryName: string | undefined;
      if (input.ministryId) {
        const ministry = await persistentDb.ministries.findById(input.ministryId);
        ministryName = ministry?.name;
      }

      const orgId = input.organizationId || "default";

      if (!isAdminOrLeader) {
        await persistentDb.workflowRequests.create({
          id: generateId(),
          organizationId: orgId,
          type: "create_announcement",
          requesterId: ctx.user.id,
          data: { ...input, ministryName },
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return { success: true, pending: true, message: "Announcement submitted for approval" };
      }

      const newAnnouncement = {
        id: generateId(),
        organizationId: orgId,
        title: input.title,
        content: input.content,
        author: ctx.user.name,
        authorRole: ctx.user.role === "super_admin" ? "Administrator" : ctx.user.role === "admin" ? "Admin" : "Leader",
        authorAvatar: ctx.user.avatar,
        date: new Date().toISOString().split("T")[0],
        priority: input.priority,
        isPinned: input.isPinned,
        ministryId: input.ministryId,
        ministryName,
      };

      const created = await persistentDb.announcements.create(newAnnouncement);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create announcement",
        });
      }

      console.log("Announcement created:", newAnnouncement.id);

      return { success: true, pending: false, announcement: newAnnouncement };
    }),

  update: adminProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ input }) => {
      const announcement = await persistentDb.announcements.findById(input.id);
      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.title) updates.title = input.title;
      if (input.content) updates.content = input.content;
      if (input.priority) updates.priority = input.priority;
      if (input.isPinned !== undefined) updates.isPinned = input.isPinned;

      const updated = await persistentDb.announcements.update(input.id, updates);
      console.log("Announcement updated:", input.id);

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const announcement = await persistentDb.announcements.findById(input.id);
      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      await persistentDb.announcements.delete(input.id);
      console.log("Announcement deleted:", input.id);

      return { success: true };
    }),

  togglePin: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const announcement = await persistentDb.announcements.findById(input.id);
      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      const updated = await persistentDb.announcements.update(input.id, {
        isPinned: !announcement.isPinned,
      });

      console.log("Announcement pin toggled:", input.id);

      return updated;
    }),
});
