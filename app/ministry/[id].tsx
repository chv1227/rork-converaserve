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
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { ministryTemplates } from "@/mocks/ministryTemplates";
import { ministryMembers, ministryEvents, getMissionStatement } from "@/mocks/ministryData";

const { width: screenWidth } = Dimensions.get("window");
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
};

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

interface LeaderCardProps {
  leader: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    email?: string;
  };
  color: string;
}

function LeaderCard({ leader, color }: LeaderCardProps) {
  return (
    <TouchableOpacity style={styles.leaderCard} activeOpacity={0.7}>
      <Image source={{ uri: leader.avatar }} style={styles.leaderAvatar} />
      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName}>{leader.name}</Text>
        <Text style={[styles.leaderRole, { color }]}>
          {leader.role === "leader" ? "Ministry Leader" : leader.role === "admin" ? "Co-Leader" : "Team Member"}
        </Text>
      </View>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: color + "15" }]}>
        <Mail size={16} color={color} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    attendeesCount: number;
  };
  color: string;
}

function EventCard({ event, color }: EventCardProps) {
  const eventDate = new Date(event.date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleDateString("en-US", { month: "short" });

  return (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.7}>
      <View style={[styles.eventDateBox, { backgroundColor: color + "15" }]}>
        <Text style={[styles.eventDay, { color }]}>{day}</Text>
        <Text style={[styles.eventMonth, { color }]}>{month}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventTime}>{event.time}</Text>
        <View style={styles.eventMeta}>
          <MapPin size={12} color={Colors.textTertiary} />
          <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
        </View>
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function MinistryPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [isJoining, setIsJoining] = useState(false);

  const template = ministryTemplates.find((t) => t.id === id);
  const members = ministryMembers[id || ""] || [];
  const events = ministryEvents[id || ""] || [];
  const missionStatement = getMissionStatement(id || "");
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
    try {
      await Share.share({
        message: `Check out the ${template?.name} at our church!`,
        title: template?.name,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  }, [template]);

  const handleJoin = useCallback(async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsJoining(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (Platform.OS === "web") {
        alert("Your request to join has been submitted!");
      } else {
        Alert.alert("Request Sent", "Your request to join this ministry has been submitted for approval.");
      }
    } catch (error) {
      console.error("Join error:", error);
    } finally {
      setIsJoining(false);
    }
  }, [user, router]);

  if (!template) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Ministry not found</Text>
      </View>
    );
  }

  const IconComponent = iconMap[template.icon] || Users;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Image source={{ uri: template.coverImage }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />
        
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={[styles.ministryBadge, { backgroundColor: template.color }]}>
            <IconComponent size={32} color="#fff" />
          </View>
          <Text style={styles.ministryName}>{template.name}</Text>
          <Text style={styles.ministryCategory}>{template.category}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={14} color="#fff" />
              <Text style={styles.statText}>{members.length} members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Calendar size={14} color="#fff" />
              <Text style={styles.statText}>{events.length} events</Text>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.headerNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          
          <Animated.Text style={[styles.navTitle, { opacity: titleOpacity }]} numberOfLines={1}>
            {template.name}
          </Animated.Text>

          <View style={styles.navActions}>
            {canManage && (
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => router.push(`/admin/ministry-edit/${id}` as any)}
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
            <Text style={styles.descriptionText}>{template.description}</Text>
          </View>

          {missionStatement && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Our Mission</Text>
              <View style={[styles.missionCard, { borderLeftColor: template.color }]}>
                <Text style={styles.missionText}>{missionStatement}</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting Times</Text>
            {template.defaultSchedule.map((schedule, index) => (
              <ScheduleItem
                key={index}
                day={schedule.day}
                time={schedule.time}
                frequency={schedule.frequency}
                location="Main Campus"
                color={template.color}
              />
            ))}
          </View>

          {leaders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Leadership Team</Text>
                {canManage && (
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => router.push(`/admin/ministry-leaders/${id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={14} color={Colors.primary} />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
              </View>
              {leaders.map((leader) => (
                <LeaderCard key={leader.id} leader={leader} color={template.color} />
              ))}
            </View>
          )}

          {events.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.7}>
                  <Text style={styles.seeAllText}>See All</Text>
                  <ChevronRight size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} color={template.color} />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactCard}>
              <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
                <View style={[styles.contactIcon, { backgroundColor: template.color + "15" }]}>
                  <Mail size={18} color={template.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{template.id}@church.org</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
              <View style={styles.contactDivider} />
              <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
                <View style={[styles.contactIcon, { backgroundColor: template.color + "15" }]}>
                  <MessageCircle size={18} color={template.color} />
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
        <TouchableOpacity 
          style={[styles.joinButton, { backgroundColor: template.color }]} 
          onPress={handleJoin}
          disabled={isJoining}
          activeOpacity={0.8}
        >
          {isJoining ? (
            <Text style={styles.joinButtonText}>Sending Request...</Text>
          ) : (
            <>
              <UserPlus size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Join This Ministry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ministryCategory: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
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
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 12,
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
  missionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  missionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    fontStyle: "italic",
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
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.primary,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  eventDateBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  eventDay: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  eventMonth: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
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
});
