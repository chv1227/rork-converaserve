import React, { useMemo, useState } from "react";
import { View, Text, SectionList, RefreshControl, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, ChevronRight, Clock, MapPin, Plus, Repeat, Trash2 } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import {
  addDaysISO,
  addMonthsISO,
  db,
  errorMessage,
  formatDate,
  formatTime,
  isValidISODate,
  nextSundayISO,
  normaliseTime,
  todayISO,
} from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { Chip, Field, FormSheet, MinistryCtx, SectionLabel, StateView, ToolScreen, cardStyle, toolStyles } from "@/components/ministry/ToolScaffold";

// Ministry gatherings live in the existing `ministry_events` table (leader-managed).
// A recurring series is created as one row per occurrence. Church-wide `events`
// tagged with this ministry are shown read-only and open the existing event screen.

interface MinistryEvent {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
}

interface ChurchEvent {
  id: string;
  title: string;
  start_datetime: string;
  location_name: string | null;
}

type RepeatMode = "none" | "weekly" | "biweekly" | "monthly";

const REPEAT_OPTIONS: { value: RepeatMode; label: string }[] = [
  { value: "none", label: "Once" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const DURATIONS = [30, 60, 90, 120];

function occurrenceDates(start: string, repeat: RepeatMode, count: number): string[] {
  if (repeat === "none") return [start];
  return Array.from({ length: count }, (_, i) =>
    repeat === "monthly" ? addMonthsISO(start, i) : addDaysISO(start, i * (repeat === "weekly" ? 7 : 14))
  );
}

function toTimestamp(dateISO: string, hhmm: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export default function MinistryEventsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Recurring Events"
      minPlan={getToolPlan("events")}
      headerRight={(ctx) =>
        ctx.isLeader ? (
          <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setCreateOpen(true)} accessibilityLabel="New event">
            <Plus size={22} color={ctx.accent} />
          </TouchableOpacity>
        ) : null
      }
    >
      {(ctx) => <EventsBody ctx={ctx} createOpen={createOpen} setCreateOpen={setCreateOpen} />}
    </ToolScreen>
  );
}

function EventsBody({ ctx, createOpen, setCreateOpen }: { ctx: MinistryCtx; createOpen: boolean; setCreateOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(nextSundayISO());
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(60);
  const [repeat, setRepeat] = useState<RepeatMode>("weekly");
  const [count, setCount] = useState(8);

  const nowISO = useMemo(() => new Date().toISOString(), []);

  const eventsQuery = useQuery<{ ministry: MinistryEvent[]; church: ChurchEvent[] }>({
    queryKey: ["ministry-events", ministryId],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const [mev, cev] = await Promise.all([
        db
          .from("ministry_events")
          .select("id, title, description, location_name, start_datetime, end_datetime")
          .eq("ministry_id", ministryId)
          .gte("start_datetime", since.toISOString())
          .order("start_datetime", { ascending: true })
          .limit(200),
        db
          .from("events")
          .select("id, title, start_datetime, location_name")
          .eq("ministry_id", ministryId)
          .eq("status", "published")
          .gte("start_datetime", since.toISOString())
          .order("start_datetime", { ascending: true })
          .limit(50),
      ]);
      if (mev.error) throw mev.error;
      return { ministry: (mev.data || []) as MinistryEvent[], church: cev.error ? [] : ((cev.data || []) as ChurchEvent[]) };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ministry-events", ministryId] });
    queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const hhmm = normaliseTime(time)!;
      const rows = occurrenceDates(date.trim(), repeat, count).map((d) => {
        const start = toTimestamp(d, hhmm);
        const end = new Date(start.getTime() + duration * 60_000);
        return {
          ministry_id: ministryId,
          church_id: churchId,
          created_by: profileId,
          title: title.trim(),
          description: description.trim() || null,
          location_name: location.trim() || null,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
        };
      });
      const { error } = await db.from("ministry_events").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      invalidate();
      if (n > 1) Alert.alert("Series created", `${n} events were added to the calendar.`);
    },
    onError: (err) => Alert.alert("Couldn't create event", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await db.from("ministry_events").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't delete", errorMessage(err)),
  });

  const submit = () => {
    if (!title.trim()) return Alert.alert("Title required", "Name the gathering.");
    if (!isValidISODate(date)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
    if (date < todayISO()) return Alert.alert("Date in the past", "Choose today or a future date.");
    if (!normaliseTime(time)) return Alert.alert("Invalid time", "Use 24-hour HH:MM, e.g. 18:30.");
    createMutation.mutate();
  };

  const confirmDelete = (ev: MinistryEvent) => {
    const series = (eventsQuery.data?.ministry || []).filter((e) => e.title === ev.title && (e.start_datetime || "") >= (ev.start_datetime || ""));
    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      { text: "Cancel", style: "cancel" },
      { text: "This event", style: "destructive", onPress: () => deleteMutation.mutate([ev.id]) },
    ];
    if (series.length > 1) {
      buttons.push({ text: `This & ${series.length - 1} later`, style: "destructive", onPress: () => deleteMutation.mutate(series.map((e) => e.id)) });
    }
    Alert.alert("Delete event?", ev.title, buttons);
  };

  const sections = useMemo(() => {
    const out: { key: string; title: string; data: ({ kind: "ministry"; ev: MinistryEvent } | { kind: "church"; ev: ChurchEvent })[] }[] = [];
    const m = (eventsQuery.data?.ministry || []).map((ev) => ({ kind: "ministry" as const, ev }));
    const c = (eventsQuery.data?.church || []).map((ev) => ({ kind: "church" as const, ev }));
    if (m.length) out.push({ key: "ministry", title: "Ministry gatherings", data: m });
    if (c.length) out.push({ key: "church", title: "Church calendar events", data: c });
    return out;
  }, [eventsQuery.data]);

  if (eventsQuery.isLoading) return <StateView kind="loading" title="Loading events..." />;
  if (eventsQuery.isError) {
    return <StateView kind="error" title="Couldn't load events" description={errorMessage(eventsQuery.error)} actionLabel="Retry" onAction={() => eventsQuery.refetch()} />;
  }

  const preview = repeat === "none" ? 1 : count;

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.ev.id}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={toolStyles.content}
        refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => eventsQuery.refetch()} tintColor={accent} />}
        renderSectionHeader={({ section }) => <SectionLabel>{section.title}</SectionLabel>}
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<CalendarRange size={30} color={colors.textTertiary} />}
            title="No upcoming events"
            description={isLeader ? "Tap + to schedule a gathering, or a weekly series." : "Upcoming gatherings will appear here."}
          />
        }
        renderItem={({ item }) => {
          const start = item.ev.start_datetime;
          const isChurch = item.kind === "church";
          return (
            <TouchableOpacity
              style={[toolStyles.card, cardStyle(colors)]}
              activeOpacity={0.75}
              onPress={() => (isChurch ? router.push(`/events/${item.ev.id}` as any) : undefined)}
              onLongPress={() => (!isChurch && isLeader ? confirmDelete(item.ev as MinistryEvent) : undefined)}
            >
              <View style={toolStyles.row}>
                <View style={[styles.dateBadge, { backgroundColor: accent + "15" }]}>
                  <Text style={[styles.dateDay, { color: accent }]}>{start ? new Date(start).getDate() : "-"}</Text>
                  <Text style={[styles.dateMonth, { color: accent }]}>
                    {start ? new Date(start).toLocaleDateString("en-US", { month: "short" }) : ""}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[toolStyles.title, { color: colors.text }]}>{item.ev.title}</Text>
                  <View style={styles.metaRow}>
                    <Clock size={12} color={colors.textTertiary} />
                    <Text style={[toolStyles.meta, styles.metaText, { color: colors.textTertiary }]}>
                      {start ? `${formatDate(start)} · ${formatTime(start)}` : "Time TBD"}
                    </Text>
                  </View>
                  {item.ev.location_name ? (
                    <View style={styles.metaRow}>
                      <MapPin size={12} color={colors.textTertiary} />
                      <Text style={[toolStyles.meta, styles.metaText, { color: colors.textTertiary }]}>{item.ev.location_name}</Text>
                    </View>
                  ) : null}
                </View>
                {isChurch ? (
                  <ChevronRight size={18} color={colors.textTertiary} />
                ) : isLeader ? (
                  <TouchableOpacity onPress={() => confirmDelete(item.ev as MinistryEvent)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<Text style={[styles.footnote, { color: colors.textTertiary }]}>Showing events from {formatDate(nowISO)} onward.</Text>}
      />

      <FormSheet
        visible={createOpen}
        title="New gathering"
        onClose={() => setCreateOpen(false)}
        onSubmit={submit}
        submitLabel={preview > 1 ? `Create ${preview} events` : "Create event"}
        submitting={createMutation.isPending}
        color={accent}
      >
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Band rehearsal" />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline />
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="Optional" />
        <Field label="First date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
        <View style={toolStyles.chipsRow}>
          <Chip label="Today" selected={date === todayISO()} onPress={() => setDate(todayISO())} color={accent} />
          <Chip label="Next Sunday" selected={date === nextSundayISO()} onPress={() => setDate(nextSundayISO())} color={accent} />
        </View>
        <Field label="Start time (24h HH:MM)" value={time} onChangeText={setTime} autoCapitalize="none" placeholder="18:00" />
        <SectionLabel>Duration</SectionLabel>
        <View style={toolStyles.chipsRow}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={d < 60 ? `${d} min` : `${d / 60} hr`} selected={duration === d} onPress={() => setDuration(d)} color={accent} />
          ))}
        </View>
        <SectionLabel right={<Repeat size={14} color={colors.textTertiary} />}>Repeat</SectionLabel>
        <View style={toolStyles.chipsRow}>
          {REPEAT_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={repeat === o.value} onPress={() => setRepeat(o.value)} color={accent} />
          ))}
        </View>
        {repeat !== "none" ? (
          <>
            <SectionLabel>Occurrences</SectionLabel>
            <View style={toolStyles.chipsRow}>
              {[4, 8, 12, 26].map((n) => (
                <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} color={accent} />
              ))}
            </View>
            {isValidISODate(date) ? (
              <Text style={[styles.footnote, { color: colors.textSecondary }]}>
                {formatDate(date)} → {formatDate(occurrenceDates(date, repeat, count).slice(-1)[0])}
              </Text>
            ) : null}
          </>
        ) : null}
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBadge: { width: 50, paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  dateDay: { fontSize: 18, fontWeight: "800" },
  dateMonth: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: { marginTop: 0 },
  footnote: { fontSize: 12, textAlign: "center", marginTop: 8 },
});
