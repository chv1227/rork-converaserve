import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";

const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  date: z.string(),
  time: z.string(),
  location: z.string(),
  ministryId: z.string(),
  organizationId: z.string().optional(),
});

const updateEventSchema = z.object({
  id: z.string(),
  title: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  ministryId: z.string().optional(),
});

export const eventsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        ministryId: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        organizationId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      console.log("Fetching events with filters:", input);
      
      let events = input?.organizationId 
        ? await persistentDb.events.findByOrganization(input.organizationId)
        : await persistentDb.events.getAll();

      if (input?.ministryId) {
        events = events.filter((e) => e.ministryId === input.ministryId);
      }

      if (input?.fromDate) {
        events = events.filter((e) => e.date >= input.fromDate!);
      }

      if (input?.toDate) {
        events = events.filter((e) => e.date <= input.toDate!);
      }

      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const event = await persistentDb.events.findById(input.id);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }
      return event;
    }),

  getUpcoming: publicProcedure
    .input(z.object({ limit: z.number().optional(), organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const today = new Date().toISOString().split("T")[0];
      
      let events = input?.organizationId
        ? await persistentDb.events.findByOrganization(input.organizationId)
        : await persistentDb.events.getAll();

      const upcoming = events
        .filter((e) => e.date >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return input?.limit ? upcoming.slice(0, input.limit) : upcoming;
    }),

  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating new event:", input.title);

      const ministry = await persistentDb.ministries.findById(input.ministryId);
      if (!ministry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ministry not found",
        });
      }

      const orgId = input.organizationId || ministry.organizationId;
      const isAdminOrLeader = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "leader";

      if (!isAdminOrLeader) {
        await persistentDb.workflowRequests.create({
          id: generateId(),
          organizationId: orgId,
          type: "create_event",
          requesterId: ctx.user.id,
          data: { ...input, ministryName: ministry.name },
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return { success: true, pending: true, message: "Event submitted for approval" };
      }

      const newEvent = {
        id: generateId(),
        organizationId: orgId,
        title: input.title,
        description: input.description,
        date: input.date,
        time: input.time,
        location: input.location,
        ministryId: input.ministryId,
        ministryName: ministry.name,
        color: ministry.color,
        attendees: 0,
      };

      const created = await persistentDb.events.create(newEvent);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event",
        });
      }

      console.log("Event created:", newEvent.id);

      return { success: true, pending: false, event: newEvent };
    }),

  update: adminProcedure
    .input(updateEventSchema)
    .mutation(async ({ input }) => {
      const event = await persistentDb.events.findById(input.id);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.title) updates.title = input.title;
      if (input.description) updates.description = input.description;
      if (input.date) updates.date = input.date;
      if (input.time) updates.time = input.time;
      if (input.location) updates.location = input.location;
      
      if (input.ministryId) {
        const ministry = await persistentDb.ministries.findById(input.ministryId);
        if (ministry) {
          updates.ministryId = input.ministryId;
          updates.ministryName = ministry.name;
          updates.color = ministry.color;
        }
      }

      const updated = await persistentDb.events.update(input.id, updates);
      console.log("Event updated:", input.id);

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const event = await persistentDb.events.findById(input.id);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await persistentDb.events.delete(input.id);
      console.log("Event deleted:", input.id);

      return { success: true };
    }),

  rsvp: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await persistentDb.events.findById(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await persistentDb.events.update(input.eventId, { attendees: event.attendees + 1 });
      console.log("RSVP added for event:", input.eventId, "by user:", ctx.user.name);

      return { success: true, attendees: event.attendees + 1 };
    }),
});
