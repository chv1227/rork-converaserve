import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href, Stack } from "expo-router";
import {
  Plus,
  Music,
  Trash2,
  Edit3,
  X,
  Check,
  Clock,
  ArrowLeft,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import Colors from '@/constants/colors';
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Song } from "@/types";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface SongRowProps {
  song: Song;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function SongRow({ song, onEdit, onDelete, isDeleting }: SongRowProps) {
  return (
    <View style={styles.songRow}>
      <View style={styles.songRowLeft}>
        {song.coverImage ? (
          <Image source={{ uri: song.coverImage }} style={styles.songThumb} />
        ) : (
          <View style={styles.songThumbPlaceholder}>
            <Music size={20} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.songRowInfo}>
          <Text style={styles.songRowTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <View style={styles.songRowMeta}>
            {!!song.artist && (
              <Text style={styles.songRowArtist} numberOfLines={1}>
                {song.artist}
              </Text>
            )}
            <View style={styles.durationBadge}>
              <Clock size={10} color={Colors.textTertiary} />
              <Text style={styles.durationText}>{formatDuration(song.duration)}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.songRowActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEdit}
          testID={`edit-song-${song.id}`}
        >
          <Edit3 size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
          disabled={isDeleting}
          testID={`delete-song-${song.id}`}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <Trash2 size={18} color={Colors.error} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ManageSongsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const songsQuery = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: { id: string; title: string; artist: string | null; duration: number; cover_image: string | null; audio_url: string | null; organization_id: string | null; created_by: string | null; created_at: string; updated_at: string }): Song => ({
        id: s.id,
        title: s.title,
        artist: s.artist || undefined,
        duration: s.duration || 0,
        coverImage: s.cover_image || undefined,
        organizationId: s.organization_id || '',
        createdBy: s.created_by || '',
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    },
  });
  const songs = songsQuery.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; artist?: string; duration: number; coverImage?: string }) => {
      const { error } = await (supabase as any)
        .from('songs')
        .insert({
          title: data.title,
          artist: data.artist || null,
          duration: data.duration,
          cover_image: data.coverImage || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Song created successfully");
      queryClient.invalidateQueries();
      setShowAddForm(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating song:", error);
      Alert.alert("Error", "Failed to create song. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { error } = await (supabase as any)
        .from('songs')
        .delete()
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Song deleted successfully");
      queryClient.invalidateQueries();
      setDeletingId(null);
    },
    onError: (error) => {
      console.error("Error deleting song:", error);
      Alert.alert("Error", "Failed to delete song. Please try again.");
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setNewTitle("");
    setNewArtist("");
    setNewCoverUrl("");
    setNewDuration("");
  };

  const handleAddSong = () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a song title.");
      return;
    }

    const durationSeconds = parseInt(newDuration) || 180;

    console.log("Creating new song:", newTitle);
    createMutation.mutate({
      title: newTitle.trim(),
      artist: newArtist.trim() || undefined,
      duration: durationSeconds,
      coverImage: newCoverUrl.trim() || undefined,
    });
  };

  const handleDeleteSong = (song: Song) => {
    Alert.alert(
      "Delete Song",
      `Are you sure you want to delete "${song.title}"? This will also delete all audio parts and lyrics.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("Deleting song:", song.id);
            setDeletingId(song.id);
            deleteMutation.mutate({ id: song.id });
          },
        },
      ]
    );
  };

  const handleEditSong = (song: Song) => {
    console.log("Editing song:", song.id);
    router.push(`/worship/edit-song?songId=${song.id}` as Href);
  };

  const onRefresh = useCallback(() => {
    console.log("Refreshing songs...");
    songsQuery.refetch();
  }, [songsQuery]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Songs</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={songsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {!showAddForm ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
            testID="add-song-button"
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Song</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addForm}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>New Song</Text>
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Enter song title"
                placeholderTextColor={Colors.textTertiary}
                testID="song-title-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Artist</Text>
              <TextInput
                style={styles.input}
                value={newArtist}
                onChangeText={setNewArtist}
                placeholder="Enter artist name"
                placeholderTextColor={Colors.textTertiary}
                testID="song-artist-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cover Image URL</Text>
              <TextInput
                style={styles.input}
                value={newCoverUrl}
                onChangeText={setNewCoverUrl}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
                testID="song-cover-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (seconds)</Text>
              <TextInput
                style={styles.input}
                value={newDuration}
                onChangeText={setNewDuration}
                placeholder="180"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                testID="song-duration-input"
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddSong}
              disabled={createMutation.isPending}
              testID="submit-song-button"
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Create Song</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.songsSection}>
          <Text style={styles.sectionTitle}>
            {songs.length} {songs.length === 1 ? "Song" : "Songs"}
          </Text>

          {songsQuery.isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : songs.length === 0 ? (
            <View style={styles.emptyState}>
              <Music size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No songs yet</Text>
              <Text style={styles.emptySubtext}>Add your first song above</Text>
            </View>
          ) : (
            <View style={styles.songsList}>
              {songs.map((song: Song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  onEdit={() => handleEditSong(song)}
                  onDelete={() => handleDeleteSong(song)}
                  isDeleting={deletingId === song.id}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  addForm: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
  songsSection: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  songsList: {
    gap: 8,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  songRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  songThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  songThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  songRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songRowTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  songRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  songRowArtist: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  songRowActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
