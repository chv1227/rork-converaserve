import { useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { AlertCircle, Plus, X, Music, Heart, BookOpen, Users, Coffee, Sparkles } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import MinistryCard from "@/components/MinistryCard";

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentOrganization } = useAuth();
  const { ministries, isLoading, isRefreshing, refresh, userMinistries, joinMinistry, leaveMinistry, createMinistry, isMinistryMember } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [pendingMinistryIds, setPendingMinistryIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMinistryName, setNewMinistryName] = useState("");
  const [newMinistryDescription, setNewMinistryDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#FF6B6B");
  const [selectedIcon, setSelectedIcon] = useState("Users");
  const [isCreating, setIsCreating] = useState(false);

  const MINISTRY_COLORS = [
    "#FF6B6B", "#4ECDC4", "#6C5CE7", "#00D4AA", "#FFE66D", "#74B9FF", "#FF7675", "#A29BFE"
  ];

  const MINISTRY_ICONS = [
    { name: "Users", icon: Users },
    { name: "Music", icon: Music },
    { name: "Heart", icon: Heart },
    { name: "BookOpen", icon: BookOpen },
    { name: "Coffee", icon: Coffee },
    { name: "Sparkles", icon: Sparkles },
  ];

  const onRefresh = useCallback(async () => {
    console.log("Refreshing groups...");
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  const otherMinistries = useMemo(() => {
    return ministries.filter((m) => !isMinistryMember(m.id));
  }, [ministries, isMinistryMember]);

  const handleCreateMinistry = async () => {
    if (!newMinistryName.trim()) {
      Alert.alert("Error", "Please enter a ministry name");
      return;
    }
    if (!newMinistryDescription.trim()) {
      Alert.alert("Error", "Please enter a ministry description");
      return;
    }
    if (!currentOrganization) {
      Alert.alert("Error", "Please set up your church first");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createMinistry({
        organizationId: currentOrganization.id,
        name: newMinistryName.trim(),
        description: newMinistryDescription.trim(),
        color: selectedColor,
        icon: selectedIcon,
        image: `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop`,
      });

      if (result.success) {
        Alert.alert("Success", "Ministry created successfully!");
        setShowCreateModal(false);
        setNewMinistryName("");
        setNewMinistryDescription("");
        setSelectedColor("#FF6B6B");
        setSelectedIcon("Users");
      }
    } catch (error) {
      console.error("Create ministry error:", error);
      Alert.alert("Error", "Failed to create ministry. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMinistryAction = async (ministryId: string, isMember: boolean, isPending: boolean) => {
    if (isMember) {
      const result = await leaveMinistry(ministryId);
      if (result.success) {
        console.log("Left ministry");
      }
    } else if (!isPending) {
      setPendingMinistryIds(prev => new Set([...prev, ministryId]));
      const result = await joinMinistry(ministryId);
      if (result.success) {
        Alert.alert("Request Sent", "Your request to join has been submitted. An admin will review it shortly.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.subtitle}>Connect with your ministries</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {!currentOrganization && (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => router.push("/organization" as Href)}
          >
            <View style={styles.setupBannerContent}>
              <AlertCircle size={24} color={Colors.primary} />
              <View style={styles.setupBannerText}>
                <Text style={styles.setupBannerTitle}>Set Up Your Church</Text>
                <Text style={styles.setupBannerSubtitle}>Create or join a church to see groups</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {isLoading && ministries.length === 0 && currentOrganization && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {currentOrganization && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Ministries</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={16} color={Colors.textInverse} />
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
            {userMinistries.length === 0 && (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>You haven&apos;t joined any ministries yet</Text>
              </View>
            )}
            {userMinistries.map((ministry) => (
              <MinistryCard
                key={ministry.id}
                ministry={ministry}
                onPress={() => router.push(`/group/${ministry.id}` as Href)}
                isMember
                isPending={false}
                onAction={() => handleMinistryAction(ministry.id, true, false)}
              />
            ))}
          </>
        )}

        {currentOrganization && otherMinistries.length > 0 && (
          <>
            <Text style={[styles.sectionTitleExplore, userMinistries.length > 0 && { marginTop: 24 }]}>
              Explore Ministries
            </Text>
            {otherMinistries.map((ministry) => {
              const isPending = pendingMinistryIds.has(ministry.id);
              return (
                <MinistryCard
                  key={ministry.id}
                  ministry={ministry}
                  onPress={() => router.push(`/group/${ministry.id}` as Href)}
                  isMember={false}
                  isPending={isPending}
                  onAction={() => handleMinistryAction(ministry.id, false, isPending)}
                />
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Ministry</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ministry Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Youth Ministry"
                placeholderTextColor={Colors.textTertiary}
                value={newMinistryName}
                onChangeText={setNewMinistryName}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the purpose of this ministry..."
                placeholderTextColor={Colors.textTertiary}
                value={newMinistryDescription}
                onChangeText={setNewMinistryDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {MINISTRY_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {MINISTRY_ICONS.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.iconOption,
                        selectedIcon === item.name && { backgroundColor: selectedColor + "20", borderColor: selectedColor },
                      ]}
                      onPress={() => setSelectedIcon(item.name)}
                    >
                      <IconComponent
                        size={24}
                        color={selectedIcon === item.name ? selectedColor : Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.inputLabel}>Preview</Text>
                <View style={[styles.previewCard, { borderLeftColor: selectedColor }]}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor + "20" }]}>
                    {MINISTRY_ICONS.find(i => i.name === selectedIcon)?.icon && (
                      (() => {
                        const IconComp = MINISTRY_ICONS.find(i => i.name === selectedIcon)!.icon;
                        return <IconComp size={20} color={selectedColor} />;
                      })()
                    )}
                  </View>
                  <View style={styles.previewText}>
                    <Text style={styles.previewName}>{newMinistryName || "Ministry Name"}</Text>
                    <Text style={styles.previewDesc} numberOfLines={1}>
                      {newMinistryDescription || "Ministry description..."}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
              onPress={handleCreateMinistry}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>Create Ministry</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitleExplore: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  emptySection: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  setupBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setupBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  setupBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: Colors.text,
    borderWidth: 3,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  previewSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  previewDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
