import * as z from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { ConversationType } from "@/types";
import { Notification } from "@/backend/db/index";

export const messagesRouter = createTRPCRouter({
  getConversations: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      console.log("Fetching conversations for user:", ctx.user.id);
      const userMinistries = ctx.user.ministries;
      
      let conversations = input?.organizationId
        ? await persistentDb.conversations.findByOrganization(input.organizationId)
        : await persistentDb.conversations.getAll();
      
      const userConversations = conversations.filter((c) => {
        if (c.ministryId && userMinistries.includes(c.ministryId)) {
          return true;
        }
        if (c.participantIds && c.participantIds.includes(ctx.user.id)) {
          return true;
        }
        if (c.type === 'direct' && c.memberIds?.includes(ctx.user.id)) {
          return true;
        }
        return false;
      });
      
      const sorted = userConversations.sort((a, b) => {
        const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
        const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      console.log("Found user conversations:", sorted.length);
      return sorted;
    }),

  getAllUserConversations: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching all conversations for user:", ctx.user.id);
      
      const conversations = await persistentDb.conversations.findByOrganization(input.organizationId);
      
      const userConversations = conversations.filter((c) => {
        if (c.isArchived) return false;
        if (c.ministryId && ctx.user.ministries.includes(c.ministryId)) {
          return true;
        }
        if (c.participantIds && c.participantIds.includes(ctx.user.id)) {
          return true;
        }
        if (c.memberIds?.includes(ctx.user.id)) {
          return true;
        }
        return false;
      });
      
      // For direct messages, resolve the correct name and avatar for the other participant
      const users = await persistentDb.users.getAll();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const processedConversations = await Promise.all(
        userConversations.map(async (c) => {
          if (c.type === 'direct') {
            const participants = c.participantIds || c.memberIds || [];
            const otherUserId = participants.find((id: string) => id !== ctx.user.id);
            
            if (otherUserId) {
              const otherUser = userMap.get(otherUserId);
              if (otherUser) {
                return {
                  ...c,
                  name: otherUser.name,
                  avatar: otherUser.avatar,
                };
              }
            }
          }
          return c;
        })
      );
      
      const sorted = processedConversations.sort((a, b) => {
        const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
        const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      return sorted;
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
          lastMessageTimestamp: new Date().toISOString(),
          unreadCount: 0,
          isGroup: true,
          type: "ministry" as ConversationType,
          members: [],
          participantIds: [],
          ministryId: ministry.id,
          ministryColor: ministry.color,
          createdAt: new Date().toISOString(),
        };
        
        await persistentDb.conversations.create(newConversation);
        conversation = newConversation;
      }

      return conversation;
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await persistentDb.conversations.findById(input.conversationId);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
      
      const hasAccess = 
        (conversation.ministryId && ctx.user.ministries.includes(conversation.ministryId)) ||
        (conversation.participantIds && conversation.participantIds.includes(ctx.user.id)) ||
        (conversation.memberIds && conversation.memberIds.includes(ctx.user.id));
      
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this conversation",
        });
      }
      
      // For direct messages, resolve the correct name and avatar for the other participant
      if (conversation.type === 'direct') {
        const participants = conversation.participantIds || conversation.memberIds || [];
        const otherUserId = participants.find((id: string) => id !== ctx.user.id);
        
        if (otherUserId) {
          const otherUser = await persistentDb.users.findById(otherUserId);
          if (otherUser) {
            return {
              ...conversation,
              name: otherUser.name,
              avatar: otherUser.avatar,
            };
          }
        }
      }
      
      return conversation;
    }),

  getMessages: protectedProcedure
    .input(z.object({ 
      conversationId: z.string(),
      limit: z.number().optional().default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching messages for conversation:", input.conversationId);
      
      const conversation = await persistentDb.conversations.findById(input.conversationId);
      
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
      
      const hasAccess = 
        (conversation.ministryId && ctx.user.ministries.includes(conversation.ministryId)) ||
        (conversation.participantIds && conversation.participantIds.includes(ctx.user.id)) ||
        (conversation.memberIds && conversation.memberIds.includes(ctx.user.id));
      
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this conversation",
        });
      }

      const messages = await persistentDb.messages.findByConversation(input.conversationId);
      
      const sorted = messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return sorted;
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

      const hasAccess = 
        (conversation.ministryId && ctx.user.ministries.includes(conversation.ministryId)) ||
        (conversation.participantIds && conversation.participantIds.includes(ctx.user.id)) ||
        (conversation.memberIds && conversation.memberIds.includes(ctx.user.id));
      
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this conversation",
        });
      }

      const now = new Date();
      const newMessage = {
        id: `msg-${generateId()}`,
        conversationId: input.conversationId,
        content: input.content,
        senderId: ctx.user.id,
        senderName: ctx.user.name,
        senderAvatar: ctx.user.avatar,
        timestamp: now.toISOString(),
        isRead: false,
        readBy: [ctx.user.id],
        messageType: "text" as const,
      };

      await persistentDb.messages.create(newMessage);
      
      await persistentDb.conversations.update(input.conversationId, {
        lastMessage: input.content,
        lastMessageTime: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        lastMessageTimestamp: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const recipientIds = (conversation.participantIds || conversation.memberIds || [])
        .filter((id: string) => id !== ctx.user.id);
      
      for (const recipientId of recipientIds) {
        const notification: Notification = {
          id: `notif-${generateId()}`,
          userId: recipientId,
          organizationId: conversation.organizationId,
          title: conversation.isGroup ? conversation.name : ctx.user.name,
          message: input.content.length > 50 ? `${input.content.substring(0, 50)}...` : input.content,
          type: "info",
          isRead: false,
          actionUrl: `/chat/${input.conversationId}`,
          createdAt: now.toISOString(),
        };
        await persistentDb.notifications.create(notification);
      }

      console.log("Message sent:", newMessage.id);

      return newMessage;
    }),

  markConversationRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const messages = await persistentDb.messages.findByConversation(input.conversationId);
      
      for (const message of messages) {
        if (!message.readBy?.includes(ctx.user.id)) {
          await persistentDb.messages.update(message.id, {
            readBy: [...(message.readBy || []), ctx.user.id],
            isRead: true,
          });
        }
      }
      
      await persistentDb.conversations.update(input.conversationId, { unreadCount: 0 });
      console.log("Conversation marked as read:", input.conversationId);

      return { success: true };
    }),

  getTotalUnread: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conversations = input?.organizationId
        ? await persistentDb.conversations.findByOrganization(input.organizationId)
        : await persistentDb.conversations.getAll();
      
      const userConversations = conversations.filter((c) => {
        if (c.ministryId && ctx.user.ministries.includes(c.ministryId)) return true;
        if (c.participantIds && c.participantIds.includes(ctx.user.id)) return true;
        if (c.memberIds?.includes(ctx.user.id)) return true;
        return false;
      });
      
      return userConversations.reduce((total, c) => total + (c.unreadCount || 0), 0);
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        isGroup: z.boolean().default(false),
        memberIds: z.array(z.string()).optional(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating conversation:", input.name);

      const now = new Date();
      const newConversation = {
        id: generateId(),
        organizationId: input.organizationId,
        name: input.name,
        avatar: input.isGroup
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff`
          : ctx.user.avatar,
        lastMessage: "",
        lastMessageTime: "Just now",
        lastMessageTimestamp: now.toISOString(),
        unreadCount: 0,
        isGroup: input.isGroup,
        type: (input.isGroup ? "group" : "direct") as ConversationType,
        members: input.isGroup ? [ctx.user.name] : undefined,
        memberIds: input.memberIds ? [...input.memberIds, ctx.user.id] : [ctx.user.id],
        participantIds: input.memberIds ? [...input.memberIds, ctx.user.id] : [ctx.user.id],
        createdBy: ctx.user.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await persistentDb.conversations.create(newConversation);
      console.log("Conversation created:", newConversation.id);

      return newConversation;
    }),

  findOrCreateDirectConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        recipientName: z.string(),
        recipientAvatar: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Finding or creating DM with:", input.recipientId);

      const conversations = await persistentDb.conversations.findByOrganization(input.organizationId);
      
      const existingConversation = conversations.find((c) => {
        if (c.type !== 'direct') return false;
        const participants = c.participantIds || c.memberIds || [];
        return participants.includes(ctx.user.id) && participants.includes(input.recipientId);
      });

      if (existingConversation) {
        console.log("Found existing DM:", existingConversation.id);
        return existingConversation;
      }

      const now = new Date();
      const newConversation = {
        id: `dm-${generateId()}`,
        organizationId: input.organizationId,
        name: input.recipientName,
        avatar: input.recipientAvatar,
        lastMessage: "",
        lastMessageTime: "Just now",
        lastMessageTimestamp: now.toISOString(),
        unreadCount: 0,
        isGroup: false,
        type: "direct" as ConversationType,
        memberIds: [ctx.user.id, input.recipientId],
        participantIds: [ctx.user.id, input.recipientId],
        createdBy: ctx.user.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await persistentDb.conversations.create(newConversation);
      console.log("Created new DM:", newConversation.id);

      return newConversation;
    }),

  getOrganizationMembers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Fetching organization members for messaging:", input.organizationId);
      
      const users = await persistentDb.users.findByOrganization(input.organizationId);
      
      const filteredUsers = users
        .filter((u) => u.id !== ctx.user.id && u.isActive)
        .map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          email: u.email,
        }));
      
      return filteredUsers;
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await persistentDb.conversations.findById(input.conversationId);
      
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.createdBy !== ctx.user.id && conversation.type !== 'direct') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the creator can delete this conversation",
        });
      }

      await persistentDb.conversations.update(input.conversationId, {
        isArchived: true,
      });

      console.log("Conversation archived:", input.conversationId);
      return { success: true };
    }),

  createGroupConversation: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        memberIds: z.array(z.string()).min(1),
        organizationId: z.string(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating group conversation:", input.name);

      const allMemberIds = [...new Set([...input.memberIds, ctx.user.id])];
      
      const users = await persistentDb.users.getAll();
      const memberNames = users
        .filter((u) => allMemberIds.includes(u.id))
        .map((u) => u.name);

      const now = new Date();
      const newConversation = {
        id: `group-${generateId()}`,
        organizationId: input.organizationId,
        name: input.name,
        avatar: input.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0F766E&color=fff`,
        lastMessage: "",
        lastMessageTime: "Just now",
        lastMessageTimestamp: now.toISOString(),
        unreadCount: 0,
        isGroup: true,
        type: "group" as ConversationType,
        members: memberNames,
        memberIds: allMemberIds,
        participantIds: allMemberIds,
        createdBy: ctx.user.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await persistentDb.conversations.create(newConversation);
      console.log("Group conversation created:", newConversation.id);

      return newConversation;
    }),
});
