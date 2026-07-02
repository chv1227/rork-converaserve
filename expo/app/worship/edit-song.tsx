import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Save,
  Plus,
  Trash2,
  Music2,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react-native";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LightTheme } from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { VocalPart, AudioPart } from "@/types";

const VOCAL_PARTS: { key: VocalPart; label: string }[] = [
  { key: "soprano", label: "Soprano" },
  { key: "alto", label: "Alto" },
  { key: "tenor", label: "Tenor" },
  { key: "bass", label: "Bass" },
  { key: "full", label: "Full Mix" },
];

export default function EditSongScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { songId } = useLocalSearchParams<{ songId: string }>();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [showAudioSection, setShowAudioSection] = useState(false);
  const [showLyricsSection, setShowLyricsSection] = useState(false);

  const [newAudioPart, setNewAudioPart] = useState<VocalPart>("full");
  const [newAudioUrl, setNewAudioUrl] = useState("");

  const [lyricsText, setLyricsText] = useState("");

  const songQuery = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      if (!songId) return null;
      const { data: song, error: songError } = await (supabase as any)
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single();
      if (songError) throw songError;
      const s = song as { id: string; title: string; artist: string | null; duration: number; cover_image: string | null; audio_url: string | null } | null;
      
      const { data: audioParts, error: audioError } = await (supabase as any)
        .from('song_audio_parts')
        .select('*')
        .eq('song_id', songId);
      if (audioError) throw audioError;
      const aps = (audioParts || []) as { id: string; part_name: string; audio_url: string }[];
      
      const { data: lyrics, error: lyricsError } = await (supabase as any)
        .from('song_lyrics')
        .select('*')
        .eq('song_id', songId)
        .order('timestamp_ms', { ascending: true });
      if (lyricsError) throw lyricsError;
      const lrs = (lyrics || []) as { id: string; timestamp_ms: number | null; content: string }[];
      
      return {
        song: s ? {
          id: s.id,
          title: s.title,
          artist: s.artist,
          duration: s.duration,
          coverImage: s.cover_image,
          audioUrl: s.audio_url,
        } : null,
        audioParts: aps.map(ap => ({
          id: ap.id,
          songId: songId!,
          vocalPart: ap.part_name as VocalPart,
          audioFileUrl: ap.audio_url,
          duration: 0,
        })),
        lyrics: lrs.map(l => ({
          id: l.id,
          startTime: l.timestamp_ms || 0,
          endTime: (l.timestamp_ms || 0) + 3000,
          lineText: l.content,
        })),
      };
    },
    enabled: !!songId
  });

  const song = songQuery.data?.song;
  const audioParts = useMemo(() => songQuery.data?.audioParts || [], [songQuery.data?.audioParts]);
  const lyrics = useMemo(() => songQuery.data?.lyrics || [], [songQuery.data?.lyrics]);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist || "");
      setCoverUrl(song.coverImage || "");
      setDuration(song.duration.toString());
    }
  }, [song]);

  useEffect(() => {
    if (lyrics.length > 0) {
      const formattedLyrics = lyrics
        .map((l) => `${l.startTime}-${l.endTime}:${l.lineText}`)
        .join("\n");
      setLyricsText(formattedLyrics);
    }
  }, [lyrics]);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; artist: string; coverImage?: string; duration: number }) => {
      const { error } = await (supabase as any)
        .from('songs')
        .update({
          title: data.title,
          artist: data.artist,
          cover_image: data.coverImage,
          duration: data.duration,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Song updated successfully");
      queryClient.invalidateQueries();
      Alert.alert("Success", "Song details updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating song:", error);
      Alert.alert("Error", "Failed to update song");
    },
  });

  const addAudioPartMutation = useMutation({
    mutationFn: async (data: { songId: string; vocalPart: VocalPart; audioUrl: string }) => {
      const { error } = await (supabase as any)
        .from('song_audio_parts')
        .insert({
          song_id: data.songId,
          part_name: data.vocalPart,
          audio_url: data.audioUrl,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Audio part added successfully");
      queryClient.invalidateQueries();
      setNewAudioUrl("");
    },
    onError: (error: Error) => {
      console.error("Error adding audio part:", error);
      Alert.alert("Error", "Failed to add audio part");
    },
  });

  const removeAudioPartMutation = useMutation({
    mutationFn: async (data: { audioPartId: string }) => {
      const { error } = await (supabase as any)
        .from('song_audio_parts')
        .delete()
        .eq('id', data.audioPartId);
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Audio part removed successfully");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Error removing audio part:", error);
      Alert.alert("Error", "Failed to remove audio part");
    },
  });

  const updateLyricsMutation = useMutation({
    mutationFn: async (data: { songId: string; lyrics: Array<{ startTime: number; endTime: number; lineText: string }> }) => {
      await (supabase as any).from('song_lyrics').delete().eq('song_id', data.songId);
      const { error } = await (supabase as any)
        .from('song_lyrics')
        .insert(
          data.lyrics.map(l => ({
            song_id: data.songId,
            content: l.lineText,
            timestamp_ms: l.startTime,
          }))
        );
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("Lyrics updated successfully");
      queryClient.invalidateQueries();
      Alert.alert("Success", "Lyrics saved successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating lyrics:", error);
      Alert.alert("Error", "Failed to save lyrics");
    },
  });

  const handleSaveDetails = () => {
    if (!songId || !title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    console.log("Updating song details:", songId);
    updateMutation.mutate({
      id: songId,
      title: title.trim(),
      artist: artist.trim(),
      coverImage: coverUrl.trim() || undefined,
      duration: parseInt(duration) || 180,
    });
  };

  const handleAddAudioPart = () => {
    if (!songId || !newAudioUrl.trim()) {
      Alert.alert("Error", "Please enter an audio URL");
      return;
    }

    console.log("Adding audio part:", newAudioPart);
    addAudioPartMutation.mutate({
      songId,
      vocalPart: newAudioPart,
      audioUrl: newAudioUrl.trim(),
    });
  };

  const handleRemoveAudioPart = (part: AudioPart) => {
    Alert.alert(
      "Remove Audio Part",
      `Are you sure you want to remove the ${part.vocalPart} part?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            console.log("Removing audio part:", part.id);
            removeAudioPartMutation.mutate({ audioPartId: part.id });
          },
        },
      ]
    );
  };

  const handleSaveLyrics = () => {
    if (!songId) return;

    const lines = lyricsText.split("\n").filter((line) => line.trim());
    const parsedLyrics = lines.map((line, index) => {
      const match = line.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?):(.*)$/);
      if (match) {
        return {
          startTime: parseFloat(match[1]),
          endTime: parseFloat(match[2]),
          lineText: match[3].trim(),
          order: index + 1,
        };
      }
      return {
        startTime: index * 8,
        endTime: (index + 1) * 8,
        lineText: line.trim(),
        order: index + 1,
      };
    });

    console.log("Saving lyrics:", parsedLyrics.length, "lines");
    updateLyricsMutation.mutate({
      songId,
      lyrics: parsedLyrics,
    });
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Admin access required</Text>
      </View>
    );
  }

  if (songQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={LightTheme.primary} />
      </View>
    );
  }

  if (!song) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Song not found</Text>
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
          <ArrowLeft size={24} color={LightTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Song</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Song Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Song title"
              placeholderTextColor={LightTheme.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Artist</Text>
            <TextInput
              style={styles.input}
              value={artist}
              onChangeText={setArtist}
              placeholder="Artist name"
              placeholderTextColor={LightTheme.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cover Image URL</Text>
            <TextInput
              style={styles.input}
              value={coverUrl}
              onChangeText={setCoverUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={LightTheme.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Duration (seconds)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="180"
              placeholderTextColor={LightTheme.textTertiary}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveDetails}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setShowAudioSection(!showAudioSection)}
        >
          <View style={styles.collapsibleLeft}>
            <Music2 size={20} color={LightTheme.primary} />
            <Text style={styles.collapsibleTitle}>Audio Parts ({audioParts.length})</Text>
          </View>
          {showAudioSection ? (
            <ChevronUp size={20} color={LightTheme.textSecondary} />
          ) : (
            <ChevronDown size={20} color={LightTheme.textSecondary} />
          )}
        </TouchableOpacity>

        {showAudioSection && (
          <View style={styles.section}>
            {audioParts.map((part) => (
              <View key={part.id} style={styles.audioPartRow}>
                <View style={styles.audioPartInfo}>
                  <Text style={styles.audioPartLabel}>
                    {VOCAL_PARTS.find((p) => p.key === part.vocalPart)?.label || part.vocalPart}
                  </Text>
                  <Text style={styles.audioPartUrl} numberOfLines={1}>
                    {part.audioFileUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveAudioPart(part)}
                  disabled={removeAudioPartMutation.isPending}
                >
                  <Trash2 size={16} color={LightTheme.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addAudioForm}>
              <Text style={styles.inputLabel}>Add Audio Part</Text>
              <View style={styles.partSelector}>
                {VOCAL_PARTS.map((part) => (
                  <TouchableOpacity
                    key={part.key}
                    style={[
                      styles.partOption,
                      newAudioPart === part.key && styles.partOptionActive,
                    ]}
                    onPress={() => setNewAudioPart(part.key)}
                  >
                    <Text
                      style={[
                        styles.partOptionText,
                        newAudioPart === part.key && styles.partOptionTextActive,
                      ]}
                    >
                      {part.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={newAudioUrl}
                onChangeText={setNewAudioUrl}
                placeholder="Audio file URL"
                placeholderTextColor={LightTheme.textTertiary}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addPartButton}
                onPress={handleAddAudioPart}
                disabled={addAudioPartMutation.isPending}
              >
                {addAudioPartMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addPartButtonText}>Add Part</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setShowLyricsSection(!showLyricsSection)}
        >
          <View style={styles.collapsibleLeft}>
            <FileText size={20} color={LightTheme.primary} />
            <Text style={styles.collapsibleTitle}>Lyrics ({lyrics.length} lines)</Text>
          </View>
          {showLyricsSection ? (
            <ChevronUp size={20} color={LightTheme.textSecondary} />
          ) : (
            <ChevronDown size={20} color={LightTheme.textSecondary} />
          )}
        </TouchableOpacity>

        {showLyricsSection && (
          <View style={styles.section}>
            <Text style={styles.lyricsHint}>
              Format: startTime-endTime:Lyric text{"\n"}
              Example: 0-8:Amazing grace, how sweet the sound
            </Text>
            <TextInput
              style={styles.lyricsInput}
              value={lyricsText}
              onChangeText={setLyricsText}
              placeholder="Enter lyrics with timestamps..."
              placeholderTextColor={LightTheme.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveLyrics}
              disabled={updateLyricsMutation.isPending}
            >
              {updateLyricsMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Lyrics</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: LightTheme.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: LightTheme.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: LightTheme.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: LightTheme.text,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LightTheme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  collapsibleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  audioPartRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  audioPartInfo: {
    flex: 1,
  },
  audioPartLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  audioPartUrl: {
    fontSize: 12,
    color: LightTheme.textTertiary,
    marginTop: 4,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  addAudioForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: LightTheme.borderLight,
  },
  partSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  partOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: LightTheme.surfaceSecondary,
  },
  partOptionActive: {
    backgroundColor: LightTheme.primary,
  },
  partOptionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: LightTheme.text,
  },
  partOptionTextActive: {
    color: "#fff",
  },
  addPartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LightTheme.primaryLight,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  addPartButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  lyricsHint: {
    fontSize: 12,
    color: LightTheme.textTertiary,
    marginBottom: 12,
    lineHeight: 18,
  },
  lyricsInput: {
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: LightTheme.text,
    minHeight: 200,
    fontFamily: "monospace",
  },
});
