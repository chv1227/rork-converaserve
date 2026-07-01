import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  Users,
  Baby,
  Coffee,
  Music,
  BookOpen,
  Globe,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface ServiceItem {
  day: string;
  time: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function ServiceTimesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization } = useAuth();

  const churchName = currentOrganization?.name || "Our Church";

  const services: ServiceItem[] = useMemo(() => [
    {
      day: "Sunday",
      time: "9:00 AM",
      label: "First Service",
      description: "Traditional worship with hymns and choir. Communion served on the first Sunday of each month.",
      icon: <Music size={22} color="#FFFFFF" />,
      color: "#6366F1",
    },
    {
      day: "Sunday",
      time: "11:00 AM",
      label: "Second Service",
      description: "Contemporary worship with full band. Kids' ministry and youth programs available.",
      icon: <Users size={22} color="#FFFFFF" />,
      color: "#0EA5E9",
    },
    {
      day: "Wednesday",
      time: "7:00 PM",
      label: "Bible Study",
      description: "Midweek deep dive into Scripture. Small groups for all ages. Prayer meeting follows at 8:15 PM.",
      icon: <BookOpen size={22} color="#FFFFFF" />,
      color: "#10B981",
    },
    {
      day: "Thursday",
      time: "6:30 AM",
      label: "Morning Prayer",
      description: "Early morning prayer gathering. Join us as we start the day in prayer and worship.",
      icon: <Clock size={22} color="#FFFFFF" />,
      color: "#F59E0B",
    },
    {
      day: "Saturday",
      time: "5:00 PM",
      label: "Youth Service",
      description: "Dynamic service for middle and high school students. Games, worship, and relevant teaching.",
      icon: <Baby size={22} color="#FFFFFF" />,
      color: "#8B5CF6",
    },
  ] as ServiceItem[], []);

  const amenities = [
    { icon: <Coffee size={20} color="#F59E0B" />, label: "Free coffee & refreshments" },
    { icon: <Baby size={20} color="#EC4899" />, label: "Nursery & kids' programs" },
    { icon: <Globe size={20} color="#6366F1" />, label: "Online streaming available" },
    { icon: <MapPin size={20} color="#10B981" />, label: "Ample free parking" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Service Times</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Church Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              123 Faith Avenue, Your City, ST 12345
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Sunday: 9:00 AM & 11:00 AM
            </Text>
          </View>
        </View>

        {/* Service Cards */}
        <View style={styles.servicesList}>
          {services.map((service, i) => (
            <View key={i} style={[styles.serviceCard, { backgroundColor: colors.surface }]}>
              <View style={styles.serviceCardLeft}>
                <View style={[styles.serviceIconCircle, { backgroundColor: service.color }]}>
                  {service.icon}
                </View>
              </View>
              <View style={styles.serviceContent}>
                <View style={styles.serviceBadgeRow}>
                  <View style={[styles.dayBadge, { backgroundColor: service.color + "14" }]}>
                    <Calendar size={11} color={service.color} />
                    <Text style={[styles.dayBadgeText, { color: service.color }]}>
                      {service.day}
                    </Text>
                  </View>
                  <View style={[styles.timeBadge, { backgroundColor: colors.surfaceSecondary }]}>
                    <Clock size={11} color={colors.textSecondary} />
                    <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]}>
                      {service.time}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.serviceLabel, { color: colors.text }]}>{service.label}</Text>
                <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>
                  {service.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Amenities */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What We Offer</Text>
        <View style={styles.amenitiesGrid}>
          {amenities.map((item, i) => (
            <View key={i} style={[styles.amenityCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.amenityIcon, { backgroundColor: colors.surfaceSecondary }]}>
                {item.icon}
              </View>
              <Text style={[styles.amenityLabel, { color: colors.text }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "20" }]}
          onPress={() => {
            if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/church/welcome" as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.ctaContent}>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>First time joining us?</Text>
            <Text style={[styles.ctaDesc, { color: colors.textSecondary }]}>
              Learn more about what to expect on your first visit to {churchName}.
            </Text>
          </View>
          <ChevronRight size={22} color={colors.primary} />
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  servicesList: {
    gap: 10,
    marginBottom: 24,
  },
  serviceCard: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  serviceCardLeft: {
    alignItems: "center",
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceContent: {
    flex: 1,
  },
  serviceBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  serviceLabel: {
    fontSize: 17,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  amenityCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  amenityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  amenityLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    marginBottom: 20,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  ctaDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
});
