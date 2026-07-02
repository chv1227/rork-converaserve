import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  UserPlus,
  Baby,
  Users,
  Heart,
  UserCheck,
  Droplets,
  Church,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
} from "lucide-react-native";
import Banner from "@/components/Banner";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";

// ── Types ──

interface SignupRecord {
  id: string;
  signup_type: string;
  status: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface SignupCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  type: string;
  gradient: readonly [string, string, ...string[]];
  bgImage: string;
  iconBg: string;
}

// ── Signup Form Modal ──

interface FormField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "phone" | "textarea" | "date";
  required: boolean;
}

const SIGNUP_FORM_CONFIGS: Record<string, { title: string; description: string; fields: FormField[] }> = {
  church_membership: {
    title: "Church Membership",
    description: "Become an official member of our church family. We'll review your application and get back to you.",
    fields: [
      { key: "first_name", label: "First Name", placeholder: "Enter your first name", type: "text", required: true },
      { key: "last_name", label: "Last Name", placeholder: "Enter your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: false },
      { key: "previous_church", label: "Previous Church", placeholder: "Where did you attend before?", type: "text", required: false },
      { key: "salvation_testimony", label: "Brief Testimony", placeholder: "Tell us about your faith journey...", type: "textarea", required: false },
      { key: "areas_of_interest", label: "Areas of Interest", placeholder: "e.g., worship, kids, outreach, tech", type: "text", required: false },
    ],
  },
  childrens_ministry: {
    title: "Children's Ministry",
    description: "Register your children for our kids' programs. Safe, fun, and faith-filled environment for ages 0-12.",
    fields: [
      { key: "first_name", label: "Parent First Name", placeholder: "Your first name", type: "text", required: true },
      { key: "last_name", label: "Parent Last Name", placeholder: "Your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: true },
      { key: "additional_notes", label: "Child Details", placeholder: "Tell us about your child (name, age, any special needs or allergies)...", type: "textarea", required: true },
      { key: "emergency_contact", label: "Emergency Contact", placeholder: "Name and phone number", type: "text", required: true },
    ],
  },
  youth_ministry: {
    title: "Youth Ministry",
    description: "Connect your teen with our vibrant youth community. Grades 6-12.",
    fields: [
      { key: "first_name", label: "Parent First Name", placeholder: "Your first name", type: "text", required: true },
      { key: "last_name", label: "Parent Last Name", placeholder: "Your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: false },
      { key: "additional_notes", label: "Teen Details", placeholder: "Tell us about your teen (name, age, grade, interests)...", type: "textarea", required: true },
    ],
  },
  volunteer: {
    title: "Volunteer Signup",
    description: "Use your gifts to serve! We have opportunities in worship, kids, hospitality, tech, and more.",
    fields: [
      { key: "first_name", label: "First Name", placeholder: "Enter your first name", type: "text", required: true },
      { key: "last_name", label: "Last Name", placeholder: "Enter your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: false },
      { key: "volunteer_area", label: "Area of Interest", placeholder: "e.g., worship team, kids ministry, greeting, tech", type: "text", required: true },
      { key: "skills_or_talents", label: "Skills & Talents", placeholder: "Tell us about your gifts and experience...", type: "textarea", required: false },
      { key: "volunteer_availability", label: "Availability", placeholder: "e.g., Sunday mornings, Wednesday evenings", type: "text", required: false },
    ],
  },
  small_group: {
    title: "Small Group Signup",
    description: "Join a small group to grow in faith and build meaningful relationships.",
    fields: [
      { key: "first_name", label: "First Name", placeholder: "Enter your first name", type: "text", required: true },
      { key: "last_name", label: "Last Name", placeholder: "Enter your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: false },
      { key: "group_preference", label: "Group Preference", placeholder: "e.g., young adults, couples, men's, women's", type: "text", required: false },
      { key: "preferred_meeting_time", label: "Preferred Time", placeholder: "e.g., Tuesday evenings, Saturday mornings", type: "text", required: false },
    ],
  },
  baptism: {
    title: "Baptism Request",
    description: "Take the next step in your faith journey. We'd be honored to celebrate this milestone with you.",
    fields: [
      { key: "first_name", label: "First Name", placeholder: "Enter your first name", type: "text", required: true },
      { key: "last_name", label: "Last Name", placeholder: "Enter your last name", type: "text", required: true },
      { key: "email", label: "Email", placeholder: "Your email address", type: "email", required: true },
      { key: "phone", label: "Phone", placeholder: "Your phone number", type: "phone", required: false },
      { key: "salvation_testimony", label: "Your Testimony", placeholder: "Share your faith story...", type: "textarea", required: true },
    ],
  },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Hourglass size={14} color="#F59E0B" />, color: "#F59E0B", label: "Pending" },
  approved: { icon: <CheckCircle2 size={14} color="#10B981" />, color: "#10B981", label: "Approved" },
  rejected: { icon: <XCircle size={14} color="#EF4444" />, color: "#EF4444", label: "Not Approved" },
  waitlisted: { icon: <Clock size={14} color="#6366F1" />, color: "#6366F1", label: "Waitlisted" },
};

// ── Main Signup Screen ──

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, currentOrganization, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successType, setSuccessType] = useState<string | null>(null);

  const orgId = currentOrganization?.id;

  const signupCategories: SignupCategory[] = useMemo(() => [
    {
      id: "church_membership",
      icon: <Church size={24} color="#FFFFFF" />,
      label: "Church Membership",
      subtitle: "Become an official member of our church family",
      type: "church_membership",
      gradient: ["rgba(27,54,93,0.55)", "rgba(15,36,64,0.90)"],
      bgImage: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=400&fit=crop",
      iconBg: "#1B365D",
    },
    {
      id: "childrens_ministry",
      icon: <Baby size={24} color="#FFFFFF" />,
      label: "Children's Ministry",
      subtitle: "Register kids for our safe, fun programs (ages 0-12)",
      type: "childrens_ministry",
      gradient: ["rgba(245,158,11,0.50)", "rgba(217,119,6,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&h=400&fit=crop",
      iconBg: "#F59E0B",
    },
    {
      id: "youth_ministry",
      icon: <Users size={24} color="#FFFFFF" />,
      label: "Youth Ministry",
      subtitle: "Connect teens to our vibrant youth community (Grades 6-12)",
      type: "youth_ministry",
      gradient: ["rgba(139,92,246,0.50)", "rgba(109,40,217,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop",
      iconBg: "#8B5CF6",
    },
    {
      id: "volunteer",
      icon: <Heart size={24} color="#FFFFFF" />,
      label: "Volunteer",
      subtitle: "Use your gifts to serve in worship, kids, tech & more",
      type: "volunteer",
      gradient: ["rgba(239,68,68,0.50)", "rgba(220,38,38,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop",
      iconBg: "#EF4444",
    },
    {
      id: "small_group",
      icon: <UserPlus size={24} color="#FFFFFF" />,
      label: "Small Groups",
      subtitle: "Join a group to grow in faith and build relationships",
      type: "small_group",
      gradient: ["rgba(16,185,129,0.50)", "rgba(5,150,105,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=400&fit=crop",
      iconBg: "#10B981",
    },
    {
      id: "baptism",
      icon: <Droplets size={24} color="#FFFFFF" />,
      label: "Baptism",
      subtitle: "Take the next step in your faith journey",
      type: "baptism",
      gradient: ["rgba(14,165,233,0.50)", "rgba(2,132,199,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop",
      iconBg: "#0EA5E9",
    },
  ], []);

  // ── Fetch user's existing signups ──

  const signupsQuery = useQuery<SignupRecord[]>({
    queryKey: ["signups", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("church_membership_signups")
        .select("id, signup_type, status, first_name, last_name, created_at")
        .eq("church_id", orgId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data || []) as SignupRecord[];
    },
    enabled: !!orgId && !!user?.id,
  });

  const signups = signupsQuery.data || [];
  const isLoading = signupsQuery.isLoading;

  // ── Submit signup mutation ──

  const submitSignup = useMutation({
    mutationFn: async (params: { signupType: string; data: Record<string, string> }) => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");

      const payload: Record<string, unknown> = {
        church_id: orgId,
        user_id: user.id,
        signup_type: params.signupType,
        status: "pending",
        first_name: params.data.first_name || user.name?.split(" ")[0] || "",
        last_name: params.data.last_name || user.name?.split(" ").slice(1).join(" ") || "",
        email: params.data.email || user.email || "",
        phone: params.data.phone || undefined,
        additional_notes: params.data.additional_notes || undefined,
        previous_church: params.data.previous_church || undefined,
        salvation_testimony: params.data.salvation_testimony || undefined,
        areas_of_interest: params.data.areas_of_interest
          ? params.data.areas_of_interest.split(",").map((s: string) => s.trim())
          : undefined,
        volunteer_area: params.data.volunteer_area || undefined,
        skills_or_talents: params.data.skills_or_talents
          ? params.data.skills_or_talents.split(",").map((s: string) => s.trim())
          : undefined,
        volunteer_availability: params.data.volunteer_availability
          ? params.data.volunteer_availability.split(",").map((s: string) => s.trim())
          : undefined,
        group_preference: params.data.group_preference || undefined,
        preferred_meeting_time: params.data.preferred_meeting_time || undefined,
        emergency_contact: params.data.emergency_contact || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("church_membership_signups")
        .insert(payload);

      if (error) throw new Error(error.message || "Failed to submit");
    },
    onSuccess: () => {
      setSuccessType(showForm);
      setShowForm(null);
      setFormData({});
      signupsQuery.refetch();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to submit signup. Please try again.");
    },
  });

  const handleOpenForm = useCallback((type: string) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFormData({});
    setShowForm(type);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(null);
    setFormData({});
  }, []);

  const handleSubmitForm = useCallback(async () => {
    if (!showForm) return;
    const config = SIGNUP_FORM_CONFIGS[showForm];
    if (!config) return;

    const missing = config.fields.filter((f) => f.required && !formData[f.key]?.trim());
    if (missing.length > 0) {
      Alert.alert("Required Fields", `Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    submitSignup.mutate({ signupType: showForm, data: formData });
    setSubmitting(false);
  }, [showForm, formData, submitSignup]);

  const updateFormField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await signupsQuery.refetch();
    setRefreshing(false);
  }, [signupsQuery]);

  const getSignupTypeLabel = useCallback((type: string): string => {
    const cat = signupCategories.find((c) => c.type === type);
    return cat?.label || type.replace(/_/g, " ");
  }, [signupCategories]);

  const handleViewAllForms = useCallback(() => {
    router.push("/forms" as Href);
  }, [router]);

  // ── Render ──

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap]}>
        <LinearGradient
          colors={["#0A1628", "#112240", "#1A365D", "#1E4A6E"]}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <ChevronRight size={22} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Get Involved</Text>
              <View style={{ width: 40 }} />
            </View>
            <Text style={styles.headerSubtitle}>
              Sign up for membership, ministries, volunteering, and more
            </Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Success Banner ── */}
        {successType && (
          <Banner
            variant="success"
            title="Signup Submitted!"
            subtitle={`Your ${getSignupTypeLabel(successType)} application has been received. We'll review it and get back to you soon.`}
            onDismiss={() => setSuccessType(null)}
          />
        )}

        {/* ── Signup Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={17} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Signup Options</Text>
          </View>

          {signupCategories.map((cat, index) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => handleOpenForm(cat.type)}
              activeOpacity={0.92}
            >
              <Image source={{ uri: cat.bgImage }} style={styles.categoryBg} contentFit="cover" />
              <LinearGradient
                colors={[...cat.gradient]}
                start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.3 }}
                style={styles.categoryOverlay}
              >
                <View style={styles.categoryContent}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: cat.iconBg }]}>
                    {cat.icon}
                  </View>
                  <View style={styles.categoryText}>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                    <Text style={styles.categorySubtitle} numberOfLines={2}>{cat.subtitle}</Text>
                  </View>
                  <View style={styles.categoryArrow}>
                    <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── My Signups ── */}
        {signups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={17} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Signups</Text>
            </View>

            {signups.map((signup) => {
              const statusCfg = STATUS_CONFIG[signup.status] || STATUS_CONFIG.pending;
              return (
                <View
                  key={signup.id}
                  style={[styles.signupCard, { backgroundColor: colors.surface }]}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
                  <View style={styles.signupCardContent}>
                    <Text style={[styles.signupCardTitle, { color: colors.text }]}>
                      {getSignupTypeLabel(signup.signup_type)}
                    </Text>
                    <Text style={[styles.signupCardName, { color: colors.textSecondary }]}>
                      {signup.first_name} {signup.last_name}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "14" }]}>
                    {statusCfg.icon}
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Browse All Forms ── */}
        <TouchableOpacity
          style={[styles.allFormsCard, { backgroundColor: colors.surface }]}
          onPress={handleViewAllForms}
          activeOpacity={0.8}
        >
          <View style={[styles.allFormsIcon, { backgroundColor: colors.primary + "0F" }]}>
            <ClipboardList size={22} color={colors.primary} />
          </View>
          <View style={styles.allFormsContent}>
            <Text style={[styles.allFormsTitle, { color: colors.text }]}>Browse All Forms</Text>
            <Text style={[styles.allFormsSub, { color: colors.textSecondary }]}>
              View all available registration and signup forms
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Signup Form Modal ── */}
      <Modal
        visible={!!showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        {showForm && SIGNUP_FORM_CONFIGS[showForm] && (
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
              <TouchableOpacity
                onPress={handleCloseForm}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
                activeOpacity={0.7}
              >
                <XCircle size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {SIGNUP_FORM_CONFIGS[showForm].title}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                {SIGNUP_FORM_CONFIGS[showForm].description}
              </Text>

              {SIGNUP_FORM_CONFIGS[showForm].fields.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {field.label}
                    {field.required && <Text style={styles.fieldRequired}> *</Text>}
                  </Text>
                  {field.type === "textarea" ? (
                    <TextInput
                      style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textTertiary}
                      value={formData[field.key] || ""}
                      onChangeText={(v) => updateFormField(field.key, v)}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  ) : (
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textTertiary}
                      value={formData[field.key] || ""}
                      onChangeText={(v) => updateFormField(field.key, v)}
                      keyboardType={field.type === "email" ? "email-address" : field.type === "phone" ? "phone-pad" : "default"}
                      autoCapitalize={field.type === "email" ? "none" : "words"}
                    />
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleSubmitForm}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <UserCheck size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Signup</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  headerWrap: { overflow: "hidden", borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerGradient: { paddingBottom: 28 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800" as const, color: "#FFFFFF" },
  headerSubtitle: {
    fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 20,
    paddingHorizontal: 2,
  },
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const },
  // Category cards
  categoryCard: {
    height: 120, borderRadius: 18, overflow: "hidden", marginBottom: 10,
  },
  categoryBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  categoryOverlay: { flex: 1, justifyContent: "flex-end" },
  categoryContent: {
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 14,
  },
  categoryIconCircle: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  categoryText: { flex: 1 },
  categoryLabel: {
    fontSize: 16, fontWeight: "800" as const, color: "#FFFFFF", marginBottom: 3,
  },
  categorySubtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.80)", lineHeight: 18,
  },
  categoryArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  // My signups
  signupCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  signupCardContent: { flex: 1 },
  signupCardTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  signupCardName: { fontSize: 12 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "700" as const },
  // All forms
  allFormsCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 18, padding: 18,
  },
  allFormsIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  allFormsContent: { flex: 1 },
  allFormsTitle: { fontSize: 16, fontWeight: "700" as const, marginBottom: 4 },
  allFormsSub: { fontSize: 13, lineHeight: 18 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  modalDesc: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  // Form fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: "600" as const, marginBottom: 8 },
  fieldRequired: { color: "#EF4444" },
  textInput: {
    height: 48, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, fontSize: 15,
  },
  textArea: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingTop: 12,
    fontSize: 15, minHeight: 100,
  },
  submitButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 12,
  },
  submitButtonText: { fontSize: 16, fontWeight: "700" as const, color: "#FFFFFF" },
});
