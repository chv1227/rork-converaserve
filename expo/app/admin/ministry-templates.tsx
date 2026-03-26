import React, { useState, useCallback, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Plus,
  Check,
  X,
  Clock,
  Users,
  Calendar,
  ChevronRight,
  Sparkles,
  Baby,
  Music,
  Heart,
  Shield,
  Star,
  HandHeart,
  Zap,
  Palette,
  Coffee,
  Trophy,
  Globe,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { ministryTemplates, MINISTRY_CATEGORIES, MinistryTemplate } from "@/mocks/ministryTemplates";

const { width: _screenWidth } = Dimensions.get("window");

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Baby,
  Sparkles,
  Music,
  Users,
  Globe,
  Heart,
  Shield,
  Star,
  HandHeart,
  Zap,
  Palette,
  Coffee,
  Trophy,
};

interface TemplateCardProps {
  template: MinistryTemplate;
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, isSelected, onToggle, onPreview }: TemplateCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComponent = iconMap[template.icon] || Users;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.templateCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onToggle}
      >
        <View style={styles.templateImageContainer}>
          <Image source={{ uri: template.coverImage }} style={styles.templateImage} />
          <View style={[styles.templateBadge, { backgroundColor: template.color }]}>
            <IconComponent size={16} color="#fff" />
          </View>
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <View style={styles.selectedCheckmark}>
                <Check size={24} color="#fff" />
              </View>
            </View>
          )}
        </View>
        <View style={styles.templateContent}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateCategory}>{template.category}</Text>
          <Text style={styles.templateDescription} numberOfLines={2}>
            {template.description}
          </Text>
          <View style={styles.templateMeta}>
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>
                {template.defaultSchedule[0]?.day} {template.defaultSchedule[0]?.time}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              activeOpacity={0.7}
            >
              <Eye size={14} color={Colors.primary} />
              <Text style={styles.previewButtonText}>Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PreviewModalProps {
  template: MinistryTemplate | null;
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
}

function PreviewModal({ template, visible, onClose, onAdd }: PreviewModalProps) {
  const insets = useSafeAreaInsets();
  
  if (!template) return null;

  const IconComponent = iconMap[template.icon] || Users;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.previewContainer, { paddingTop: insets.top }]}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={onClose} style={styles.previewCloseButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Template Preview</Text>
          <TouchableOpacity style={styles.addFromPreviewButton} onPress={onAdd} activeOpacity={0.7}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addFromPreviewText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: template.coverImage }} style={styles.previewCoverImage} />
          
          <View style={styles.previewContent}>
            <View style={styles.previewTitleRow}>
              <View style={[styles.previewIconContainer, { backgroundColor: template.color }]}>
                <IconComponent size={28} color="#fff" />
              </View>
              <View style={styles.previewTitleInfo}>
                <Text style={styles.previewMinistryName}>{template.name}</Text>
                <Text style={styles.previewMinistryCategory}>{template.category}</Text>
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Description</Text>
              <Text style={styles.previewSectionContent}>{template.description}</Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Mission Statement</Text>
              <Text style={styles.previewSectionContent}>{template.missionStatement}</Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Default Schedule</Text>
              {template.defaultSchedule.map((schedule, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <Calendar size={16} color={template.color} />
                  <Text style={styles.scheduleText}>
                    {schedule.day} at {schedule.time} ({schedule.frequency})
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Target Audience</Text>
              <Text style={styles.previewSectionContent}>{template.targetAudience}</Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Included Sections</Text>
              <View style={styles.sectionsList}>
                {template.suggestedSections.map((section) => (
                  <View key={section} style={styles.sectionBadge}>
                    <Check size={12} color={Colors.success} />
                    <Text style={styles.sectionBadgeText}>
                      {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function MinistryTemplatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<MinistryTemplate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const filteredTemplates = ministryTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleToggleTemplate = useCallback((templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  }, []);

  const handleAddMinistries = useCallback(async () => {
    if (selectedTemplates.length === 0) {
      if (Platform.OS === "web") {
        alert("Please select at least one ministry template");
      } else {
        Alert.alert("No Selection", "Please select at least one ministry template to add");
      }
      return;
    }
    setShowConfirmModal(true);
  }, [selectedTemplates]);

  const confirmAddMinistries = useCallback(async () => {
    setIsAdding(true);
    
    try {
      console.log("Adding ministries:", selectedTemplates);
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setShowConfirmModal(false);
      
      if (Platform.OS === "web") {
        alert(`Successfully added ${selectedTemplates.length} ministries to your church!`);
      } else {
        Alert.alert(
          "Success!",
          `Successfully added ${selectedTemplates.length} ministries to your church. Leaders will be notified to customize and publish.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
      
      setSelectedTemplates([]);
    } catch (error) {
      console.error("Failed to add ministries:", error);
      if (Platform.OS === "web") {
        alert("Failed to add ministries. Please try again.");
      } else {
        Alert.alert("Error", "Failed to add ministries. Please try again.");
      }
    } finally {
      setIsAdding(false);
    }
  }, [selectedTemplates, router]);

  const handleAddFromPreview = useCallback(() => {
    if (previewTemplate) {
      if (!selectedTemplates.includes(previewTemplate.id)) {
        setSelectedTemplates((prev) => [...prev, previewTemplate.id]);
      }
      setPreviewTemplate(null);
    }
  }, [previewTemplate, selectedTemplates]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Access denied</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Ministry Templates</Text>
            <Text style={styles.subtitle}>
              {selectedTemplates.length > 0
                ? `${selectedTemplates.length} selected`
                : `${ministryTemplates.length} templates available`}
            </Text>
          </View>
          {selectedTemplates.length > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddMinistries} activeOpacity={0.7}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>{selectedTemplates.length}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {MINISTRY_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Templates Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filter</Text>
          </View>
        ) : (
          <View style={styles.templatesGrid}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplates.includes(template.id)}
                onToggle={() => handleToggleTemplate(template.id)}
                onPreview={() => setPreviewTemplate(template)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {selectedTemplates.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomBarContent}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedCount}>{selectedTemplates.length}</Text>
              <Text style={styles.selectedLabel}>
                {selectedTemplates.length === 1 ? "ministry" : "ministries"} selected
              </Text>
            </View>
            <TouchableOpacity style={styles.addAllButton} onPress={handleAddMinistries} activeOpacity={0.7}>
              <Text style={styles.addAllButtonText}>Add to My Church</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PreviewModal
        template={previewTemplate}
        visible={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onAdd={handleAddFromPreview}
      />

      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Add Ministries?</Text>
            <Text style={styles.confirmMessage}>
              You are about to add {selectedTemplates.length}{" "}
              {selectedTemplates.length === 1 ? "ministry" : "ministries"} to your church. You can assign
              leaders and customize each ministry after adding.
            </Text>

            <View style={styles.selectedList}>
              {selectedTemplates.slice(0, 5).map((id) => {
                const template = ministryTemplates.find((t) => t.id === id);
                if (!template) return null;
                return (
                  <View key={id} style={styles.selectedItem}>
                    <View style={[styles.selectedItemDot, { backgroundColor: template.color }]} />
                    <Text style={styles.selectedItemName}>{template.name}</Text>
                  </View>
                );
              })}
              {selectedTemplates.length > 5 && (
                <Text style={styles.moreText}>+{selectedTemplates.length - 5} more</Text>
              )}
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
                disabled={isAdding}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isAdding && styles.confirmButtonDisabled]}
                onPress={confirmAddMinistries}
                disabled={isAdding}
                activeOpacity={0.7}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add Ministries</Text>
                )}
              </TouchableOpacity>
            </View>
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
    paddingBottom: 12,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: Colors.text,
  },
  categoriesScroll: {
    marginHorizontal: -20,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
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
  },
  templatesGrid: {
    gap: 16,
  },
  templateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  templateImageContainer: {
    position: "relative",
    height: 140,
  },
  templateImage: {
    width: "100%",
    height: "100%",
  },
  templateBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckmark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  templateContent: {
    padding: 16,
  },
  templateName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500" as const,
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  bottomBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedCount: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  selectedLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addAllButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  addFromPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addFromPreviewText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  previewScroll: {
    flex: 1,
  },
  previewCoverImage: {
    width: "100%",
    height: 200,
  },
  previewContent: {
    padding: 20,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  previewIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitleInfo: {
    flex: 1,
  },
  previewMinistryName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  previewMinistryCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  previewSectionContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: Colors.text,
  },
  sectionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "500" as const,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  selectedList: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  selectedItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedItemName: {
    fontSize: 14,
    color: Colors.text,
  },
  moreText: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
