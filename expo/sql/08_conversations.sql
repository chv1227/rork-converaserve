-- ============================================
-- 08_conversations.sql
-- Conversations, Participants, Messages
-- ============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group', 'ministry')),
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_ministry ON public.conversations(ministry_id);
CREATE INDEX idx_conversations_archived ON public.conversations(is_archived) WHERE is_archived = FALSE;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, profile_id)
);

CREATE INDEX idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_profile ON public.conversation_participants(profile_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES FOR CONVERSATIONS
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they participate in
CREATE POLICY "View own conversations"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            JOIN public.profiles p ON p.id = cp.profile_id
            WHERE cp.conversation_id = conversations.id
            AND p.user_id = auth.uid()
        )
    );

-- Authenticated users in the org can create conversations
CREATE POLICY "Create conversations in own org"
    ON public.conversations FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND public.user_belongs_to_church(organization_id)
    );

-- Conversation creator or org admin can update
CREATE POLICY "Update own conversations"
    ON public.conversations FOR UPDATE
    USING (
        created_by = auth.uid()
        OR public.user_is_admin_of_church(organization_id)
    );

-- Conversation creator or org admin can delete
CREATE POLICY "Delete own conversations"
    ON public.conversations FOR DELETE
    USING (
        created_by = auth.uid()
        OR public.user_is_admin_of_church(organization_id)
    );

-- Users can view participants of conversations they belong to
CREATE POLICY "View conversation participants"
    ON public.conversation_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp2
            JOIN public.profiles p ON p.id = cp2.profile_id
            WHERE cp2.conversation_id = conversation_participants.conversation_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can add participants to conversations they belong to
CREATE POLICY "Add conversation participants"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp2
            JOIN public.profiles p ON p.id = cp2.profile_id
            WHERE cp2.conversation_id = conversation_participants.conversation_id
            AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_participants.conversation_id
            AND c.created_by = auth.uid()
        )
    );

-- Users can update their own participant record (mark as read)
CREATE POLICY "Update own participant record"
    ON public.conversation_participants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = conversation_participants.profile_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can leave conversations (delete their participant record)
CREATE POLICY "Leave conversations"
    ON public.conversation_participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = conversation_participants.profile_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can view messages in conversations they belong to
CREATE POLICY "View messages in own conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            JOIN public.profiles p ON p.id = cp.profile_id
            WHERE cp.conversation_id = messages.conversation_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can send messages in conversations they belong to
CREATE POLICY "Send messages in own conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            JOIN public.profiles p ON p.id = cp.profile_id
            WHERE cp.conversation_id = messages.conversation_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can update their own messages
CREATE POLICY "Update own messages"
    ON public.messages FOR UPDATE
    USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Delete own messages"
    ON public.messages FOR DELETE
    USING (sender_id = auth.uid());
