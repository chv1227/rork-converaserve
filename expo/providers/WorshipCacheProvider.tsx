import { useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Song, AudioPart, LyricLine } from "@/types";

const CACHE_KEYS = {
  SONGS: "worship_songs_cache",
  AUDIO_PARTS: "worship_audio_parts_cache",
  LYRICS: "worship_lyrics_cache",
  LAST_POSITION: "worship_last_position",
};

interface CachedSongData {
  songs: Song[];
  audioParts: Record<string, AudioPart[]>;
  lyrics: Record<string, LyricLine[]>;
  cachedAt: string;
}

interface LastPosition {
  songId: string;
  position: number;
  vocalPart: string;
  updatedAt: string;
}

async function loadCachedData(): Promise<CachedSongData | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.SONGS);
    if (cached) {
      console.log("Loaded cached worship data");
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error loading cached data:", error);
  }
  return null;
}

async function saveCachedData(data: CachedSongData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.SONGS, JSON.stringify(data));
    console.log("Saved worship data to cache");
  } catch (error) {
    console.error("Error saving cached data:", error);
  }
}

async function loadLastPosition(): Promise<LastPosition | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.LAST_POSITION);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error loading last position:", error);
  }
  return null;
}

async function saveLastPosition(position: LastPosition): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_POSITION, JSON.stringify(position));
    console.log("Saved last playback position");
  } catch (error) {
    console.error("Error saving last position:", error);
  }
}

export const [WorshipCacheProvider, useWorshipCache] = createContextHook(() => {
  const queryClient = useQueryClient();

  const cachedDataQuery = useQuery({
    queryKey: ["worshipCache"],
    queryFn: loadCachedData,
    staleTime: Infinity,
  });

  const lastPositionQuery = useQuery({
    queryKey: ["worshipLastPosition"],
    queryFn: loadLastPosition,
    staleTime: Infinity,
  });

  const saveCacheMutation = useMutation({
    mutationFn: saveCachedData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worshipCache"] });
    },
  });

  const savePositionMutation = useMutation({
    mutationFn: saveLastPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worshipLastPosition"] });
    },
  });

  const { mutate: saveCacheMutate } = saveCacheMutation;
  const cacheSongs = useCallback(
    (songs: Song[], audioParts: Record<string, AudioPart[]>, lyrics: Record<string, LyricLine[]>) => {
      console.log("Caching songs for offline use:", songs.length);
      saveCacheMutate({
        songs,
        audioParts,
        lyrics,
        cachedAt: new Date().toISOString(),
      });
    },
    [saveCacheMutate]
  );

  const { mutate: savePositionMutate } = savePositionMutation;
  const savePlaybackPosition = useCallback(
    (songId: string, position: number, vocalPart: string) => {
      savePositionMutate({
        songId,
        position,
        vocalPart,
        updatedAt: new Date().toISOString(),
      });
    },
    [savePositionMutate]
  );

  const getCachedSongs = useCallback((): Song[] => {
    return cachedDataQuery.data?.songs || [];
  }, [cachedDataQuery.data]);

  const getCachedAudioParts = useCallback(
    (songId: string): AudioPart[] => {
      return cachedDataQuery.data?.audioParts?.[songId] || [];
    },
    [cachedDataQuery.data]
  );

  const getCachedLyrics = useCallback(
    (songId: string): LyricLine[] => {
      return cachedDataQuery.data?.lyrics?.[songId] || [];
    },
    [cachedDataQuery.data]
  );

  const getLastPosition = useCallback((): LastPosition | null => {
    return lastPositionQuery.data || null;
  }, [lastPositionQuery.data]);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.SONGS,
        CACHE_KEYS.AUDIO_PARTS,
        CACHE_KEYS.LYRICS,
        CACHE_KEYS.LAST_POSITION,
      ]);
      queryClient.invalidateQueries({ queryKey: ["worshipCache"] });
      queryClient.invalidateQueries({ queryKey: ["worshipLastPosition"] });
      console.log("Cleared worship cache");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }, [queryClient]);

  const isCacheAvailable = useMemo(() => {
    return (cachedDataQuery.data?.songs?.length || 0) > 0;
  }, [cachedDataQuery.data]);

  const cacheAge = useMemo(() => {
    if (!cachedDataQuery.data?.cachedAt) return null;
    const cached = new Date(cachedDataQuery.data.cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - cached.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  }, [cachedDataQuery.data]);

  return {
    cacheSongs,
    savePlaybackPosition,
    getCachedSongs,
    getCachedAudioParts,
    getCachedLyrics,
    getLastPosition,
    clearCache,
    isCacheAvailable,
    cacheAge,
    isLoading: cachedDataQuery.isLoading,
  };
});
