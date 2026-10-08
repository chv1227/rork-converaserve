import React, { useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, MessageCircle, Pin, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, timeAgo } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { Field, FormSheet, MinistryCtx, StateView, ToolScreen, cardStyle, toolStyles } from "@/components/ministry/ToolScaffold";

interface MinistryAnnouncement {
  id: string;
  title: string;
  body: string | null;
  is_pinned: boolean;
  created_at: string;
  author: { display_name: string | null } | null;
}

export default function MinistryAnnouncementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [composeOpen, setComposeOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Announcements"
      minPlan={getToolPlan("announcements")}
      headerRight={(ctx) =>
        ctx.isLeader ? (
          <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setComposeOpen(true)} accessibilityLabel="New announcement">
            <Plus size={22} color={ctx.accent} />
          </TouchableOpacity>
        ) : null
      }
    >
      {(ctx) => <AnnouncementsBody ctx={ctx} composeOpen={composeOpen} setComposeOpen={setComposeOpen} />}
    </ToolScreen>
  );
}

function AnnouncementsBody({ ctx, composeOpen, setComposeOpen }: { ctx: MinistryCtx; composeOpen: boolean; setComposeOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const listQuery = useQuery<MinistryAnnouncement[]>({
    queryKey: ["ministry-announcements", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_announcements")
        .select("id, title, body, is_pinned, created_at, author:profiles!ministry_announcements_author_id_fkey(display_name)")
        .eq("ministry_id", ministryId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as MinistryAnnouncement[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ministry-announcements", ministryId] });
    queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("ministry_announcements").insert({
        ministry_id: ministryId,
        church_id: churchId,
        author_id: profileId,
        title: title.trim(),
        body: body.trim() || null,
        is_pinned: pinned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComposeOpen(false);
      setTitle("");
      setBody("");
      setPinned(false);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't post", errorMessage(err)),
  });

  const pinMutation = useMutation({
    mutationFn: async (a: MinistryAnnouncement) => {
      const { error } = await db.from("ministry_announcements").update({ is_pinned: !a.is_pinned }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't update", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await db.from("ministry_announcements").delete().eq("id", announcementId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't delete", errorMessage(err)),
  });

  if (listQuery.isLoading) return <StateView kind="loading" title="Loading announcements..." />;
  if (listQuery.isError) {
    return (
      <StateView kind="error" title="Couldn't load announcements" description={errorMessage(listQuery.error)} actionLabel="Retry" onAction={() => listQuery.refetch()} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={listQuery.data || []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={toolStyles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isRefetching} onRefresh={() => listQuery.refetch()} tintColor={accent} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.threadLink, { backgroundColor: accent + "12", borderColor: accent + "30" }]}
            onPress={() => router.push(`/ministry/${ministryId}/thread` as any)}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color={accent} />
            <Text style={[styles.threadText, { color: accent }]}>Open the team thread to discuss</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<Megaphone size={30} color={colors.textTertiary} />}
            title="No announcements yet"
            description={isLeader ? "Tap + to post the first update for your team." : "Updates from your leaders will appear here."}
          />
        }
        renderItem={({ item }) => (
          <View style={[toolStyles.card, cardStyle(colors), item.is_pinned && { borderColor: accent + "60" }]}>
            <View style={toolStyles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[toolStyles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                  {displayName(item.author, "Leader")} · {timeAgo(item.created_at)}
                </Text>
              </View>
              {item.is_pinned ? <Pin size={16} color={accent} /> : null}
            </View>
            {item.body ? <Text style={[toolStyles.body, { color: colors.textSecondary }]}>{item.body}</Text> : null}
            {isLeader ? (
              <View style={styles.leaderActions}>
                <TouchableOpacity onPress={() => pinMutation.mutate(item)} style={styles.inlineBtn}>
                  <Pin size={14} color={colors.textSecondary} />
                  <Text style={[styles.inlineText, { color: colors.textSecondary }]}>{item.is_pinned ? "Unpin" : "Pin"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} style={styles.inlineBtn}>
                  <Trash2 size={14} color={colors.error} />
                  <Text style={[styles.inlineText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />

      <FormSheet
        visible={composeOpen}
        title="New announcement"
        onClose={() => setComposeOpen(false)}
        onSubmit={() => {
          if (!title.trim()) return Alert.alert("Title required", "Add a short headline.");
          postMutation.mutate();
        }}
        submitLabel="Post"
        submitting={postMutation.isPending}
        color={accent}
      >
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Rehearsal moved to 6pm" />
        <Field label="Message" value={body} onChangeText={setBody} placeholder="Details for the team" multiline />
        <View style={[toolStyles.rowBetween, { marginBottom: 8 }]}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Pin to top</Text>
          <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: accent, false: colors.border }} />
        </View>
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  threadLink: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  threadText: { fontSize: 14, fontWeight: "700" },
  leaderActions: { flexDirection: "row", gap: 16, marginTop: 12 },
  inlineBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineText: { fontSize: 13, fontWeight: "600" },
});

