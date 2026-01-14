import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { OrganizationRole } from "@/types";

const createOrganizationSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  logo: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  logo: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

export const organizationsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    console.log("Fetching all organizations");
    return await persistentDb.organizations.getAll();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const organization = await persistentDb.organizations.findById(input.id);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      return organization;
    }),

  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating new organization:", input.name);

      const orgId = generateId();
      const newOrganization = {
        id: orgId,
        name: input.name,
        description: input.description,
        logo: input.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff&size=200`,
        address: input.address || undefined,
        phone: input.phone || undefined,
        email: input.email || undefined,
        website: input.website || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdOrg = await persistentDb.organizations.create(newOrganization);
      if (!createdOrg) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization",
        });
      }

      const membershipId = generateId();
      const membership = {
        id: membershipId,
        userId: ctx.user.id,
        organizationId: orgId,
        role: "super_admin" as OrganizationRole,
        joinedAt: new Date().toISOString(),
        isActive: true,
      };

      const createdMembership = await persistentDb.memberships.create(membership);
      if (!createdMembership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create membership",
        });
      }

      await persistentDb.users.update(ctx.user.id, { role: "super_admin" });
      console.log("User role updated to super_admin:", ctx.user.id);

      console.log("Organization created:", orgId);

      return { organization: newOrganization, membership };
    }),

  update: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.id);

      if (!membership || (membership.role !== "organization_admin" && membership.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this organization",
        });
      }

      const organization = await persistentDb.organizations.findById(input.id);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.logo) updates.logo = input.logo;
      if (input.address !== undefined) updates.address = input.address;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.email !== undefined) updates.email = input.email;
      if (input.website !== undefined) updates.website = input.website;

      const updatedOrg = await persistentDb.organizations.update(input.id, updates);
      console.log("Organization updated:", input.id);

      return updatedOrg;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.id);

      if (!membership || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can delete organizations",
        });
      }

      const organization = await persistentDb.organizations.findById(input.id);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      console.log("Organization deleted:", input.id);

      return { success: true };
    }),

  getUserOrganizations: protectedProcedure.query(async ({ ctx }) => {
    console.log("Fetching organizations for user:", ctx.user.id);
    const memberships = await persistentDb.memberships.findByUser(ctx.user.id);
    const activeMemberships = memberships.filter(m => m.isActive);
    
    const organizations = await Promise.all(
      activeMemberships.map(async (membership) => {
        const organization = await persistentDb.organizations.findById(membership.organizationId);
        if (!organization) return null;
        return {
          ...organization,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return organizations.filter(Boolean);
  }),

  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const orgMemberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const activeMemberships = orgMemberships.filter(m => m.isActive);

      const members = await Promise.all(
        activeMemberships.map(async (m) => {
          const user = await persistentDb.users.findById(m.userId);
          return {
            id: m.id,
            oderId: m.userId,
            name: user?.name || "Unknown",
            email: user?.email || "Unknown",
            avatar: user?.avatar,
            role: m.role,
            joinedAt: m.joinedAt,
            isActive: m.isActive,
          };
        })
      );

      return members;
    }),

  requestJoin: protectedProcedure
    .input(z.object({ organizationId: z.string(), message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("User requesting to join organization:", input.organizationId);

      const organization = await persistentDb.organizations.findById(input.organizationId);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const existingMembership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this organization or have a pending request",
        });
      }

      const allRequests = await persistentDb.workflowRequests.getAll();
      const existingRequest = allRequests.find(
        (r) => r.requesterId === ctx.user.id && 
               r.type === "join_organization" && 
               r.targetId === input.organizationId &&
               r.status === "pending"
      );

      if (existingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a pending join request for this organization",
        });
      }

      await persistentDb.workflowRequests.create({
        id: generateId(),
        organizationId: input.organizationId,
        type: "join_organization",
        requesterId: ctx.user.id,
        targetId: input.organizationId,
        data: { organizationName: organization.name, message: input.message },
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("Join request created for organization:", input.organizationId);

      return { success: true, message: "Your request to join has been submitted for approval" };
    }),

  approveJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string(), role: z.enum(["member", "organization_admin"]).default("member") }))
    .mutation(async ({ ctx, input }) => {
      const allRequests = await persistentDb.workflowRequests.getAll();
      const request = allRequests.find((r) => r.id === input.requestId);
      
      if (!request || request.type !== "join_organization") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, request.organizationId);

      if (!membership || (membership.role !== "organization_admin" && membership.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve join requests",
        });
      }

      await persistentDb.workflowRequests.update(input.requestId, {
        status: "approved",
        reviewerId: ctx.user.id,
        updatedAt: new Date().toISOString(),
      });

      await persistentDb.memberships.create({
        id: generateId(),
        userId: request.requesterId,
        organizationId: request.organizationId,
        role: input.role,
        joinedAt: new Date().toISOString(),
        isActive: true,
      });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: request.requesterId,
        organizationId: request.organizationId,
        title: "Join Request Approved",
        message: `Your request to join has been approved.`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Join request approved:", input.requestId);

      return { success: true };
    }),

  rejectJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const allRequests = await persistentDb.workflowRequests.getAll();
      const request = allRequests.find((r) => r.id === input.requestId);
      
      if (!request || request.type !== "join_organization") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, request.organizationId);

      if (!membership || (membership.role !== "organization_admin" && membership.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject join requests",
        });
      }

      await persistentDb.workflowRequests.update(input.requestId, {
        status: "rejected",
        reviewerId: ctx.user.id,
        reviewNote: input.reason,
        updatedAt: new Date().toISOString(),
      });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: request.requesterId,
        organizationId: request.organizationId,
        title: "Join Request Rejected",
        message: `Your request to join has been rejected.${input.reason ? ` Reason: ${input.reason}` : ""}`,
        type: "error",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Join request rejected:", input.requestId);

      return { success: true };
    }),

  getJoinRequests: protectedProcedure
    .input(z.object({ organizationId: z.string(), status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || (membership.role !== "organization_admin" && membership.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view join requests",
        });
      }

      const allRequests = await persistentDb.workflowRequests.getAll();
      let requests = allRequests.filter(
        (r) => r.type === "join_organization" && r.organizationId === input.organizationId
      );

      if (input.status) {
        requests = requests.filter((r) => r.status === input.status);
      }

      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const requester = await persistentDb.users.findById(request.requesterId);
          return {
            ...request,
            requesterName: requester?.name || "Unknown",
            requesterEmail: requester?.email || "Unknown",
            requesterAvatar: requester?.avatar,
          };
        })
      );

      return enrichedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ 
      membershipId: z.string(), 
      role: z.enum(["member", "organization_admin", "super_admin"]) 
    }))
    .mutation(async ({ ctx, input }) => {
      const allMemberships = await persistentDb.memberships.findByUser(ctx.user.id);
      const membershipToUpdate = allMemberships.find(m => m.id === input.membershipId);
      
      if (!membershipToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      const ctxMembership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, membershipToUpdate.organizationId);

      if (!ctxMembership || ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can change member roles",
        });
      }

      if (membershipToUpdate.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      await persistentDb.memberships.update(input.membershipId, { role: input.role });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: membershipToUpdate.userId,
        organizationId: membershipToUpdate.organizationId,
        title: "Role Updated",
        message: `Your role has been updated to ${input.role.replace(/_/g, " ")}.`,
        type: "info",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Member role updated:", input.membershipId, "to", input.role);

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const allMemberships = await persistentDb.memberships.findByUser(ctx.user.id);
      const membershipToRemove = allMemberships.find(m => m.id === input.membershipId);
      
      if (!membershipToRemove) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      const ctxMembership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, membershipToRemove.organizationId);

      if (!ctxMembership || (ctxMembership.role !== "organization_admin" && ctxMembership.role !== "super_admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove members",
        });
      }

      if (membershipToRemove.role === "super_admin" && ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can remove other super admins",
        });
      }

      if (membershipToRemove.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself. Use leave organization instead.",
        });
      }

      await persistentDb.memberships.update(input.membershipId, { isActive: false });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: membershipToRemove.userId,
        organizationId: membershipToRemove.organizationId,
        title: "Removed from Organization",
        message: `You have been removed from the organization.`,
        type: "warning",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Member removed:", input.membershipId);

      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this organization",
        });
      }

      const orgMemberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const superAdminCount = orgMemberships.filter(
        (m) => m.role === "super_admin" && m.isActive
      ).length;

      if (membership.role === "super_admin" && superAdminCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are the only super admin. Please promote another member before leaving.",
        });
      }

      await persistentDb.memberships.update(membership.id, { isActive: false });

      console.log("User left organization:", input.organizationId);

      return { success: true };
    }),

  getMembership: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive) {
        return null;
      }

      const organization = await persistentDb.organizations.findById(input.organizationId);

      return {
        ...membership,
        organization,
      };
    }),
});
