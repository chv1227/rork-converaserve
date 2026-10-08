import React, { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Minus, Plus, UserCheck } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, formatDate, isMissingRelation, isValidISODate, todayISO } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { useMinistryMembers } from "@/hooks/useMinistryMembers";
import {
  Chip,
  Field,
  FormSheet,
  MinistryCtx,
  PrimaryButton,
  SectionLabel,
  StateView,
  ToolScreen,
  cardStyle,
  toolStyles,
} from "@/components/ministry/ToolScaffold";

interface AttendanceSession {
  id: string;
  attendance_date: string;
  label: string | null;
  guest_count: number;
  notes: string | null;
  ministry_attendance_records: { profile_id: string; status: string }[];
}

interface Editor {
  sessionId?: string;
  date: string;
  label: string;
  guests: number;
  notes: string;
  present: string[];
}

function presentCount(s: Pick<AttendanceSession, "ministry_attendance_records" | "guest_count">): number {
  const members = (s.ministry_attendance_records || []).filter((r) => r.status === "present" || r.status === "late").length;
  return members + (s.guest_count || 0);
}

export default function MinistryAttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ToolScreen ministryId={id} title="Attendance" minPlan={getToolPlan("attendance")}>
      {(ctx) => <AttendanceBody ctx={ctx} />}
    </ToolScreen>
  );
}

function AttendanceBody({ ctx }: { ctx: MinistryCtx }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const { members } = useMinistryMembers(ministryId);
  const [editor, setEditor] = useState<Editor | null>(null);

  const sessionsQuery = useQuery<AttendanceSession[]>({
    queryKey: ["ministry-attendance", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_attendance")
        .select("id, attendance_date, label, guest_count, notes, ministry_attendance_records(profile_id, status)")
        .eq("ministry_id", ministryId)
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data || []) as unknown as AttendanceSession[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (e: Editor) => {
      let sessionId = e.sessionId;
      const sessionPayload = {
        attendance_date: e.date.trim(),
        label: e.label.trim() || null,
        guest_count: e.guests,
        notes: e.notes.trim() || null,
      };
      if (sessionId) {
        const { error } = await db.from("ministry_attendance").update(sessionPayload).eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from("ministry_attendance")
          .insert({ ...sessionPayload, church_id: churchId, ministry_id: ministryId, created_by: profileId })
          .select("id")
          .single();
        if (error) throw error;
        sessionId = data.id as string;
      }
      if (members.length > 0) {
        const rows = members.map((m) => ({
          attendance_id: sessionId,
          ministry_id: ministryId,
          church_id: churchId,
          profile_id: m.profile_id,
          status: e.present.includes(m.profile_id) ? "present" : "absent",
        }));
        const { error } = await db.from("ministry_attendance_records").upsert(rows, { onConflict: "attendance_id,profile_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ["ministry-attendance", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
    },
    onError: (err) => Alert.alert("Couldn't save attendance", errorMessage(err)),
  });

  const sessions = sessionsQuery.data || [];
  const average = useMemo(() => {
    const recent = sessions.slice(0, 8);
    if (recent.length === 0) return 0;
    return Math.round(recent.reduce((sum, s) => sum + presentCount(s), 0) / recent.length);
  }, [sessions]);

  const startNew = () => {
    const today = todayISO();
    const existing = sessions.find((s) => s.attendance_date === today && !s.label);
    if (existing) return openSession(existing);
    setEditor({ date: today, label: "", guests: 0, notes: "", present: [] });
  };

  const openSession = (s: AttendanceSession) => {
    setEditor({
      sessionId: s.id,
      date: s.attendance_date,
      label: s.label || "",
      guests: s.guest_count || 0,
      notes: s.notes || "",
      present: (s.ministry_attendance_records || []).filter((r) => r.status === "present" || r.status === "late").map((r) => r.profile_id),
    });
  };

  const submit = () => {
    if (!editor) return;
    if (!isValidISODate(editor.date)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
    saveMutation.mutate(editor);
  };

  if (sessionsQuery.isLoading) return <StateView kind="loading" title="Loading attendance..." />;
  if (sessionsQuery.isError) {
    const missing = isMissingRelation(sessionsQuery.error);
    return (
      <StateView
        kind="error"
        title={missing ? "Attendance isn't set up yet" : "Couldn't load attendance"}
        description={missing ? "The attendance tables haven't been created. Apply sql/16_ministry_workspace_v2.sql." : errorMessage(sessionsQuery.error)}
        actionLabel="Retry"
        onAction={() => sessionsQuery.refetch()}
      />
    );
  }

  const presentSet = new Set(editor?.present || []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={toolStyles.content}
        refreshControl={<RefreshControl refreshing={sessionsQuery.isRefetching} onRefresh={() => sessionsQuery.refetch()} tintColor={accent} />}
        ListHeaderComponent={
          <View>
            <View style={[styles.summary, cardStyle(colors)]}>
              <Stat label="Last count" value={sessions[0] ? presentCount(sessions[0]) : "—"} color={colors.text} sub={colors.textSecondary} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Stat label="Avg (last 8)" value={sessions.length ? average : "—"} color={colors.text} sub={colors.textSecondary} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Stat label="Gatherings" value={sessions.length} color={colors.text} sub={colors.textSecondary} />
            </View>
            {isLeader ? (
              <View style={{ marginBottom: 16 }}>
                <PrimaryButton label="Take attendance" onPress={startNew} color={accent} icon={<UserCheck size={18} color="#fff" />} />
              </View>
            ) : null}
            {sessions.length > 0 ? <SectionLabel>History</SectionLabel> : null}
          </View>
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<UserCheck size={30} color={colors.textTertiary} />}
            title="No attendance yet"
            description={isLeader ? "Take attendance at your next gathering to start tracking." : "Your leaders haven't recorded attendance yet."}
          />
        }
        renderItem={({ item }) => {
          const records = item.ministry_attendance_records || [];
          const presentMembers = records.filter((r) => r.status === "present" || r.status === "late").length;
          return (
            <TouchableOpacity
              style={[toolStyles.card, cardStyle(colors)]}
              activeOpacity={isLeader ? 0.7 : 1}
              onPress={() => (isLeader ? openSession(item) : undefined)}
            >
              <View style={toolStyles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[toolStyles.title, { color: colors.text }]}>
                    {formatDate(item.attendance_date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                  <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                    {item.label ? `${item.label} · ` : ""}
                    {presentMembers} of {records.length} members{item.guest_count ? ` + ${item.guest_count} guests` : ""}
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: accent + "18" }]}>
                  <Text style={[styles.countText, { color: accent }]}>{presentCount(item)}</Text>
                </View>
              </View>
              {item.notes ? <Text style={[toolStyles.body, { color: colors.textSecondary }]}>{item.notes}</Text> : null}
            </TouchableOpacity>
          );
        }}
      />

      <FormSheet
        visible={!!editor}
        title={editor?.sessionId ? "Edit attendance" : "Take attendance"}
        onClose={() => setEditor(null)}
        onSubmit={submit}
        submitLabel={`Save · ${(editor?.present.length || 0) + (editor?.guests || 0)} present`}
        submitting={saveMutation.isPending}
        color={accent}
      >
        {editor ? (
          <>
            <Field label="Date (YYYY-MM-DD)" value={editor.date} onChangeText={(v) => setEditor({ ...editor, date: v })} autoCapitalize="none" />
            <Field label="Gathering (optional)" value={editor.label} onChangeText={(v) => setEditor({ ...editor, label: v })} placeholder="e.g. Sunday rehearsal" />
            <SectionLabel
              right={
                <View style={toolStyles.row}>
                  <Chip label="All" selected={false} onPress={() => setEditor({ ...editor, present: members.map((m) => m.profile_id) })} color={accent} />
                  <Chip label="None" selected={false} onPress={() => setEditor({ ...editor, present: [] })} color={accent} />
                </View>
              }
            >
              Members ({editor.present.length}/{members.length})
            </SectionLabel>
            {members.length === 0 ? <Text style={{ color: colors.textTertiary, marginBottom: 12 }}>No members in this ministry yet.</Text> : null}
            {members.map((m) => {
              const on = presentSet.has(m.profile_id);
              return (
                <TouchableOpacity
                  key={m.profile_id}
                  style={[styles.memberRow, { borderColor: colors.borderLight }]}
                  onPress={() =>
                    setEditor({
                      ...editor,
                      present: on ? editor.present.filter((p) => p !== m.profile_id) : [...editor.present, m.profile_id],
                    })
                  }
                >
                  {on ? <CheckCircle2 size={22} color={colors.success} /> : <Circle size={22} color={colors.border} />}
                  <Text style={[styles.memberName, { color: colors.text }]}>{displayName(m.profiles)}</Text>
                </TouchableOpacity>
              );
            })}
            <SectionLabel>Guests</SectionLabel>
            <View style={[toolStyles.row, { marginBottom: 14 }]}>
              <TouchableOpacity
                style={[styles.stepper, { borderColor: colors.border }]}
                onPress={() => setEditor({ ...editor, guests: Math.max(0, editor.guests - 1) })}
              >
                <Minus size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.guestCount, { color: colors.text }]}>{editor.guests}</Text>
              <TouchableOpacity style={[styles.stepper, { borderColor: colors.border }]} onPress={() => setEditor({ ...editor, guests: editor.guests + 1 })}>
                <Plus size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Field label="Notes" value={editor.notes} onChangeText={(v) => setEditor({ ...editor, notes: v })} placeholder="Optional" multiline />
          </>
        ) : null}
      </FormSheet>
    </View>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: number | string; color: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: sub }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginBottom: 14 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  divider: { width: 1, marginVertical: 4 },
  countBadge: { minWidth: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  countText: { fontSize: 16, fontWeight: "800" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  memberName: { fontSize: 15, fontWeight: "500" },
  stepper: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  guestCount: { fontSize: 18, fontWeight: "700", minWidth: 32, textAlign: "center" },
});
