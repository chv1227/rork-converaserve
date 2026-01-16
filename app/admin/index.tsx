import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Stack, Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  UsersRound,
  AlertTriangle,
  Settings,
  Shield,
  Activity,
  ChevronRight,
  UserCheck,
  UserX,
  Calendar,
  Megaphone,
  Palette,
  Church,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
}

function StatCard({ icon, label, value, color, onPress }: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Container>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
}

function QuickAction({ icon, title, subtitle, onPress, badge }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIcon}>{icon}</View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

interface ActivityItemProps {
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

function ActivityItem({ action, details, userName, createdAt }: ActivityItemProps) {
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityDot} />
      <View style={styles.activityContent}>
        <Text style={styles.activityDetails}>{details}</Text>
        <Text style={styles.activityMeta}>
          {userName} • {formatTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      console.log("Non-admin user attempted to access admin panel, redirecting...");
      if (Platform.OS === "web") {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Access Denied", "You don't have permission to access the admin panel.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    }
  }, [isAdmin, router]);

  const statsQuery = trpc.admin.getEnhancedStats.useQuery(undefined, { enabled: isAdmin });
  const stats = statsQuery.data;

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Checking permissions...</Text>
      </View>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Loading dashboard...</Text>
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
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>Welcome back, {user?.name?.split(" ")[0]}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Shield size={14} color={Colors.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Users size={20} color="#3B82F6" />}
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="#3B82F6"
            onPress={() => router.push("/admin/users" as any)}
          />
          <StatCard
            icon={<UserCheck size={20} color="#10B981" />}
            label="Active"
            value={stats?.activeUsers || 0}
            color="#10B981"
          />
          <StatCard
            icon={<UsersRound size={20} color="#8B5CF6" />}
            label="Ministries"
            value={stats?.totalMinistries || 0}
            color="#8B5CF6"
            onPress={() => router.push("/admin/groups" as any)}
          />
          <StatCard
            icon={<AlertTriangle size={20} color="#F59E0B" />}
            label="Reports"
            value={stats?.pendingReports || 0}
            color="#F59E0B"
            onPress={() => router.push("/admin/moderation" as any)}
          />
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.totalEvents || 0} Events</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Megaphone size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.totalAnnouncements || 0} Announcements</Text>
          </View>
          <View style={styles.secondaryStat}>
            <UserX size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.suspendedUsers || 0} Suspended</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsSection}>
          <QuickAction
            icon={<Users size={20} color={Colors.primary} />}
            title="User Management"
            subtitle="View, edit, and manage users"
            onPress={() => router.push("/admin/users" as any)}
          />
          <QuickAction
            icon={<UsersRound size={20} color={Colors.primary} />}
            title="Ministry Management"
            subtitle="Manage ministries and members"
            onPress={() => router.push("/admin/groups" as any)}
          />
          <QuickAction
            icon={<AlertTriangle size={20} color={Colors.warning} />}
            title="Content Moderation"
            subtitle="Review reported content"
            onPress={() => router.push("/admin/moderation" as any)}
            badge={stats?.pendingReports}
          />
          <QuickAction
            icon={<Palette size={20} color={Colors.primary} />}
            title="Ministry Colors"
            subtitle="Manage ministry categories & colors"
            onPress={() => router.push("/admin/ministries" as any)}
          />
          <QuickAction
            icon={<Church size={20} color={Colors.primary} />}
            title="Create Church"
            subtitle="Register a new church profile"
            onPress={() => router.push("/church/create" as any)}
          />
          <QuickAction
            icon={<Settings size={20} color={Colors.primary} />}
            title="App Settings"
            subtitle="Configure app preferences"
            onPress={() => router.push("/settings" as Href)}
          />
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activitySection}>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity) => (
              <ActivityItem
                key={activity.id}
                action={activity.action}
                details={activity.details}
                userName={activity.userName}
                createdAt={activity.createdAt}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Activity size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  redirectText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
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
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  secondaryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryStatText: {
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
  quickActionsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textInverse,
  },
  activitySection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDetails: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  emptyActivity: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
