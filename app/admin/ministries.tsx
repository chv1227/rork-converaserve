import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Plus,
  Palette,
  Edit2,
  Trash2,
  X,
  Users,
  Check,
  Search,
  ChevronRight,
  UserMinus,
  Music,
  Heart,
  Baby,
  HandHeart,
  Video,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";
import { Ministry } from "@/types";
import { getMinistryColor } from "@/constants/ministryColors";

const PRESET_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#F472B6",
  "#6366F1",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
  "#EF4444",
  "#84CC16",
  "#A855F7",
  "#0EA5E9",
  "#E11D48",
  "#22C55E",
  "#7C3AED",
  "#9CA3AF",
];

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Baby,
  HandHeart,
  Video,
};

interface MinistryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
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

export default function AdminMinistriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, currentOrganization } = useAuth();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MinistryFormData>({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
    icon: "users",
  });

  const ministriesQuery = trpc.ministries.list.useQuery({
    organizationId: currentOrganization?.id,
  });

  const membersQuery = trpc.admin.getMinistryMembers.useQuery(
    { ministryId: selectedMinistryId || "" },
    { enabled: !!selectedMinistryId && isAdmin }
  );

  const createMutation = trpc.ministries.create.useMutation({
    onSuccess: () => {
      console.log("Ministry created successfully");
      utils.ministries.list.invalidate();
      resetForm();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Ministry created successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to create ministry:", error);
      if (Platform.OS === "web") {
        alert(error.message || "Failed to create ministry");
      } else {
        Alert.alert("Error", error.message || "Failed to create ministry");
      }
    },
  });

  const updateMutation = trpc.ministries.update.useMutation({
    onSuccess: () => {
      console.log("Ministry updated successfully");
      utils.ministries.list.invalidate();
      resetForm();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Ministry updated successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to update ministry:", error);
      if (Platform.OS === "web") {
        alert(error.message || "Failed to update ministry");
      } else {
        Alert.alert("Error", error.message || "Failed to update ministry");
      }
    },
  });

  const deleteMutation = trpc.ministries.delete.useMutation({
    onSuccess: () => {
      console.log("Ministry deleted successfully");
      utils.ministries.list.invalidate();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Ministry deleted successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to delete ministry:", error);
      if (Platform.OS === "web") {
        alert(error.message || "Failed to delete ministry");
      } else {
        Alert.alert("Error", error.message || "Failed to delete ministry");
      }
    },
  });

  const removeMemberMutation = trpc.admin.removeUserFromMinistry.useMutation({
    onSuccess: () => {
      utils.admin.getMinistryMembers.invalidate();
      utils.ministries.list.invalidate();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Member removed from ministry");
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const resetForm = () => {
    setModalVisible(false);
    setEditingMinistry(null);
    setFormData({
      name: "",
      description: "",
      color: PRESET_COLORS[0],
      icon: "users",
    });
  };

  const openCreateModal = () => {
    setEditingMinistry(null);
    setFormData({
      name: "",
      description: "",
      color: PRESET_COLORS[0],
      icon: "users",
    });
    setModalVisible(true);
  };

  const openEditModal = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setFormData({
      name: ministry.name,
      description: ministry.description,
      color: ministry.color || getMinistryColor(ministry.name, ministry.id),
      icon: ministry.icon || "users",
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      if (Platform.OS === "web") {
        alert("Ministry name is required");
      } else {
        Alert.alert("Error", "Ministry name is required");
      }
      return;
    }

    if (formData.description.length < 10) {
      if (Platform.OS === "web") {
        alert("Description must be at least 10 characters");
      } else {
        Alert.alert("Error", "Description must be at least 10 characters");
      }
      return;
    }

    if (editingMinistry) {
      updateMutation.mutate({
        id: editingMinistry.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
      });
    } else {
      if (!currentOrganization?.id) {
        if (Platform.OS === "web") {
          alert("No organization selected");
        } else {
          Alert.alert("Error", "No organization selected");
        }
        return;
      }
      createMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
        organizationId: currentOrganization.id,
      });
    }
  };

  const handleDelete = (ministry: Ministry) => {
    const confirmDelete = () => {
      deleteMutation.mutate({ id: ministry.id });
    };

    if (Platform.OS === "web") {
      if (confirm(`Are you sure you want to delete "${ministry.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Ministry",
        `Are you sure you want to delete "${ministry.name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  const handleRemoveMember = useCallback((userId: string, userName: string) => {
    if (!selectedMinistryId) return;
    
    if (Platform.OS === "web") {
      removeMemberMutation.mutate({ userId, ministryId: selectedMinistryId });
    } else {
      Alert.alert(
        "Remove Member",
        `Are you sure you want to remove ${userName} from this ministry?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeMemberMutation.mutate({ userId, ministryId: selectedMinistryId }),
          },
        ]
      );
    }
  }, [selectedMinistryId, removeMemberMutation]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Access denied</Text>
      </View>
    );
  }

  const ministries = ministriesQuery.data || [];
  const filteredMinistries = ministries.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const selectedMinistry = ministries.find((m) => m.id === selectedMinistryId);

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
            <Text style={styles.title}>Ministry Management</Text>
            <Text style={styles.subtitle}>{ministries.length} ministries</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreateModal}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Palette size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Create, edit, and manage ministries. Assign colors that appear on user profiles to indicate ministry affiliations.
          </Text>
        </View>

        {ministriesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredMinistries.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "No Results" : "No Ministries"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? "Try a different search term"
                : "Create your first ministry to get started"}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={openCreateModal}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.createFirstButtonText}>Create Ministry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.ministriesList}>
            {filteredMinistries.map((ministry) => {
              const color = ministry.color || getMinistryColor(ministry.name, ministry.id);
              const IconComponent = iconMap[ministry.icon || ""] || Users;
              return (
                <TouchableOpacity 
                  key={ministry.id} 
                  style={styles.ministryCard}
                  onPress={() => setSelectedMinistryId(ministry.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.ministryHeader}>
                    <View style={[styles.colorPreview, { backgroundColor: color }]}>
                      <IconComponent size={20} color="#fff" />
                    </View>
                    <View style={styles.ministryInfo}>
                      <Text style={styles.ministryName}>{ministry.name}</Text>
                      <Text style={styles.ministryDescription} numberOfLines={2}>
                        {ministry.description}
                      </Text>
                      <View style={styles.ministryMeta}>
                        <Users size={12} color={Colors.textTertiary} />
                        <Text style={styles.memberCount}>
                          {ministry.memberCount} members
                        </Text>
                        <View style={[styles.colorBadge, { backgroundColor: color + "20" }]}>
                          <Text style={[styles.colorCode, { color }]}>{color}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.ministryActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(ministry);
                      }}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(ministry);
                      }}
                      activeOpacity={0.7}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                    <ChevronRight size={18} color={Colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMinistry ? "Edit Ministry" : "Create Ministry"}
              </Text>
              <TouchableOpacity
                onPress={resetForm}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ministry Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Youth Ministry"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Brief description of the ministry..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formData.color === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, color })}
                      activeOpacity={0.7}
                    >
                      {formData.color === color && (
                        <Check size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.selectedColorPreview}>
                  <View style={[styles.previewDot, { backgroundColor: formData.color }]} />
                  <Text style={styles.previewColorText}>{formData.color}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingMinistry ? "Save Changes" : "Create Ministry"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal 
        visible={!!selectedMinistryId} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMinistryId(null)}
      >
        <View style={[styles.membersModalContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.membersModalHeader}>
            <TouchableOpacity onPress={() => setSelectedMinistryId(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.membersModalTitle}>{selectedMinistry?.name}</Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedMinistryId) {
                  router.push(`/group/${selectedMinistryId}` as any);
                  setSelectedMinistryId(null);
                }
              }}
            >
              <Text style={styles.viewButton}>View</Text>
            </TouchableOpacity>
          </View>

          {selectedMinistry && (
            <View style={styles.ministryDetailHeader}>
              <View style={[styles.ministryDetailColor, { backgroundColor: selectedMinistry.color || getMinistryColor(selectedMinistry.name, selectedMinistry.id) }]}>
                {(() => {
                  const IconComp = iconMap[selectedMinistry.icon || ""] || Users;
                  return <IconComp size={32} color="#fff" />;
                })()}
              </View>
              <View style={styles.ministryDetailInfo}>
                <Text style={styles.ministryDetailDescription}>{selectedMinistry.description}</Text>
                <View style={styles.ministryDetailStats}>
                  <Users size={16} color={Colors.textSecondary} />
                  <Text style={styles.ministryDetailStatText}>
                    {selectedMinistry.memberCount} members
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editMinistryButton}
                onPress={() => {
                  setSelectedMinistryId(null);
                  setTimeout(() => openEditModal(selectedMinistry), 300);
                }}
                activeOpacity={0.7}
              >
                <Edit2 size={16} color={Colors.primary} />
                <Text style={styles.editMinistryButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}

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
              <Text style={styles.emptyMembersText}>No members in this ministry</Text>
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
  errorText: {
    fontSize: 16,
    color: Colors.error,
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
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 24,
  },
  createFirstButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  ministriesList: {
    gap: 12,
  },
  ministryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ministryHeader: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ministryInfo: {
    flex: 1,
  },
  ministryName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  ministryDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  ministryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginRight: 8,
  },
  colorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  colorCode: {
    fontSize: 10,
    fontWeight: "600" as const,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  ministryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: Colors.error + "15",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flexGrow: 0,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formTextArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedColorPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  previewColorText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  membersModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  membersModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  membersModalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  viewButton: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  ministryDetailHeader: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  ministryDetailColor: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ministryDetailInfo: {
    flex: 1,
    gap: 8,
  },
  ministryDetailDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ministryDetailStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ministryDetailStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  editMinistryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editMinistryButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
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
  emptyMembersText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
