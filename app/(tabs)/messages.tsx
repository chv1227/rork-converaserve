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
} from "react-native";
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
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";
import { Conversation } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

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
  const { currentOrganization, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"direct" | "group">("direct");
  const [selectedMembers, setSelectedMembers] = useState<OrgMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const conversationsQuery = trpc.messages.getAllUserConversations.useQuery(
    { organizationId: currentOrganization?.id || "" },
    {
      enabled: !!currentOrganization?.id,
      refetchInterval: 3000,
    }
  );

  const membersQuery = trpc.messages.getOrganizationMembers.useQuery(
    { organizationId: currentOrganization?.id || "" },
    { enabled: !!currentOrganization?.id && showNewChatModal }
  );

  const createDMmutation = trpc.messages.findOrCreateDirectConversation.useMutation({
    onSuccess: (conversation) => {
      console.log("DM created/found:", conversation.id);
      queryClient.invalidateQueries();
      setShowNewChatModal(false);
      setSelectedMembers([]);
      router.push(`/chat/${conversation.id}` as Href);
    },
  });

  const createGroupMutation = trpc.messages.createGroupConversation.useMutation({
    onSuccess: (conversation) => {
      console.log("Group created:", conversation.id);
      queryClient.invalidateQueries();
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

  const onRefresh = useCallback(() => {
    conversationsQuery.refetch();
  }, [conversationsQuery]);

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

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.type === "direct" && conversation.participantIds && user) {
      return conversation.name;
    }
    return conversation.name;
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isUnread = item.unreadCount > 0;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}` as Href)}
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
            <View style={[styles.groupBadge, { backgroundColor: Colors.primary }]}>
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
              {getConversationDisplayName(item)}
            </Text>
            <Text style={styles.conversationTime}>{item.lastMessageTime}</Text>
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
  };

  const renderMemberItem = ({ item }: { item: OrgMember }) => {
    const isSelected = selectedMembers.some((m) => m.id === item.id);

    if (newChatTab === "direct") {
      return (
        <TouchableOpacity
          style={styles.memberItem}
          onPress={() => handleStartDM(item)}
          activeOpacity={0.7}
          disabled={createDMmutation.isPending}
        >
          <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
          {createDMmutation.isPending && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected]}
        onPress={() => toggleMemberSelection(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && <Check size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (!currentOrganization) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <MessageCircle size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyText}>Join an organization first</Text>
          <Text style={styles.emptySubtext}>
            You need to be part of an organization to start messaging
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => setShowNewChatModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textTertiary}
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
            tintColor={Colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          isLoading && conversations.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <MessageCircle size={40} color={Colors.textTertiary} />
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
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowNewChatModal(false);
                setSelectedMembers([]);
                setGroupName("");
                setMemberSearch("");
              }}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Message</Text>
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

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, newChatTab === "direct" && styles.activeTab]}
              onPress={() => {
                setNewChatTab("direct");
                setSelectedMembers([]);
              }}
            >
              <User size={18} color={newChatTab === "direct" ? Colors.primary : Colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  newChatTab === "direct" && styles.activeTabText,
                ]}
              >
                Direct
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, newChatTab === "group" && styles.activeTab]}
              onPress={() => setNewChatTab("group")}
            >
              <Users size={18} color={newChatTab === "group" ? Colors.primary : Colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  newChatTab === "group" && styles.activeTabText,
                ]}
              >
                Group
              </Text>
            </TouchableOpacity>
          </View>

          {newChatTab === "group" && (
            <View style={styles.groupNameContainer}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name"
                placeholderTextColor={Colors.textTertiary}
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
                      <X size={12} color={Colors.textSecondary} />
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

          <View style={styles.memberSearchContainer}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.memberSearchInput}
              placeholder="Search members..."
              placeholderTextColor={Colors.textTertiary}
              value={memberSearch}
              onChangeText={setMemberSearch}
            />
          </View>

          {membersQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderMemberItem}
              contentContainerStyle={styles.memberListContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyMembersContainer}>
                  <Text style={styles.emptyMembersText}>
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight,
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
