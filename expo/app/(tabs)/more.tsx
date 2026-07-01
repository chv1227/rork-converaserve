import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import {
  QrCode,
  HandHeart,
  PencilRuler,
  MessageSquareText,
  BarChart3,
  Settings,
  Church,
  Users,
  BookOpen,
  Music,
  Vote,
  FileText,
  ShieldCheck,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface QuickLinkItem {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  href: Href;
  color: string;
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, isAdmin } = useAuth();

  const handlePress = useCallback(
    (href: Href) => {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(href);
    },
    [router]
  );

  const quickLinks: QuickLinkItem[] = useMemo(() => {
    const base: QuickLinkItem[] = [
      {
        icon: <HandHeart size={22} color="#FFFFFF" />,
        label: "Prayer Requests",
        subtitle: "Submit & pray for requests",
        href: "/(tabs)/more" as Href,
        color: "#8B5CF6",
      },
      {
        icon: <QrCode size={22} color="#FFFFFF" />,
        label: "Scan QR Code",
        subtitle: "Quick check-in & giving",
        href: "/(tabs)/more" as Href,
        color: "#6366F1",
      },
      {
        icon: <BookOpen size={22} color="#FFFFFF" />,
        label: "Daily Devotional",
        subtitle: "Today's reading & reflection",
        href: "/worship" as Href,
        color: "#F59E0B",
      },
      {
        icon: <Music size={22} color="#FFFFFF" />,
        label: "Worship Music",
        subtitle: "Practice songs & learn parts",
        href: "/worship" as Href,
        color: "#10B981",
      },
      {
        icon: <Users size={22} color="#FFFFFF" />,
        label: "Community Groups",
        subtitle: "Join a small group",
        href: "/(tabs)/profile" as Href,
        color: "#0EA5E9",
      },
      {
        icon: <FileText size={22} color="#FFFFFF" />,
        label: "Forms & Signups",
        subtitle: "Register for events & ministries",
        href: "/forms" as Href,
        color: "#EF4444",
      },
      {
        icon: <MessageSquareText size={22} color="#FFFFFF" />,
        label: "Discussion Board",
        subtitle: "Join the conversation",
        href: "/(tabs)/profile" as Href,
        color: "#EC4899",
      },
      {
        icon: <Vote size={22} color="#FFFFFF" />,
        label: "Polls & Surveys",
        subtitle: "Share your voice",
        href: "/(tabs)/more" as Href,
        color: "#14B8A6",
      },
    ];

    if (isAdmin) {
      base.push({
        icon: <BarChart3 size={22} color="#FFFFFF" />,
        label: "Reports & Analytics",
        subtitle: "View church insights",
        href: "/admin" as Href,
        color: "#F97316",
      });
    }

    base.push({
      icon: <ShieldCheck size={22} color="#FFFFFF" />,
      label: "Privacy & Safety",
      subtitle: "Manage your data",
      href: "/settings" as Href,
      color: "#6B7280",
    });

    return base;
  }, [isAdmin]);

  const ministryLinks = useMemo(() => [
    {
      icon: <Church size={20} color="#6366F1" />,
      label: "Worship Team",
      subtitle: "Music & choir resources",
      href: "/worship" as Href,
    },
    {
      icon: <Users size={20} color="#10B981" />,
      label: "Youth Ministry",
      subtitle: "Middle & high school",
      href: "/(tabs)/profile" as Href,
    },
    {
      icon: <HandHeart size={20} color="#EF4444" />,
      label: "Outreach",
      subtitle: "Community service & missions",
      href: "/forms" as Href,
    },
    {
      icon: <PencilRuler size={20} color="#F59E0B" />,
      label: "Kids' Ministry",
      subtitle: "Nursery through 5th grade",
      href: "/(tabs)/profile" as Href,
    },
  ] as QuickLinkItem[], []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>More</Text>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.push("/settings" as Href)}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
      >
        {/* Organization */}
        {currentOrganization && (
          <View style={[styles.orgCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.orgIconCircle, { backgroundColor: colors.primary + "10" }]}>
              <Church size={28} color={colors.primary} />
            </View>
            <Text style={[styles.orgName, { color: colors.text }]}>{currentOrganization.name}</Text>
            <Text style={[styles.orgDesc, { color: colors.textSecondary }]}>
              Your church workspace
            </Text>
          </View>
        )}

        {/* Quick Links */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Links</Text>
        <View style={styles.linksGrid}>
          {quickLinks.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.linkCard, { backgroundColor: colors.surface }]}
              onPress={() => handlePress(link.href)}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIcon, { backgroundColor: link.color }]}>
                {link.icon}
              </View>
              <View style={styles.linkContent}>
                <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                <Text style={[styles.linkSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
                  {link.subtitle}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Ministry Quick Links */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ministries</Text>
        <View style={styles.ministriesGrid}>
          {ministryLinks.map((ministry, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.ministryCard, { backgroundColor: colors.surface }]}
              onPress={() => handlePress(ministry.href)}
              activeOpacity={0.7}
            >
              <View style={[styles.ministryIcon, { backgroundColor: colors.surfaceSecondary }]}>
                {ministry.icon}
              </View>
              <Text style={[styles.ministryLabel, { color: colors.text }]}>{ministry.label}</Text>
              <Text style={[styles.ministrySubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
                {ministry.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  orgCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  orgIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  orgDesc: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  linksGrid: {
    gap: 8,
    marginBottom: 24,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  linkIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  linkContent: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
  },
  ministriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  ministryCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  ministryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  ministryLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  ministrySubtitle: {
    fontSize: 11,
    textAlign: "center",
  },
});
