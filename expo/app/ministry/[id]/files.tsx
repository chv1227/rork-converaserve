import React from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Alert, Linking, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { CheckCircle2, ChevronRight, FileText, FolderOpen, Image as ImageIcon, Trash2, Upload } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { db, displayName, errorMessage, timeAgo } from "@/lib/ministryWorkspace";
import { getToolPlan } from "@/constants/ministryTools";
import { MinistryCtx, PrimaryButton, SectionLabel, StateView, ToolScreen, cardStyle, toolStyles } from "@/components/ministry/ToolScaffold";

// Uses the existing live table ministry_files + private storage bucket "ministry-files".
// Storage RLS expects objects under `<ministry_id>/...`. Non-leader uploads start as
// "pending" until a leader approves them (enforced by the mfiles_insert policy).

const BUCKET = "ministry-files";

interface MinistryFile {
  id: string;
  name: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  status: "pending" | "approved" | string;
  uploader_id: string | null;
  created_at: string;
  uploader: { display_name: string | null } | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return res.arrayBuffer();
  }
  const base64 = await LegacyFileSystem.readAsStringAsync(uri, { encoding: LegacyFileSystem.EncodingType.Base64 });
  return decode(base64);
}

export default function MinistryFilesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ToolScreen ministryId={id} title="Files & Media" minPlan={getToolPlan("files")}>
      {(ctx) => <FilesBody ctx={ctx} />}
    </ToolScreen>
  );
}

function FilesBody({ ctx }: { ctx: MinistryCtx }) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ministryId, churchId, profileId, isLeader, accent } = ctx;

  const filesQuery = useQuery<MinistryFile[]>({
    queryKey: ["ministry-files", ministryId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_files")
        .select("id, name, path, mime_type, size, status, uploader_id, created_at, uploader:profiles!ministry_files_uploader_id_fkey(display_name)")
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as MinistryFile[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ministry-files", ministryId] });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Your church profile wasn't found.");
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return false;
      const asset = result.assets[0];
      const safeName = asset.name.replace(/[^\w.\-]+/g, "_");
      const path = `${ministryId}/${Date.now()}-${safeName}`;
      const body = await readAsArrayBuffer(asset.uri);
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, body, {
        contentType: asset.mimeType || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await db.from("ministry_files").insert({
        ministry_id: ministryId,
        church_id: churchId,
        uploader_id: profileId,
        name: asset.name,
        path,
        mime_type: asset.mimeType || null,
        size: asset.size ?? null,
        status: isLeader ? "approved" : "pending",
      });
      if (error) {
        await db.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return true;
    },
    onSuccess: (uploaded) => {
      if (!uploaded) return;
      invalidate();
      if (!isLeader) Alert.alert("Uploaded", "Your file will be visible to the team once a leader approves it.");
    },
    onError: (err) => Alert.alert("Upload failed", errorMessage(err)),
  });

  const approveMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await db.from("ministry_files").update({ status: "approved" }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't approve", errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: MinistryFile) => {
      const { error } = await db.from("ministry_files").delete().eq("id", file.id);
      if (error) throw error;
      await db.storage.from(BUCKET).remove([file.path]);
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Couldn't delete", errorMessage(err)),
  });

  const openFile = async (file: MinistryFile) => {
    try {
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(file.path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("No link available");
      await Linking.openURL(data.signedUrl);
    } catch (err) {
      Alert.alert("Couldn't open file", errorMessage(err));
    }
  };

  if (filesQuery.isLoading) return <StateView kind="loading" title="Loading files..." />;
  if (filesQuery.isError) {
    return <StateView kind="error" title="Couldn't load files" description={errorMessage(filesQuery.error)} actionLabel="Retry" onAction={() => filesQuery.refetch()} />;
  }

  const files = filesQuery.data || [];
  const pending = files.filter((f) => f.status !== "approved");

  return (
    <FlatList
      data={files}
      keyExtractor={(f) => f.id}
      contentContainerStyle={toolStyles.content}
      refreshControl={<RefreshControl refreshing={filesQuery.isRefetching} onRefresh={() => filesQuery.refetch()} tintColor={accent} />}
      ListHeaderComponent={
        <View>
          <PrimaryButton
            label={uploadMutation.isPending ? "Uploading..." : "Upload a file"}
            onPress={() => uploadMutation.mutate()}
            loading={uploadMutation.isPending}
            color={accent}
            icon={<Upload size={18} color="#fff" />}
          />
          <TouchableOpacity
            style={[styles.mediaLink, cardStyle(colors)]}
            onPress={() => router.push("/media" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.mediaIcon, { backgroundColor: accent + "18" }]}>
              <ImageIcon size={20} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[toolStyles.title, { color: colors.text }]}>Church Media Library</Text>
              <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>Sermons, photos & shared media</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {isLeader && pending.length > 0 ? (
            <Text style={[styles.pendingNote, { color: colors.warning }]}>{pending.length} file(s) waiting for approval</Text>
          ) : null}
          {files.length > 0 ? <SectionLabel>Ministry files</SectionLabel> : null}
        </View>
      }
      ListEmptyComponent={
        <StateView
          kind="empty"
          compact
          icon={<FolderOpen size={30} color={colors.textTertiary} />}
          title="No files yet"
          description="Upload schedules, charts, lesson plans or photos for the team."
        />
      }
      renderItem={({ item }) => {
        const isPending = item.status !== "approved";
        const canDelete = isLeader || item.uploader_id === profileId;
        return (
          <TouchableOpacity style={[toolStyles.card, cardStyle(colors)]} onPress={() => openFile(item)} activeOpacity={0.75}>
            <View style={toolStyles.row}>
              <View style={[styles.fileIcon, { backgroundColor: colors.surfaceSecondary }]}>
                {item.mime_type?.startsWith("image/") ? <ImageIcon size={20} color={accent} /> : <FileText size={20} color={accent} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[toolStyles.title, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[toolStyles.meta, { color: colors.textTertiary }]}>
                  {[displayName(item.uploader), formatSize(item.size), timeAgo(item.created_at)].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {isPending ? (
                <View style={[toolStyles.pill, { backgroundColor: colors.warningLight }]}>
                  <Text style={[toolStyles.pillText, { color: colors.warning }]}>Pending</Text>
                </View>
              ) : null}
            </View>
            {(isLeader && isPending) || canDelete ? (
              <View style={styles.actions}>
                {isLeader && isPending ? (
                  <TouchableOpacity style={styles.inlineBtn} onPress={() => approveMutation.mutate(item.id)}>
                    <CheckCircle2 size={14} color={colors.success} />
                    <Text style={[styles.inlineText, { color: colors.success }]}>Approve</Text>
                  </TouchableOpacity>
                ) : null}
                {canDelete ? (
                  <TouchableOpacity style={styles.inlineBtn} onPress={() => deleteMutation.mutate(item)}>
                    <Trash2 size={14} color={colors.error} />
                    <Text style={[styles.inlineText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  mediaLink: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12, marginBottom: 12 },
  mediaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pendingNote: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  actions: { flexDirection: "row", gap: 16, marginTop: 10 },
  inlineBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineText: { fontSize: 13, fontWeight: "600" },
});
