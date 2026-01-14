import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, adminProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";

export const workflowsRouter = createTRPCRouter({
  getPendingRequests: adminProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      console.log("Fetching pending workflow requests");
      
      const allRequests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();
      
      const pending = allRequests.filter((r) => r.status === "pending");
      
      const enrichedRequests = await Promise.all(
        pending.map(async (request) => {
          const requester = await persistentDb.users.findById(request.requesterId);
          return {
            ...request,
            requesterName: requester?.name || "Unknown",
            requesterAvatar: requester?.avatar,
          };
        })
      );

      return enrichedRequests;
    }),

  getAllRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        type: z.enum(["join_ministry", "create_event", "create_announcement", "role_change", "join_organization"]).optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Fetching all workflow requests with filters:", input);
      
      let requests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();

      if (input?.status) {
        requests = requests.filter((r) => r.status === input.status);
      }

      if (input?.type) {
        requests = requests.filter((r) => r.type === input.type);
      }

      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const requester = await persistentDb.users.findById(request.requesterId);
          const reviewer = request.reviewerId ? await persistentDb.users.findById(request.reviewerId) : null;
          return {
            ...request,
            requesterName: requester?.name || "Unknown",
            requesterAvatar: requester?.avatar,
            reviewerName: reviewer?.name,
          };
        })
      );

      return enrichedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  approve: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Approving request:", input.requestId);

      const request = await persistentDb.workflowRequests.findById(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request has already been processed",
        });
      }

      await persistentDb.workflowRequests.update(input.requestId, {
        status: "approved",
        reviewerId: ctx.user.id,
        reviewNote: input.note,
        updatedAt: new Date().toISOString(),
      });

      if (request.type === "join_ministry" && request.targetId) {
        const user = await persistentDb.users.findById(request.requesterId);
        if (user && !user.ministries.includes(request.targetId)) {
          await persistentDb.users.update(request.requesterId, {
            ministries: [...user.ministries, request.targetId],
          });
          
          const ministry = await persistentDb.ministries.findById(request.targetId);
          if (ministry) {
            await persistentDb.ministries.update(request.targetId, {
              memberCount: ministry.memberCount + 1,
            });
          }
        }
      }

      if (request.type === "create_event") {
        const eventData = request.data as {
          title: string;
          description: string;
          date: string;
          time: string;
          location: string;
          ministryId: string;
          ministryName: string;
        };
        const ministry = await persistentDb.ministries.findById(eventData.ministryId);
        
        await persistentDb.events.create({
          id: generateId(),
          organizationId: request.organizationId,
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          ministryId: eventData.ministryId,
          ministryName: eventData.ministryName,
          color: ministry?.color || "#0F766E",
          attendees: 0,
        });
      }

      if (request.type === "create_announcement") {
        const announcementData = request.data as {
          title: string;
          content: string;
          priority: "high" | "normal" | "low";
          isPinned: boolean;
          ministryId?: string;
          ministryName?: string;
        };
        const requester = await persistentDb.users.findById(request.requesterId);
        
        await persistentDb.announcements.create({
          id: generateId(),
          organizationId: request.organizationId,
          title: announcementData.title,
          content: announcementData.content,
          author: requester?.name || "Unknown",
          authorRole: "Member",
          authorAvatar: requester?.avatar || "",
          date: new Date().toISOString().split("T")[0],
          priority: announcementData.priority,
          isPinned: announcementData.isPinned,
          ministryId: announcementData.ministryId,
          ministryName: announcementData.ministryName,
        });
      }

      await persistentDb.notifications.create({
        id: generateId(),
        userId: request.requesterId,
        organizationId: request.organizationId,
        title: "Request Approved",
        message: `Your ${request.type.replace(/_/g, " ")} request has been approved.${input.note ? ` Note: ${input.note}` : ""}`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Request approved:", input.requestId);

      return { success: true };
    }),

  reject: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Rejecting request:", input.requestId);

      const request = await persistentDb.workflowRequests.findById(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request has already been processed",
        });
      }

      await persistentDb.workflowRequests.update(input.requestId, {
        status: "rejected",
        reviewerId: ctx.user.id,
        reviewNote: input.note,
        updatedAt: new Date().toISOString(),
      });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: request.requesterId,
        organizationId: request.organizationId,
        title: "Request Rejected",
        message: `Your ${request.type.replace(/_/g, " ")} request has been rejected.${input.note ? ` Reason: ${input.note}` : ""}`,
        type: "error",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Request rejected:", input.requestId);

      return { success: true };
    }),

  getMyRequests: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      console.log("Fetching requests for user:", ctx.user.id);
      
      const allRequests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();
      
      return allRequests
        .filter((r) => r.requesterId === ctx.user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),
});
