// Dashboard strip shown at the top of /ministry/[id]:
// upcoming events, open volunteer slots, last attendance, recent activity.
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, CalendarClock, ClipboardList, Megaphone, MessageCircle, UserCheck, Lock } from "lucide-react-native";
import Colors from "@/constants/colors";
import { db, isMissingRelation, timeAgo, todayISO } from "@/lib/ministryWorkspace";
import type { MinistryToolId } from "@/constants/ministryTools";

interface ActivityItem {
  id: string;
  kind: "announcement" | "task" | "task_done" | "attendance" | "message";
  text: string;
  at: string;
}

interface DashboardStats {
  upcomingEvents: number;
  openSlots: number;
  lastAttendance: { count: number; date: string } | null;
  activity: ActivityItem[];
}

async function countOrZero(promise: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await promise;
  return error ? 0 : count || 0;
}

async function fetchStats(ministryId: string): Promise<DashboardStats> {
  const nowISO = new Date().toISOString();

  const [churchEvents, ministryEvents, openSlots, attendance, announcements, tasks, messages] = await Promise.all([
    countOrZero(
      db.from("events").select("id", { count: "exact", head: true }).eq("ministry_id", ministryId).eq("status", "published").gte("start_datetime", nowISO)
    ),
    countOrZero(db.from("ministry_events").select("id", { count: "exact", head: true }).eq("ministry_id", ministryId).gte("start_datetime", nowISO)),
    countOrZero(
      db
        .from("ministry_roster_slots")
        .select("id", { count: "exact", head: true })
        .eq("ministry_id", ministryId)
        .is("assignee_profile_id", null)
        .gte("service_date", todayISO())
    ),
    db
      .from("ministry_attendance")
      .select("id, attendance_date, guest_count, created_at, ministry_attendance_records(status)")
      .eq("ministry_id", ministryId)
      .order("attendance_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    db.from("ministry_announcements").select("id, title, created_at").eq("ministry_id", ministryId).order("created_at", { ascending: false }).limit(3),
    db
      .from("ministry_tasks")
      .select("id, title, status, created_at, completed_at")
      .eq("ministry_id", ministryId)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("ministry_messages")
      .select("id, body, created_at, sender:profiles!ministry_messages_sender_id_fkey(display_name)")
      .eq("ministry_id", ministryId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const activity: ActivityItem[] = [];
  (announcements.data || []).forEach((a: { id: string; title: string; created_at: string }) =>
    activity.push({ id: `a-${a.id}`, kind: "announcement", text: `Announcement: ${a.title}`, at: a.created_at })
  );
  (tasks.data || []).forEach((t: { id: string; title: string; status: string; created_at: string; completed_at: string | null }) => {
    if (t.status === "done" && t.completed_at) activity.push({ id: `td-${t.id}`, kind: "task_done", text: `Task completed: ${t.title}`, at: t.completed_at });
    else activity.push({ id: `t-${t.id}`, kind: "task", text: `New task: ${t.title}`, at: t.created_at });
  });
  type MessageRow = { id: string; body: string; created_at: string; sender: { display_name: string | null } | null };
  ((messages.data || []) as unknown as MessageRow[]).forEach((m) =>
    activity.push({
      id: `m-${m.id}`,
      kind: "message",
      text: `${m.sender?.display_name || "Someone"}: ${m.body}`,
      at: m.created_at,
    })
  );

  let lastAttendance: DashboardStats["lastAttendance"] = null;
  if (!attendance.error) {
    const sessions = (attendance.data || []) as {
      id: string;
      attendance_date: string;
      guest_count: number;
      created_at: string;
      ministry_attendance_records: { status: string }[];
    }[];
    const countFor = (s: (typeof sessions)[number]) =>
      (s.ministry_attendance_records || []).filter((r) => r.status === "present" || r.status === "late").length + (s.guest_count || 0);
    if (sessions[0]) lastAttendance = { count: countFor(sessions[0]), date: sessions[0].attendance_date };
    sessions.slice(0, 2).forEach((s) =>
      activity.push({ id: `at-${s.id}`, kind: "attendance", text: `Attendance taken: ${countFor(s)} present`, at: s.created_at })
    );
  } else if (!isMissingRelation(attendance.error)) {
    console.log("[MinistryDashboard] attendance error:", attendance.error);
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    upcomingEvents: churchEvents + ministryEvents,
    openSlots,
    lastAttendance,
    activity: activity.slice(0, 5),
  };
}

const ACTIVITY_ICON = {
  announcement: Megaphone,
  task: ClipboardList,
  task_done: ClipboardList,
  attendance: UserCheck,
  message: MessageCircle,
} as const;

interface Props {
  ministryId: string;
  color: string;
  /** Opens a tool through the same gate as the tool grid (routes to /pricing when locked). */
  onOpenTool: (id: MinistryToolId) => void;
  isLocked: (id: MinistryToolId) => boolean;
}

export default function MinistryDashboardHeader({ ministryId, color, onOpenTool, isLocked }: Props) {
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["ministry-dashboard-stats", ministryId],
    queryFn: () => fetchStats(ministryId),
    enabled: !!ministryId,
    staleTime: 30_000,
  });

  const stats = statsQuery.data;

  const tiles: { id: MinistryToolId; label: string; value: string; icon: typeof CalendarRange }[] = [
    { id: "events", label: "Upcoming events", value: stats ? String(stats.upcomingEvents) : "–", icon: CalendarRange },
    { id: "volunteers", label: "Open slots", value: stats ? String(stats.openSlots) : "–", icon: CalendarClock },
    {
      id: "attendance",
      label: "Last attendance",
      value: stats?.lastAttendance ? String(stats.lastAttendance.count) : "–",
      icon: UserCheck,
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.tiles}>
        {tiles.map((t) => {
          const locked = isLocked(t.id);
          return (
            <TouchableOpacity key={t.id} style={styles.tile} activeOpacity={0.75} onPress={() => onOpenTool(t.id)}>
              <View style={styles.tileTop}>
                <t.icon size={16} color={color} />
                {locked ? <Lock size={12} color={Colors.textTertiary} /> : null}
              </View>
              {statsQuery.isLoading ? (
                <ActivityIndicator size="small" color={color} style={styles.tileLoader} />
              ) : (
                <Text style={styles.tileValue}>{t.value}</Text>
              )}
              <Text style={styles.tileLabel} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.activityCard}>
        <Text style={styles.activityTitle}>Recent activity</Text>
        {statsQuery.isLoading ? (
          <ActivityIndicator size="small" color={color} style={{ marginVertical: 8 }} />
        ) : statsQuery.isError ? (
          <TouchableOpacity onPress={() => statsQuery.refetch()}>
            <Text style={styles.activityEmpty}>Couldn't load activity. Tap to retry.</Text>
          </TouchableOpacity>
        ) : !stats || stats.activity.length === 0 ? (
          <Text style={styles.activityEmpty}>No activity yet. Post an announcement or create a task to get things going.</Text>
        ) : (
          stats.activity.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <View key={a.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: color + "15" }]}>
                  <Icon size={13} color={color} />
                </View>
                <Text style={styles.activityText} numberOfLines={1}>
                  {a.text}
                </Text>
                <Text style={styles.activityTime}>{timeAgo(a.at)}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 28 },
  tiles: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tile: {
    flex: 1,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  tileTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tileValue: { fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 8 },
  tileLoader: { marginTop: 10, marginBottom: 4, alignSelf: "flex-start" },
  tileLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: "600" },
  activityCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, padding: 14 },
  activityTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  activityEmpty: { fontSize: 13, color: Colors.textTertiary, lineHeight: 18 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  activityIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  activityText: { flex: 1, fontSize: 13, color: Colors.text },
  activityTime: { fontSize: 11, color: Colors.textTertiary },
});
