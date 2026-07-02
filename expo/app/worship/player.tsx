import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Audio, AVPlaybackStatus } from "expo-av";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Music,
} from "lucide-react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import Colors from '@/constants/colors';
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { VocalPart, LyricLine } from "@/types";

const VOCAL_PARTS: { key: VocalPart; label: string; color: string }[] = [
  { key: "soprano", label: "Soprano", color: "#EC4899" },
  { key: "alto", label: "Alto", color: "#8B5CF6" },
  { key: "tenor", label: "Tenor", color: "#3B82F6" },
  { key: "bass", label: "Bass", color: "#10B981" },
  { key: "full", label: "Full Mix", color: Colors.primary },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { songId } = useLocalSearchParams<{ songId: string }>();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedPart, setSelectedPart] = useState<VocalPart>("full");
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  
  const lyricsScrollRef = useRef<ScrollView>(null);
  const lyricPositions = useRef<Record<number, number>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
          vocalPart: ap.part_name,
          audioFileUrl: ap.audio_url,
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

  const availableParts = useMemo(() => {
    return VOCAL_PARTS.filter((part) =>
      audioParts.some((ap) => ap.vocalPart === part.key)
    );
  }, [audioParts]);

  const currentAudioUrl = useMemo(() => {
    const part = audioParts.find((ap) => ap.vocalPart === selectedPart);
    return part?.audioFileUrl || audioParts[0]?.audioFileUrl;
  }, [audioParts, selectedPart]);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    };
    setupAudio();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let currentSound: Audio.Sound | null = null;
    
    const loadSound = async () => {
      if (!currentAudioUrl) return;

      console.log("Loading audio:", currentAudioUrl);
      setIsLoading(true);

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentAudioUrl },
          { shouldPlay: false, volume: 1 },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        );

        currentSound = newSound;
        if (isMounted) {
          setSound(newSound);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading sound:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentAudioUrl]);

  useEffect(() => {
    return () => {
      if (sound) {
        console.log("Unloading sound on unmount");
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (lyrics.length === 0) return;

    const currentIndex = lyrics.findIndex(
      (lyric) => position >= lyric.startTime && position < lyric.endTime
    );

    if (currentIndex !== currentLyricIndex && currentIndex !== -1) {
      setCurrentLyricIndex(currentIndex);
      
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const yPosition = lyricPositions.current[currentIndex];
      if (yPosition !== undefined && lyricsScrollRef.current) {
        lyricsScrollRef.current.scrollTo({
          y: Math.max(0, yPosition - 150),
          animated: true,
        });
      }
    }
  }, [position, lyrics, currentLyricIndex, pulseAnim]);

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const handleSeek = async (value: number) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(value * 1000);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const handleSkipBack = async () => {
    if (!sound) return;

    try {
      const newPosition = Math.max(0, position - 10);
      await sound.setPositionAsync(newPosition * 1000);
    } catch (error) {
      console.error("Error skipping back:", error);
    }
  };

  const handleSkipForward = async () => {
    if (!sound) return;

    try {
      const newPosition = Math.min(duration, position + 10);
      await sound.setPositionAsync(newPosition * 1000);
    } catch (error) {
      console.error("Error skipping forward:", error);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    if (sound) {
      try {
        await sound.setVolumeAsync(value);
      } catch (error) {
        console.error("Error setting volume:", error);
      }
    }
  };

  const handlePartChange = async (part: VocalPart) => {
    const wasPlaying = isPlaying;
    const currentPosition = position;

    if (sound && isPlaying) {
      await sound.pauseAsync();
    }

    setSelectedPart(part);

    setTimeout(async () => {
      if (sound) {
        try {
          await sound.setPositionAsync(currentPosition * 1000);
          if (wasPlaying) {
            await sound.playAsync();
          }
        } catch (error) {
          console.error("Error resuming after part change:", error);
        }
      }
    }, 500);
  };

  const handleLyricPress = async (lyric: { id: string; startTime: number; endTime: number; lineText: string }) => {
    if (!sound) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await sound.setPositionAsync(lyric.startTime * 1000);
    } catch (error) {
      console.error("Error seeking to lyric:", error);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (songQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
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

  const selectedPartInfo = VOCAL_PARTS.find((p) => p.key === selectedPart);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          testID="close-player-button"
        >
          <ChevronDown size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerSubtitle}>NOW PLAYING</Text>
          <Text style={styles.headerSongTitle} numberOfLines={1}>
            {song.title}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={lyricsScrollRef}
        style={styles.lyricsContainer}
        contentContainerStyle={styles.lyricsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverContainer}>
          {song.coverImage ? (
            <Image source={{ uri: song.coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Music size={80} color={Colors.textTertiary} />
            </View>
          )}
        </View>

        <View style={styles.songInfoContainer}>
          <Text style={styles.songTitle}>{song.title}</Text>
          {song.artist && <Text style={styles.songArtist}>{song.artist}</Text>}
        </View>

        {availableParts.length > 1 && (
          <View style={styles.partsContainer}>
            <Text style={styles.partsLabel}>Select Your Part</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.partsScroll}
            >
              {availableParts.map((part) => (
                <TouchableOpacity
                  key={part.key}
                  style={[
                    styles.partButton,
                    selectedPart === part.key && {
                      backgroundColor: part.color,
                      borderColor: part.color,
                    },
                  ]}
                  onPress={() => handlePartChange(part.key)}
                  testID={`part-button-${part.key}`}
                >
                  <Text
                    style={[
                      styles.partButtonText,
                      selectedPart === part.key && styles.partButtonTextActive,
                    ]}
                  >
                    {part.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {lyrics.length > 0 && (
          <View style={styles.lyricsSection}>
            <Text style={styles.lyricsSectionTitle}>Lyrics</Text>
            {lyrics.map((lyric, index) => (
              <TouchableOpacity
                key={lyric.id}
                onPress={() => handleLyricPress(lyric)}
                onLayout={(e) => {
                  lyricPositions.current[index] = e.nativeEvent.layout.y;
                }}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.lyricLine,
                    index === currentLyricIndex && {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.lyricText,
                      index === currentLyricIndex && {
                        color: selectedPartInfo?.color || Colors.primary,
                        fontWeight: "700" as const,
                        fontSize: 20,
                      },
                      index < currentLyricIndex && styles.lyricTextPast,
                    ]}
                  >
                    {lyric.lineText}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 200 }} />
      </ScrollView>

      <View style={[styles.playerControls, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor={selectedPartInfo?.color || Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={selectedPartInfo?.color || Colors.primary}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSkipBack}
            testID="skip-back-button"
          >
            <SkipBack size={28} color={Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.playButton,
              { backgroundColor: selectedPartInfo?.color || Colors.primary },
            ]}
            onPress={handlePlayPause}
            disabled={isLoading}
            testID="play-pause-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isPlaying ? (
              <Pause size={32} color="#fff" fill="#fff" />
            ) : (
              <Play size={32} color="#fff" fill="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSkipForward}
            testID="skip-forward-button"
          >
            <SkipForward size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.volumeContainer}>
          <Volume2 size={18} color={Colors.textSecondary} />
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor={Colors.textSecondary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.textSecondary}
          />
        </View>
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  headerSongTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 2,
  },
  lyricsContainer: {
    flex: 1,
  },
  lyricsContent: {
    paddingHorizontal: 24,
  },
  coverContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  coverPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  songInfoContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center",
  },
  songArtist: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  partsContainer: {
    marginTop: 24,
  },
  partsLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  partsScroll: {
    gap: 8,
  },
  partButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  partButtonTextActive: {
    color: "#fff",
  },
  lyricsSection: {
    marginTop: 32,
  },
  lyricsSectionTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  lyricLine: {
    paddingVertical: 8,
  },
  lyricText: {
    fontSize: 18,
    color: Colors.text,
    lineHeight: 28,
    textAlign: "center",
  },
  lyricTextPast: {
    color: Colors.textTertiary,
  },
  playerControls: {
    backgroundColor: Colors.surface,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 40,
    textAlign: "center",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginTop: 8,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  volumeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
    paddingHorizontal: 24,
  },
  volumeSlider: {
    flex: 1,
    height: 30,
  },
});
