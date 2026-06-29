import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FolderOpen,
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  Plus,
  Download,
  ChevronRight,
  Grid3x3,
  List,
  ExternalLink,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

interface MediaItem {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  document_type: string;
  mime_type: string | null;
  file_url: string;
  folder_path: string;
  file_size: number | null;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon size={18} color="#3B82F6" />,
  video: <Video size={18} color="#EF4444" />,
  document: <FileText size={18} color="#6B7280" />,
  audio: <FileText size={18} color="#10B981" />,
};

export default function MediaLibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentFolder, setCurrentFolder] = useState("/");

  const mediaQuery = useQuery<MediaItem[]>({
    queryKey: ["media", currentOrganization?.id, currentFolder],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("*")
        .eq("church_id", currentOrganization.id)
        .eq("folder_path", currentFolder)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as MediaItem[];
    },
    enabled: !!currentOrganization?.id,
  });

  const foldersQuery = useQuery<string[]>({
    queryKey: ["media-folders", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("folder_path")
        .eq("church_id", currentOrganization.id)
        .neq("folder_path", "/");

      if (error || !data) return [];
      const unique = [...new Set((data as { folder_path: string }[]).map((d) => d.folder_path))];
      return unique.sort();
    },
    enabled: !!currentOrganization?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string; size?: number; mimeType?: string }) => {
      if (!currentOrganization?.id) throw new Error("No organization selected");

      const docType = file.type === "image" ? "image" : file.type === "video" ? "video" : "document";

      const { data, error } = await (supabase as any)
        .from("documents")
        .insert({
          church_id: currentOrganization.id,
          name: file.name,
          document_type: docType,
          mime_type: file.mimeType || null,
          file_url: file.uri,
          folder_path: currentFolder,
          file_size: file.size || null,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", currentOrganization?.id, currentFolder] });
      queryClient.invalidateQueries({ queryKey: ["media-folders", currentOrganization?.id] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await mediaQuery.refetch();
    await foldersQuery.refetch();
    setRefreshing(false);
  }, [mediaQuery, foldersQuery]);

  const handleUpload = useCallback(async () => {
    Alert.alert("Upload Media", "Choose file type", [
      {
        text: "Photo",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            uploadMutation.mutate({
              uri: asset.uri,
              name: asset.fileName || `photo_${Date.now()}.jpg`,
              type: "image",
              size: asset.fileSize,
              mimeType: asset.mimeType,
            });
          }
        },
      },
      {
        text: "Video",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            uploadMutation.mutate({
              uri: asset.uri,
              name: asset.fileName || `video_${Date.now()}.mp4`,
              type: "video",
              size: asset.fileSize,
              mimeType: asset.mimeType,
            });
          }
        },
      },
      {
        text: "Document",
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync();
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              uploadMutation.mutate({
                uri: asset.uri,
                name: asset.name,
                type: "document",
                size: asset.size,
                mimeType: asset.mimeType,
              });
            }
          } catch {
            Alert.alert("Error", "Could not pick document.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [currentFolder, uploadMutation]);

  const media = mediaQuery.data || [];
  const folders = foldersQuery.data || [];
  const isLoading = mediaQuery.isLoading;
  const isUploading = uploadMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Media Library</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List size={18} color={colors.textSecondary} /> : <Grid3x3 size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
              onPress={handleUpload}
              disabled={isUploading}
              activeOpacity={0.7}
            >
              {isUploading ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Upload size={18} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Folder Breadcrumb */}
        {currentFolder !== "/" && (
          <TouchableOpacity
            style={[styles.breadcrumb, { backgroundColor: colors.surface }]}
            onPress={() => setCurrentFolder("/")}
          >
            <FolderOpen size={16} color={colors.primary} />
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>Back to Root</Text>
          </TouchableOpacity>
        )}

        {/* Folders */}
        {currentFolder === "/" && folders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Folders</Text>
            {folders.map((folder) => (
              <TouchableOpacity
                key={folder}
                style={[styles.folderCard, { backgroundColor: colors.surface }]}
                onPress={() => setCurrentFolder(folder)}
                activeOpacity={0.7}
              >
                <FolderOpen size={20} color={colors.secondary} />
                <Text style={[styles.folderName, { color: colors.text }]}>{folder.replace("/", "")}</Text>
                <ChevronRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Files */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {currentFolder !== "/" ? currentFolder.replace("/", "") : "Files"} ({media.length})
          </Text>

          {isLoading && media.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : media.length === 0 ? (
            <View style={styles.emptyState}>
              <FolderOpen size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Empty Folder</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {isAdmin ? 'Tap the upload button to add files.' : 'No files available.'}
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            <View style={styles.grid}>
              {media.map((item) => (
                <View key={item.id} style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                  <View style={[styles.gridPreview, { backgroundColor: colors.surfaceSecondary }]}>
                    {item.document_type === "image" ? (
                      <Image source={{ uri: item.file_url }} style={styles.gridImage} contentFit="cover" />
                    ) : (
                      <View style={styles.gridIcon}>
                        {TYPE_ICONS[item.document_type] || TYPE_ICONS.document}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.gridItemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.gridItemSize, { color: colors.textTertiary }]}>{formatFileSize(item.file_size)}</Text>
                </View>
              ))}
            </View>
          ) : (
            media.map((item) => (
              <View key={item.id} style={[styles.listItem, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
                <View style={[styles.listIconBox, { backgroundColor: colors.surfaceSecondary }]}>
                  {item.document_type === "image" ? (
                    <Image source={{ uri: item.file_url }} style={styles.listThumb} contentFit="cover" />
                  ) : (
                    TYPE_ICONS[item.document_type] || TYPE_ICONS.document
                  )}
                </View>
                <View style={styles.listContent}>
                  <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.listMeta, { color: colors.textTertiary }]}>
                    {formatFileSize(item.file_size)} · {formatDate(item.created_at)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.downloadBtn} onPress={() => { void Linking.openURL(item.file_url); }}>
                  <Download size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  viewToggle: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  uploadBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  breadcrumbText: { fontSize: 14, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  loadingContainer: { padding: 40, alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: "center" },
  folderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  folderName: { flex: 1, fontSize: 15, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "47.5%",
    borderRadius: 14,
    padding: 8,
    marginBottom: 4,
  },
  gridPreview: {
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  gridImage: { width: "100%", height: "100%" },
  gridIcon: { flex: 1, alignItems: "center", justifyContent: "center" },
  gridItemName: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  gridItemSize: { fontSize: 11 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  listIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  listThumb: { width: "100%", height: "100%" },
  listContent: { flex: 1 },
  listName: { fontSize: 15, fontWeight: "600" },
  listMeta: { fontSize: 12, marginTop: 2 },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
