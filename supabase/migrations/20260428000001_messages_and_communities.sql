-- =============================================
-- Direct Messages, Group Chats & Communities
-- =============================================

-- ==================== CONVERSATIONS (DMs + Group Chats) ====================

CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name        TEXT,          -- group chat name (null for DMs)
  avatar_url  TEXT,          -- group chat avatar
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: only members can see them
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update conversation"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = created_by);

-- Conversation members: members can see other members in their conversations
CREATE POLICY "Members can view conversation members"
  ON public.conversation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm2
      WHERE cm2.conversation_id = public.conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join or be added to conversations"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own membership"
  ON public.conversation_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: only members of the conversation can read/write
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Sender can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Bump conversation updated_at when new message is sent
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_conversation_on_message ON public.messages;
CREATE TRIGGER touch_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- ==================== COMMUNITIES ====================

CREATE TABLE IF NOT EXISTS public.communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  banner_url   TEXT,
  type         TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INT NOT NULL DEFAULT 1,
  post_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id   UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT,
  content        TEXT NOT NULL,
  image_url      TEXT,
  likes_count    INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Public communities visible to all; private only to members
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (
    type = 'public'
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = public.communities.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin can update community"
  ON public.communities FOR UPDATE
  USING (auth.uid() = created_by);

-- Community members
CREATE POLICY "Members visible in public communities"
  ON public.community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND (
          c.type = 'public'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.community_members cm2
            WHERE cm2.community_id = c.id AND cm2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Community posts
CREATE POLICY "Members can view community posts"
  ON public.community_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND (
          c.type = 'public'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Members can post in communities"
  ON public.community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = public.community_posts.community_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Author can delete community post"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS community_member_count_trigger ON public.community_members;
CREATE TRIGGER community_member_count_trigger
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- Auto-update post_count
CREATE OR REPLACE FUNCTION public.update_community_post_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS community_post_count_trigger ON public.community_posts;
CREATE TRIGGER community_post_count_trigger
  AFTER INSERT OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();

-- Indexes
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS conv_members_user_idx
  ON public.conversation_members (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS community_posts_community_idx
  ON public.community_posts (community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS communities_type_created_idx
  ON public.communities (type, created_at DESC);
