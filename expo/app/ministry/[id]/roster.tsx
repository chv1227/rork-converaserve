import React, { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, TextInput, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Star, Users } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, formatDate } from "@/lib/ministryWorkspace";
import { useMinistryMembers } from "@/hooks/useMinistryMembers";
import { getToolPlan } from "@/constants/ministryTools";
import { Avatar, Chip, MinistryCtx, StateView, ToolScreen, cardStyle, toolStyles } from "@/components/ministry/ToolScaffold";

const ROLE_OPTIONS: { value: "member" | "leader"; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
];

export default function MinistryRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ToolScreen ministryId={id} title="Team Roster" minPlan={getToolPlan("roster")}>
      {(ctx) => <RosterBody ctx={ctx} />}
    </ToolScreen>
  );
}

function RosterBody({ ctx }: { ctx: MinistryCtx }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { ministryId, accent, isLeader, profileId } = ctx;

  const membersQuery = useMinistryMembers(ministryId);

  const roleMutation = useMutation({
    mutationFn: async ({ profile, role }: { profile: string; role: "member" | "leader" }) => {
      const { error } = await db.rpc("cc_set_ministry_member_role", {
        p_ministry: ministryId,
        p_profile: profile,
        p_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-roster", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry-member-count", ministryId] });
    },
    onError: (err) => Alert.alert("Couldn't change role", errorMessage(err)),
  });

  const members = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (membersQuery.data || [])
      .filter((m) => !term || displayName(m.profiles).toLowerCase().includes(term))
      .sort((a, b) => {
        const la = a.role === "leader" || a.role === "admin" ? 0 : 1;
        const lb = b.role === "leader" || b.role === "admin" ? 0 : 1;
        if (la !== lb) return la - lb;
        return displayName(a.profiles).localeCompare(displayName(b.profiles));
      });
  }, [membersQuery.data, search]);

  const leaderCount = (membersQuery.data || []).filter((m) => m.role === "leader" || m.role === "admin").length;

  if (membersQuery.isLoading) return <StateView kind="loading" title="Loading roster..." />;
  if (membersQuery.isError) {
    return (
      <StateView
        kind="error"
        title="Couldn't load the roster"
        description={errorMessage(membersQuery.error)}
        actionLabel="Retry"
        onAction={() => membersQuery.refetch()}
      />
    );
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(m) => m.id}
      contentContainerStyle={toolStyles.content}
      refreshControl={<RefreshControl refreshing={membersQuery.isRefetching} onRefresh={() => membersQuery.refetch()} tintColor={accent} />}
      ListHeaderComponent={
        <View>
          <View style={[styles.summary, cardStyle(colors)]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{membersQuery.data?.length || 0}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Members</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{leaderCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Leaders</Text>
            </View>
          </View>
          <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Search size={16} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          {isLeader ? (
            <Text style={[styles.hint, { color: colors.textTertiary }]}>As a leader you can change member roles below.</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <StateView
          kind="empty"
          compact
          icon={<Users size={30} color={colors.textTertiary} />}
          title={search ? "No matches" : "No members yet"}
          description={search ? "Try a different name." : "Members appear here when they join the ministry."}
        />
      }
      renderItem={({ item }) => {
        const name = displayName(item.profiles);
        const isLeaderRole = item.role === "leader" || item.role === "admin";
        const isSelf = item.profile_id === profileId;
        const pending = roleMutation.isPending && roleMutation.variables?.profile === item.profile_id;
        return (
          <View style={[toolStyles.card, cardStyle(colors)]}>
            <View style={toolStyles.row}>
              <Avatar name={name} color={accent} />
              <View style={{ flex: 1 }}>
                <Text style={[toolStyles.title, { color: colors.text }]}>
                  {name}
                  {isSelf ? <Text style={{ color: colors.textTertiary, fontWeight: "500" }}> (you)</Text> : null}
                </Text>
                <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                  {item.joined_at ? `Joined ${formatDate(item.joined_at, { month: "short", day: "numeric", year: "numeric" })}` : "Member"}
                </Text>
              </View>
              {isLeaderRole ? (
                <View style={[toolStyles.pill, styles.leaderPill, { backgroundColor: accent + "18" }]}>
                  <Star size={11} color={accent} />
                  <Text style={[toolStyles.pillText, { color: accent }]}>Leader</Text>
                </View>
              ) : (
                <View style={[toolStyles.pill, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[toolStyles.pillText, { color: colors.textSecondary }]}>Member</Text>
                </View>
              )}
            </View>
            {isLeader && !isSelf ? (
              <View style={styles.roleRow}>
                <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>{pending ? "Saving..." : "Role"}</Text>
                {ROLE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    color={accent}
                    selected={opt.value === "leader" ? isLeaderRole : !isLeaderRole}
                    onPress={() => {
                      if ((opt.value === "leader") === isLeaderRole || roleMutation.isPending) return;
                      roleMutation.mutate({ profile: item.profile_id, role: opt.value });
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  divider: { width: 1, marginVertical: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  hint: { fontSize: 12, marginBottom: 12 },
  leaderPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  roleLabel: { fontSize: 12, fontWeight: "600", marginRight: 4 },
});
