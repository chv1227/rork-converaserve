import { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  SectionList,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href, Stack } from "expo-router";
import { Music, Play, Settings, Clock, Mic2, ArrowLeft, Search, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { Song } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface SongCardProps {
  song: Song;
  onPress: () => void;
}

function SongCard({ song, onPress }: SongCardProps) {
  const audioPartsQuery = useQuery({
    queryKey: ['song-audio-parts', song.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_audio_parts')
        .select('*')
        .eq('song_id', song.id);
      if (error) { console.log('Audio parts query error:', error.message); return []; }
      return (data || []) as { id: string; part_name: string; audio_url: string }[];
    },
  });
  const availableParts = (audioPartsQuery.data || []).map((p: { part_name: string }) => p.part_name);
  return (
    <TouchableOpacity
      style={styles.songCard}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`song-card-${song.id}`}
    >
      <View style={styles.songImageContainer}>
        {song.coverImage ? (
          <Image source={{ uri: song.coverImage }} style={styles.songImage} />
        ) : (
          <View style={styles.songImagePlaceholder}>
            <Music size={28} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <Play size={20} color="#fff" fill="#fff" />
        </View>
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {song.title}
        </Text>
        {!!song.artist && (
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        )}
        <View style={styles.songMeta}>
          <View style={styles.metaItem}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{formatDuration(song.duration)}</Text>
          </View>
          {availableParts.length > 0 && (
            <View style={styles.metaItem}>
              <Mic2 size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>
                {availableParts.length} {availableParts.length === 1 ? "part" : "parts"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function WorshipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const sectionListRef = useRef<SectionList>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetterIndex, setActiveLetterIndex] = useState<number | null>(null);

  const songsQuery = useQuery({
    queryKey: ['songs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('title');
      if (error) { console.log('Songs query error:', error.message); return []; }
      return (data || []).map((s: { id: string; title: string; artist: string | null; duration: number; cover_image: string | null; organization_id: string | null; created_by: string | null; created_at: string; updated_at: string }): Song => ({
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
  const songs = useMemo(() => songsQuery.data || [], [songsQuery.data]);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const query = searchQuery.toLowerCase();
    return songs.filter(
      (song: Song) =>
        song.title.toLowerCase().includes(query) ||
        (song.artist && song.artist.toLowerCase().includes(query))
    );
  }, [songs, searchQuery]);

  const sections = useMemo(() => {
    const grouped: Record<string, Song[]> = {};
    
    filteredSongs.forEach((song) => {
      const firstChar = song.title.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(song);
    });

    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === '#') return -1;
        if (b === '#') return 1;
        return a.localeCompare(b);
      })
      .map((letter) => ({
        title: letter,
        data: grouped[letter].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [filteredSongs]);

  const availableLetters = useMemo(() => {
    return new Set(sections.map((s) => s.title));
  }, [sections]);

  const handleLetterPress = useCallback((letter: string, index: number) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setActiveLetterIndex(index);
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
      setTimeout(() => setActiveLetterIndex(null), 300);
    }
  }, [sections]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const onRefresh = useCallback(() => {
    console.log("Refreshing songs...");
    songsQuery.refetch();
  }, [songsQuery]);

  const handleSongPress = (songId: string) => {
    console.log("Opening song player:", songId);
    router.push(`/worship/player?songId=${songId}` as Href);
  };

  const handleManagePress = () => {
    console.log("Opening song management");
    router.push("/worship/manage" as Href);
  };

  if (songsQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Music Player</Text>
            <Text style={styles.subtitle}>Practice songs & learn your parts</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManagePress}
              testID="manage-songs-button"
            >
              <Settings size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {!isAdmin && <View style={{ width: 44 }} />}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs or artists..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            testID="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.listContainer}>
        {filteredSongs.length === 0 ? (
          <View style={styles.emptyState}>
            <Music size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Results Found' : 'No Songs Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No songs match "${searchQuery}"`
                : isAdmin
                ? "Tap the settings icon to add songs for your team"
                : "Check back later for new practice songs"}
            </Text>
          </View>
        ) : (
          <>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SongCard
                  song={item}
                  onPress={() => handleSongPress(item.id)}
                />
              )}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              contentContainerStyle={styles.sectionListContent}
              stickySectionHeadersEnabled={true}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={songsQuery.isRefetching}
                  onRefresh={onRefresh}
                  tintColor={Colors.primary}
                />
              }
              onScrollToIndexFailed={() => {}}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />

            <View style={styles.alphabetSidebar}>
              {ALPHABET.map((letter, index) => {
                const isAvailable = availableLetters.has(letter);
                const isActive = activeLetterIndex === index;
                return (
                  <TouchableOpacity
                    key={letter}
                    style={[
                      styles.alphabetLetter,
                      isActive && styles.alphabetLetterActive,
                    ]}
                    onPress={() => handleLetterPress(letter, index)}
                    disabled={!isAvailable}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.alphabetLetterText,
                        !isAvailable && styles.alphabetLetterTextDisabled,
                        isActive && styles.alphabetLetterTextActive,
                      ]}
                    >
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
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
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  manageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 10,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
    flexDirection: "row",
  },
  sectionListContent: {
    paddingHorizontal: 16,
    paddingRight: 36,
  },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
    textTransform: "uppercase",
  },
  alphabetSidebar: {
    position: "absolute",
    right: 2,
    top: 0,
    bottom: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    zIndex: 10,
  },
  alphabetLetter: {
    width: 22,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  alphabetLetterActive: {
    backgroundColor: Colors.primary,
    borderRadius: 11,
  },
  alphabetLetterText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  alphabetLetterTextDisabled: {
    color: Colors.textTertiary,
    opacity: 0.4,
  },
  alphabetLetterTextActive: {
    color: "#fff",
  },
  songCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  songImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  songImage: {
    width: "100%",
    height: "100%",
  },
  songImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  songInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  songMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
