import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../create-context";
import { persistentDb, generateId } from "@/backend/db/persistent";
import { TRPCError } from "@trpc/server";
import { VocalPart } from "@/types";

const vocalPartSchema = z.enum(["soprano", "alto", "tenor", "bass", "full"]);

export const songsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      console.log("Fetching all songs");
      
      const songs = input?.organizationId
        ? await persistentDb.songs.findByOrganization(input.organizationId)
        : await persistentDb.songs.getAll();
      
      return songs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  getById: publicProcedure
    .input(z.object({ songId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching song:", input.songId);
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }
      return song;
    }),

  getAudioParts: publicProcedure
    .input(z.object({ songId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching audio parts for song:", input.songId);
      return await persistentDb.audioParts.findBySong(input.songId);
    }),

  getLyrics: publicProcedure
    .input(z.object({ songId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching lyrics for song:", input.songId);
      const lyrics = await persistentDb.lyrics.findBySong(input.songId);
      return lyrics.sort((a, b) => a.order - b.order);
    }),

  getSongWithDetails: publicProcedure
    .input(z.object({ songId: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching song with details:", input.songId);
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }
      const audioParts = await persistentDb.audioParts.findBySong(input.songId);
      const lyrics = await persistentDb.lyrics.findBySong(input.songId);
      
      return { 
        song, 
        audioParts, 
        lyrics: lyrics.sort((a, b) => a.order - b.order) 
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        artist: z.string().optional(),
        coverImage: z.string().optional(),
        duration: z.number().min(0),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("Creating new song:", input.title);
      
      const newSong = {
        id: generateId(),
        organizationId: input.organizationId || "default",
        title: input.title,
        artist: input.artist,
        createdBy: ctx.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coverImage: input.coverImage,
        duration: input.duration,
      };
      
      const created = await persistentDb.songs.create(newSong);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create song",
        });
      }
      
      return newSong;
    }),

  update: adminProcedure
    .input(
      z.object({
        songId: z.string(),
        title: z.string().min(1).optional(),
        artist: z.string().optional(),
        coverImage: z.string().optional(),
        duration: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Updating song:", input.songId);
      
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }
      
      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (input.title) updates.title = input.title;
      if (input.artist !== undefined) updates.artist = input.artist;
      if (input.coverImage !== undefined) updates.coverImage = input.coverImage;
      if (input.duration !== undefined) updates.duration = input.duration;
      
      const updated = await persistentDb.songs.update(input.songId, updates);
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ songId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Deleting song:", input.songId);
      
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }
      
      const audioParts = await persistentDb.audioParts.findBySong(input.songId);
      await Promise.all(audioParts.map(ap => persistentDb.audioParts.delete(ap.id)));
      
      const lyrics = await persistentDb.lyrics.findBySong(input.songId);
      await Promise.all(lyrics.map(l => persistentDb.lyrics.delete(l.id)));
      
      await persistentDb.songs.delete(input.songId);
      
      return { success: true };
    }),

  addAudioPart: adminProcedure
    .input(
      z.object({
        songId: z.string(),
        vocalPart: vocalPartSchema,
        audioFileUrl: z.string().url(),
        duration: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Adding audio part to song:", input.songId, input.vocalPart);
      
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }

      const audioParts = await persistentDb.audioParts.findBySong(input.songId);
      const existing = audioParts.find((ap) => ap.vocalPart === input.vocalPart);
      
      if (existing) {
        const updated = await persistentDb.audioParts.update(existing.id, {
          audioFileUrl: input.audioFileUrl,
          duration: input.duration,
        });
        return updated;
      }
      
      const newPart = {
        id: generateId(),
        songId: input.songId,
        vocalPart: input.vocalPart as VocalPart,
        audioFileUrl: input.audioFileUrl,
        duration: input.duration,
      };
      
      await persistentDb.audioParts.create(newPart);
      return newPart;
    }),

  removeAudioPart: adminProcedure
    .input(z.object({ audioPartId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Removing audio part:", input.audioPartId);
      
      const audioParts = await persistentDb.audioParts.getAll();
      const part = audioParts.find((ap) => ap.id === input.audioPartId);
      
      if (!part) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audio part not found",
        });
      }
      
      await persistentDb.audioParts.delete(input.audioPartId);
      return { success: true };
    }),

  addLyricLine: adminProcedure
    .input(
      z.object({
        songId: z.string(),
        lineText: z.string(),
        startTime: z.number().min(0),
        endTime: z.number().min(0),
        order: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Adding lyric line to song:", input.songId);
      
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }
      
      const newLine = {
        id: generateId(),
        songId: input.songId,
        lineText: input.lineText,
        startTime: input.startTime,
        endTime: input.endTime,
        order: input.order,
      };
      
      await persistentDb.lyrics.create(newLine);
      return newLine;
    }),

  updateLyricLine: adminProcedure
    .input(
      z.object({
        lyricId: z.string(),
        lineText: z.string().optional(),
        startTime: z.number().min(0).optional(),
        endTime: z.number().min(0).optional(),
        order: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Updating lyric line:", input.lyricId);
      
      const lyrics = await persistentDb.lyrics.getAll();
      const lyric = lyrics.find((l) => l.id === input.lyricId);
      
      if (!lyric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lyric line not found",
        });
      }
      
      const updates: Record<string, unknown> = {};
      if (input.lineText !== undefined) updates.lineText = input.lineText;
      if (input.startTime !== undefined) updates.startTime = input.startTime;
      if (input.endTime !== undefined) updates.endTime = input.endTime;
      if (input.order !== undefined) updates.order = input.order;
      
      const updated = await persistentDb.lyrics.update(input.lyricId, updates);
      return updated;
    }),

  removeLyricLine: adminProcedure
    .input(z.object({ lyricId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("Removing lyric line:", input.lyricId);
      
      const lyrics = await persistentDb.lyrics.getAll();
      const lyric = lyrics.find((l) => l.id === input.lyricId);
      
      if (!lyric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lyric line not found",
        });
      }
      
      await persistentDb.lyrics.delete(input.lyricId);
      return { success: true };
    }),

  updateAllLyrics: adminProcedure
    .input(
      z.object({
        songId: z.string(),
        lyrics: z.array(
          z.object({
            lineText: z.string(),
            startTime: z.number().min(0),
            endTime: z.number().min(0),
            order: z.number().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Updating all lyrics for song:", input.songId);
      
      const song = await persistentDb.songs.findById(input.songId);
      if (!song) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Song not found",
        });
      }

      const existingLyrics = await persistentDb.lyrics.findBySong(input.songId);
      await Promise.all(existingLyrics.map(l => persistentDb.lyrics.delete(l.id)));

      const newLyrics = await Promise.all(
        input.lyrics.map(async (lyric, index) => {
          const newLine = {
            id: generateId(),
            songId: input.songId,
            lineText: lyric.lineText,
            startTime: lyric.startTime,
            endTime: lyric.endTime,
            order: lyric.order || index + 1,
          };
          await persistentDb.lyrics.create(newLine);
          return newLine;
        })
      );
      
      return newLyrics;
    }),
});
