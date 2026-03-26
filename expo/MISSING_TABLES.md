# Missing Database Tables

The following tables need to be created in Supabase to support the features that were using tRPC:

## 1. Polls System

```sql
-- Polls table
CREATE TABLE public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    allow_multiple BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id),
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_polls_church ON public.polls(church_id);
CREATE INDEX idx_polls_ministry ON public.polls(ministry_id);
CREATE INDEX idx_polls_active ON public.polls(is_active);

-- Poll options
CREATE TABLE public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    voter_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id);

-- Poll votes (for tracking individual votes)
CREATE TABLE public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, profile_id, option_id)
);

CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_profile ON public.poll_votes(profile_id);
```

## 2. Songs/Worship System

```sql
-- Songs table
CREATE TABLE public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    cover_image TEXT,
    audio_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_church ON public.songs(church_id);

-- Song audio parts (for choir parts like soprano, alto, tenor, bass)
CREATE TABLE public.song_audio_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_song_audio_parts_song ON public.song_audio_parts(song_id);

-- Song lyrics
CREATE TABLE public.song_lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_song_lyrics_song ON public.song_lyrics(song_id);
```

## 3. Giving/Donations System

```sql
CREATE TYPE giving_type AS ENUM ('tithe', 'offering', 'special');
CREATE TYPE giving_frequency AS ENUM ('one_time', 'weekly', 'bi_weekly', 'monthly');
CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Donations table
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type giving_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency giving_frequency DEFAULT 'one_time',
    status donation_status DEFAULT 'pending',
    payment_method TEXT,
    note TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_church ON public.donations(church_id);
CREATE INDEX idx_donations_profile ON public.donations(profile_id);
CREATE INDEX idx_donations_status ON public.donations(status);

-- Recurring giving
CREATE TABLE public.recurring_giving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type giving_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency giving_frequency NOT NULL,
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_giving_church ON public.recurring_giving(church_id);
CREATE INDEX idx_recurring_giving_profile ON public.recurring_giving(profile_id);
CREATE INDEX idx_recurring_giving_active ON public.recurring_giving(is_active);
```

## 4. Discussions System

```sql
-- Discussions/Posts table
CREATE TABLE public.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    comment_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussions_church ON public.discussions(church_id);
CREATE INDEX idx_discussions_ministry ON public.discussions(ministry_id);
CREATE INDEX idx_discussions_author ON public.discussions(author_id);

-- Discussion comments
CREATE TABLE public.discussion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussion_comments_discussion ON public.discussion_comments(discussion_id);
```

## 5. Messages/Chat System

```sql
-- Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    is_group BOOLEAN DEFAULT FALSE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, profile_id)
);

CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_profile ON public.conversation_participants(profile_id);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
```

## 6. Add triggers for updated_at

```sql
CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON public.songs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_giving_updated_at
    BEFORE UPDATE ON public.recurring_giving
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at
    BEFORE UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## Next Steps

1. Run these SQL scripts in your Supabase SQL editor
2. Set up Row Level Security (RLS) policies for each table
3. Update the app code to use the new tables

## Note on RLS Policies

Each table will need appropriate RLS policies. Example for polls:

```sql
-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Users can view polls in their church
CREATE POLICY "Users can view church polls" ON public.polls
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM public.church_memberships
            WHERE profile_id = auth.uid()
        )
    );

-- Leaders can create polls
CREATE POLICY "Leaders can create polls" ON public.polls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.church_memberships
            WHERE profile_id = auth.uid()
            AND church_id = polls.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
        )
    );
```

Apply similar RLS policies for all other tables based on your security requirements.
