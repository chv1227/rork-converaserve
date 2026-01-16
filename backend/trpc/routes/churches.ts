import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { Church, ChurchSettings, ChurchMembership, ChurchRole } from "@/types";

const socialLinksSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
}).optional();

const createChurchSchema = z.object({
  name: z.string().min(2, "Church name must be at least 2 characters"),
  denomination: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(3, "ZIP code is required"),
  country: z.string().min(2, "Country is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  website: z.string().url().optional().or(z.literal("")),
  logo: z.string().url().optional().or(z.literal("")),
  bannerImage: z.string().url().optional().or(z.literal("")),
  socialLinks: socialLinksSchema,
});

const updateChurchSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  denomination: z.string().optional(),
  description: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  zip: z.string().min(3).optional(),
  country: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo: z.string().url().optional().or(z.literal("")),
  bannerImage: z.string().url().optional().or(z.literal("")),
  socialLinks: socialLinksSchema,
});

const updateSettingsSchema = z.object({
  churchId: z.string(),
  visibility: z.enum(["public", "private"]).optional(),
  modulesEnabled: z.object({
    events: z.boolean(),
    announcements: z.boolean(),
    donations: z.boolean(),
    media: z.boolean(),
    ministries: z.boolean(),
    messaging: z.boolean(),
  }).optional(),
  notificationPreferences: z.object({
    newMembers: z.boolean(),
    events: z.boolean(),
    announcements: z.boolean(),
    donations: z.boolean(),
  }).optional(),
});

export const churchesRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    console.log("Churches: Fetching all public churches");
    const churches = await persistentDb.churches.getAll();
    const publicChurches: Church[] = [];
    
    for (const church of churches) {
      const settings = await persistentDb.churchSettings.findByChurchId(church.id);
      if (!settings || settings.visibility === "public") {
        publicChurches.push(church);
      }
    }
    
    return publicChurches;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("Churches: Fetching church by ID:", input.id);
      const church = await persistentDb.churches.findById(input.id);
      if (!church) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Church not found",
        });
      }
      return church;
    }),

  create: protectedProcedure
    .input(createChurchSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Creating new church:", input.name);

      const existingChurches = await persistentDb.churches.getAll();
      const duplicate = existingChurches.find(
        (c) => c.name.toLowerCase() === input.name.toLowerCase() &&
               c.city.toLowerCase() === input.city.toLowerCase() &&
               c.state.toLowerCase() === input.state.toLowerCase()
      );

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A church with this name already exists in this location",
        });
      }

      const churchId = generateId();
      const now = new Date().toISOString();

      const newChurch: Church = {
        id: churchId,
        name: input.name.trim(),
        denomination: input.denomination?.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        zip: input.zip.trim(),
        country: input.country.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        website: input.website?.trim() || undefined,
        logo: input.logo?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=1A7B74&color=fff&size=200`,
        bannerImage: input.bannerImage?.trim() || undefined,
        socialLinks: input.socialLinks || undefined,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      };

      const createdChurch = await persistentDb.churches.create(newChurch);
      if (!createdChurch) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create church",
        });
      }

      const settingsId = generateId();
      const defaultSettings: ChurchSettings = {
        id: settingsId,
        churchId: churchId,
        visibility: "public",
        modulesEnabled: {
          events: true,
          announcements: true,
          donations: true,
          media: true,
          ministries: true,
          messaging: true,
        },
        notificationPreferences: {
          newMembers: true,
          events: true,
          announcements: true,
          donations: true,
        },
        updatedAt: now,
      };

      await persistentDb.churchSettings.create(defaultSettings);

      const membershipId = generateId();
      const membership: ChurchMembership = {
        id: membershipId,
        churchId: churchId,
        userId: ctx.user.id,
        role: "super_admin" as ChurchRole,
        joinedAt: now,
        isActive: true,
      };

      const createdMembership = await persistentDb.churchMemberships.create(membership);
      if (!createdMembership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create membership",
        });
      }

      console.log("Churches: Church created successfully:", churchId);

      return { 
        church: newChurch, 
        membership,
        settings: defaultSettings,
      };
    }),

  update: protectedProcedure
    .input(updateChurchSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Updating church:", input.id);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.id);

      if (!membership || !["super_admin", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this church",
        });
      }

      const church = await persistentDb.churches.findById(input.id);
      if (!church) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Church not found",
        });
      }

      const updates: Partial<Church> = {
        updatedAt: new Date().toISOString(),
      };

      if (input.name) updates.name = input.name.trim();
      if (input.denomination !== undefined) updates.denomination = input.denomination?.trim();
      if (input.description) updates.description = input.description.trim();
      if (input.address) updates.address = input.address.trim();
      if (input.city) updates.city = input.city.trim();
      if (input.state) updates.state = input.state.trim();
      if (input.zip) updates.zip = input.zip.trim();
      if (input.country) updates.country = input.country.trim();
      if (input.email) updates.email = input.email.trim().toLowerCase();
      if (input.phone) updates.phone = input.phone.trim();
      if (input.website !== undefined) updates.website = input.website?.trim() || undefined;
      if (input.logo !== undefined) updates.logo = input.logo?.trim() || undefined;
      if (input.bannerImage !== undefined) updates.bannerImage = input.bannerImage?.trim() || undefined;
      if (input.socialLinks !== undefined) updates.socialLinks = input.socialLinks || undefined;

      const updatedChurch = await persistentDb.churches.update(input.id, updates);
      console.log("Churches: Church updated:", input.id);

      return updatedChurch;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Deleting church:", input.id);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.id);

      if (!membership || membership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can delete churches",
        });
      }

      await persistentDb.churches.delete(input.id);
      console.log("Churches: Church deleted:", input.id);

      return { success: true };
    }),

  getUserChurches: protectedProcedure.query(async ({ ctx }) => {
    console.log("Churches: Fetching churches for user:", ctx.user.id);
    const memberships = await persistentDb.churchMemberships.findByUser(ctx.user.id);
    const activeMemberships = memberships.filter(m => m.isActive);
    
    const churches = await Promise.all(
      activeMemberships.map(async (membership) => {
        const church = await persistentDb.churches.findById(membership.churchId);
        if (!church) return null;
        return {
          ...church,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return churches.filter(Boolean);
  }),

  getSettings: protectedProcedure
    .input(z.object({ churchId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Churches: Fetching settings for church:", input.churchId);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!membership || !["super_admin", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view church settings",
        });
      }

      const settings = await persistentDb.churchSettings.findByChurchId(input.churchId);
      
      if (!settings) {
        const settingsId = generateId();
        const defaultSettings: ChurchSettings = {
          id: settingsId,
          churchId: input.churchId,
          visibility: "public",
          modulesEnabled: {
            events: true,
            announcements: true,
            donations: true,
            media: true,
            ministries: true,
            messaging: true,
          },
          notificationPreferences: {
            newMembers: true,
            events: true,
            announcements: true,
            donations: true,
          },
          updatedAt: new Date().toISOString(),
        };
        await persistentDb.churchSettings.create(defaultSettings);
        return defaultSettings;
      }

      return settings;
    }),

  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Updating settings for church:", input.churchId);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!membership || !["super_admin", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update church settings",
        });
      }

      let settings = await persistentDb.churchSettings.findByChurchId(input.churchId);

      if (!settings) {
        const settingsId = generateId();
        settings = {
          id: settingsId,
          churchId: input.churchId,
          visibility: input.visibility || "public",
          modulesEnabled: input.modulesEnabled || {
            events: true,
            announcements: true,
            donations: true,
            media: true,
            ministries: true,
            messaging: true,
          },
          notificationPreferences: input.notificationPreferences || {
            newMembers: true,
            events: true,
            announcements: true,
            donations: true,
          },
          updatedAt: new Date().toISOString(),
        };
        await persistentDb.churchSettings.create(settings);
        return settings;
      }

      const updates: Partial<ChurchSettings> = {
        updatedAt: new Date().toISOString(),
      };

      if (input.visibility) updates.visibility = input.visibility;
      if (input.modulesEnabled) updates.modulesEnabled = input.modulesEnabled;
      if (input.notificationPreferences) updates.notificationPreferences = input.notificationPreferences;

      const updatedSettings = await persistentDb.churchSettings.update(settings.id, updates);
      console.log("Churches: Settings updated for church:", input.churchId);

      return updatedSettings;
    }),

  getMembers: protectedProcedure
    .input(z.object({ churchId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Churches: Fetching members for church:", input.churchId);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!membership || !membership.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this church",
        });
      }

      const churchMemberships = await persistentDb.churchMemberships.findByChurch(input.churchId);
      const activeMemberships = churchMemberships.filter(m => m.isActive);

      const members = await Promise.all(
        activeMemberships.map(async (m) => {
          const user = await persistentDb.users.findById(m.userId);
          return {
            id: m.id,
            userId: m.userId,
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

  getMembership: protectedProcedure
    .input(z.object({ churchId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!membership || !membership.isActive) {
        return null;
      }

      const church = await persistentDb.churches.findById(input.churchId);

      return {
        ...membership,
        church,
      };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({
      membershipId: z.string(),
      churchId: z.string(),
      role: z.enum(["super_admin", "admin", "staff", "member"]),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Updating member role:", input.membershipId);

      const ctxMembership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!ctxMembership || ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can change member roles",
        });
      }

      const targetMembership = await persistentDb.churchMemberships.findById(input.membershipId);

      if (!targetMembership || targetMembership.churchId !== input.churchId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      await persistentDb.churchMemberships.update(input.membershipId, { role: input.role });

      console.log("Churches: Member role updated:", input.membershipId, "to", input.role);

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ membershipId: z.string(), churchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: Removing member:", input.membershipId);

      const ctxMembership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!ctxMembership || !["super_admin", "admin"].includes(ctxMembership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove members",
        });
      }

      const targetMembership = await persistentDb.churchMemberships.findById(input.membershipId);

      if (!targetMembership || targetMembership.churchId !== input.churchId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      if (targetMembership.role === "super_admin" && ctxMembership.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can remove other super admins",
        });
      }

      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself. Use leave church instead.",
        });
      }

      await persistentDb.churchMemberships.update(input.membershipId, { isActive: false });

      console.log("Churches: Member removed:", input.membershipId);

      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ churchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: User leaving church:", input.churchId);

      const membership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (!membership || !membership.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this church",
        });
      }

      const churchMemberships = await persistentDb.churchMemberships.findByChurch(input.churchId);
      const superAdminCount = churchMemberships.filter(
        (m) => m.role === "super_admin" && m.isActive
      ).length;

      if (membership.role === "super_admin" && superAdminCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are the only super admin. Please promote another member before leaving.",
        });
      }

      await persistentDb.churchMemberships.update(membership.id, { isActive: false });

      console.log("Churches: User left church:", input.churchId);

      return { success: true };
    }),

  requestJoin: protectedProcedure
    .input(z.object({ churchId: z.string(), message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Churches: User requesting to join church:", input.churchId);

      const church = await persistentDb.churches.findById(input.churchId);
      if (!church) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Church not found",
        });
      }

      const existingMembership = await persistentDb.churchMemberships.findByUserAndChurch(ctx.user.id, input.churchId);

      if (existingMembership && existingMembership.isActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this church",
        });
      }

      const membershipId = generateId();
      const membership: ChurchMembership = {
        id: membershipId,
        churchId: input.churchId,
        userId: ctx.user.id,
        role: "member",
        joinedAt: new Date().toISOString(),
        isActive: true,
      };

      await persistentDb.churchMemberships.create(membership);

      console.log("Churches: User joined church:", input.churchId);

      return { success: true, message: "You have joined the church" };
    }),
});
