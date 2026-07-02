import { useCallback, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import {
  MessageCircle,
  Plus,
  Search,
  Users,
  User,
  X,
  Check,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import Colors from '@/constants/colors';
import { supabase } from "@/lib/supabase";
import { Conversation } from "@/types";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import React from "react";

function formatConversationTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const ConversationListItem = React.memo(function ConversationListItem({
  item,
  onPress,
  themeColors,
}: {
  item: Conversation;
  onPress: (id: string) => void;
  themeColors: ReturnType<typeof useTheme>["colors"];
}) {
  const isUnread = item.unreadCount > 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <TouchableOpacity
      onPress={() => onPress(item.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      testID={`conversation-${item.id}`}
    >
      <Animated.View style={[styles.conversationItem, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {item.type === "ministry" && item.ministryColor && (
            <View
              style={[
                styles.ministryBadge,
                { backgroundColor: item.ministryColor },
              ]}
            />
          )}
          {item.type === "group" && (
            <View style={[styles.groupBadge, { backgroundColor: themeColors.primary, borderColor: themeColors.surface }]}>
              <Users size={10} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.conversationName, isUnread && styles.unreadName]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={styles.conversationTime}>
              {formatConversationTime(item.lastMessageTime)}
            </Text>
          </View>
          <View style={styles.conversationPreview}>
            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || "No messages yet"}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

interface OrgMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { currentOrganization, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"direct" | "group">("direct");
  const [selectedMembers, setSelectedMembers] = useState<OrgMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

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

  const conversationsQuery = useQuery({
    queryKey: ['conversations', currentOrganization?.id, profileId],
    queryFn: async ({ signal }) => {
      if (!currentOrganization?.id || !profileId) return [];
      
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('profile_id', profileId)
        .abortSignal(signal);
      
      if (participantError) {
        console.log('Error fetching conversation participants:', participantError.message);
        return [];
      }
      
      const participantMap = new Map<string, string | null>();
      for (const p of (participantData || []) as { conversation_id: string; last_read_at: string | null }[]) {
        participantMap.set(p.conversation_id, p.last_read_at);
      }
      const conversationIds = Array.from(participantMap.keys());
      if (conversationIds.length === 0) return [];
      
      const { data } = await supabase
        .from('conversations')
        .select('*, ministries(color)')
        .in('id', conversationIds)
        .eq('organization_id', currentOrganization.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .abortSignal(signal);
      
      const convoIds = (data || []).map((c: { id: string }) => c.id);
      
      let lastMessagesMap = new Map<string, { content: string; created_at: string }>();
      let unreadCountsMap = new Map<string, number>();
      
      if (convoIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false })
          .abortSignal(signal);
        
        for (const msg of (lastMsgs || []) as { conversation_id: string; content: string; created_at: string }[]) {
          if (!lastMessagesMap.has(msg.conversation_id)) {
            lastMessagesMap.set(msg.conversation_id, { content: msg.content, created_at: msg.created_at });
          }
        }
        
        for (const convoId of convoIds) {
          const lastReadAt = participantMap.get(convoId);
          if (lastReadAt) {
            const unreadMsgs = (lastMsgs || []).filter(
              (m: { conversation_id: string; created_at: string }) => 
                m.conversation_id === convoId && m.created_at > lastReadAt
            );
            unreadCountsMap.set(convoId, unreadMsgs.length);
          } else {
            const allMsgs = (lastMsgs || []).filter(
              (m: { conversation_id: string }) => m.conversation_id === convoId
            );
            unreadCountsMap.set(convoId, allMsgs.length);
          }
        }
      }
      
      return (data || []).map((c: { id: string; organization_id: string; name: string; avatar: string | null; type: string; ministry_id: string | null; created_by: string; is_archived: boolean; created_at: string; updated_at: string; ministries: { color: string } | null }) => {
        const lastMsg = lastMessagesMap.get(c.id);
        const unread = unreadCountsMap.get(c.id) || 0;
        return {
          id: c.id,
          organizationId: c.organization_id,
          name: c.name,
          avatar: c.avatar || '',
          lastMessage: lastMsg?.content || '',
          lastMessageTime: lastMsg?.created_at || c.updated_at,
          unreadCount: unread,
          isGroup: c.type !== 'direct',
          type: c.type as 'direct' | 'group' | 'ministry',
          ministryId: c.ministry_id || undefined,
          ministryColor: c.ministries?.color || undefined,
          createdBy: c.created_by,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          isArchived: c.is_archived,
        };
      }) as Conversation[];
    },
    enabled: !!currentOrganization?.id && !!profileId,
    refetchInterval: 5000,
  });

  const membersQuery = useQuery({
    queryKey: ['orgMembers', currentOrganization?.id, profileId],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, users!user_id(email)')
        .eq('church_id', currentOrganization.id);
      
      const members: OrgMember[] = [];
      for (const m of (data || []) as { id: string; user_id: string; display_name: string | null; avatar_url: string | null; users: { email: string } | null }[]) {
        if (m.id !== profileId) {
          const displayName = m.display_name || 'User';
          const userEmail = m.users?.email || '';
          members.push({
            id: m.id,
            name: displayName,
            email: userEmail,
            avatar: m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A7B74&color=fff`,
          });
        }
      }
      return members;
    },
    enabled: !!currentOrganization?.id && showNewChatModal,
  });

  const createDMmutation = useMutation({
    mutationFn: async (data: { recipientId: string; recipientName: string; recipientAvatar: string; organizationId: string }) => {
      if (!profileId) throw new Error('Profile not found');
      
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', profileId);
      
      const myConvoIds = (existingParticipants || []).map((p: { conversation_id: string }) => p.conversation_id);
      
      if (myConvoIds.length > 0) {
        const { data: recipientParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('profile_id', data.recipientId)
          .in('conversation_id', myConvoIds);
        
        const sharedConvoIds = (recipientParticipants || []).map((p: { conversation_id: string }) => p.conversation_id);
        
        if (sharedConvoIds.length > 0) {
          const { data: existingDM } = await supabase
            .from('conversations')
            .select('*')
            .in('id', sharedConvoIds)
            .eq('type', 'direct')
            .limit(1)
            .single();
          
          if (existingDM) return { id: (existingDM as { id: string }).id };
        }
      }
      
      const { data: newConvo, error } = await (supabase
        .from('conversations') as any)
        .insert({
          organization_id: data.organizationId,
          name: data.recipientName,
          avatar: data.recipientAvatar,
          type: 'direct',
          created_by: profileId,
        })
        .select()
        .single();
      
      if (error) throw error;
      const convo = newConvo as { id: string };
      
      await (supabase.from('conversation_participants') as any).insert([
        { conversation_id: convo.id, profile_id: profileId },
        { conversation_id: convo.id, profile_id: data.recipientId },
      ]);
      
      return { id: convo.id };
    },
    onSuccess: (conversation) => {
      console.log("DM created/found:", conversation.id);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewChatModal(false);
      setSelectedMembers([]);
      router.push(`/chat/${conversation.id}` as Href);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberIds: string[]; organizationId: string }) => {
      if (!profileId) throw new Error('Profile not found');
      
      const { data: newConvo, error } = await (supabase
        .from('conversations') as any)
        .insert({
          organization_id: data.organizationId,
          name: data.name,
          type: 'group',
          created_by: profileId,
        })
        .select()
        .single();
      
      if (error) throw error;
      const convo = newConvo as { id: string };
      
      const participants = [profileId, ...data.memberIds].map(memberId => ({
        conversation_id: convo.id,
        profile_id: memberId,
      }));
      
      await (supabase.from('conversation_participants') as any).insert(participants);
      
      return { id: convo.id };
    },
    onSuccess: (conversation) => {
      console.log("Group created:", conversation.id);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowNewChatModal(false);
      setSelectedMembers([]);
      setGroupName("");
      router.push(`/chat/${conversation.id}` as Href);
    },
  });

  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const isLoading = conversationsQuery.isLoading;
  const isRefreshing = conversationsQuery.isRefetching;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const filteredMembers = useMemo(() => {
    const members = membersQuery.data || [];
    if (!memberSearch.trim()) return members;
    const query = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [membersQuery.data, memberSearch]);

  const { refetch: refetchConversations } = conversationsQuery;
  
  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void refetchConversations();
  }, [refetchConversations]);

  const handleStartDM = (member: OrgMember) => {
    if (!currentOrganization?.id) return;
    createDMmutation.mutate({
      recipientId: member.id,
      recipientName: member.name,
      recipientAvatar: member.avatar,
      organizationId: currentOrganization.id,
    });
  };

  const handleCreateGroup = () => {
    if (!currentOrganization?.id || !groupName.trim() || selectedMembers.length === 0) return;
    createGroupMutation.mutate({
      name: groupName.trim(),
      memberIds: selectedMembers.map((m) => m.id),
      organizationId: currentOrganization.id,
    });
  };

  const toggleMemberSelection = (member: OrgMember) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  const handleConversationPress = useCallback((conversationId: string) => {
    router.push(`/chat/${conversationId}` as Href);
  }, [router]);

  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationListItem item={item} onPress={handleConversationPress} themeColors={colors} />
  ), [handleConversationPress, colors]);

  const renderMemberItem = ({ item }: { item: OrgMember }) => {
    const isSelected = selectedMembers.some((m) => m.id === item.id);

    if (newChatTab === "direct") {
      return (
        <TouchableOpacity
          style={[styles.memberItem, { backgroundColor: colors.surface }]}
          onPress={() => handleStartDM(item)}
          activeOpacity={0.7}
          disabled={createDMmutation.isPending}
        >
          <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          </View>
          {createDMmutation.isPending && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.memberItem, { backgroundColor: colors.surface }, isSelected && { backgroundColor: colors.primary + '10' }]}
        onPress={() => toggleMemberSelection(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          {isSelected && <Check size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (!currentOrganization) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <MessageCircle size={40} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>Join an organization first</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            You need to be part of an organization to start messaging
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowNewChatModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />}
        ListHeaderComponent={
          isLoading && conversations.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <MessageCircle size={40} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start a new chat by tapping the + button above
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showNewChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity
              onPress={() => {
                setShowNewChatModal(false);
                setSelectedMembers([]);
                setGroupName("");
                setMemberSearch("");
              }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Message</Text>
            {newChatTab === "group" && (
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={
                  !groupName.trim() ||
                  selectedMembers.length === 0 ||
                  createGroupMutation.isPending
                }
                style={[
                  styles.createButton,
                  (!groupName.trim() || selectedMembers.length === 0) &&
                    styles.createButtonDisabled,
                ]}
              >
                {createGroupMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            )}
            {newChatTab === "direct" && <View style={{ width: 60 }} />}
          </View>

          <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.tab, { backgroundColor: colors.surfaceSecondary }, newChatTab === "direct" && { backgroundColor: colors.primary + '15' }]}
              onPress={() => {
                setNewChatTab("direct");
                setSelectedMembers([]);
              }}
            >
              <User size={18} color={newChatTab === "direct" ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  newChatTab === "direct" && { color: colors.primary },
                ]}
              >
                Direct
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, { backgroundColor: colors.surfaceSecondary }, newChatTab === "group" && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setNewChatTab("group")}
            >
              <Users size={18} color={newChatTab === "group" ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  newChatTab === "group" && { color: colors.primary },
                ]}
              >
                Group
              </Text>
            </TouchableOpacity>
          </View>

          {newChatTab === "group" && (
            <View style={[styles.groupNameContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
              <TextInput
                style={[styles.groupNameInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
                placeholder="Group name"
                placeholderTextColor={colors.textTertiary}
                value={groupName}
                onChangeText={setGroupName}
              />
              {selectedMembers.length > 0 && (
                <View style={styles.selectedMembersRow}>
                  {selectedMembers.slice(0, 5).map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.selectedMemberChip}
                      onPress={() => toggleMemberSelection(member)}
                    >
                      <Image
                        source={{ uri: member.avatar }}
                        style={styles.chipAvatar}
                      />
                      <Text style={styles.chipName} numberOfLines={1}>
                        {member.name.split(" ")[0]}
                      </Text>
                      <X size={12} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                  {selectedMembers.length > 5 && (
                    <View style={styles.moreChip}>
                      <Text style={styles.moreChipText}>
                        +{selectedMembers.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={[styles.memberSearchContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.memberSearchInput, { color: colors.text }]}
              placeholder="Search members..."
              placeholderTextColor={colors.textTertiary}
              value={memberSearch}
              onChangeText={setMemberSearch}
            />
          </View>

          {membersQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderMemberItem}
              contentContainerStyle={styles.memberListContent}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />}
              ListEmptyComponent={
                <View style={styles.emptyMembersContainer}>
                  <Text style={[styles.emptyMembersText, { color: colors.textSecondary }]}>
                    {memberSearch
                      ? "No members found"
                      : "No other members in this organization"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 80,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  ministryBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  unreadName: {
    fontWeight: "700" as const,
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  conversationPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: Colors.text,
    fontWeight: "500" as const,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    gap: 6,
  },
  activeTab: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  groupNameContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  groupNameInput: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  selectedMembersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  selectedMemberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    gap: 4,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  chipName: {
    fontSize: 12,
    color: Colors.primary,
    maxWidth: 60,
  },
  moreChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moreChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  memberSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  memberListContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
  },
  memberItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyMembersContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyMembersText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
