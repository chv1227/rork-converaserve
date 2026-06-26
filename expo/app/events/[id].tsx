import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Globe,
  Video,
  Share2,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type RSVPStatus = "going" | "maybe" | "declined" | null;

interface EventData {
  id: string;
  church_id: string;
  ministry_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  start_datetime: string;
  end_datetime: string | null;
  location_name: string | null;
  is_online: boolean;
  online_url: string | null;
  requires_registration: boolean;
  max_attendees: number | null;
  image_url: string | null;
  ministries?: { name: string; color: string } | null;
  created_at: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, user } = useAuth();
  const { refresh } = useData();
  const queryClient = useQueryClient();

  const eventQuery = useQuery<EventData | null>({
    queryKey: ["event", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*, ministries(name, color)")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message || "Failed to load event");
      return data as EventData;
    },
    enabled: !!id,
  });

  const rsvpQuery = useQuery<{ status: RSVPStatus }>({
    queryKey: ["event-rsvp", id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return { status: null };
      const { data } = await (supabase as any)
        .from("event_registrations")
        .select("status")
        .eq("event_id", id)
        .eq("profile_id", user.id)
        .maybeSingle();
      const row = data as { status: string } | null;
      return { status: (row?.status || null) as RSVPStatus };
    },
    enabled: !!id && !!user?.id,
  });

  const attendeesQuery = useQuery<number>({
    queryKey: ["event-attendees", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count } = await (supabase as any)
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "going");
      return count || 0;
    },
    enabled: !!id,
  });

  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

  const event = eventQuery.data;
  const rsvpStatus = rsvpQuery.data?.status || null;
  const attendeeCount = attendeesQuery.data || 0;

  const formattedDate = useMemo(() => {
    if (!event?.start_datetime) return "";
    const date = new Date(event.start_datetime);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [event?.start_datetime]);

  const formattedTime = useMemo(() => {
    if (!event?.start_datetime) return "";
    const start = new Date(event.start_datetime);
    const startStr = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (!event?.end_datetime) return startStr;

    const end = new Date(event.end_datetime);
    const endStr = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${startStr} – ${endStr}`;
  }, [event?.start_datetime, event?.end_datetime]);

  const handleRSVP = useCallback(
    async (status: RSVPStatus) => {
      if (!user?.id || !id || !currentOrganization) return;

      setIsSubmittingRsvp(true);
      try {
        if (status === rsvpStatus) {
          setIsSubmittingRsvp(false);
          return;
        }

        if (status === null) {
          await (supabase as any)
            .from("event_registrations")
            .delete()
            .eq("event_id", id)
            .eq("profile_id", user.id);
        } else {
          await (supabase as any)
            .from("event_registrations")
            .upsert({
              event_id: id,
              profile_id: user.id,
              status,
              registered_at: new Date().toISOString(),
            });
        }

        await queryClient.invalidateQueries({ queryKey: ["event-rsvp", id, user.id] });
        await queryClient.invalidateQueries({ queryKey: ["event-attendees", id] });
      } catch (err) {
        Alert.alert("Error", "Failed to update RSVP. Please try again.");
      } finally {
        setIsSubmittingRsvp(false);
      }
    },
    [user?.id, id, currentOrganization, rsvpStatus, queryClient]
  );

  const handleShare = useCallback(async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `${event.title}\n${formattedDate} at ${formattedTime}\n\n${event.description || ""}`,
      });
    } catch {}
  }, [event, formattedDate, formattedTime]);

  if (eventQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { marginTop: 16 }]}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Event Details
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Share2 size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Title & Type */}
        <View style={styles.hero}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
              {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          {event.ministries && (
            <View style={styles.ministryRow}>
              <View style={[styles.ministryDot, { backgroundColor: event.ministries.color }]} />
              <Text style={[styles.ministryName, { color: event.ministries.color }]}>
                {event.ministries.name}
              </Text>
            </View>
          )}
        </View>

        {/* Date & Time Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "12" }]}>
              <Calendar size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formattedDate}</Text>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "12" }]}>
              <Clock size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formattedTime}</Text>
            </View>
          </View>

          {event.location_name && !event.is_online && (
            <>
              <View style={[styles.infoDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primary + "12" }]}>
                  <MapPin size={18} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{event.location_name}</Text>
                </View>
              </View>
            </>
          )}

          {event.is_online && event.online_url && (
            <>
              <View style={[styles.infoDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Video size={18} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Online</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{event.online_url}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text }]}>{event.description}</Text>
          </View>
        )}

        {/* Attendees */}
        {event.requires_registration && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Attendees</Text>
            <View style={[styles.attendeesRow, { backgroundColor: colors.surface }]}>
              <Users size={20} color={colors.primary} />
              <Text style={[styles.attendeesText, { color: colors.primary }]}>
                {attendeeCount}{event.max_attendees ? ` / ${event.max_attendees}` : ""} going
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* RSVP Bottom Bar */}
      {event.requires_registration && user && (
        <View
          style={[
            styles.rsvpBar,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: colors.surface,
              borderTopColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.rsvpLabel, { color: colors.textSecondary }]}>Your RSVP:</Text>
          <View style={styles.rsvpOptions}>
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                {
                  backgroundColor: rsvpStatus === "going" ? "#10B981" : colors.surfaceSecondary,
                  borderColor: rsvpStatus === "going" ? "#10B981" : colors.border,
                },
              ]}
              onPress={() => handleRSVP(rsvpStatus === "going" ? null : "going")}
              disabled={isSubmittingRsvp}
            >
              <CheckCircle2 size={16} color={rsvpStatus === "going" ? "#fff" : colors.textSecondary} />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: rsvpStatus === "going" ? "#fff" : colors.textSecondary },
                ]}
              >
                Going
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rsvpButton,
                {
                  backgroundColor: rsvpStatus === "maybe" ? "#F59E0B" : colors.surfaceSecondary,
                  borderColor: rsvpStatus === "maybe" ? "#F59E0B" : colors.border,
                },
              ]}
              onPress={() => handleRSVP(rsvpStatus === "maybe" ? null : "maybe")}
              disabled={isSubmittingRsvp}
            >
              <HelpCircle size={16} color={rsvpStatus === "maybe" ? "#fff" : colors.textSecondary} />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: rsvpStatus === "maybe" ? "#fff" : colors.textSecondary },
                ]}
              >
                Maybe
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rsvpButton,
                {
                  backgroundColor: rsvpStatus === "declined" ? "#EF4444" : colors.surfaceSecondary,
                  borderColor: rsvpStatus === "declined" ? "#EF4444" : colors.border,
                },
              ]}
              onPress={() => handleRSVP(rsvpStatus === "declined" ? null : "declined")}
              disabled={isSubmittingRsvp}
            >
              <XCircle size={16} color={rsvpStatus === "declined" ? "#fff" : colors.textSecondary} />
              <Text
                style={[
                  styles.rsvpButtonText,
                  { color: rsvpStatus === "declined" ? "#fff" : colors.textSecondary },
                ]}
              >
                Can't
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  shareButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  hero: { marginBottom: 20 },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  typeBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  title: { fontSize: 26, fontWeight: "800", lineHeight: 32, marginBottom: 8 },
  ministryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ministryDot: { width: 10, height: 10, borderRadius: 5 },
  ministryName: { fontSize: 14, fontWeight: "600" },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  infoIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  infoDivider: { height: 1, marginVertical: 14 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22 },
  attendeesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 16,
  },
  attendeesText: { fontSize: 16, fontWeight: "700" },
  rsvpBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  rsvpLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  rsvpOptions: { flexDirection: "row", gap: 10 },
  rsvpButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  rsvpButtonText: { fontSize: 13, fontWeight: "700" },
  errorText: { fontSize: 16 },
  backLink: {},
  backLinkText: { fontSize: 15, fontWeight: "600" },
});
