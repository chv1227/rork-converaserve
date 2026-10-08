import React, { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, errorMessage, formatDate, isValidISODate, todayISO, addDaysISO } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { useMinistryMembers } from "@/hooks/useMinistryMembers";
import {
  Chip,
  Field,
  FormSheet,
  MinistryCtx,
  SectionLabel,
  StateView,
  ToolScreen,
  cardStyle,
  toolStyles,
} from "@/components/ministry/ToolScaffold";

interface MinistryTask {
  id: string;
  title: string;
  notes: string | null;
  assignee_profile_id: string | null;
  due_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

type Filter = "open" | "mine" | "done";

interface Draft {
  id?: string;
  title: string;
  notes: string;
  due: string;
  assignee: string | null;
}

const EMPTY_DRAFT: Draft = { title: "", notes: "", due: "", assignee: null };

export default function MinistryTasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <ToolScreen
      ministryId={id}
      title="Task List"
      minPlan={getToolPlan("tasks")}
      headerRight={(ctx) =>
        ctx.isLeader ? (
          <TouchableOpacity style={toolStyles.headerBtn} onPress={() => setSheetOpen(true)} accessibilityLabel="New task">
            <Plus size={22} color={ctx.accent} />
          </TouchableOpacity>
        ) : null
      }
    >
      {(ctx) => <TasksBody ctx={ctx} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} />}
    </ToolScreen>
  );
}

function TasksBody({ ctx, sheetOpen, setSheetOpen }: { ctx: MinistryCtx; sheetOpen: boolean; setSheetOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;
  const { members, nameFor } = useMinistryMembers(ministryId);
  const [filter, setFilter] = useState<Filter>("open");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const tasksQuery = useQuery<MinistryTask[]>({
    queryKey: ["ministry-tasks", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_tasks")
        .select("id, title, notes, assignee_profile_id, due_date, status, created_by, created_at, completed_at")
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as MinistryTask[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ministry-tasks", ministryId] });
    queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", ministryId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        title: d.title.trim(),
        notes: d.notes.trim() || null,
        due_date: d.due.trim() || null,
        assignee_profile_id: d.assignee,
      };
      if (d.id) {
        const { error } = await db.from("ministry_tasks").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ministry_tasks").insert({
          ...payload,
          church_id: churchId,
          ministry_id: ministryId,
          status: "open",
          created_by: profileId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setSheetOpen(false);
      setDraft(EMPTY_DRAFT);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't save task", errorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: async (task: MinistryTask) => {
      const done = task.status === "done";
      const { data, error } = await db
        .from("ministry_tasks")
        .update({ status: done ? "open" : "done", completed_at: done ? null : new Date().toISOString() })
        .eq("id", task.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("You can only update tasks assigned to you.");
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't update task", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await db.from("ministry_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSheetOpen(false);
      setDraft(EMPTY_DRAFT);
      invalidate();
    },
    onError: (err) => Alert.alert("Couldn't delete task", errorMessage(err)),
  });

  const tasks = useMemo(() => {
    const all = tasksQuery.data || [];
    const list =
      filter === "done"
        ? all.filter((t) => t.status === "done")
        : filter === "mine"
          ? all.filter((t) => t.status !== "done" && t.assignee_profile_id === profileId)
          : all.filter((t) => t.status !== "done");
    if (filter === "done") return list;
    return [...list].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  }, [tasksQuery.data, filter, profileId]);

  const counts = useMemo(() => {
    const all = tasksQuery.data || [];
    return {
      open: all.filter((t) => t.status !== "done").length,
      mine: all.filter((t) => t.status !== "done" && t.assignee_profile_id === profileId).length,
      done: all.filter((t) => t.status === "done").length,
    };
  }, [tasksQuery.data, profileId]);

  const openEditor = (task?: MinistryTask) => {
    setDraft(
      task
        ? { id: task.id, title: task.title, notes: task.notes || "", due: task.due_date || "", assignee: task.assignee_profile_id }
        : EMPTY_DRAFT
    );
    setSheetOpen(true);
  };

  const submit = () => {
    if (!draft.title.trim()) return Alert.alert("Title required", "Give the task a short title.");
    if (draft.due.trim() && !isValidISODate(draft.due)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
    saveMutation.mutate(draft);
  };

  const today = todayISO();

  let content: React.ReactNode;
  if (tasksQuery.isLoading) {
    content = <StateView kind="loading" title="Loading tasks..." />;
  } else if (tasksQuery.isError) {
    content = (
      <StateView kind="error" title="Couldn't load tasks" description={errorMessage(tasksQuery.error)} actionLabel="Retry" onAction={() => tasksQuery.refetch()} />
    );
  } else {
    content = (
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={toolStyles.content}
        refreshControl={<RefreshControl refreshing={tasksQuery.isRefetching} onRefresh={() => tasksQuery.refetch()} tintColor={accent} />}
        ListHeaderComponent={
          <View style={toolStyles.chipsRow}>
            <Chip label={`Open (${counts.open})`} selected={filter === "open"} onPress={() => setFilter("open")} color={accent} />
            <Chip label={`Mine (${counts.mine})`} selected={filter === "mine"} onPress={() => setFilter("mine")} color={accent} />
            <Chip label={`Done (${counts.done})`} selected={filter === "done"} onPress={() => setFilter("done")} color={accent} />
          </View>
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            compact
            icon={<ClipboardList size={30} color={colors.textTertiary} />}
            title={filter === "done" ? "Nothing completed yet" : "No open tasks"}
            description={isLeader ? "Tap + to create a task and assign it to someone." : "Tasks your leaders assign will show up here."}
            actionLabel={isLeader && filter !== "done" ? "New task" : undefined}
            onAction={isLeader ? () => openEditor() : undefined}
          />
        }
        renderItem={({ item }) => {
          const done = item.status === "done";
          const canToggle = isLeader || (!!profileId && item.assignee_profile_id === profileId);
          const overdue = !done && !!item.due_date && item.due_date < today;
          const pending = toggleMutation.isPending && toggleMutation.variables?.id === item.id;
          return (
            <TouchableOpacity
              style={[toolStyles.card, cardStyle(colors)]}
              activeOpacity={isLeader ? 0.7 : 1}
              onPress={() => (isLeader ? openEditor(item) : undefined)}
            >
              <View style={toolStyles.row}>
                <TouchableOpacity
                  disabled={!canToggle || pending}
                  onPress={() => toggleMutation.mutate(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={done ? "Mark as open" : "Mark as done"}
                >
                  {done ? (
                    <CheckCircle2 size={24} color={colors.success} />
                  ) : (
                    <Circle size={24} color={canToggle ? accent : colors.border} />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[toolStyles.title, { color: done ? colors.textTertiary : colors.text }, done && styles.strike]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={[toolStyles.meta, { color: overdue ? colors.error : colors.textTertiary }]}>
                    {nameFor(item.assignee_profile_id)}
                    {item.due_date ? ` · Due ${formatDate(item.due_date)}${overdue ? " (overdue)" : ""}` : ""}
                    {done && item.completed_at ? ` · Done ${formatDate(item.completed_at)}` : ""}
                  </Text>
                  {item.notes ? (
                    <Text style={[toolStyles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
      <FormSheet
        visible={sheetOpen}
        title={draft.id ? "Edit task" : "New task"}
        onClose={() => {
          setSheetOpen(false);
          setDraft(EMPTY_DRAFT);
        }}
        onSubmit={submit}
        submitLabel={draft.id ? "Save changes" : "Create task"}
        submitting={saveMutation.isPending}
        color={accent}
      >
        <Field label="Title" value={draft.title} onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))} placeholder="e.g. Set up chairs" />
        <Field
          label="Notes"
          value={draft.notes}
          onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
          placeholder="Optional details"
          multiline
        />
        <Field
          label="Due date (YYYY-MM-DD)"
          value={draft.due}
          onChangeText={(v) => setDraft((d) => ({ ...d, due: v }))}
          placeholder="Optional"
          autoCapitalize="none"
        />
        <View style={toolStyles.chipsRow}>
          <Chip label="Today" selected={draft.due === today} onPress={() => setDraft((d) => ({ ...d, due: today }))} color={accent} />
          <Chip label="In a week" selected={draft.due === addDaysISO(today, 7)} onPress={() => setDraft((d) => ({ ...d, due: addDaysISO(today, 7) }))} color={accent} />
          <Chip label="No date" selected={!draft.due} onPress={() => setDraft((d) => ({ ...d, due: "" }))} color={accent} />
        </View>
        <SectionLabel>Assign to</SectionLabel>
        <View style={toolStyles.chipsRow}>
          <Chip label="Unassigned" selected={!draft.assignee} onPress={() => setDraft((d) => ({ ...d, assignee: null }))} color={accent} />
          {members.map((m) => (
            <Chip
              key={m.profile_id}
              label={m.profiles?.display_name || "Member"}
              selected={draft.assignee === m.profile_id}
              onPress={() => setDraft((d) => ({ ...d, assignee: m.profile_id }))}
              color={accent}
            />
          ))}
        </View>
        {draft.id ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => draft.id && deleteMutation.mutate(draft.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>{deleteMutation.isPending ? "Deleting..." : "Delete task"}</Text>
          </TouchableOpacity>
        ) : null}
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  strike: { textDecorationLine: "line-through" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  deleteText: { fontSize: 14, fontWeight: "600" },
});
