import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, adminProcedure, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { UserRole } from "@/backend/db";
import { generateSecureToken } from "@/backend/utils/crypto";

export const adminRouter = createTRPCRouter({
  getUsers: adminProcedure
    .input(
      z.object({
        role: z.enum(["member", "leader", "admin", "super_admin"]).optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Admin: Fetching users with filters:", input);

      let users = input?.organizationId
        ? await persistentDb.users.findByOrganization(input.organizationId)
        : await persistentDb.users.getAll();

      if (input?.role) {
        users = users.filter((u) => u.role === input.role);
      }

      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }

      if (input?.isActive !== undefined) {
        users = users.filter((u) => u.isActive === input.isActive);
      }

      const memberships = input?.organizationId
        ? await persistentDb.memberships.findByOrganization(input.organizationId)
        : [];

      return users.map((u) => {
        const membership = memberships.find(m => m.userId === u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          role: u.role,
          organizationRole: membership?.role || "member",
          ministries: u.ministries,
          isActive: u.isActive,
          joinedDate: u.joinedDate,
          createdAt: u.createdAt,
        };
      });
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["member", "leader", "admin", "super_admin"]),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Updating user role:", input.userId, "to", input.role);

      if (input.role === "super_admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can promote users to super admin",
        });
      }

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const oldRole = user.role;
      await persistentDb.users.update(input.userId, { role: input.role });

      await persistentDb.notifications.create({
        id: generateId(),
        userId: input.userId,
        organizationId: input.organizationId,
        title: "Role Updated",
        message: `Your role has been changed from ${oldRole} to ${input.role}.`,
        type: "info",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      console.log("User role updated:", input.userId);

      return { success: true };
    }),

  toggleUserStatus: adminProcedure
    .input(z.object({ userId: z.string(), organizationId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Toggling user status:", input.userId);

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      if (user.role === "super_admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can deactivate other super admins",
        });
      }

      const newStatus = !user.isActive;
      await persistentDb.users.update(input.userId, { isActive: newStatus });

      if (!newStatus) {
        const sessions = await persistentDb.sessions.findByUserId(input.userId);
        await Promise.all(sessions.map(s => persistentDb.sessions.delete(s.id)));
      }

      console.log("User status toggled:", input.userId, "active:", newStatus);

      return { success: true, isActive: newStatus };
    }),

  addUserToMinistry: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        ministryId: z.string(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Admin: Adding user to ministry:", input.userId, input.ministryId);

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      if (user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this ministry",
        });
      }

      await persistentDb.users.update(input.userId, {
        ministries: [...user.ministries, input.ministryId],
      });

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

      console.log("User added to ministry:", input.userId, input.ministryId);

      return { success: true };
    }),

  removeUserFromMinistry: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        ministryId: z.string(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Admin: Removing user from ministry:", input.userId, input.ministryId);

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

      await persistentDb.users.update(input.userId, {
        ministries: user.ministries.filter(id => id !== input.ministryId),
      });

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (ministry) {
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
      }

      console.log("User removed from ministry:", input.userId, input.ministryId);

      return { success: true };
    }),

  getDashboardStats: adminProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      console.log("Admin: Fetching dashboard stats");

      const users = input?.organizationId
        ? await persistentDb.users.findByOrganization(input.organizationId)
        : await persistentDb.users.getAll();

      const ministries = input?.organizationId
        ? await persistentDb.ministries.findByOrganization(input.organizationId)
        : await persistentDb.ministries.getAll();

      const events = input?.organizationId
        ? await persistentDb.events.findByOrganization(input.organizationId)
        : await persistentDb.events.getAll();

      const workflowRequests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();

      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.isActive).length;
      const totalMinistries = ministries.length;
      const totalEvents = events.length;
      const pendingRequests = workflowRequests.filter((r) => r.status === "pending").length;

      const usersByRole: Record<UserRole, number> = {
        member: 0,
        leader: 0,
        admin: 0,
        super_admin: 0,
      };

      users.forEach((u) => {
        usersByRole[u.role]++;
      });

      return {
        totalUsers,
        activeUsers,
        totalMinistries,
        totalEvents,
        pendingRequests,
        usersByRole,
      };
    }),

  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user.role === "admin" || ctx.user.role === "super_admin";
  }),

  isSuperAdmin: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user.role === "super_admin";
  }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string(), organizationId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Deleting user:", input.userId);

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      if (user.role === "super_admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can delete other super admins",
        });
      }

      const sessions = await persistentDb.sessions.findByUserId(input.userId);
      await Promise.all(sessions.map(s => persistentDb.sessions.delete(s.id)));

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "user_deleted",
        details: `Deleted user account: ${user.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("User deleted:", input.userId);
      return { success: true };
    }),

  updateUserProfile: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Updating user profile:", input.userId);

      const user = await persistentDb.users.findById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (input.email && input.email !== user.email) {
        const existingUser = await persistentDb.users.findByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.email) updates.email = input.email;
      if (input.phone !== undefined) updates.phone = input.phone;

      const updatedUser = await persistentDb.users.update(input.userId, updates);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "user_updated",
        details: `Updated profile for: ${updatedUser?.name || user.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("User profile updated:", input.userId);
      return { success: true, user: updatedUser };
    }),

  getMinistryMembers: adminProcedure
    .input(z.object({ ministryId: z.string(), organizationId: z.string().optional() }))
    .query(async ({ input }) => {
      console.log("Admin: Fetching ministry members:", input.ministryId);

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const allUsers = await persistentDb.users.getAll();
      const members = allUsers.filter((u) => u.ministries.includes(input.ministryId));

      return members.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        isActive: u.isActive,
        joinedDate: u.joinedDate,
      }));
    }),

  deleteMinistry: adminProcedure
    .input(z.object({ ministryId: z.string(), organizationId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Deleting ministry:", input.ministryId);

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const allUsers = await persistentDb.users.getAll();
      await Promise.all(
        allUsers
          .filter(u => u.ministries.includes(input.ministryId))
          .map(u => persistentDb.users.update(u.id, {
            ministries: u.ministries.filter(id => id !== input.ministryId),
          }))
      );

      await persistentDb.ministries.delete(input.ministryId);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "ministry_deleted",
        details: `Deleted ministry: ${ministry.name}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Ministry deleted:", input.ministryId);
      return { success: true };
    }),

  getReportedContent: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "resolved", "dismissed"]).optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Admin: Fetching reported content:", input);

      let reports = input?.organizationId
        ? await persistentDb.reportedContent.findByOrganization(input.organizationId)
        : await persistentDb.reportedContent.getAll();

      if (input?.status) {
        reports = reports.filter((r) => r.status === input.status);
      }

      return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  resolveReport: adminProcedure
    .input(
      z.object({
        reportId: z.string(),
        action: z.enum(["resolve", "dismiss"]),
        deleteContent: z.boolean().optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Resolving report:", input.reportId);

      const report = await persistentDb.reportedContent.findById(input.reportId);
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      await persistentDb.reportedContent.update(input.reportId, {
        status: input.action === "resolve" ? "resolved" : "dismissed",
        resolvedBy: ctx.user.id,
        resolvedAt: new Date().toISOString(),
      });

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "report_resolved",
        details: `${input.action === "resolve" ? "Resolved" : "Dismissed"} report: ${report.reason}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Report resolved:", input.reportId);
      return { success: true };
    }),

  getActivityLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Admin: Fetching activity logs");

      const logs = input?.organizationId
        ? await persistentDb.activityLogs.findByOrganization(input.organizationId)
        : await persistentDb.activityLogs.getAll();

      const limit = input?.limit || 50;
      return logs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }),

  getEnhancedStats: adminProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      console.log("Admin: Fetching enhanced dashboard stats");

      const users = input?.organizationId
        ? await persistentDb.users.findByOrganization(input.organizationId)
        : await persistentDb.users.getAll();

      const ministries = input?.organizationId
        ? await persistentDb.ministries.findByOrganization(input.organizationId)
        : await persistentDb.ministries.getAll();

      const events = input?.organizationId
        ? await persistentDb.events.findByOrganization(input.organizationId)
        : await persistentDb.events.getAll();

      const announcements = input?.organizationId
        ? await persistentDb.announcements.findByOrganization(input.organizationId)
        : await persistentDb.announcements.getAll();

      const reports = input?.organizationId
        ? await persistentDb.reportedContent.findByOrganization(input.organizationId)
        : await persistentDb.reportedContent.getAll();

      const workflowRequests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();

      const activityLogs = input?.organizationId
        ? await persistentDb.activityLogs.findByOrganization(input.organizationId)
        : await persistentDb.activityLogs.getAll();

      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.isActive).length;
      const suspendedUsers = users.filter((u) => !u.isActive).length;
      const totalMinistries = ministries.length;
      const totalEvents = events.length;
      const totalAnnouncements = announcements.length;
      const pendingReports = reports.filter((r) => r.status === "pending").length;
      const pendingRequests = workflowRequests.filter((r) => r.status === "pending").length;

      const usersByRole: Record<UserRole, number> = {
        member: 0,
        leader: 0,
        admin: 0,
        super_admin: 0,
      };

      users.forEach((u) => {
        usersByRole[u.role]++;
      });

      const recentActivity = activityLogs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      return {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalMinistries,
        totalEvents,
        totalAnnouncements,
        pendingReports,
        pendingRequests,
        usersByRole,
        recentActivity,
      };
    }),

  inviteUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
        role: z.enum(["member", "leader", "admin", "super_admin"]).default("member"),
        ministries: z.array(z.string()).default([]),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Inviting user:", input.email);

      const existingUser = await persistentDb.users.findByEmail(input.email.toLowerCase());
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const invitations = await persistentDb.invitations.getAll();
      const existingInvitation = invitations.find(
        (i) => i.email.toLowerCase() === input.email.toLowerCase() && 
               i.status === "pending" && 
               (input.organizationId ? i.organizationId === input.organizationId : true)
      );
      
      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent to this email",
        });
      }

      if (input.role === "super_admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can invite super admin users",
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = {
        id: generateId(),
        organizationId: input.organizationId || "default",
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role === "super_admin" ? "super_admin" as const : 
              input.role === "admin" ? "organization_admin" as const : "member" as const,
        ministries: input.ministries,
        invitedBy: ctx.user.id,
        invitedByName: ctx.user.name,
        status: "pending" as const,
        token: generateSecureToken(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      await persistentDb.invitations.create(invitation);

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "user_invited",
        details: `Invited ${input.name} (${input.email}) to join`,
        createdAt: new Date().toISOString(),
      });

      console.log("Invitation created:", invitation.id);

      return { success: true, invitation };
    }),

  getInvitations: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "accepted", "expired"]).optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Admin: Fetching invitations");

      let invitations = input?.organizationId
        ? await persistentDb.invitations.findByOrganization(input.organizationId)
        : await persistentDb.invitations.getAll();

      if (input?.status) {
        invitations = invitations.filter((i) => i.status === input.status);
      }

      const ministries = await persistentDb.ministries.getAll();

      return invitations
        .map((invitation) => ({
          ...invitation,
          ministryNames: invitation.ministries
            .map((mId) => ministries.find((m) => m.id === mId)?.name)
            .filter(Boolean),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  cancelInvitation: adminProcedure
    .input(z.object({ invitationId: z.string(), organizationId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Admin: Canceling invitation:", input.invitationId);

      const invitations = await persistentDb.invitations.getAll();
      const invitation = invitations.find((i) => i.id === input.invitationId);
      
      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending invitations can be canceled",
        });
      }

      await persistentDb.activityLogs.create({
        id: generateId(),
        organizationId: input.organizationId || "default",
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "invitation_canceled",
        details: `Canceled invitation for ${invitation.email}`,
        createdAt: new Date().toISOString(),
      });

      console.log("Invitation canceled:", input.invitationId);

      return { success: true };
    }),

  resendInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Admin: Resending invitation:", input.invitationId);

      const invitations = await persistentDb.invitations.getAll();
      const invitation = invitations.find((i) => i.id === input.invitationId);
      
      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await persistentDb.invitations.update(input.invitationId, {
        token: generateSecureToken(),
        expiresAt: expiresAt.toISOString(),
        status: "pending",
      });

      console.log("Invitation resent:", input.invitationId);

      return { success: true };
    }),

  getMinistryJoinRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Admin: Fetching ministry join requests");

      let requests = input?.organizationId
        ? await persistentDb.workflowRequests.findByOrganization(input.organizationId)
        : await persistentDb.workflowRequests.getAll();

      requests = requests.filter((r) => r.type === "join_ministry");

      if (input?.status) {
        requests = requests.filter((r) => r.status === input.status);
      }

      const ministries = await persistentDb.ministries.getAll();

      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const requester = await persistentDb.users.findById(request.requesterId);
          const ministry = request.targetId ? ministries.find((m) => m.id === request.targetId) : null;
          const reviewer = request.reviewerId ? await persistentDb.users.findById(request.reviewerId) : null;

          return {
            ...request,
            requesterName: requester?.name || "Unknown",
            requesterEmail: requester?.email || "Unknown",
            requesterAvatar: requester?.avatar,
            ministryName: ministry?.name || (request.data as { ministryName?: string })?.ministryName || "Unknown",
            ministryColor: ministry?.color,
            reviewerName: reviewer?.name,
          };
        })
      );

      return enrichedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),
});
