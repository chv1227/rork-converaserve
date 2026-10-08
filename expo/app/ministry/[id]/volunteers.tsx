import React, { useMemo, useState } from "react";
import { View, Text, SectionList, RefreshControl, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2, UserPlus } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, errorMessage, formatDate, isValidISODate, nextSundayISO, todayISO, addDaysISO } from "@/lib/ministryWorkspace";
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

// Volunteer scheduling is built on the existing live tables:
//   ministry_positions    (roles, leader-managed)
//   ministry_roster_slots (one row per person needed; assignee_profile_id NULL = open)
// Members sign up / release through the cc_roster_claim_slot / cc_roster_release_slot RPCs
// (sql/16_ministry_workspace_v2.sql); confirmations use the existing cc_roster_respond RPC.

interface Position {
  id: string;
  name: string;
  sort_order: number;
}

interface Slot {
  id: string;
  position_id: string;
  service_date: string;
  service_label: string | null;
  assignee_profile_id: string | null;
  status: "pending" | "confirmed" | "swap_requested" | string;
  swap_note: string | null;
}

type Filter = "all" | "open" | "mine";

export default function MinistryVolunteersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Volunteer Schedule"
      minPlan={getToolPlan("volunteers")}
      headerRight={(ctx) =>
        ctx.isLeader ? (
          <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setCreateOpen(true)} accessibilityLabel="Add slots">
            <Plus size={22} color={ctx.accent} />
          </TouchableOpacity>
        ) : null
      }
    >
      {(ctx) => <VolunteersBody ctx={ctx} createOpen={createOpen} setCreateOpen={setCreateOpen} />}
    </ToolScreen>
  );
}

function VolunteersBody({ ctx, createOpen, setCreateOpen }: { ctx: MinistryCtx; createOpen: boolean; setCreateOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const { members, nameFor } = useMinistryMembers(ministryId);
  const [filter, setFilter] = useState<Filter>("all");
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null);

  // create-slot form
  const [positionId, setPositionId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [date, setDate] = useState(nextSundayISO());
  const [label, setLabel] = useState("");
  const [count, setCount] = useState(1);

  const today = todayISO();

  const positionsQuery = useQuery<Position[]>({
    queryKey: ["ministry-positions", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_positions")
        .select("id, name, sort_order")
        .eq("ministry_id", ministryId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Position[];
    },
  });

  const slotsQuery = useQuery<Slot[]>({
    queryKey: ["ministry-roster-slots", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_roster_slots")
        .select("id, position_id, service_date, service_label, assignee_profile_id, status, swap_note")
        .eq("ministry_id", ministryId)
        .gte("service_date", today)
        .order("service_date", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data || []) as Slot[];
    },
  });

  const positionName = (pid: string) => positionsQuery.data?.find((p) => p.id === pid)?.name || "Role";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ministry-roster-slots", ministryId] });
    queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
  };

  const rpcMutation = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown>; slotId: string }) => {
      const { error } = await db.rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't update slot", errorMessage(err)),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ slotId, assignee }: { slotId: string; assignee: string | null }) => {
      const { error } = await db
        .from("ministry_roster_slots")
        .update({ assignee_profile_id: assignee, status: "pending", swap_note: null })
        .eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      setAssignSlot(null);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't assign", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await db.from("ministry_roster_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      setAssignSlot(null);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't delete slot", errorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let pid = positionId;
      if (!pid) {
        const name = newRole.trim();
        const { data, error } = await db
          .from("ministry_positions")
          .insert({ church_id: churchId, ministry_id: ministryId, name, sort_order: positionsQuery.data?.length || 0 })
          .select("id")
          .single();
        if (error) throw error;
        pid = data.id as string;
      }
      const rows = Array.from({ length: count }, () => ({
        church_id: churchId,
        ministry_id: ministryId,
        position_id: pid,
        service_date: date.trim(),
        service_label: label.trim() || null,
        status: "pending",
        created_by: profileId,
      }));
      const { error } = await db.from("ministry_roster_slots").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewRole("");
      setCount(1);
      queryClient.invalidateQueries({ queryKey: ["ministry-positions", ministryId] });
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't create slots", errorMessage(err)),
  });

  const submitCreate = () => {
    if (!positionId && !newRole.trim()) return Alert.alert("Role required", "Pick a role or type a new one.");
    if (!isValidISODate(date)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
    if (date < today) return Alert.alert("Date in the past", "Choose today or a future date.");
    createMutation.mutate();
  };

  const sections = useMemo(() => {
    const slots = (slotsQuery.data || []).filter((s) =>
      filter === "open" ? !s.assignee_profile_id : filter === "mine" ? !!profileId && s.assignee_profile_id === profileId : true
    );
    const groups = new Map<string, Slot[]>();
    slots.forEach((s) => {
      const key = `${s.service_date}|${s.service_label || ""}`;
      groups.set(key, [...(groups.get(key) || []), s]);
    });
    return Array.from(groups.entries()).map(([key, data]) => {
      const [d, l] = key.split("|");
      const open = data.filter((s) => !s.assignee_profile_id).length;
      return { key, title: formatDate(d, { weekday: "long", month: "short", day: "numeric" }), label: l, open, data };
    });
  }, [slotsQuery.data, filter, profileId]);

  const openCount = (slotsQuery.data || []).filter((s) => !s.assignee_profile_id).length;
  const mineCount = (slotsQuery.data || []).filter((s) => !!profileId && s.assignee_profile_id === profileId).length;

  if (slotsQuery.isLoading || positionsQuery.isLoading) return <StateView kind="loading" title="Loading schedule..." />;
  if (slotsQuery.isError || positionsQuery.isError) {
    return (
      <StateView
        kind="error"
        title="Couldn't load the schedule"
        description={errorMessage(slotsQuery.error || positionsQuery.error)}
        actionLabel="Retry"
        onAction={() => {
          slotsQuery.refetch();
          positionsQuery.refetch();
        }}
      />
    );
  }

  const statusPill = (s: Slot) => {
    if (!s.assignee_profile_id) return { text: "Open", fg: accent, bg: accent + "18" };
    if (s.status === "confirmed") return { text: "Confirmed", fg: colors.success, bg: colors.successLight };
    if (s.status === "swap_requested") return { text: "Swap requested", fg: colors.warning, bg: colors.warningLight };
    return { text: "Pending", fg: colors.textSecondary, bg: colors.surfaceSecondary };
  };

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={toolStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={slotsQuery.isRefetching}
            onRefresh={() => {
              slotsQuery.refetch();
              positionsQuery.refetch();
            }}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View style={toolStyles.chipsRow}>
            <Chip label="All upcoming" selected={filter === "all"} onPress={() => setFilter("all")} color={accent} />
            <Chip label={`Open (${openCount})`} selected={filter === "open"} onPress={() => setFilter("open")} color={accent} />
            <Chip label={`Mine (${mineCount})`} selected={filter === "mine"} onPress={() => setFilter("mine")} color={accent} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
              {section.label ? `${section.label} · ` : ""}
              {section.open > 0 ? `${section.open} open` : "All filled"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<CalendarClock size={30} color={colors.textTertiary} />}
            title={filter === "open" ? "No open slots" : filter === "mine" ? "You're not scheduled" : "No upcoming slots"}
            description={isLeader ? "Tap + to add service slots for a date." : "When leaders add service slots you can sign up here."}
          />
        }
        renderItem={({ item }) => {
          const pill = statusPill(item);
          const mine = !!profileId && item.assignee_profile_id === profileId;
          const busy = rpcMutation.isPending && rpcMutation.variables?.slotId === item.id;
          return (
            <View style={[toolStyles.card, cardStyle(colors)]}>
              <View style={toolStyles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[toolStyles.title, { color: colors.text }]}>{positionName(item.position_id)}</Text>
                  <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                    {item.assignee_profile_id ? nameFor(item.assignee_profile_id) : "Nobody yet"}
                    {mine ? " (you)" : ""}
                  </Text>
                  {item.status === "swap_requested" && item.swap_note ? (
                    <Text style={[toolStyles.meta, { color: colors.warning }]}>“{item.swap_note}”</Text>
                  ) : null}
                </View>
                <View style={[toolStyles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[toolStyles.pillText, { color: pill.fg }]}>{pill.text}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {!item.assignee_profile_id ? (
                  <ActionButton
                    label={busy ? "Signing up..." : "Sign up"}
                    color={accent}
                    solid
                    onPress={() => rpcMutation.mutate({ fn: "cc_roster_claim_slot", args: { p_slot: item.id }, slotId: item.id })}
                  />
                ) : null}
                {mine && item.status !== "confirmed" ? (
                  <ActionButton
                    label="Confirm"
                    color={colors.success}
                    onPress={() =>
                      rpcMutation.mutate({ fn: "cc_roster_respond", args: { p_slot: item.id, p_status: "confirmed", p_note: null }, slotId: item.id })
                    }
                  />
                ) : null}
                {mine ? (
                  <ActionButton
                    label="Can't make it"
                    color={colors.error}
                    onPress={() => rpcMutation.mutate({ fn: "cc_roster_release_slot", args: { p_slot: item.id }, slotId: item.id })}
                  />
                ) : null}
                {isLeader ? <ActionButton label="Manage" color={colors.textSecondary} onPress={() => setAssignSlot(item)} /> : null}
              </View>
            </View>
          );
        }}
      />

      {/* Leader: assign / unassign / delete */}
      <FormSheet
        visible={!!assignSlot}
        title={assignSlot ? `${positionName(assignSlot.position_id)} · ${formatDate(assignSlot.service_date)}` : ""}
        onClose={() => setAssignSlot(null)}
        color={accent}
      >
        <SectionLabel>Assign a member</SectionLabel>
        <View style={toolStyles.chipsRow}>
          {members.length === 0 ? <Text style={{ color: colors.textTertiary }}>No members in this ministry yet.</Text> : null}
          {members.map((m) => (
            <Chip
              key={m.profile_id}
              label={m.profiles?.display_name || "Member"}
              selected={assignSlot?.assignee_profile_id === m.profile_id}
              onPress={() => assignSlot && assignMutation.mutate({ slotId: assignSlot.id, assignee: m.profile_id })}
              color={accent}
            />
          ))}
        </View>
        {assignSlot?.assignee_profile_id ? (
          <PrimaryButton
            label="Mark as open"
            variant="soft"
            color={accent}
            loading={assignMutation.isPending}
            onPress={() => assignSlot && assignMutation.mutate({ slotId: assignSlot.id, assignee: null })}
          />
        ) : null}
        <TouchableOpacity
          style={styles.deleteBtn}
          disabled={deleteMutation.isPending}
          onPress={() => assignSlot && deleteMutation.mutate(assignSlot.id)}
        >
          <Trash2 size={16} color={colors.error} />
          <Text style={[styles.deleteText, { color: colors.error }]}>{deleteMutation.isPending ? "Deleting..." : "Delete slot"}</Text>
        </TouchableOpacity>
      </FormSheet>

      {/* Leader: create slots */}
      <FormSheet
        visible={createOpen}
        title="Add service slots"
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
        submitLabel={count > 1 ? `Create ${count} slots` : "Create slot"}
        submitting={createMutation.isPending}
        color={accent}
      >
        <SectionLabel>Role</SectionLabel>
        <View style={toolStyles.chipsRow}>
          {(positionsQuery.data || []).map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={positionId === p.id}
              onPress={() => {
                setPositionId(p.id);
                setNewRole("");
              }}
              color={accent}
            />
          ))}
          <Chip label="+ New role" selected={!positionId} onPress={() => setPositionId(null)} color={accent} />
        </View>
        {!positionId ? (
          <Field label="New role name" value={newRole} onChangeText={setNewRole} placeholder="e.g. Greeter, Sound, Usher" />
        ) : null}
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
        <View style={toolStyles.chipsRow}>
          <Chip label="Next Sunday" selected={date === nextSundayISO()} onPress={() => setDate(nextSundayISO())} color={accent} />
          <Chip
            label="Sunday after"
            selected={date === addDaysISO(nextSundayISO(), 7)}
            onPress={() => setDate(addDaysISO(nextSundayISO(), 7))}
            color={accent}
          />
        </View>
        <Field label="Service (optional)" value={label} onChangeText={setLabel} placeholder="e.g. 9:00 AM Service" />
        <SectionLabel>People needed</SectionLabel>
        <View style={toolStyles.chipsRow}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} color={accent} />
          ))}
        </View>
      </FormSheet>
    </View>
  );
}

function ActionButton({ label, color, onPress, solid }: { label: string; color: string; onPress: () => void; solid?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: solid ? color : color + "14" }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {solid ? <UserPlus size={14} color="#fff" /> : null}
      <Text style={[styles.actionText, { color: solid ? "#fff" : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { marginTop: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionMeta: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: "700" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 14 },
  deleteText: { fontSize: 14, fontWeight: "600" },
});
