import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
  Platform,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Share2,
  Settings,
  MapPin,
  Mail,
  Users,
  Calendar,
  ChevronRight,
  MessageCircle,
  Star,
  Baby,
  Music,
  Shield,
  HandHeart,
  Zap,
  Palette,
  Coffee,
  Trophy,
  Globe,
  Sparkles,
  Edit3,
  UserPlus,
  Heart,
  X,
  Check,
  Video,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ministry } from "@/types";
import { getMinistryColor } from "@/constants/ministryColors";

Dimensions.get("window");
const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 100;

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
  Video,
};

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
];

const ICON_OPTIONS = [
  { name: "Users", icon: Users },
  { name: "Music", icon: Music },
  { name: "Heart", icon: Heart },
  { name: "Baby", icon: Baby },
  { name: "Sparkles", icon: Sparkles },
  { name: "Globe", icon: Globe },
  { name: "Shield", icon: Shield },
  { name: "Star", icon: Star },
  { name: "HandHeart", icon: HandHeart },
  { name: "Zap", icon: Zap },
  { name: "Palette", icon: Palette },
  { name: "Coffee", icon: Coffee },
  { name: "Trophy", icon: Trophy },
  { name: "Video", icon: Video },
];

interface ScheduleItemProps {
  day: string;
  time: string;
  frequency: string;
  location?: string;
  color: string;
}

function ScheduleItem({ day, time, frequency, location, color }: ScheduleItemProps) {
  return (
    <View style={styles.scheduleItem}>
      <View style={[styles.scheduleIcon, { backgroundColor: color + "20" }]}>
        <Calendar size={18} color={color} />
      </View>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleDay}>{day}</Text>
        <Text style={styles.scheduleTime}>{time} • {frequency}</Text>
        {location && (
          <View style={styles.locationRow}>
            <MapPin size={12} color={Colors.textTertiary} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  color: string;
  isLeader?: boolean;
}

function MemberCard({ member, color, isLeader }: MemberCardProps) {
  return (
    <TouchableOpacity style={styles.leaderCard} activeOpacity={0.7}>
      <Image source={{ uri: member.avatar }} style={styles.leaderAvatar} />
      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName}>{member.name}</Text>
        <Text style={[styles.leaderRole, { color }]}>
          {isLeader ? "Ministry Leader" : member.role === "admin" ? "Co-Leader" : "Member"}
        </Text>
      </View>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: color + "15" }]}>
        <Mail size={16} color={color} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  ministry: Ministry;
  onSave: (data: { name: string; description: string; color: string; icon: string }) => void;
  isLoading: boolean;
}

function SettingsModal({ visible, onClose, ministry, onSave, isLoading }: SettingsModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(ministry.name);
  const [description, setDescription] = useState(ministry.description);
  const [color, setColor] = useState(ministry.color || getMinistryColor(ministry.name, ministry.id));
  const [icon, setIcon] = useState(ministry.icon || "Users");

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Ministry name is required");
      return;
    }
    if (description.length < 10) {
      Alert.alert("Error", "Description must be at least 10 characters");
      return;
    }
    onSave({ name: name.trim(), description: description.trim(), color, icon });
  };

  const IconComponent = iconMap[icon] || Users;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ministry Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.previewCard}>
              <View style={[styles.previewIcon, { backgroundColor: color }]}>
                <IconComponent size={28} color="#fff" />
              </View>
              <Text style={styles.previewName}>{name || "Ministry Name"}</Text>
              <Text style={styles.previewDescription} numberOfLines={2}>
                {description || "Ministry description"}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ministry Name</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter ministry name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the ministry..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.name}
                      style={[
                        styles.iconOption,
                        { backgroundColor: color + "15" },
                        icon === opt.name && styles.iconOptionSelected,
                      ]}
                      onPress={() => setIcon(opt.name)}
                      activeOpacity={0.7}
                    >
                      <OptIcon size={22} color={icon === opt.name ? color : Colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.7}
                  >
                    {color === c && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MinistryPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, currentOrganization } = useAuth();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [settingsVisible, setSettingsVisible] = useState(false);

  const ministryQuery = useQuery<Ministry | null>({
    queryKey: ['ministry', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ministries')
        .select('*, ministry_members(count)')
        .eq('id', id)
        .single();
      if (error) throw error;
      const result: any = data;
      return result ? {
        id: result.id,
        organizationId: result.church_id || '',
        name: result.name,
        description: result.description || '',
        color: result.color || Colors.primary,
        image: result.image_url || '',
        icon: result.icon || 'Users',
        memberCount: 0,
      } : null;
    },
    enabled: !!id
  });

  const membersQuery = useQuery({
    queryKey: ['ministry-members', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('ministry_members')
        .select('*, users(id, full_name, avatar_url)')
        .eq('ministry_id', id);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.users?.id || '',
        name: m.users?.full_name || '',
        avatar: m.users?.avatar_url || '',
        role: m.role || 'member',
      }));
    },
    enabled: !!id
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; color: string; icon: string }) => {
      const { error } = await supabase
        .from('ministries')
        .update({
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Ministry updated successfully");
      ministryQuery.refetch();
      setSettingsVisible(false);
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Ministry updated successfully");
      }
    },
    onError: (error: Error) => {
      console.error("Failed to update ministry:", error);
      if (Platform.OS === "web") {
        alert(error.message || "Failed to update ministry");
      } else {
        Alert.alert("Error", error.message || "Failed to update ministry");
      }
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { ministryId: string; organizationId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ministry_members')
        .insert({
          ministry_id: data.ministryId,
          user_id: user.id,
          role: 'member',
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      if (Platform.OS === "web") {
        alert("Your request to join has been submitted!");
      } else {
        Alert.alert("Request Sent", "Your request to join this ministry has been submitted for approval.");
      }
      membersQuery.refetch();
    },
    onError: (error: Error) => {
      if (Platform.OS === "web") {
        alert(error.message || "Failed to submit join request");
      } else {
        Alert.alert("Error", error.message || "Failed to submit join request");
      }
    },
  });

  const ministry = ministryQuery.data;
  const members = membersQuery.data || [];
  const leaders = members.filter((m) => m.role === "leader" || m.role === "admin");
  const canManage = isAdmin;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [(HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const handleShare = useCallback(async () => {
    if (!ministry) return;
    try {
      await Share.share({
        message: `Check out the ${ministry.name} at our church!`,
        title: ministry.name,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  }, [ministry]);

  const handleJoin = useCallback(async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!id) return;
    joinMutation.mutate({ 
      ministryId: id, 
      organizationId: currentOrganization?.id 
    });
  }, [user, router, id, currentOrganization?.id, joinMutation.mutate]);

  const handleSaveSettings = useCallback((data: { name: string; description: string; color: string; icon: string }) => {
    if (!id) return;
    updateMutation.mutate({
      id,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
    });
  }, [id, updateMutation.mutate]);

  if (ministryQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading ministry...</Text>
      </View>
    );
  }

  if (!ministry) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Ministry not found</Text>
        <TouchableOpacity 
          style={styles.backButtonCentered} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = ministry.color || getMinistryColor(ministry.name, ministry.id);
  const IconComponent = iconMap[ministry.icon || ""] || Users;
  const coverImage = ministry.image || `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop`;

  const isMember = user?.ministries?.includes(ministry.id);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />
        
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={[styles.ministryBadge, { backgroundColor: color }]}>
            <IconComponent size={32} color="#fff" />
          </View>
          <Text style={styles.ministryName}>{ministry.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={14} color="#fff" />
              <Text style={styles.statText}>{ministry.memberCount} members</Text>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.headerNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          
          <Animated.Text style={[styles.navTitle, { opacity: titleOpacity }]} numberOfLines={1}>
            {ministry.name}
          </Animated.Text>

          <View style={styles.navActions}>
            {canManage && (
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => setSettingsVisible(true)}
                activeOpacity={0.7}
              >
                <Settings size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.navButton} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_MAX_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{ministry.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting Times</Text>
            <ScheduleItem
              day="Sunday"
              time="10:00 AM"
              frequency="Weekly"
              location="Main Campus"
              color={color}
            />
            <ScheduleItem
              day="Wednesday"
              time="7:00 PM"
              frequency="Weekly"
              location="Fellowship Hall"
              color={color}
            />
          </View>

          {leaders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Leadership Team</Text>
                {canManage && (
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => router.push(`/admin/ministries` as any)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={14} color={Colors.primary} />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
              </View>
              {leaders.map((leader) => (
                <MemberCard key={leader.id} member={leader} color={color} isLeader />
              ))}
            </View>
          )}

          {members.length > leaders.length && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members</Text>
                <Text style={styles.memberCountText}>{members.length - leaders.length}</Text>
              </View>
              {members.filter(m => m.role !== "leader" && m.role !== "admin").slice(0, 5).map((member) => (
                <MemberCard key={member.id} member={member} color={color} />
              ))}
              {members.length - leaders.length > 5 && (
                <TouchableOpacity style={styles.seeAllMembersButton} activeOpacity={0.7}>
                  <Text style={[styles.seeAllMembersText, { color }]}>
                    View all {members.length - leaders.length} members
                  </Text>
                  <ChevronRight size={16} color={color} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactCard}>
              <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
                <View style={[styles.contactIcon, { backgroundColor: color + "15" }]}>
                  <Mail size={18} color={color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{ministry.id}@church.org</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
              <View style={styles.contactDivider} />
              <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
                <View style={[styles.contactIcon, { backgroundColor: color + "15" }]}>
                  <MessageCircle size={18} color={color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Message</Text>
                  <Text style={styles.contactValue}>Send a direct message</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {isMember ? (
          <View style={[styles.memberBadge, { backgroundColor: color + "15" }]}>
            <Check size={20} color={color} />
            <Text style={[styles.memberBadgeText, { color }]}>You are a Member</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.joinButton, { backgroundColor: color }]} 
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            activeOpacity={0.8}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <UserPlus size={20} color="#fff" />
                <Text style={styles.joinButtonText}>Join This Ministry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {ministry && settingsVisible && (
        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          ministry={ministry}
          onSave={handleSaveSettings}
          isLoading={updateMutation.isPending}
        />
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
  },
  backButtonCentered: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  headerNav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 12,
  },
  navActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerContent: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  ministryBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ministryName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + "15",
    borderRadius: 16,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.primary,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  leaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  leaderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  leaderRole: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  seeAllMembersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  seeAllMembersText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 72,
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
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  memberBadgeText: {
    fontSize: 16,
    fontWeight: "600" as const,
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  previewCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 10,
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
    minHeight: 100,
    paddingTop: 14,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
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
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
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
