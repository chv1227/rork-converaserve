import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import type { Poll, PollOption } from "@/types";

const createPollSchema = z.object({
  ministryId: z.string(),
  organizationId: z.string(),
  question: z.string().min(5),
  options: z.array(z.string().min(1)).min(2).max(10),
  endsAt: z.string().optional(),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
});

const votePollSchema = z.object({
  pollId: z.string(),
  optionIds: z.array(z.string()).min(1),
});

export const pollsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ ministryId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching polls for ministry:", input.ministryId);
      const polls = await persistentDb.polls.findByMinistry(input.ministryId);
      return polls.sort((a: Poll, b: Poll) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const poll = await persistentDb.polls.findById(input.id);
      if (!poll) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll not found",
        });
      }
      return poll;
    }),

  create: protectedProcedure
    .input(createPollSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating new poll:", input.question);

      const options: PollOption[] = input.options.map((text) => ({
        id: generateId(),
        text,
        votes: 0,
        voterIds: [],
      }));

      const newPoll: Poll = {
        id: generateId(),
        ministryId: input.ministryId,
        organizationId: input.organizationId,
        question: input.question,
        options,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdByAvatar: ctx.user.avatar,
        createdAt: new Date().toISOString(),
        endsAt: input.endsAt,
        isActive: true,
        allowMultiple: input.allowMultiple,
        isAnonymous: input.isAnonymous,
        totalVotes: 0,
      };

      const created = await persistentDb.polls.create(newPoll);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create poll",
        });
      }

      console.log("Poll created:", newPoll.id);
      return newPoll;
    }),

  vote: protectedProcedure
    .input(votePollSchema)
    .mutation(async ({ ctx, input }) => {
      const poll = await persistentDb.polls.findById(input.pollId);
      if (!poll) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll not found",
        });
      }

      if (!poll.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This poll is no longer active",
        });
      }

      if (poll.endsAt && new Date(poll.endsAt) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This poll has ended",
        });
      }

      const hasVoted = poll.options.some((opt: PollOption) => opt.voterIds.includes(ctx.user.id));
      if (hasVoted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already voted in this poll",
        });
      }

      if (!poll.allowMultiple && input.optionIds.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This poll only allows selecting one option",
        });
      }

      const updatedOptions = poll.options.map((opt: PollOption) => {
        if (input.optionIds.includes(opt.id)) {
          return {
            ...opt,
            votes: opt.votes + 1,
            voterIds: [...opt.voterIds, ctx.user.id],
          };
        }
        return opt;
      });

      const totalVotes = updatedOptions.reduce((sum: number, opt: PollOption) => sum + opt.votes, 0);

      await persistentDb.polls.update(input.pollId, {
        options: updatedOptions,
        totalVotes,
      });

      console.log("Vote recorded for poll:", input.pollId);

      return {
        success: true,
        poll: {
          ...poll,
          options: updatedOptions,
          totalVotes,
        },
      };
    }),

  close: protectedProcedure
    .input(z.object({ pollId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const poll = await persistentDb.polls.findById(input.pollId);
      if (!poll) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll not found",
        });
      }

      if (poll.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the poll creator can close this poll",
        });
      }

      await persistentDb.polls.update(input.pollId, { isActive: false });

      console.log("Poll closed:", input.pollId);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ pollId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const poll = await persistentDb.polls.findById(input.pollId);
      if (!poll) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll not found",
        });
      }

      if (poll.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the poll creator can delete this poll",
        });
      }

      await persistentDb.polls.delete(input.pollId);

      console.log("Poll deleted:", input.pollId);

      return { success: true };
    }),
});
