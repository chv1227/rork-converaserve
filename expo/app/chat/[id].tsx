import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, Users, User, MoreVertical, CheckCheck, Check } from "lucide-react-native";
import { LightTheme } from '@/constants/colors';
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Message } from "@/types";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [messageText, setMessageText] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);

  const profileQuery = useQuery({
    queryKey: ['userProfile', currentOrganization?.id, user?.id],
    queryFn: async () => {
      if (!currentOrganization?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('church_id', currentOrganization.id)
        .maybeSingle();
      if (error) {
        console.log('Profile query error:', error.message);
        return null;
      }
      return data as { id: string } | null;
    },
    enabled: !!currentOrganization?.id && !!user?.id,
  });

  const profileId = profileQuery.data?.id;

  const conversationQuery = useQuery({
    queryKey: ['conversation', id],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('conversations')
        .select('*, ministries(color)')
        .eq('id', id)
        .abortSignal(signal)
        .single();
      
      if (error) throw error;
      
      const convData = data as { id: string; name: string; avatar: string | null; type: string; ministries: { color: string | null } | null } | null;
      if (!convData) return null;
      
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('profile_id')
        .eq('conversation_id', id)
        .abortSignal(signal);
      
      const participantIds = (participants || []).map((p: { profile_id: string }) => p.profile_id);
      
      return {
        id: convData.id,
        name: convData.name,
        avatar: convData.avatar,
        type: convData.type,
        isGroup: convData.type !== 'direct',
        unreadCount: 0,
        ministryColor: convData.ministries?.color || null,
        participantIds,
        members: participantIds,
      };
    },
    enabled: !!id,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', id],
    queryFn: async ({ signal }) => {
      if (!id) return [];

      let messagesData: { id: string; conversation_id: string; content: string; sender_id: string; created_at: string; message_type: string; users?: { full_name: string | null; avatar_url: string | null } | null }[] = [];

      const { data: withJoin, error: joinError } = await (supabase as any)
        .from('messages')
        .select('*, users!sender_id(full_name, avatar_url)')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .abortSignal(signal);

      if (joinError) {
        console.log('Chat: FK join failed, falling back to plain query:', joinError.message);
        const { data: plain, error: plainError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true })
          .abortSignal(signal);
        if (plainError) throw plainError;
        messagesData = (plain || []) as typeof messagesData;
      } else {
        messagesData = (withJoin || []) as typeof messagesData;
      }

      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const sendersMissing = messagesData.some(m => !m.users?.full_name);

      let usersMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (sendersMissing && senderIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', senderIds)
          .abortSignal(signal);
        for (const u of (usersData || []) as { id: string; full_name: string | null; avatar_url: string | null }[]) {
          usersMap.set(u.id, { full_name: u.full_name, avatar_url: u.avatar_url });
        }
      }

      return messagesData.map((m) => {
        const joinedUser = m.users;
        const fallbackUser = usersMap.get(m.sender_id);
        const senderName = joinedUser?.full_name || fallbackUser?.full_name || 'Unknown';
        const senderAvatar = joinedUser?.avatar_url || fallbackUser?.avatar_url || '';
        return {
          id: m.id,
          conversationId: m.conversation_id,
          content: m.content,
          senderId: m.sender_id,
          senderName,
          senderAvatar,
          timestamp: m.created_at,
          isRead: true,
          readBy: [],
          messageType: m.message_type as 'text' | 'image' | 'system',
        };
      }) as Message[];
    },
    enabled: !!id,
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation<void, Error, { conversationId: string; content: string }, { previousMessages: unknown }>({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      if (!user?.id) throw new Error('Not logged in');
      const { error } = await supabase.from('messages').insert({
        conversation_id: data.conversationId,
        content: data.content,
        sender_id: user.id,
        message_type: 'text',
      } as never);
      if (error) throw error;
      
      await supabase.from('conversations').update({
        updated_at: new Date().toISOString(),
      } as never).eq('id', data.conversationId);
    },
    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', id] });
      
      const previousMessages = queryClient.getQueryData(['messages', id]);

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: id || "",
        content,
        senderId: user?.id || "",
        senderName: user?.name || "",
        senderAvatar: user?.avatar || "",
        timestamp: new Date().toISOString(),
        isRead: false,
        readBy: [user?.id || ""],
        messageType: "text",
      };

      queryClient.setQueryData(
        ['messages', id],
        (old: Message[] | undefined) => [...(old || []), optimisticMessage]
      );

      return { previousMessages };
    },
    onSuccess: () => {
      console.log("Message sent successfully");
      setMessageText("");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: Error, _variables, context) => {
      console.error("Failed to send message:", error);
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', id], context.previousMessages);
      }
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (data: { conversationId: string; profileId: string }) => {
      if (!data.profileId) return;
      await supabase.from('conversation_participants').update({
        last_read_at: new Date().toISOString(),
      } as never).eq('conversation_id', data.conversationId).eq('profile_id', data.profileId);
    },
  });

  // Mark conversation as read when entering the chat
  useEffect(() => {
    if (id && profileId) {
      markReadMutation.mutate({ conversationId: id, profileId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profileId]);

  const conversation = conversationQuery.data;
  const messages = useMemo(() => messagesQuery.data || [], [messagesQuery.data]);

  const { refetch: refetchMessages } = messagesQuery;

  const onRefresh = useCallback(() => {
    void refetchMessages();
  }, [refetchMessages]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !id) return;
    sendMessageMutation.mutate({
      conversationId: id,
      content: messageText.trim(),
    });
  }, [messageText, id, sendMessageMutation]);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number }, contentSize: { height: number }, layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 100;
    setIsAtBottom(
      contentOffset.y >= contentSize.height - layoutMeasurement.height - paddingToBottom
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const getMessageStatus = useCallback((message: Message) => {
    if (message.senderId !== user?.id) return null;
    
    const readByOthers = message.readBy?.filter(uid => uid !== user?.id) || [];
    if (readByOthers.length > 0) {
      return "read";
    }
    return "sent";
  }, [user?.id]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showName = !isOwn && conversation?.isGroup && showAvatar;
    const status = getMessageStatus(item);
    const isTemp = item.id.startsWith("temp-");

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <View style={styles.avatarPlaceholder}>
            {showAvatar && (
              <Image source={{ uri: item.senderAvatar }} style={styles.messageAvatar} />
            )}
          </View>
        )}
        <View style={styles.messageContentWrapper}>
          {showName && (
            <Text style={styles.messageSenderName}>{item.senderName}</Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
              { backgroundColor: isOwn ? (conversation?.ministryColor ?? LightTheme.primary) : LightTheme.surfaceSecondary },
              isTemp && styles.messageBubbleTemp,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {item.content}
            </Text>
          </View>
          <View style={[styles.messageFooter, isOwn && styles.messageFooterOwn]}>
            <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isOwn && status && (
              <View style={styles.statusIcon}>
                {status === "read" ? (
                  <CheckCheck size={14} color={LightTheme.primary} />
                ) : (
                  <Check size={14} color={LightTheme.textTertiary} />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [user?.id, conversation, messages, getMessageStatus]);

  if (conversationQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={LightTheme.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Conversation not found</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerColor = conversation.ministryColor ?? LightTheme.primary;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          { 
            paddingTop: insets.top + 8,
            backgroundColor: headerColor,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={LightTheme.textInverse} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerContent} activeOpacity={0.8}>
          <Image source={{ uri: conversation.avatar || undefined }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation.name}
            </Text>
            <View style={styles.headerSubtitleRow}>
              {conversation.isGroup ? (
                <>
                  <Users size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.headerSubtitle}>
                    {conversation.members?.length ?? conversation.participantIds?.length ?? 0} members
                  </Text>
                </>
              ) : (
                <>
                  <User size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.headerSubtitle}>Direct message</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <MoreVertical size={20} color={LightTheme.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={messagesQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={LightTheme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: headerColor },
              ]}
            >
              {conversation.isGroup ? (
                <Users size={32} color={LightTheme.textInverse} />
              ) : (
                <User size={32} color={LightTheme.textInverse} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {conversation.type === "direct" 
                ? `Start chatting with ${conversation.name}`
                : `Welcome to ${conversation.name}`}
            </Text>
            <Text style={styles.emptySubtext}>
              {conversation.type === "direct"
                ? "Send a message to start the conversation"
                : "Be the first to send a message!"}
            </Text>
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0 && isAtBottom) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {!isAtBottom && messages.length > 5 && (
        <TouchableOpacity
          style={[styles.scrollToBottomButton, { backgroundColor: headerColor }]}
          onPress={scrollToBottom}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#fff" style={{ transform: [{ rotate: "-90deg" }] }} />
        </TouchableOpacity>
      )}

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={LightTheme.textTertiary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: headerColor },
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            activeOpacity={0.7}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color={LightTheme.textInverse} />
            ) : (
              <Send size={20} color={LightTheme.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: LightTheme.textSecondary,
    marginBottom: 16,
  },
  backButtonAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: LightTheme.primary,
    borderRadius: 20,
  },
  backButtonAltText: {
    color: LightTheme.textInverse,
    fontWeight: "600" as const,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: LightTheme.textInverse,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-end",
  },
  messageRowOwn: {
    flexDirection: "row-reverse",
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContentWrapper: {
    maxWidth: "75%",
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: LightTheme.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleOwn: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageBubbleTemp: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: LightTheme.textInverse,
  },
  messageTextOther: {
    color: LightTheme.text,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 4,
    gap: 4,
  },
  messageFooterOwn: {
    justifyContent: "flex-end",
    marginRight: 4,
    marginLeft: 0,
  },
  messageTime: {
    fontSize: 11,
    color: LightTheme.textTertiary,
  },
  messageTimeOwn: {
    textAlign: "right",
  },
  statusIcon: {
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: LightTheme.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    textAlign: "center",
  },
  scrollToBottomButton: {
    position: "absolute",
    right: 16,
    bottom: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  inputContainer: {
    backgroundColor: LightTheme.surface,
    borderTopWidth: 1,
    borderTopColor: LightTheme.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: LightTheme.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
