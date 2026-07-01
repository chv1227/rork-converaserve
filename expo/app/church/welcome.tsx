import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Heart,
  Baby,
  Music,
  Coffee,
  MessageCircle,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization } = useAuth();

  const churchName = currentOrganization?.name || "Our Church";

  const sections = [
    {
      icon: <Clock size={22} color="#0EA5E9" />,
      title: "Service Times",
      description: "Join us every Sunday at 9:00 AM and 11:00 AM. Wednesday Bible study at 7:00 PM.",
    },
    {
      icon: <MapPin size={22} color="#10B981" />,
      title: "Location & Parking",
      description: "We're located at 123 Faith Avenue. Free parking available in the main lot and overflow across the street.",
    },
    {
      icon: <Users size={22} color="#8B5CF6" />,
      title: "What to Expect",
      description: "A warm, welcoming community. Services last about 75 minutes with contemporary worship and relevant teaching.",
    },
    {
      icon: <Baby size={22} color="#F59E0B" />,
      title: "Kids & Youth",
      description: "Safe, fun programs for newborns through 12th grade. Our kids' ministry is available during both Sunday services.",
    },
    {
      icon: <Music size={22} color="#EF4444" />,
      title: "Worship Style",
      description: "Contemporary worship with a full band. Come as you are — jeans and t-shirts are totally fine!",
    },
    {
      icon: <Coffee size={22} color="#6366F1" />,
      title: "After Service",
      description: "Join us for free coffee and donuts in the fellowship hall after each service. We'd love to meet you!",
    },
  ];

  const handleContact = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/church/contact" as any);
  }, [router]);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Here?</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop" }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(27,54,93,0.25)", "rgba(15,36,64,0.85)"]}
            start={{ x: 0, y: 0.2 }} end={{ x: 0, y: 1 }}
            style={styles.heroOverlay}
          >
            <Text style={styles.heroTitle}>Welcome to {churchName}</Text>
            <Text style={styles.heroSubtitle}>
              We're so glad you're here! Here's everything you need to know for your first visit.
            </Text>
          </LinearGradient>
        </View>

        {/* Sections */}
        <View style={styles.sectionsList}>
          {sections.map((section, i) => (
            <View key={i} style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                {section.icon}
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                  {section.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={handleContact}
          activeOpacity={0.8}
        >
          <MessageCircle size={20} color="#FFFFFF" />
          <Text style={styles.ctaText}>Have Questions? Contact Us</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={[styles.planCard, { backgroundColor: colors.surface }]}>
          <Heart size={24} color={colors.primary} />
          <Text style={[styles.planTitle, { color: colors.text }]}>Plan Your Visit</Text>
          <Text style={[styles.planDesc, { color: colors.textSecondary }]}>
            Let us know you're coming and we'll have someone ready to greet you, show you around, and help you get your kids checked in.
          </Text>
          <TouchableOpacity
            style={[styles.planButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/forms" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.planButtonText}>Plan My Visit</Text>
          </TouchableOpacity>
        </View>
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
  heroCard: {
    height: 240,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
  },
  sectionsList: {
    gap: 10,
    marginBottom: 20,
  },
  sectionCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  planCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    marginTop: 12,
    marginBottom: 8,
  },
  planDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  planButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
