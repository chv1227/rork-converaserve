import React, { useState } from "react";
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

interface MinistryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export default function AdminMinistriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, currentOrganization } = useAuth();
  const utils = trpc.useUtils();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [formData, setFormData] = useState<MinistryFormData>({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
    icon: "users",
  });

  const ministriesQuery = trpc.ministries.list.useQuery({
    organizationId: currentOrganization?.id,
  });

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

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Access denied</Text>
      </View>
    );
  }

  const ministries = ministriesQuery.data || [];
  const isLoading = createMutation.isPending || updateMutation.isPending;

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
            <Text style={styles.title}>Ministry Colors</Text>
            <Text style={styles.subtitle}>Manage ministry categories</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreateModal}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
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
            Assign colors to ministries. These colors appear as dots on user profiles to indicate their ministry affiliations.
          </Text>
        </View>

        {ministriesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : ministries.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Ministries</Text>
            <Text style={styles.emptySubtitle}>
              Create your first ministry to get started
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={openCreateModal}
              activeOpacity={0.7}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.createFirstButtonText}>Create Ministry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ministriesList}>
            {ministries.map((ministry) => {
              const color = ministry.color || getMinistryColor(ministry.name, ministry.id);
              return (
                <View key={ministry.id} style={styles.ministryCard}>
                  <View style={styles.ministryHeader}>
                    <View style={[styles.colorPreview, { backgroundColor: color }]} />
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
                      onPress={() => openEditModal(ministry)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(ministry)}
                      activeOpacity={0.7}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

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
});
