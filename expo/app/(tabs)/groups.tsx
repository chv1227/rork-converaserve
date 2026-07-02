import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  X,
  Music,
  Heart,
  BookOpen,
  Users,
  Coffee,
  Sparkles,
  ChevronRight,
  Search,
  Settings,
  Check,
  Clock,
  Baby,
  HandHeart,
  Video,
  Star,
  TrendingUp,
} from "lucide-react-native";
import { LightTheme } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ministry } from "@/types";
import React from "react";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Baby,
  HandHeart,
  Video,
  BookOpen,
  Coffee,
  Sparkles,
};

const MINISTRY_COLORS = [
  "#1B3A5C",
  "#6B8F71",
  "#5A8F8F",
  "#C8943E",
  "#C76F54",
  "#4A8BAF",
  "#7A6B8F",
  "#D4956A",
];

const MINISTRY_ICONS = [
  { name: "Users", icon: Users },
  { name: "Music", icon: Music },
  { name: "Heart", icon: Heart },
  { name: "BookOpen", icon: BookOpen },
  { name: "Coffee", icon: Coffee },
  { name: "Sparkles", icon: Sparkles },
  { name: "Baby", icon: Baby },
  { name: "HandHeart", icon: HandHeart },
];

interface MinistryCardAnimatedProps {
  ministry: Ministry;
  index: number;
  isMember: boolean;
  isPending: boolean;
  onPress: () => void;
  onAction: () => void;
}

function MinistryCardAnimated({
  ministry,
  index,
  isMember,
  isPending,
  onPress,
  onAction,
}: MinistryCardAnimatedProps) {
  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const IconComponent = iconMap[ministry.icon] || Users;
  const color = ministry.color || "#6366F1";

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: cardScale }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.ministryCard}
      >
        <Image
          source={{ uri: ministry.image }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.9)"]}
          style={styles.cardGradient}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconBadge, { backgroundColor: color }]}>
              <IconComponent size={18} color="#fff" />
            </View>

            <TouchableOpacity
              style={[
                styles.cardActionButton,
                isMember
                  ? styles.cardActionMember
                  : isPending
                  ? styles.cardActionPending
                  : styles.cardActionJoin,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (!isPending) {
                  onAction();
                }
              }}
              activeOpacity={isPending ? 1 : 0.7}
            >
              {isMember ? (
                <>
                  <Check size={14} color={LightTheme.primary} />
                  <Text style={styles.actionTextMember}>Joined</Text>
                </>
              ) : isPending ? (
                <>
                  <Clock size={14} color={LightTheme.warning} />
                  <Text style={styles.actionTextPending}>Pending</Text>
                </>
              ) : (
                <>
                  <Plus size={14} color="#fff" />
                  <Text style={styles.actionTextJoin}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{ministry.name}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {ministry.description}
            </Text>
            <View style={styles.cardMeta}>
              <View style={styles.cardMetaItem}>
                <Users size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.cardMetaText}>
                  {ministry.memberCount} members
                </Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
            </View>
          </View>
        </View>

        <View style={[styles.cardAccent, { backgroundColor: color }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CompactMinistryCardProps {
  ministry: Ministry;
  index: number;
  isMember: boolean;
  onPress: () => void;
}

function CompactMinistryCard({
  ministry,
  index,
  isMember,
  onPress,
}: CompactMinistryCardProps) {
  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const IconComponent = iconMap[ministry.icon] || Users;
  const color = ministry.color || "#6366F1";

  return (
    <Animated.View
      style={[
        styles.compactCardWrapper,
        { opacity: fadeAnim, transform: [{ scale: cardScale }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.compactCard}
      >
        <View style={[styles.compactIconContainer, { backgroundColor: color + "20" }]}>
          <IconComponent size={22} color={color} />
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {ministry.name}
          </Text>
          <Text style={styles.compactMeta}>
            {ministry.memberCount} members
          </Text>
        </View>
        {isMember && (
          <View style={styles.memberBadge}>
            <Check size={12} color={LightTheme.success} />
          </View>
        )}
        <ChevronRight size={18} color={LightTheme.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { currentOrganization, isAdmin, isChurchApproved } = useAuth();
  const {
    ministries,
    isLoading,
    isRefreshing,
    refresh,
    userMinistries,
    joinMinistry,
    leaveMinistry,
    createMinistry,
    isMinistryMember,
  } = useData();

  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [pendingMinistryIds, setPendingMinistryIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMinistryName, setNewMinistryName] = useState("");
  const [newMinistryDescription, setNewMinistryDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(MINISTRY_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("Users");
  const [isCreating, setIsCreating] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [headerAnim]);

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Refreshing ministries...");
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  const filteredMinistries = useMemo(() => {
    if (!searchQuery.trim()) return ministries;
    const query = searchQuery.toLowerCase();
    return ministries.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
  }, [ministries, searchQuery]);

  const otherMinistries = useMemo(() => {
    return filteredMinistries.filter((m) => !isMinistryMember(m.id));
  }, [filteredMinistries, isMinistryMember]);

  const myMinistries = useMemo(() => {
    if (!searchQuery.trim()) return userMinistries;
    const query = searchQuery.toLowerCase();
    return userMinistries.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
  }, [userMinistries, searchQuery]);

  const featuredMinistries = useMemo(() => {
    return filteredMinistries
      .filter((m) => m.memberCount >= 0)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 3);
  }, [filteredMinistries]);

  const handleCreateMinistry = async () => {
    if (!newMinistryName.trim()) {
      Alert.alert("Error", "Please enter a ministry name");
      return;
    }
    if (!newMinistryDescription.trim() || newMinistryDescription.length < 10) {
      Alert.alert("Error", "Please enter a description (at least 10 characters)");
      return;
    }
    if (!currentOrganization) {
      Alert.alert("Error", "Please set up your church first");
      return;
    }
    if (!isChurchApproved) {
      Alert.alert("Not Available", "Ministry creation is only available for approved churches. Your church registration is still pending review.");
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
        setSelectedColor(MINISTRY_COLORS[0]);
        setSelectedIcon("Users");
      } else {
        Alert.alert("Error", result.message || "Failed to create ministry");
      }
    } catch (error) {
      console.error("Create ministry error:", error);
      Alert.alert("Error", "Failed to create ministry. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMinistryAction = async (
    ministryId: string,
    isMember: boolean,
    isPending: boolean
  ) => {
    if (isMember) {
      Alert.alert(
        "Leave Ministry",
        "Are you sure you want to leave this ministry?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: async () => {
              const result = await leaveMinistry(ministryId);
              if (result.success) {
                console.log("Left ministry");
              }
            },
          },
        ]
      );
    } else if (!isPending) {
      setPendingMinistryIds((prev) => new Set([...prev, ministryId]));
      const result = await joinMinistry(ministryId);
      if (result.success) {
        Alert.alert(
          "Request Sent",
          "Your request to join has been submitted. An admin will review it shortly."
        );
      } else {
        setPendingMinistryIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(ministryId);
          return newSet;
        });
        Alert.alert("Error", result.message || "Failed to send request");
      }
    }
  };

  const hasNoMinistries = ministries.length === 0 && !isLoading;
  const hasNoResults = filteredMinistries.length === 0 && searchQuery.trim() && !isLoading;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.borderLight,
            paddingTop: insets.top + 8,
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: themeColors.text }]}>Ministries</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {ministries.length > 0
                ? `${ministries.length} active ${ministries.length === 1 ? "ministry" : "ministries"}`
                : "Connect and serve together"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push("/admin/ministries" as Href)}
                activeOpacity={0.7}
              >
                <Settings size={20} color={themeColors.text} />
              </TouchableOpacity>
            )}
            {currentOrganization && isAdmin && (
              <TouchableOpacity
                style={styles.createButtonHeader}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
          <Search size={18} color={themeColors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search ministries..."
            placeholderTextColor={themeColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color={LightTheme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={LightTheme.primary}
          />
        }
      >
        {isLoading && ministries.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={LightTheme.primary} />
            <Text style={styles.loadingText}>Loading ministries...</Text>
          </View>
        )}

        {hasNoMinistries && !isLoading && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.primary + '15' }]}>
              <Users size={48} color={themeColors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Ministries Yet</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
              {isAdmin
                ? "Create your first ministry to start connecting your community"
                : "Ministries will appear here once they are created"}
            </Text>
            {isAdmin && currentOrganization && (
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyCreateButtonText}>Create Ministry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasNoResults && (
          <View style={styles.noResultsContainer}>
            <Search size={40} color={themeColors.textTertiary} />
            <Text style={[styles.noResultsTitle, { color: themeColors.text }]}>No Results</Text>
            <Text style={[styles.noResultsSubtitle, { color: themeColors.textSecondary }]}>
              Try a different search term
            </Text>
          </View>
        )}

        {!hasNoMinistries && !hasNoResults && !isLoading && (
          <>
            {featuredMinistries.length > 0 && !searchQuery.trim() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <TrendingUp size={18} color={themeColors.primary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Featured</Text>
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                    Popular ministries in your church
                  </Text>
                </View>

                {featuredMinistries.map((ministry, index) => (
                  <MinistryCardAnimated
                    key={ministry.id}
                    ministry={ministry}
                    index={index}
                    isMember={isMinistryMember(ministry.id)}
                    isPending={pendingMinistryIds.has(ministry.id)}
                    onPress={() => router.push(`/group/${ministry.id}` as Href)}
                    onAction={() =>
                      handleMinistryAction(
                        ministry.id,
                        isMinistryMember(ministry.id),
                        pendingMinistryIds.has(ministry.id)
                      )
                    }
                  />
                ))}
              </View>
            )}

            {myMinistries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Star size={18} color={themeColors.warning} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>My Ministries</Text>
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                    You are a member of {myMinistries.length}{" "}
                    {myMinistries.length === 1 ? "ministry" : "ministries"}
                  </Text>
                </View>

                {myMinistries.map((ministry, index) => (
                  <CompactMinistryCard
                    key={ministry.id}
                    ministry={ministry}
                    index={index}
                    isMember={true}
                    onPress={() => router.push(`/group/${ministry.id}` as Href)}
                  />
                ))}
              </View>
            )}

            {otherMinistries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Users size={18} color={themeColors.textSecondary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      {myMinistries.length > 0 ? "Explore More" : "All Ministries"}
                    </Text>
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                    Discover and join other ministries
                  </Text>
                </View>

                {otherMinistries.map((ministry, index) => (
                  <MinistryCardAnimated
                    key={ministry.id}
                    ministry={ministry}
                    index={index}
                    isMember={false}
                    isPending={pendingMinistryIds.has(ministry.id)}
                    onPress={() => router.push(`/group/${ministry.id}` as Href)}
                    onAction={() =>
                      handleMinistryAction(
                        ministry.id,
                        false,
                        pendingMinistryIds.has(ministry.id)
                      )
                    }
                  />
                ))}
              </View>
            )}
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Ministry</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ministry Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Youth Ministry"
                placeholderTextColor={LightTheme.textTertiary}
                value={newMinistryName}
                onChangeText={setNewMinistryName}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the purpose of this ministry (min 10 characters)..."
                placeholderTextColor={LightTheme.textTertiary}
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
                  >
                    {selectedColor === color && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
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
                        selectedIcon === item.name && {
                          backgroundColor: selectedColor + "20",
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => setSelectedIcon(item.name)}
                    >
                      <IconComponent
                        size={24}
                        color={selectedIcon === item.name ? selectedColor : LightTheme.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.inputLabel}>Preview</Text>
                <View style={[styles.previewCard, { borderLeftColor: selectedColor }]}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor + "20" }]}>
                    {MINISTRY_ICONS.find((i) => i.name === selectedIcon)?.icon &&
                      (() => {
                        const IconComp = MINISTRY_ICONS.find(
                          (i) => i.name === selectedIcon
                        )!.icon;
                        return <IconComp size={20} color={selectedColor} />;
                      })()}
                  </View>
                  <View style={styles.previewText}>
                    <Text style={styles.previewName}>
                      {newMinistryName || "Ministry Name"}
                    </Text>
                    <Text style={styles.previewDesc} numberOfLines={1}>
                      {newMinistryDescription || "Ministry description..."}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: selectedColor },
                isCreating && styles.submitButtonDisabled,
              ]}
              onPress={handleCreateMinistry}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
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
    backgroundColor: LightTheme.background,
  },
  header: {
    backgroundColor: LightTheme.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  subtitle: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LightTheme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: LightTheme.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: LightTheme.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: LightTheme.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: LightTheme.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    marginTop: 24,
  },
  emptyCreateButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: LightTheme.textSecondary,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  ministryCard: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: LightTheme.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  cardActionJoin: {
    backgroundColor: LightTheme.primary,
  },
  cardActionMember: {
    backgroundColor: "#fff",
  },
  cardActionPending: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: LightTheme.warning,
  },
  actionTextJoin: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#fff",
  },
  actionTextMember: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: LightTheme.primary,
  },
  actionTextPending: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: LightTheme.warning,
  },
  cardInfo: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#fff",
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500" as const,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  compactCardWrapper: {
    marginBottom: 10,
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  compactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
    marginBottom: 2,
  },
  compactMeta: {
    fontSize: 13,
    color: LightTheme.textSecondary,
  },
  memberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LightTheme.success + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: LightTheme.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: LightTheme.surface,
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
    borderBottomColor: LightTheme.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: LightTheme.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
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
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: LightTheme.surfaceSecondary,
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
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    gap: 12,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  previewDesc: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    margin: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
