import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, ActivityIndicator,
} from "react-native";
import { Stack, useRouter, Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarDays, Clock, MapPin, UserPlus } from "lucide-react-native";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Event } from "@/types";

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatEventTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function isUpcoming(dateStr: string): boolean {
  try {
    return new Date(dateStr) >= new Date(new Date().toDateString());
  } catch {
    return false;
  }
}

function isPast(dateStr: string): boolean {
  return !isUpcoming(dateStr);
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { events, getUpcomingEvents, isRefreshing, refresh, rsvpToEvent, isLoading } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const allEvents = useMemo(() => events, [events]);
  const upcomingEvents = useMemo(() => getUpcomingEvents(999), [getUpcomingEvents]);

  const upcoming = useMemo(() => allEvents.filter((e) => isUpcoming(e.date)), [allEvents]);
  const past = useMemo(() => allEvents.filter((e) => isPast(e.date)), [allEvents]);

  const onRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    try { await refresh(); } catch { /* silent */ }
    finally { setLocalRefreshing(false); }
  }, [refresh]);

  const isRefreshingNow = localRefreshing || isRefreshing;

  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/events/${eventId}` as Href);
  }, [router]);

  const handleRsvp = useCallback(async (eventId: string) => {
    await rsvpToEvent(eventId, "going");
  }, [rsvpToEvent]);

  const renderEventCard = useCallback((event: Event) => {
    const eventColor = event.color || "#0EA5E9";
    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, { backgroundColor: colors.surface }]}
        onPress={() => handleEventPress(event.id)}
        activeOpacity={0.9}
      >
        <View style={styles.eventDateBlock}>
          <View style={[styles.eventDateBadge, { backgroundColor: eventColor + "15" }]}>
            <Text style={[styles.eventDateDay, { color: eventColor }]}>
              {(() => { try { return new Date(event.date).getDate(); } catch { return "?"; } })()}
            </Text>
            <Text style={[styles.eventDateMonth, { color: eventColor }]}>
              {(() => { try { return new Date(event.date).toLocaleString(undefined, { month: "short" }); } catch { return ""; } })()}
            </Text>
          </View>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {event.description ? (
            <Text style={[styles.eventDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {event.description}
            </Text>
          ) : null}
          <View style={styles.eventMeta}>
            {event.time ? (
              <View style={styles.metaItem}>
                <Clock size={13} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatEventTime(event.time)}
                </Text>
              </View>
            ) : null}
            {event.location ? (
              <View style={styles.metaItem}>
                <MapPin size={13} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            ) : null}
            {event.ministryName ? (
              <View style={styles.metaItem}>
                <UserPlus size={13} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: eventColor }]}>
                  {event.ministryName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleEventPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + 8,
        backgroundColor: colors.surface,
        borderBottomColor: colors.borderLight,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Events</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingNow}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && allEvents.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : allEvents.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + "08" }]}>
              <CalendarDays size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No events yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Church events will appear here once they are scheduled
            </Text>
          </View>
        ) : (
          <>
            {/* Upcoming Events */}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: "#10B981" }]} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: "#10B981" + "15" }]}>
                    <Text style={[styles.sectionBadgeText, { color: "#10B981" }]}>
                      {upcoming.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventsList}>
                  {upcoming.map(renderEventCard)}
                </View>
              </View>
            )}

            {/* Past Events */}
            {past.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.textTertiary }]} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Past</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: colors.textTertiary + "15" }]}>
                    <Text style={[styles.sectionBadgeText, { color: colors.textTertiary }]}>
                      {past.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventsList}>
                  {past.map(renderEventCard)}
                </View>
              </View>
            )}
          </>
        )}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" as const },
  scrollView: { flex: 1, paddingTop: 16 },
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2 },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: "700" as const },
  eventsList: { gap: 10 },
  eventCard: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  eventDateBlock: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  eventDateBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eventDateDay: { fontSize: 22, fontWeight: "800" as const },
  eventDateMonth: { fontSize: 12, fontWeight: "600" as const, textTransform: "uppercase" as const },
  eventInfo: { flex: 1, padding: 16, paddingLeft: 0, justifyContent: "center" },
  eventTitle: { fontSize: 16, fontWeight: "700" as const, lineHeight: 21, marginBottom: 4 },
  eventDescription: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  eventMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "500" as const },
  loadingState: { padding: 60, alignItems: "center" },
  emptyState: {
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
