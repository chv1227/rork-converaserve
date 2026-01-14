import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb } from "@/backend/db/persistent";

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      console.log("Fetching notifications for user:", ctx.user.id);

      let notifications = await persistentDb.notifications.findByUser(ctx.user.id);

      if (input?.unreadOnly) {
        notifications = notifications.filter((n) => !n.isRead);
      }

      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return input?.limit ? notifications.slice(0, input.limit) : notifications;
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await persistentDb.notifications.findByUser(ctx.user.id);
    return notifications.filter((n) => !n.isRead).length;
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notifications = await persistentDb.notifications.findByUser(ctx.user.id);
      const notification = notifications.find((n) => n.id === input.id);

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      await persistentDb.notifications.update(input.id, { isRead: true });
      console.log("Notification marked as read:", input.id);

      return { success: true };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const notifications = await persistentDb.notifications.findByUser(ctx.user.id);
    
    await Promise.all(
      notifications.map((n) => persistentDb.notifications.update(n.id, { isRead: true }))
    );
    
    console.log("All notifications marked as read for user:", ctx.user.id);

    return { success: true };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notifications = await persistentDb.notifications.findByUser(ctx.user.id);
      const notification = notifications.find((n) => n.id === input.id);

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      await persistentDb.notifications.delete(input.id);
      console.log("Notification deleted:", input.id);

      return { success: true };
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    const notifications = await persistentDb.notifications.findByUser(ctx.user.id);
    
    await Promise.all(
      notifications.map((n) => persistentDb.notifications.delete(n.id))
    );
    
    console.log("All notifications cleared for user:", ctx.user.id);

    return { success: true };
  }),
});
