import React, { useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert, Switch } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, HandHeart, Lock, Plus } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, timeAgo } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { Chip, Field, FormSheet, MinistryCtx, StateView, ToolScreen, cardStyle, toolStyles } from "@/components/ministry/ToolScaffold";

// Uses the existing live table ministry_prayer_requests + cc_ministry_pray RPC.

interface PrayerRequest {
  id: string;
  title: string | null;
  content: string | null;
  is_anonymous: boolean;
  prayer_count: number;
  answered_at: string | null;
  visibility: "team" | "leaders" | string;
  author_id: string | null;
  created_at: string;
  author: { display_name: string | null } | null;
}

type Filter = "active" | "answered";

export default function MinistryPrayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [composeOpen, setComposeOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Prayer List"
      minPlan={getToolPlan("prayer")}
      headerRight={(ctx) => (
        <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setComposeOpen(true)} accessibilityLabel="New prayer request">
          <Plus size={22} color={ctx.accent} />
        </TouchableOpacity>
      )}
    >
      {(ctx) => <PrayerBody ctx={ctx} composeOpen={composeOpen} setComposeOpen={setComposeOpen} />}
    </ToolScreen>
  );
}

function PrayerBody({ ctx, composeOpen, setComposeOpen }: { ctx: MinistryCtx; composeOpen: boolean; setComposeOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const [filter, setFilter] = useState<Filter>("active");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [leadersOnly, setLeadersOnly] = useState(false);

  const listQuery = useQuery<PrayerRequest[]>({
    queryKey: ["ministry-prayer", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_prayer_requests")
        .select(
          "id, title, content, is_anonymous, prayer_count, answered_at, visibility, author_id, created_at, author:profiles!ministry_prayer_requests_author_id_fkey(display_name)"
        )
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data || []) as unknown as PrayerRequest[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ministry-prayer", ministryId] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("ministry_prayer_requests").insert({
        ministry_id: ministryId,
        church_id: churchId,
        author_id: profileId,
        title: title.trim() || null,
        content: content.trim(),
        is_anonymous: anonymous,
        visibility: leadersOnly ? "leaders" : "team",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComposeOpen(false);
      setTitle("");
      setContent("");
      setAnonymous(false);
      setLeadersOnly(false);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't share request", errorMessage(err)),
  });

  const prayMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await db.rpc("cc_ministry_pray", { pr: requestId });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't record prayer", errorMessage(err)),
  });

  const answeredMutation = useMutation({
    mutationFn: async (r: PrayerRequest) => {
      const { error } = await db
        .from("ministry_prayer_requests")
        .update({ answered_at: r.answered_at ? null : new Date().toISOString(), follow_up_status: r.answered_at ? "praying" : "answered" })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't update", errorMessage(err)),
  });

  const all = listQuery.data || [];
  const items = all.filter((r) => (filter === "answered" ? !!r.answered_at : !r.answered_at));

  if (listQuery.isLoading) return <StateView kind="loading" title="Loading prayer list..." />;
  if (listQuery.isError) {
    return <StateView kind="error" title="Couldn't load prayer list" description={errorMessage(listQuery.error)} actionLabel="Retry" onAction={() => listQuery.refetch()} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={toolStyles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isRefetching} onRefresh={() => listQuery.refetch()} tintColor={accent} />}
        ListHeaderComponent={
          <View style={toolStyles.chipsRow}>
            <Chip label={`Praying (${all.filter((r) => !r.answered_at).length})`} selected={filter === "active"} onPress={() => setFilter("active")} color={accent} />
            <Chip label={`Answered (${all.filter((r) => !!r.answered_at).length})`} selected={filter === "answered"} onPress={() => setFilter("answered")} color={accent} />
          </View>
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<HandHeart size={30} color={colors.textTertiary} />}
            title={filter === "answered" ? "No answered prayers yet" : "No prayer requests"}
            description="Tap + to share a request with your team."
          />
        }
        renderItem={({ item }) => {
          const canMark = isLeader || item.author_id === profileId;
          return (
            <View style={[toolStyles.card, cardStyle(colors)]}>
              <View style={toolStyles.rowBetween}>
                <View style={{ flex: 1 }}>
                  {item.title ? <Text style={[toolStyles.title, { color: colors.text }]}>{item.title}</Text> : null}
                  <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                    {item.is_anonymous ? "Anonymous" : displayName(item.author)} · {timeAgo(item.created_at)}
                  </Text>
                </View>
                {item.visibility === "leaders" ? <Lock size={14} color={colors.textTertiary} /> : null}
              </View>
              {item.content ? <Text style={[toolStyles.body, { color: colors.textSecondary }]}>{item.content}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.prayBtn, { backgroundColor: accent + "14" }]}
                  onPress={() => prayMutation.mutate(item.id)}
                  disabled={prayMutation.isPending}
                >
                  <HandHeart size={14} color={accent} />
                  <Text style={[styles.prayText, { color: accent }]}>Prayed · {item.prayer_count || 0}</Text>
                </TouchableOpacity>
                {canMark ? (
                  <TouchableOpacity style={styles.inlineBtn} onPress={() => answeredMutation.mutate(item)}>
                    <CheckCircle2 size={14} color={colors.success} />
                    <Text style={[styles.inlineText, { color: colors.success }]}>{item.answered_at ? "Reopen" : "Mark answered"}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <FormSheet
        visible={composeOpen}
        title="New prayer request"
        onClose={() => setComposeOpen(false)}
        onSubmit={() => {
          if (!content.trim()) return Alert.alert("Request required", "Share what we can pray for.");
          createMutation.mutate();
        }}
        submitLabel="Share"
        submitting={createMutation.isPending}
        color={accent}
      >
        <Field label="Title (optional)" value={title} onChangeText={setTitle} />
        <Field label="Request" value={content} onChangeText={setContent} multiline placeholder="How can the team pray?" />
        <View style={[toolStyles.rowBetween, styles.switchRow]}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Post anonymously</Text>
          <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: accent, false: colors.border }} />
        </View>
        <View style={[toolStyles.rowBetween, styles.switchRow]}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Leaders only</Text>
          <Switch value={leadersOnly} onValueChange={setLeadersOnly} trackColor={{ true: accent, false: colors.border }} />
        </View>
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  prayBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  prayText: { fontSize: 13, fontWeight: "700" },
  inlineBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineText: { fontSize: 13, fontWeight: "600" },
  switchRow: { marginBottom: 12 },
  switchLabel: { fontSize: 15, fontWeight: "600" },
});
