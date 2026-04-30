-- =============================================
-- Active notification triggers
-- =============================================

-- Enable Realtime for news_articles so the frontend can subscribe to INSERT events
-- (safe to run multiple times; ADD TABLE is idempotent in Supabase)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.news_articles;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- ─────────────────────────────────────────────
-- 1. In-app notification when a DM / group message is received
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_display TEXT;
  conv_name      TEXT;
  member         RECORD;
BEGIN
  -- Resolve sender's display name
  SELECT COALESCE(display_name, username, 'Someone')
    INTO sender_display
    FROM public.profiles
   WHERE user_id = NEW.sender_id
   LIMIT 1;

  -- Resolve conversation name (only set for group chats)
  SELECT name
    INTO conv_name
    FROM public.conversations
   WHERE id = NEW.conversation_id
   LIMIT 1;

  -- Insert a notification row for every member except the sender
  FOR member IN
    SELECT user_id
      FROM public.conversation_members
     WHERE conversation_id = NEW.conversation_id
       AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      member.user_id,
      'new_message',
      CASE
        WHEN conv_name IS NOT NULL THEN conv_name || ': ' || sender_display
        ELSE sender_display || ' sent you a message'
      END,
      LEFT(NEW.content, 120)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();


-- ─────────────────────────────────────────────
-- 2. In-app notification when someone posts in a community
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_community_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_name    TEXT;
  community_name TEXT;
  member         RECORD;
  preview        TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone')
    INTO poster_name
    FROM public.profiles
   WHERE user_id = NEW.user_id
   LIMIT 1;

  SELECT name
    INTO community_name
    FROM public.communities
   WHERE id = NEW.community_id
   LIMIT 1;

  preview := LEFT(COALESCE(NEW.title, NEW.content, 'New post'), 120);

  FOR member IN
    SELECT user_id
      FROM public.community_members
     WHERE community_id = NEW.community_id
       AND user_id <> NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      member.user_id,
      'community_post',
      COALESCE(community_name, 'Community') || ': New Post',
      poster_name || ': ' || preview
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_community_post ON public.community_posts;
CREATE TRIGGER trg_notify_new_community_post
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_community_post();


-- ─────────────────────────────────────────────
-- 3. In-app notification for trending new news articles
--    (one notification per user who has a profile — kept lightweight by
--     only firing for articles flagged is_trending = true)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_trending_article()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only broadcast for trending articles
  IF NEW.is_trending IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, article_id)
  SELECT
    user_id,
    'trending_news',
    '🔥 Trending: ' || NEW.category,
    NEW.headline,
    NEW.id
  FROM public.profiles;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_trending_article ON public.news_articles;
CREATE TRIGGER trg_notify_trending_article
  AFTER INSERT ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trending_article();
