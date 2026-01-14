import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";

export const messagesRouter = createTRPCRouter({
  getConversations: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      console.log("Fetching conversations for user:", ctx.user.id);
      const userMinistries = ctx.user.ministries;
      
      let conversations = input?.organizationId
        ? await persistentDb.conversations.findByOrganization(input.organizationId)
        : await persistentDb.conversations.getAll();
      
      const ministryConversations = conversations.filter(
        (c) => c.ministryId && userMinistries.includes(c.ministryId)
      );
      
      console.log("Found ministry conversations:", ministryConversations.length);
      return ministryConversations;
    }),

  getMinistryConversation: protectedProcedure
    .input(z.object({ ministryId: z.string(), organizationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching ministry conversation:", input.ministryId);
      
      if (!ctx.user.ministries.includes(input.ministryId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this ministry",
        });
      }

      const conversations = input.organizationId
        ? await persistentDb.conversations.findByOrganization(input.organizationId)
        : await persistentDb.conversations.getAll();
      
      let conversation = conversations.find((c) => c.ministryId === input.ministryId);

      if (!conversation) {
        const ministry = await persistentDb.ministries.findById(input.ministryId);
        if (!ministry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ministry not found",
          });
        }

        const newConversation = {
          id: `c-${input.ministryId}`,
          organizationId: input.organizationId || ministry.organizationId,
          name: ministry.name,
          avatar: ministry.image,
          lastMessage: "",
          lastMessageTime: "Just now",
          unreadCount: 0,
          isGroup: true,
          members: [],
          ministryId: ministry.id,
          ministryColor: ministry.color,
        };
        
        await persistentDb.conversations.create(newConversation);
        conversation = newConversation;
      }

      return conversation;
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      const conversation = await persistentDb.conversations.findById(input.conversationId);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
      return conversation;
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching messages for conversation:", input.conversationId);
      
      const conversation = await persistentDb.conversations.findById(input.conversationId);
      if (conversation?.ministryId && !ctx.user.ministries.includes(conversation.ministryId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this ministry",
        });
      }

      const messages = await persistentDb.messages.findByConversation(input.conversationId);
      return messages;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Sending message to conversation:", input.conversationId);

      const conversation = await persistentDb.conversations.findById(input.conversationId);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.ministryId && !ctx.user.ministries.includes(conversation.ministryId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this ministry",
        });
      }

      const newMessage = {
        id: `${input.conversationId}-${generateId()}`,
        conversationId: input.conversationId,
        content: input.content,
        senderId: ctx.user.id,
        senderName: ctx.user.name,
        senderAvatar: ctx.user.avatar,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      await persistentDb.messages.create(newMessage);
      
      await persistentDb.conversations.update(input.conversationId, {
        lastMessage: input.content,
        lastMessageTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      console.log("Message sent:", newMessage.id);

      return newMessage;
    }),

  markConversationRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input }) => {
      await persistentDb.conversations.update(input.conversationId, { unreadCount: 0 });
      console.log("Conversation marked as read:", input.conversationId);

      return { success: true };
    }),

  getTotalUnread: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const conversations = input?.organizationId
        ? await persistentDb.conversations.findByOrganization(input.organizationId)
        : await persistentDb.conversations.getAll();
      
      return conversations.reduce((total, c) => total + c.unreadCount, 0);
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        isGroup: z.boolean().default(false),
        memberIds: z.array(z.string()).optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating conversation:", input.name);

      const newConversation = {
        id: generateId(),
        organizationId: input.organizationId || "default",
        name: input.name,
        avatar: input.isGroup
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff`
          : ctx.user.avatar,
        lastMessage: "",
        lastMessageTime: "Just now",
        unreadCount: 0,
        isGroup: input.isGroup,
        members: input.isGroup ? [ctx.user.name] : undefined,
      };

      await persistentDb.conversations.create(newConversation);
      console.log("Conversation created:", newConversation.id);

      return newConversation;
    }),
});
