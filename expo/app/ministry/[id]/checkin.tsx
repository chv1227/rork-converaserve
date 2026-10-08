import React, { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, LogIn, LogOut, Plus, ShieldCheck } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { db, errorMessage, formatTime } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
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

// Children's check-in uses the existing live tables + RPCs:
//   children, child_guardians, child_checkins
//   cc_child_check_in(p_child, p_method, p_by_name, p_classroom) -> { checkin_id, security_code }
//   cc_child_check_out(p_checkin, p_guardian, p_method)  (guardian must be allowed to pick up)
//   cc_child_check_out_exception(p_checkin, p_to_name, p_reason)  (church admins only)

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  classroom: string | null;
}

interface Checkin {
  id: string;
  child_id: string;
  classroom: string | null;
  security_code: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_out_to_name: string | null;
}

interface Guardian {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
}

const UNASSIGNED = "__unassigned__";

export default function MinistryCheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [addOpen, setAddOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Children's Check-In"
      minPlan={getToolPlan("checkin")}
      headerRight={(ctx) =>
        ctx.isLeader ? (
          <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setAddOpen(true)} accessibilityLabel="Add child">
            <Plus size={22} color={ctx.accent} />
          </TouchableOpacity>
        ) : null
      }
    >
      {(ctx) => <CheckinBody ctx={ctx} addOpen={addOpen} setAddOpen={setAddOpen} />}
    </ToolScreen>
  );
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function CheckinBody({ ctx, addOpen, setAddOpen }: { ctx: MinistryCtx; addOpen: boolean; setAddOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const { isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileName, accent } = ctx;
  const [room, setRoom] = useState<string | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<{ child: Child; checkin: Checkin } | null>(null);
  const [exceptionName, setExceptionName] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [newChild, setNewChild] = useState({ first: "", last: "", classroom: "", guardian: "", phone: "" });

  const childrenQuery = useQuery<Child[]>({
    queryKey: ["ministry-children", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("children")
        .select("id, first_name, last_name, classroom")
        .eq("ministry_id", ministryId)
        .eq("is_active", true)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data || []) as Child[];
    },
  });

  const checkinsQuery = useQuery<Checkin[]>({
    queryKey: ["ministry-checkins", ministryId],
    refetchInterval: 30_000,
    queryFn: async () => {
      // Everyone still checked in (any day) + everything from today.
      const fields = "id, child_id, classroom, security_code, checked_in_at, checked_out_at, checked_out_to_name";
      const [open, today] = await Promise.all([
        db.from("child_checkins").select(fields).eq("ministry_id", ministryId).is("checked_out_at", null),
        db.from("child_checkins").select(fields).eq("ministry_id", ministryId).gte("checked_in_at", startOfTodayISO()),
      ]);
      if (open.error) throw open.error;
      if (today.error) throw today.error;
      const map = new Map<string, Checkin>();
      [...(open.data || []), ...(today.data || [])].forEach((c) => map.set((c as Checkin).id, c as Checkin));
      return Array.from(map.values()).sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime());
    },
  });

  const guardiansQuery = useQuery<Guardian[]>({
    queryKey: ["child-guardians", checkoutFor?.child.id],
    enabled: !!checkoutFor,
    queryFn: async () => {
      const { data, error } = await db
        .from("child_guardians")
        .select("id, name, relationship, phone")
        .eq("child_id", checkoutFor!.child.id)
        .eq("can_pickup", true)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data || []) as Guardian[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ministry-checkins", ministryId] });
  };

  const checkInMutation = useMutation({
    mutationFn: async (child: Child) => {
      const { data, error } = await db.rpc("cc_child_check_in", {
        p_child: child.id,
        p_method: "staff",
        p_by_name: profileName,
        p_classroom: child.classroom,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { child, code: (row?.security_code as string) || "" };
    },
    onSuccess: ({ child, code }) => {
      refresh();
      Alert.alert("Checked in", `${child.first_name} is checked in.${code ? `\nSecurity code: ${code}` : ""}`);
    },
    onError: (err) => Alert.alert("Couldn't check in", errorMessage(err)),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (args: { checkinId: string; guardianId?: string; exception?: { name: string; reason: string } }) => {
      const { error } = args.exception
        ? await db.rpc("cc_child_check_out_exception", { p_checkin: args.checkinId, p_to_name: args.exception.name, p_reason: args.exception.reason })
        : await db.rpc("cc_child_check_out", { p_checkin: args.checkinId, p_guardian: args.guardianId, p_method: "staff" });
      if (error) throw error;
    },
    onSuccess: () => {
      setCheckoutFor(null);
      setExceptionName("");
      setExceptionReason("");
      refresh();
    },
    onError: (err) => Alert.alert("Couldn't check out", errorMessage(err)),
  });

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await db
        .from("children")
        .insert({
          church_id: churchId,
          ministry_id: ministryId,
          first_name: newChild.first.trim(),
          last_name: newChild.last.trim(),
          classroom: newChild.classroom.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (newChild.guardian.trim()) {
        const { error: gErr } = await db.from("child_guardians").insert({
          church_id: churchId,
          child_id: data.id,
          name: newChild.guardian.trim(),
          phone: newChild.phone.trim() || null,
          relationship: "Parent/Guardian",
          is_primary: true,
          can_pickup: true,
        });
        if (gErr) throw gErr;
      }
    },
    onSuccess: () => {
      setAddOpen(false);
      setNewChild({ first: "", last: "", classroom: "", guardian: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["ministry-children", ministryId] });
    },
    onError: (err) => Alert.alert("Couldn't add child", errorMessage(err)),
  });

  const children = childrenQuery.data || [];
  const checkins = checkinsQuery.data || [];
  const openByChild = useMemo(() => {
    const map = new Map<string, Checkin>();
    checkins.filter((c) => !c.checked_out_at).forEach((c) => map.set(c.child_id, c));
    return map;
  }, [checkins]);

  const classrooms = useMemo(() => {
    const counts = new Map<string, { total: number; inRoom: number }>();
    children.forEach((c) => {
      const key = c.classroom?.trim() || UNASSIGNED;
      const cur = counts.get(key) || { total: 0, inRoom: 0 };
      cur.total += 1;
      if (openByChild.has(c.id)) cur.inRoom += 1;
      counts.set(key, cur);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => (a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b)));
  }, [children, openByChild]);

  const visibleChildren = children.filter((c) => !room || (c.classroom?.trim() || UNASSIGNED) === room);
  const childName = (id: string) => {
    const c = children.find((x) => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "Child";
  };

  if (childrenQuery.isLoading || checkinsQuery.isLoading) return <StateView kind="loading" title="Loading classrooms..." />;
  if (childrenQuery.isError || checkinsQuery.isError) {
    return (
      <StateView
        kind="error"
        title="Couldn't load check-in"
        description={errorMessage(childrenQuery.error || checkinsQuery.error)}
        actionLabel="Retry"
        onAction={() => {
          childrenQuery.refetch();
          checkinsQuery.refetch();
        }}
      />
    );
  }

  const startOfToday = new Date(startOfTodayISO()).getTime();
  const todayLog = checkins.filter((c) => new Date(c.checked_in_at).getTime() >= startOfToday);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visibleChildren}
        keyExtractor={(c) => c.id}
        contentContainerStyle={toolStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={childrenQuery.isRefetching || checkinsQuery.isRefetching}
            onRefresh={() => {
              childrenQuery.refetch();
              checkinsQuery.refetch();
            }}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.summary, cardStyle(colors)]}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{openByChild.size}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>children checked in right now</Text>
            </View>
            <SectionLabel>Classrooms</SectionLabel>
            <View style={toolStyles.chipsRow}>
              <Chip label={`All (${children.length})`} selected={!room} onPress={() => setRoom(null)} color={accent} />
              {classrooms.map(([name, c]) => (
                <Chip
                  key={name}
                  label={`${name === UNASSIGNED ? "No classroom" : name} · ${c.inRoom}/${c.total}`}
                  selected={room === name}
                  onPress={() => setRoom(name)}
                  color={accent}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<Baby size={30} color={colors.textTertiary} />}
            title="No children registered"
            description={ctx.isLeader ? "Tap + to add a child and their guardian." : "Children registered with this ministry will appear here."}
          />
        }
        renderItem={({ item }) => {
          const open = openByChild.get(item.id);
          const busy = checkInMutation.isPending && checkInMutation.variables?.id === item.id;
          return (
            <View style={[toolStyles.card, cardStyle(colors)]}>
              <View style={toolStyles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[toolStyles.title, { color: colors.text }]}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text style={[toolStyles.meta, { color: open ? colors.success : colors.textTertiary }]}>
                    {open
                      ? `In since ${formatTime(open.checked_in_at)}${open.security_code ? ` · Code ${open.security_code}` : ""}`
                      : item.classroom || "No classroom"}
                  </Text>
                </View>
                {open ? (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.errorLight }]}
                    onPress={() => setCheckoutFor({ child: item, checkin: open })}
                  >
                    <LogOut size={14} color={colors.error} />
                    <Text style={[styles.btnText, { color: colors.error }]}>Check out</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: accent }]}
                    disabled={busy}
                    onPress={() => checkInMutation.mutate(item)}
                  >
                    <LogIn size={14} color="#fff" />
                    <Text style={[styles.btnText, { color: "#fff" }]}>{busy ? "..." : "Check in"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          todayLog.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <SectionLabel>{"Today's log"}</SectionLabel>
              {todayLog.map((c) => (
                <View key={c.id} style={[styles.logRow, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.logName, { color: colors.text }]}>{childName(c.child_id)}</Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                    In {formatTime(c.checked_in_at)}
                    {c.checked_out_at ? ` · Out ${formatTime(c.checked_out_at)}${c.checked_out_to_name ? ` (${c.checked_out_to_name})` : ""}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {/* Check-out: pick an authorized guardian */}
      <FormSheet
        visible={!!checkoutFor}
        title={checkoutFor ? `Check out ${checkoutFor.child.first_name}` : ""}
        onClose={() => setCheckoutFor(null)}
        color={accent}
      >
        {checkoutFor?.checkin.security_code ? (
          <View style={[styles.codeBox, { backgroundColor: colors.surfaceSecondary }]}>
            <ShieldCheck size={18} color={accent} />
            <Text style={[styles.codeText, { color: colors.text }]}>Match security code {checkoutFor.checkin.security_code}</Text>
          </View>
        ) : null}
        <SectionLabel>Released to</SectionLabel>
        {guardiansQuery.isLoading ? <StateView kind="loading" compact title="Loading guardians..." /> : null}
        {guardiansQuery.isError ? <Text style={{ color: colors.error, marginBottom: 12 }}>{errorMessage(guardiansQuery.error)}</Text> : null}
        {!guardiansQuery.isLoading && (guardiansQuery.data || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>No authorized pickup people on file for this child.</Text>
        ) : null}
        {(guardiansQuery.data || []).map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[toolStyles.card, cardStyle(colors)]}
            disabled={checkOutMutation.isPending}
            onPress={() => checkoutFor && checkOutMutation.mutate({ checkinId: checkoutFor.checkin.id, guardianId: g.id })}
          >
            <Text style={[toolStyles.title, { color: colors.text }]}>{g.name}</Text>
            <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
              {[g.relationship, g.phone].filter(Boolean).join(" · ") || "Authorized pickup"}
            </Text>
          </TouchableOpacity>
        ))}
        {isAdmin || isSuperAdmin ? (
          <View style={{ marginTop: 8 }}>
            <SectionLabel>Admin exception</SectionLabel>
            <Field label="Released to (name)" value={exceptionName} onChangeText={setExceptionName} />
            <Field label="Reason" value={exceptionReason} onChangeText={setExceptionReason} multiline />
            <PrimaryButton
              label="Release with exception"
              variant="soft"
              color={colors.error}
              loading={checkOutMutation.isPending}
              disabled={!exceptionName.trim() || !exceptionReason.trim()}
              onPress={() =>
                checkoutFor &&
                checkOutMutation.mutate({
                  checkinId: checkoutFor.checkin.id,
                  exception: { name: exceptionName.trim(), reason: exceptionReason.trim() },
                })
              }
            />
          </View>
        ) : null}
      </FormSheet>

      {/* Leader: add a child */}
      <FormSheet
        visible={addOpen}
        title="Add a child"
        onClose={() => setAddOpen(false)}
        onSubmit={() => {
          if (!newChild.first.trim() || !newChild.last.trim()) return Alert.alert("Name required", "Enter the child's first and last name.");
          addChildMutation.mutate();
        }}
        submitLabel="Add child"
        submitting={addChildMutation.isPending}
        color={accent}
      >
        <Field label="First name" value={newChild.first} onChangeText={(v) => setNewChild((c) => ({ ...c, first: v }))} />
        <Field label="Last name" value={newChild.last} onChangeText={(v) => setNewChild((c) => ({ ...c, last: v }))} />
        <Field
          label="Classroom"
          value={newChild.classroom}
          onChangeText={(v) => setNewChild((c) => ({ ...c, classroom: v }))}
          placeholder="e.g. Preschool, K-2"
        />
        <View style={toolStyles.chipsRow}>
          {classrooms
            .filter(([name]) => name !== UNASSIGNED)
            .map(([name]) => (
              <Chip key={name} label={name} selected={newChild.classroom === name} onPress={() => setNewChild((c) => ({ ...c, classroom: name }))} color={accent} />
            ))}
        </View>
        <Field
          label="Guardian name (authorized pickup)"
          value={newChild.guardian}
          onChangeText={(v) => setNewChild((c) => ({ ...c, guardian: v }))}
          placeholder="Optional"
        />
        <Field
          label="Guardian phone"
          value={newChild.phone}
          onChangeText={(v) => setNewChild((c) => ({ ...c, phone: v }))}
          placeholder="Optional"
          keyboardType="phone-pad"
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14, alignItems: "center" },
  summaryValue: { fontSize: 28, fontWeight: "800" },
  summaryLabel: { fontSize: 13, marginTop: 2 },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  btnText: { fontSize: 13, fontWeight: "700" },
  logRow: { paddingVertical: 10, borderBottomWidth: 1 },
  logName: { fontSize: 14, fontWeight: "600" },
  logTime: { fontSize: 12, marginTop: 2 },
  codeBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  codeText: { fontSize: 14, fontWeight: "600" },
});
