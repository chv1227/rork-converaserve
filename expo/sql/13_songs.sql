-- ============================================
-- 13_songs.sql
-- Songs & Worship Music System
-- ============================================

-- ============================================
-- SONGS
-- ============================================

CREATE TABLE public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    genre TEXT,
    
    -- Media
    cover_image TEXT,
    audio_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    key_signature TEXT,
    tempo INTEGER,
    bpm INTEGER,
    tags TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Authorship
    created_by UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_church ON public.songs(church_id);
CREATE INDEX idx_songs_title ON public.songs(title);
CREATE INDEX idx_songs_artist ON public.songs(artist);
CREATE INDEX idx_songs_active ON public.songs(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON public.songs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SONG AUDIO PARTS
-- ============================================

CREATE TABLE public.song_audio_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    
    -- Part info
    part_name TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_song_audio_parts_song ON public.song_audio_parts(song_id);

-- ============================================
-- SONG LYRICS
-- ============================================

CREATE TABLE public.song_lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Timing for synced lyrics
    timestamp_ms INTEGER,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_song_lyrics_song ON public.song_lyrics(song_id);
CREATE INDEX idx_song_lyrics_order ON public.song_lyrics(sort_order);

-- ============================================
-- WORSHIP SETS (Playlists)
-- ============================================

CREATE TABLE public.worship_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Content
    name TEXT NOT NULL,
    description TEXT,
    date DATE,
    service_type TEXT,
    
    -- Who created it
    created_by UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worship_sets_church ON public.worship_sets(church_id);
CREATE INDEX idx_worship_sets_date ON public.worship_sets(date);

CREATE TRIGGER update_worship_sets_updated_at
    BEFORE UPDATE ON public.worship_sets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Worship set songs (ordered list)
CREATE TABLE public.worship_set_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worship_set_id UUID NOT NULL REFERENCES public.worship_sets(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    key_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worship_set_id, song_id)
);

CREATE INDEX idx_worship_set_songs_set ON public.worship_set_songs(worship_set_id);
CREATE INDEX idx_worship_set_songs_song ON public.worship_set_songs(song_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_audio_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_set_songs ENABLE ROW LEVEL SECURITY;

-- Anyone in the church can view songs
CREATE POLICY "Members can view songs"
    ON public.songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND church_id = songs.church_id
        )
    );

-- Leaders/admins can manage songs
CREATE POLICY "Leaders can manage songs"
    ON public.songs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = songs.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

CREATE POLICY "Leaders can update songs"
    ON public.songs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = songs.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

CREATE POLICY "Leaders can delete songs"
    ON public.songs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = songs.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Audio parts inherit song visibility
CREATE POLICY "Members can view audio parts"
    ON public.song_audio_parts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.songs
            JOIN public.profiles ON profiles.church_id = songs.church_id
            WHERE songs.id = song_audio_parts.song_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Leaders can manage audio parts"
    ON public.song_audio_parts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.songs
            WHERE songs.id = song_audio_parts.song_id
            AND EXISTS (
                SELECT 1 FROM public.user_church_roles
                WHERE user_id = auth.uid()
                AND church_id = songs.church_id
                AND role IN ('owner', 'admin', 'pastor', 'staff')
                AND is_active = TRUE
            )
        )
    );

-- Lyrics inherit song visibility
CREATE POLICY "Members can view lyrics"
    ON public.song_lyrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.songs
            JOIN public.profiles ON profiles.church_id = songs.church_id
            WHERE songs.id = song_lyrics.song_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Leaders can manage lyrics"
    ON public.song_lyrics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.songs
            WHERE songs.id = song_lyrics.song_id
            AND EXISTS (
                SELECT 1 FROM public.user_church_roles
                WHERE user_id = auth.uid()
                AND church_id = songs.church_id
                AND role IN ('owner', 'admin', 'pastor', 'staff')
                AND is_active = TRUE
            )
        )
    );

-- Worship sets policies
CREATE POLICY "Members can view worship sets"
    ON public.worship_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND church_id = worship_sets.church_id
        )
    );

CREATE POLICY "Leaders can manage worship sets"
    ON public.worship_sets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = worship_sets.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Worship set songs inherit set visibility
CREATE POLICY "Members can view worship set songs"
    ON public.worship_set_songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.worship_sets
            JOIN public.profiles ON profiles.church_id = worship_sets.church_id
            WHERE worship_sets.id = worship_set_songs.worship_set_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Leaders can manage worship set songs"
    ON public.worship_set_songs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.worship_sets
            WHERE worship_sets.id = worship_set_songs.worship_set_id
            AND EXISTS (
                SELECT 1 FROM public.user_church_roles
                WHERE user_id = auth.uid()
                AND church_id = worship_sets.church_id
                AND role IN ('owner', 'admin', 'pastor', 'staff')
                AND is_active = TRUE
            )
        )
    );
