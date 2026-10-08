import React, { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, timeAgo } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { Avatar, MinistryCtx, StateView, ToolScreen } from "@/components/ministry/ToolScaffold";

interface ThreadMessage {
  id: string;
  body: string;
  sender_id: string;
  parent_id: string | null;
  created_at: string;
  sender: { display_name: string | null } | null;
}

export default function MinistryThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ToolScreen ministryId={id} title="Team Thread" minPlan={getToolPlan("thread")}>
      {(ctx) => <ThreadBody ctx={ctx} />}
    </ToolScreen>
  );
}

function ThreadBody({ ctx }: { ctx: MinistryCtx }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const [text, setText] = useState("");

  const messagesQuery = useQuery<ThreadMessage[]>({
    queryKey: ["ministry-thread", ministryId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_messages")
        .select("id, body, sender_id, parent_id, created_at, sender:profiles!ministry_messages_sender_id_fkey(display_name)")
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data || []) as unknown as ThreadMessage[]).reverse();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!profileId) throw new Error("Your church profile wasn't found.");
      const { error } = await db.from("ministry_messages").insert({
        ministry_id: ministryId,
        church_id: churchId,
        sender_id: profileId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["ministry-thread", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300);
    },
    onError: (err) => Alert.alert("Couldn't send", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await db.from("ministry_messages").delete().eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ministry-thread", ministryId] }),
    onError: (err) => Alert.alert("Couldn't delete", errorMessage(err)),
  });

  const confirmDelete = (m: ThreadMessage) => {
    if (!(isLeader || m.sender_id === profileId)) return;
    Alert.alert("Delete message?", "This removes it for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(m.id) },
    ]);
  };

  if (messagesQuery.isLoading) return <StateView kind="loading" title="Loading thread..." />;
  if (messagesQuery.isError) {
    return (
      <StateView kind="error" title="Couldn't load the thread" description={errorMessage(messagesQuery.error)} actionLabel="Retry" onAction={() => messagesQuery.refetch()} />
    );
  }

  const send = () => {
    const body = text.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messagesQuery.data || []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<MessageCircle size={30} color={colors.textTertiary} />}
            title="Start the conversation"
            description="Messages here are visible to everyone in this ministry."
          />
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === profileId;
          const name = displayName(item.sender);
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => confirmDelete(item)}
              style={[styles.msgRow, mine && styles.msgRowMine, item.parent_id ? styles.reply : null]}
            >
              {!mine ? <Avatar name={name} color={accent} size={30} /> : null}
              <View style={[styles.bubble, { backgroundColor: mine ? accent : colors.surface, borderColor: colors.borderLight }]}>
                {!mine ? <Text style={[styles.sender, { color: accent }]}>{name}</Text> : null}
                <Text style={[styles.body, { color: mine ? "#fff" : colors.text }]}>{item.body}</Text>
                <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.75)" : colors.textTertiary }]}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message the team"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? accent : colors.border }]}
          onPress={send}
          disabled={!text.trim() || sendMutation.isPending}
          accessibilityLabel="Send"
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10, maxWidth: "88%" },
  msgRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  reply: { marginLeft: 24 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, flexShrink: 1 },
  sender: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 4 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
