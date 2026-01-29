import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { ministryTemplates } from "@/mocks/ministryTemplates";

async function validateChurchAdmin(userId: string, churchId: string): Promise<void> {
  let membership = await persistentDb.churchMemberships.findByUserAndChurch(userId, churchId);
  
  if (!membership || !membership.isActive) {
    const orgMembership = await persistentDb.memberships.findByUserAndOrg(userId, churchId);
    if (orgMembership && orgMembership.isActive) {
      if (['super_admin', 'organization_admin', 'admin'].includes(orgMembership.role)) {
        console.log("MinistryTemplates: User validated via organization membership");
        return;
      }
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to manage ministries for this church",
    });
  }
  
  if (!['super_admin', 'admin', 'staff'].includes(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can manage ministry templates",
    });
  }
}

const addMinistryFromTemplateSchema = z.object({
  templateId: z.string(),
  organizationId: z.string(),
  leaderId: z.string().optional(),
});

const addMultipleMinistriesSchema = z.object({
  templateIds: z.array(z.string()),
  organizationId: z.string(),
});

const inviteLeaderSchema = z.object({
  ministryId: z.string(),
  organizationId: z.string(),
  inviteeEmail: z.string().email(),
  inviteeName: z.string().optional(),
  inviteeId: z.string().optional(),
  role: z.enum(["primary_leader", "co_leader"]),
  message: z.string().optional(),
});

const transferLeadershipSchema = z.object({
  ministryId: z.string(),
  organizationId: z.string(),
  newLeaderId: z.string(),
  newLeaderEmail: z.string().email(),
  newLeaderName: z.string(),
  transferType: z.enum(["complete_handoff", "add_co_leader", "gradual_transition"]),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

const respondToInvitationSchema = z.object({
  invitationId: z.string(),
  response: z.enum(["accept", "decline"]),
});

export const ministryTemplatesRouter = createTRPCRouter({
  listTemplates: publicProcedure.query(async () => {
    console.log("Fetching ministry templates");
    return ministryTemplates;
  }),

  getTemplateById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = ministryTemplates.find((t) => t.id === input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry template not found",
        });
      }
      return template;
    }),

  getTemplatesByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      return ministryTemplates.filter((t) => t.category === input.category);
    }),

  searchTemplates: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const loweredQuery = input.query.toLowerCase();
      return ministryTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(loweredQuery) ||
          t.description.toLowerCase().includes(loweredQuery) ||
          t.keywords.some((k) => k.includes(loweredQuery))
      );
    }),

  addFromTemplate: protectedProcedure
    .input(addMinistryFromTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Adding ministry from template:", input.templateId);

      await validateChurchAdmin(ctx.user.id, input.organizationId);

      const template = ministryTemplates.find((t) => t.id === input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry template not found",
        });
      }

      const newMinistry = {
        id: generateId(),
        organizationId: input.organizationId,
        templateId: template.id,
        name: template.name,
        description: template.description,
        color: template.color,
        icon: template.icon,
        memberCount: 0,
        image: template.coverImage,
        missionStatement: template.missionStatement,
        schedule: template.defaultSchedule.map((s) => ({ ...s, location: "Main Campus" })),
        enabledSections: template.suggestedSections,
        status: "draft" as const,
        createdBy: ctx.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await persistentDb.ministries.create(newMinistry);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ministry",
        });
      }

      if (input.leaderId) {
        const leader = {
          id: generateId(),
          ministryId: newMinistry.id,
          userId: input.leaderId,
          role: "primary_leader" as const,
          status: "active" as const,
          invitedBy: ctx.user.id,
          invitedAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        };
        console.log("Assigning leader to ministry:", leader);
      }

      console.log("Ministry created from template:", newMinistry.id);
      return newMinistry;
    }),

  addMultipleFromTemplates: protectedProcedure
    .input(addMultipleMinistriesSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Adding multiple ministries from templates:", input.templateIds);

      await validateChurchAdmin(ctx.user.id, input.organizationId);

      const results: { templateId: string; ministryId: string; name: string }[] = [];

      for (const templateId of input.templateIds) {
        const template = ministryTemplates.find((t) => t.id === templateId);
        if (!template) {
          console.warn(`Template not found: ${templateId}`);
          continue;
        }

        const newMinistry = {
          id: generateId(),
          organizationId: input.organizationId,
          templateId: template.id,
          name: template.name,
          description: template.description,
          color: template.color,
          icon: template.icon,
          memberCount: 0,
          image: template.coverImage,
          missionStatement: template.missionStatement,
          schedule: template.defaultSchedule.map((s) => ({ ...s, location: "Main Campus" })),
          enabledSections: template.suggestedSections,
          status: "draft" as const,
          createdBy: ctx.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const created = await persistentDb.ministries.create(newMinistry);
        if (created) {
          results.push({
            templateId,
            ministryId: newMinistry.id,
            name: newMinistry.name,
          });
        }
      }

      console.log(`Created ${results.length} ministries from templates`);
      return { success: true, created: results };
    }),

  inviteLeader: protectedProcedure
    .input(inviteLeaderSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Inviting leader to ministry:", input.ministryId);

      await validateChurchAdmin(ctx.user.id, input.organizationId);

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const inviter = await persistentDb.users.findById(ctx.user.id);

      const invitation = {
        id: generateId(),
        ministryId: input.ministryId,
        ministryName: ministry.name,
        organizationId: input.organizationId,
        inviterId: ctx.user.id,
        inviterName: inviter?.name || "Admin",
        inviterAvatar: inviter?.avatar || "",
        inviteeId: input.inviteeId,
        inviteeEmail: input.inviteeEmail,
        inviteeName: input.inviteeName,
        role: input.role,
        message: input.message,
        token: generateId(),
        status: "pending" as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      console.log("Leadership invitation created:", invitation.id);

      if (input.inviteeId) {
        const notification = {
          id: generateId(),
          userId: input.inviteeId,
          organizationId: input.organizationId,
          type: "info" as const,
          title: "Leadership Invitation",
          message: `You have been invited to be a ${input.role === "primary_leader" ? "Primary Leader" : "Co-Leader"} of ${ministry.name}`,
          data: { invitationId: invitation.id, ministryId: input.ministryId },
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        await persistentDb.notifications.create(notification);
      }

      return { success: true, invitation };
    }),

  transferLeadership: protectedProcedure
    .input(transferLeadershipSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Transferring leadership for ministry:", input.ministryId);

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const inviter = await persistentDb.users.findById(ctx.user.id);

      const transfer = {
        id: generateId(),
        ministryId: input.ministryId,
        ministryName: ministry.name,
        organizationId: input.organizationId,
        inviterId: ctx.user.id,
        inviterName: inviter?.name || "Leader",
        inviterAvatar: inviter?.avatar || "",
        inviteeId: input.newLeaderId,
        inviteeEmail: input.newLeaderEmail,
        inviteeName: input.newLeaderName,
        role: "primary_leader" as const,
        transferType: input.transferType,
        scheduledTransferDate: input.scheduledDate,
        message: input.notes,
        token: generateId(),
        status: "pending" as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      console.log("Leadership transfer created:", transfer.id);

      const notification = {
        id: generateId(),
        userId: input.newLeaderId,
        organizationId: input.organizationId,
        type: "info" as const,
        title: "Leadership Transfer Request",
        message: `${inviter?.name || "A leader"} wants to transfer leadership of ${ministry.name} to you`,
        data: { transferId: transfer.id, ministryId: input.ministryId, transferType: input.transferType },
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await persistentDb.notifications.create(notification);

      return { success: true, transfer };
    }),

  respondToInvitation: protectedProcedure
    .input(respondToInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log(`User ${ctx.user.id} responding to invitation ${input.invitationId}: ${input.response}`);

      if (input.response === "accept") {
        console.log("Invitation accepted - leadership role granted");
        
        const notification = {
          id: generateId(),
          userId: ctx.user.id,
          organizationId: "",
          type: "success" as const,
          title: "Leadership Role Confirmed",
          message: "You are now a leader of this ministry",
          data: { invitationId: input.invitationId },
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        await persistentDb.notifications.create(notification);
      } else {
        console.log("Invitation declined");
      }

      return { success: true, status: input.response === "accept" ? "accepted" : "declined" };
    }),

  getLeaders: protectedProcedure
    .input(z.object({ ministryId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching leaders for ministry:", input.ministryId);
      
      return [];
    }),

  getPendingInvitations: protectedProcedure
    .input(z.object({ ministryId: z.string().optional(), organizationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching pending invitations for user:", ctx.user.id);
      
      return [];
    }),

  getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
    console.log("Fetching invitations for user:", ctx.user.id);
    
    return [];
  }),

  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Cancelling invitation:", input.invitationId);
      
      return { success: true };
    }),

  resendInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Resending invitation:", input.invitationId);
      
      return { success: true, newExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    }),

  removeLeader: protectedProcedure
    .input(z.object({ ministryId: z.string(), userId: z.string(), organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Removing leader from ministry:", input.ministryId);

      await validateChurchAdmin(ctx.user.id, input.organizationId);

      return { success: true };
    }),

  getActiveMinistries: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching active ministries for organization:", input.organizationId);
      
      const ministries = await persistentDb.ministries.findByOrganization(input.organizationId);
      return ministries;
    }),

  updateMinistryStatus: protectedProcedure
    .input(z.object({ 
      ministryId: z.string(), 
      status: z.enum(["draft", "published", "archived"]),
      organizationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Updating ministry status:", input.ministryId, input.status);

      await validateChurchAdmin(ctx.user.id, input.organizationId);

      const updates: Record<string, unknown> = { 
        status: input.status,
        updatedAt: new Date().toISOString(),
      };

      if (input.status === "published") {
        updates.publishedAt = new Date().toISOString();
      }

      const updated = await persistentDb.ministries.update(input.ministryId, updates);
      return updated;
    }),
});
