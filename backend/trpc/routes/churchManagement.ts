import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { OrganizationRole } from "@/types";

const createChurchSchema = z.object({
  name: z.string().min(2, "Church name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  logo: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

const updateChurchSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  logo: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

const updateMemberRoleSchema = z.object({
  organizationId: z.string(),
  membershipId: z.string(),
  role: z.enum(["member", "organization_admin", "super_admin"]),
});

const removeMemberSchema = z.object({
  organizationId: z.string(),
  membershipId: z.string(),
});

const createMinistrySchema = z.object({
  organizationId: z.string(),
  name: z.string().min(2, "Ministry name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  color: z.string(),
  icon: z.string(),
  image: z.string().url().optional(),
});

const updateMinistrySchema = z.object({
  organizationId: z.string(),
  ministryId: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().url().optional(),
});

const deleteMinistrySchema = z.object({
  organizationId: z.string(),
  ministryId: z.string(),
});

export const churchManagementRouter = createTRPCRouter({
  checkAccess: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Church Management: Checking access for user:", ctx.user.id);
      
      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);
      
      if (!membership || !membership.isActive) {
        return { hasAccess: false, reason: "Not a member of this organization" };
      }

      if (membership.role !== "super_admin") {
        return { hasAccess: false, reason: "Only super admins can access church management" };
      }

      const organization = await persistentDb.organizations.findById(input.organizationId);
      if (!organization) {
        return { hasAccess: false, reason: "Organization not found" };
      }

      console.log("Church Management: Access granted for user:", ctx.user.id);
      return { 
        hasAccess: true, 
        role: membership.role,
        organization,
      };
    }),

  createChurch: protectedProcedure
    .input(createChurchSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Creating new church:", input.name);

      const orgId = generateId();
      const now = new Date().toISOString();

      const newOrganization = {
        id: orgId,
        name: input.name,
        description: input.description,
        logo: input.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff&size=200`,
        address: input.address || undefined,
        phone: input.phone || undefined,
        email: input.email || undefined,
        website: input.website || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const createdOrg = await persistentDb.organizations.create(newOrganization);
      if (!createdOrg) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create church",
        });
      }

      const membershipId = generateId();
      const membership = {
        id: membershipId,
        userId: ctx.user.id,
        organizationId: orgId,
        role: "super_admin" as OrganizationRole,
        joinedAt: now,
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

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: orgId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "church_created",
        details: `Created church: ${input.name}`,
        createdAt: now,
      });

      console.log("Church Management: Church created successfully:", orgId);

      return { 
        organization: newOrganization, 
        membership,
        message: "Church created successfully. You are now the super admin." 
      };
    }),

  updateChurch: protectedProcedure
    .input(updateChurchSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Updating church:", input.organizationId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can update church settings.",
        });
      }

      const organization = await persistentDb.organizations.findById(input.organizationId);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Church not found",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.logo !== undefined) updates.logo = input.logo;
      if (input.address !== undefined) updates.address = input.address;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.email !== undefined) updates.email = input.email;
      if (input.website !== undefined) updates.website = input.website;

      const updatedOrg = await persistentDb.organizations.update(input.organizationId, updates);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "church_updated",
        details: `Updated church settings`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Church updated successfully:", input.organizationId);

      return { 
        organization: updatedOrg,
        message: "Church settings updated successfully" 
      };
    }),

  getChurchDetails: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Church Management: Getting church details:", input.organizationId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can view church management details.",
        });
      }

      const organization = await persistentDb.organizations.findById(input.organizationId);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Church not found",
        });
      }

      const memberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const ministries = await persistentDb.ministries.findByOrganization(input.organizationId);
      const activityLogs = await persistentDb.activityLogs.findByOrganization(input.organizationId);

      const stats = {
        totalMembers: memberships.filter(m => m.isActive).length,
        totalMinistries: ministries.length,
        superAdmins: memberships.filter(m => m.role === "super_admin" && m.isActive).length,
        admins: memberships.filter(m => m.role === "organization_admin" && m.isActive).length,
        regularMembers: memberships.filter(m => m.role === "member" && m.isActive).length,
      };

      return {
        organization,
        stats,
        recentActivity: activityLogs.slice(0, 10).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    }),

  getAllMembers: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      search: z.string().optional(),
      roleFilter: z.enum(["all", "super_admin", "organization_admin", "member"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      console.log("Church Management: Getting all members for:", input.organizationId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can manage members.",
        });
      }

      const orgMemberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const activeMemberships = orgMemberships.filter(m => m.isActive);

      let members = await Promise.all(
        activeMemberships.map(async (m) => {
          const user = await persistentDb.users.findById(m.userId);
          return {
            membershipId: m.id,
            userId: m.userId,
            name: user?.name || "Unknown",
            email: user?.email || "Unknown",
            avatar: user?.avatar,
            role: m.role,
            joinedAt: m.joinedAt,
            isActive: m.isActive,
            ministries: user?.ministries || [],
            phone: user?.phone,
          };
        })
      );

      if (input.search) {
        const searchLower = input.search.toLowerCase();
        members = members.filter(m => 
          m.name.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower)
        );
      }

      if (input.roleFilter && input.roleFilter !== "all") {
        members = members.filter(m => m.role === input.roleFilter);
      }

      return members.sort((a, b) => {
        const roleOrder = { super_admin: 0, organization_admin: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Updating member role:", input.membershipId);

      const ctxMembership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!ctxMembership || !ctxMembership.isActive || ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can change member roles.",
        });
      }

      const allMemberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const targetMembership = allMemberships.find(m => m.id === input.membershipId);

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      if (targetMembership.role === "super_admin" && input.role !== "super_admin") {
        const superAdminCount = allMemberships.filter(
          m => m.role === "super_admin" && m.isActive
        ).length;
        
        if (superAdminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the last super admin. Promote another member first.",
          });
        }
      }

      await persistentDb.memberships.update(input.membershipId, { role: input.role });

      const targetUser = await persistentDb.users.findById(targetMembership.userId);

      await persistentDb.notifications.create({
        id: generateId(),
        userId: targetMembership.userId,
        organizationId: input.organizationId,
        title: "Role Updated",
        message: `Your role has been updated to ${input.role.replace(/_/g, " ")}.`,
        type: "info",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "member_role_updated",
        details: `Updated ${targetUser?.name || "member"}'s role to ${input.role.replace(/_/g, " ")}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Member role updated successfully");

      return { success: true, message: "Member role updated successfully" };
    }),

  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Removing member:", input.membershipId);

      const ctxMembership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!ctxMembership || !ctxMembership.isActive || ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can remove members.",
        });
      }

      const allMemberships = await persistentDb.memberships.findByOrganization(input.organizationId);
      const targetMembership = allMemberships.find(m => m.id === input.membershipId);

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself. Use the leave organization option instead.",
        });
      }

      if (targetMembership.role === "super_admin") {
        const superAdminCount = allMemberships.filter(
          m => m.role === "super_admin" && m.isActive
        ).length;
        
        if (superAdminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last super admin.",
          });
        }
      }

      await persistentDb.memberships.update(input.membershipId, { isActive: false });

      const targetUser = await persistentDb.users.findById(targetMembership.userId);

      await persistentDb.notifications.create({
        id: generateId(),
        userId: targetMembership.userId,
        organizationId: input.organizationId,
        title: "Removed from Church",
        message: `You have been removed from the church.`,
        type: "warning",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "member_removed",
        details: `Removed ${targetUser?.name || "member"} from the church`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Member removed successfully");

      return { success: true, message: "Member removed successfully" };
    }),

  getAllMinistries: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Church Management: Getting all ministries for:", input.organizationId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can manage ministries.",
        });
      }

      const ministries = await persistentDb.ministries.findByOrganization(input.organizationId);

      const ministriesWithMembers = await Promise.all(
        ministries.map(async (ministry) => {
          const allUsers = await persistentDb.users.getAll();
          const members = allUsers.filter(u => u.ministries.includes(ministry.id));
          return {
            ...ministry,
            memberCount: members.length,
            members: members.slice(0, 5).map(u => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar,
            })),
          };
        })
      );

      return ministriesWithMembers;
    }),

  createMinistry: protectedProcedure
    .input(createMinistrySchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Creating ministry:", input.name);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can create ministries.",
        });
      }

      const ministryId = generateId();
      const newMinistry = {
        id: ministryId,
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

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "ministry_created",
        details: `Created ministry: ${input.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Ministry created successfully:", ministryId);

      return { ministry: newMinistry, message: "Ministry created successfully" };
    }),

  updateMinistry: protectedProcedure
    .input(updateMinistrySchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Updating ministry:", input.ministryId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can update ministries.",
        });
      }

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      if (ministry.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This ministry does not belong to your church.",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.color) updates.color = input.color;
      if (input.icon) updates.icon = input.icon;
      if (input.image) updates.image = input.image;

      const updated = await persistentDb.ministries.update(input.ministryId, updates);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "ministry_updated",
        details: `Updated ministry: ${ministry.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Ministry updated successfully");

      return { ministry: updated, message: "Ministry updated successfully" };
    }),

  deleteMinistry: protectedProcedure
    .input(deleteMinistrySchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Deleting ministry:", input.ministryId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can delete ministries.",
        });
      }

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      if (ministry.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This ministry does not belong to your church.",
        });
      }

      const allUsers = await persistentDb.users.getAll();
      const usersInMinistry = allUsers.filter(u => u.ministries.includes(input.ministryId));
      
      for (const user of usersInMinistry) {
        const updatedMinistries = user.ministries.filter(id => id !== input.ministryId);
        await persistentDb.users.update(user.id, { ministries: updatedMinistries });
      }

      await persistentDb.ministries.delete(input.ministryId);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "ministry_deleted",
        details: `Deleted ministry: ${ministry.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Ministry deleted successfully");

      return { success: true, message: "Ministry deleted successfully" };
    }),

  addMemberToMinistry: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      ministryId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Adding member to ministry");

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can manage ministry memberships.",
        });
      }

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry || ministry.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found in this church",
        });
      }

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this ministry",
        });
      }

      const updatedMinistries = [...user.ministries, input.ministryId];
      await persistentDb.users.update(input.userId, { ministries: updatedMinistries });

      await persistentDb.ministries.update(input.ministryId, {
        memberCount: ministry.memberCount + 1,
      });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: input.userId,
        organizationId: input.organizationId,
        title: "Added to Ministry",
        message: `You have been added to ${ministry.name}.`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Member added to ministry successfully");

      return { success: true, message: "Member added to ministry successfully" };
    }),

  removeMemberFromMinistry: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      ministryId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Church Management: Removing member from ministry");

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can manage ministry memberships.",
        });
      }

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry || ministry.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found in this church",
        });
      }

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this ministry",
        });
      }

      const updatedMinistries = user.ministries.filter(id => id !== input.ministryId);
      await persistentDb.users.update(input.userId, { ministries: updatedMinistries });

      await persistentDb.ministries.update(input.ministryId, {
        memberCount: Math.max(0, ministry.memberCount - 1),
      });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: input.userId,
        organizationId: input.organizationId,
        title: "Removed from Ministry",
        message: `You have been removed from ${ministry.name}.`,
        type: "info",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("Church Management: Member removed from ministry successfully");

      return { success: true, message: "Member removed from ministry successfully" };
    }),

  getActivityLogs: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      console.log("Church Management: Getting activity logs for:", input.organizationId);

      const membership = await persistentDb.memberships.findByUserAndOrg(ctx.user.id, input.organizationId);

      if (!membership || !membership.isActive || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Only super admins can view activity logs.",
        });
      }

      const logs = await persistentDb.activityLogs.findByOrganization(input.organizationId);
      
      return logs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, input.limit);
    }),
});
