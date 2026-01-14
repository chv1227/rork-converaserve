import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Users,
  ChevronRight,
  Trash2,
  UserMinus,
  X,
  Music,
  Heart,
  Baby,
  HandHeart,
  Video,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Baby,
  HandHeart,
  Video,
};

interface GroupItemProps {
  group: {
    id: string;
    name: string;
    description: string;
    image: string;
    memberCount: number;
    color: string;
    icon: string;
  };
  onPress: () => void;
  onDelete: () => void;
}

function GroupItem({ group, onPress, onDelete }: GroupItemProps) {
  const IconComponent = iconMap[group.icon] || Users;

  return (
    <TouchableOpacity style={styles.groupItem} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: group.image }} style={styles.groupImage} />
      <View style={styles.groupInfo}>
        <View style={styles.groupNameRow}>
          <View style={[styles.groupIcon, { backgroundColor: group.color + "20" }]}>
            <IconComponent size={16} color={group.color} />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
        </View>
        <Text style={styles.groupDescription} numberOfLines={1}>
          {group.description}
        </Text>
        <View style={styles.groupStats}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={styles.groupMemberCount}>{group.memberCount} members</Text>
        </View>
      </View>
      <View style={styles.groupActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={Colors.error} />
        </TouchableOpacity>
        <ChevronRight size={18} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

interface MemberItemProps {
  member: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  onRemove: () => void;
}

function MemberItem({ member, onRemove }: MemberItemProps) {
  return (
    <View style={styles.memberItem}>
      <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <TouchableOpacity style={styles.removeMemberButton} onPress={onRemove} activeOpacity={0.7}>
        <UserMinus size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function GroupManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
    }
  }, [isAdmin, router]);

  const ministriesQuery = trpc.ministries.list.useQuery(undefined, { enabled: isAdmin });
  const membersQuery = trpc.admin.getMinistryMembers.useQuery(
    { ministryId: selectedGroup || "" },
    { enabled: !!selectedGroup && isAdmin }
  );

  const deleteMinistryMutation = trpc.admin.deleteMinistry.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Group deleted successfully");
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const removeMemberMutation = trpc.admin.removeUserFromMinistry.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Member removed from group");
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const filteredGroups = ministriesQuery.data?.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    if (Platform.OS === "web") {
      deleteMinistryMutation.mutate({ ministryId: groupId });
    } else {
      Alert.alert(
        "Delete Group",
        `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMinistryMutation.mutate({ ministryId: groupId }),
          },
        ]
      );
    }
  }, [deleteMinistryMutation]);

  const handleRemoveMember = useCallback((userId: string, userName: string) => {
    if (!selectedGroup) return;
    
    if (Platform.OS === "web") {
      removeMemberMutation.mutate({ userId, ministryId: selectedGroup });
    } else {
      Alert.alert(
        "Remove Member",
        `Are you sure you want to remove ${userName} from this group?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeMemberMutation.mutate({ userId, ministryId: selectedGroup }),
          },
        ]
      );
    }
  }, [selectedGroup, removeMemberMutation]);

  const selectedGroupData = ministriesQuery.data?.find((g) => g.id === selectedGroup);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Group Management</Text>
            <Text style={styles.subtitle}>{ministriesQuery.data?.length || 0} groups</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {ministriesQuery.isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredGroups?.map((group) => (
            <GroupItem
              key={group.id}
              group={group}
              onPress={() => setSelectedGroup(group.id)}
              onDelete={() => handleDeleteGroup(group.id, group.name)}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={!!selectedGroup} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedGroup(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedGroupData?.name}</Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedGroup) {
                  router.push(`/group/${selectedGroup}` as any);
                  setSelectedGroup(null);
                }
              }}
            >
              <Text style={styles.viewButton}>View</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupDetailHeader}>
            {selectedGroupData && (
              <>
                <Image source={{ uri: selectedGroupData.image }} style={styles.groupDetailImage} />
                <View style={styles.groupDetailInfo}>
                  <Text style={styles.groupDetailDescription}>{selectedGroupData.description}</Text>
                  <View style={styles.groupDetailStats}>
                    <Users size={16} color={Colors.textSecondary} />
                    <Text style={styles.groupDetailStatText}>
                      {selectedGroupData.memberCount} members
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Members</Text>

          {membersQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : membersQuery.data && membersQuery.data.length > 0 ? (
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
              {membersQuery.data.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  onRemove={() => handleRemoveMember(member.id, member.name)}
                />
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <View style={styles.emptyMembers}>
              <Users size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No members in this group</Text>
            </View>
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  groupDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  groupStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupMemberCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  groupActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  viewButton: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  groupDetailHeader: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  groupDetailImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupDetailInfo: {
    gap: 8,
  },
  groupDetailDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  groupDetailStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupDetailStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeMemberButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMembers: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
