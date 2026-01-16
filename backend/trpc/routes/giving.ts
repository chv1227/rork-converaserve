import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { TRPCError } from "@trpc/server";
import { Donation, RecurringGiving, GivingStats, GivingType, GivingFrequency } from "@/types";

export const givingRouter = createTRPCRouter({
  createDonation: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        type: z.enum(["tithe", "offering"]),
        amount: z.number().positive(),
        currency: z.string().default("USD"),
        frequency: z.enum(["one_time", "weekly", "bi_weekly", "monthly"]),
        note: z.string().optional(),
        paymentMethod: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating donation for user:", ctx.user.id);

      const now = new Date().toISOString();
      const donationId = generateId();

      const donation: Donation = {
        id: donationId,
        userId: ctx.user.id,
        organizationId: input.organizationId,
        type: input.type as GivingType,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency as GivingFrequency,
        note: input.note,
        status: "completed",
        paymentMethod: input.paymentMethod || "card",
        transactionId: `txn_${generateId()}`,
        createdAt: now,
        updatedAt: now,
      };

      const result = await persistentDb.donations.create(donation);

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create donation",
        });
      }

      if (input.frequency !== "one_time") {
        const recurringId = generateId();
        const nextDate = calculateNextDate(input.frequency as GivingFrequency);

        const recurring: RecurringGiving = {
          id: recurringId,
          userId: ctx.user.id,
          organizationId: input.organizationId,
          type: input.type as GivingType,
          amount: input.amount,
          currency: input.currency,
          frequency: input.frequency as GivingFrequency,
          note: input.note,
          isActive: true,
          nextDate: nextDate,
          lastProcessedDate: now,
          createdAt: now,
          updatedAt: now,
        };

        await persistentDb.recurringGiving.create(recurring);
        console.log("Created recurring giving:", recurringId);
      }

      console.log("Donation created successfully:", donationId);
      return { success: true, donation: result };
    }),

  getDonationHistory: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log("Getting donation history for user:", ctx.user.id);

      const donations = await persistentDb.donations.findByUserAndOrg(
        ctx.user.id,
        input.organizationId
      );

      const sortedDonations = donations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, input.limit);

      console.log(`Found ${sortedDonations.length} donations`);
      return sortedDonations;
    }),

  getGivingStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log("Getting giving stats for user:", ctx.user.id);

      const donations = await persistentDb.donations.findByUserAndOrg(
        ctx.user.id,
        input.organizationId
      );

      const completedDonations = donations.filter(d => d.status === "completed");

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const stats: GivingStats = {
        totalGiven: completedDonations.reduce((sum, d) => sum + d.amount, 0),
        totalTithes: completedDonations
          .filter(d => d.type === "tithe")
          .reduce((sum, d) => sum + d.amount, 0),
        totalOfferings: completedDonations
          .filter(d => d.type === "offering")
          .reduce((sum, d) => sum + d.amount, 0),
        thisMonthTotal: completedDonations
          .filter(d => new Date(d.createdAt) >= startOfMonth)
          .reduce((sum, d) => sum + d.amount, 0),
        thisYearTotal: completedDonations
          .filter(d => new Date(d.createdAt) >= startOfYear)
          .reduce((sum, d) => sum + d.amount, 0),
        donationCount: completedDonations.length,
      };

      console.log("Giving stats calculated:", stats);
      return stats;
    }),

  getRecurringGiving: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log("Getting recurring giving for user:", ctx.user.id);

      const recurring = await persistentDb.recurringGiving.findByUserAndOrg(
        ctx.user.id,
        input.organizationId
      );

      const activeRecurring = recurring.filter(r => r.isActive);
      console.log(`Found ${activeRecurring.length} active recurring giving`);
      return activeRecurring;
    }),

  cancelRecurringGiving: protectedProcedure
    .input(
      z.object({
        recurringId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Cancelling recurring giving:", input.recurringId);

      const recurring = await persistentDb.recurringGiving.findById(input.recurringId);

      if (!recurring) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring giving not found",
        });
      }

      if (recurring.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own recurring giving",
        });
      }

      const result = await persistentDb.recurringGiving.update(input.recurringId, {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel recurring giving",
        });
      }

      console.log("Recurring giving cancelled successfully");
      return { success: true };
    }),

  updateRecurringGiving: protectedProcedure
    .input(
      z.object({
        recurringId: z.string(),
        amount: z.number().positive().optional(),
        frequency: z.enum(["weekly", "bi_weekly", "monthly"]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Updating recurring giving:", input.recurringId);

      const recurring = await persistentDb.recurringGiving.findById(input.recurringId);

      if (!recurring) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring giving not found",
        });
      }

      if (recurring.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own recurring giving",
        });
      }

      const updates: Partial<RecurringGiving> = {
        updatedAt: new Date().toISOString(),
      };

      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.frequency !== undefined) {
        updates.frequency = input.frequency as GivingFrequency;
        updates.nextDate = calculateNextDate(input.frequency as GivingFrequency);
      }
      if (input.note !== undefined) updates.note = input.note;

      const result = await persistentDb.recurringGiving.update(input.recurringId, updates);

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update recurring giving",
        });
      }

      console.log("Recurring giving updated successfully");
      return { success: true, recurring: result };
    }),
});

function calculateNextDate(frequency: GivingFrequency): string {
  const now = new Date();
  let nextDate = new Date(now);

  switch (frequency) {
    case "weekly":
      nextDate.setDate(now.getDate() + 7);
      break;
    case "bi_weekly":
      nextDate.setDate(now.getDate() + 14);
      break;
    case "monthly":
      nextDate.setMonth(now.getMonth() + 1);
      break;
    default:
      nextDate = now;
  }

  return nextDate.toISOString();
}
