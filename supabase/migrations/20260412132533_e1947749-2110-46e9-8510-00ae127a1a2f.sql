
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  article_id UUID REFERENCES public.news_articles(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role needs to insert notifications too (for triggers)
CREATE POLICY "Service can insert notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Badges definition table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
ON public.badges FOR SELECT USING (true);

-- User badges junction table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges are viewable by everyone"
ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "System can insert user badges"
ON public.user_badges FOR INSERT
TO service_role
WITH CHECK (true);

-- Seed default badges
INSERT INTO public.badges (name, description, icon, criteria_type, criteria_value) VALUES
  ('First Vote', 'Cast your first vote', '🗳️', 'votes', 1),
  ('Voice of the People', 'Cast 10 votes', '📢', 'votes', 10),
  ('Poll Master', 'Cast 50 votes', '🏆', 'votes', 50),
  ('First Comment', 'Post your first comment', '💬', 'comments', 1),
  ('Commentator', 'Post 10 comments', '🎙️', 'comments', 10),
  ('Discussion Leader', 'Post 50 comments', '👑', 'comments', 50),
  ('Rising Star', 'Earn 50 points', '⭐', 'points', 50),
  ('Community Champion', 'Earn 500 points', '🌟', 'points', 500),
  ('Naija Legend', 'Earn 2000 points', '🇳🇬', 'points', 2000);

-- Function to check and award badges after votes/comments
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _vote_count INTEGER;
  _comment_count INTEGER;
  _points INTEGER;
  _badge RECORD;
BEGIN
  IF TG_TABLE_NAME = 'votes' THEN
    _user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    _user_id := NEW.user_id;
  END IF;

  SELECT COUNT(*) INTO _vote_count FROM public.votes WHERE user_id = _user_id;
  SELECT comment_count, points INTO _comment_count, _points FROM public.profiles WHERE user_id = _user_id;

  FOR _badge IN SELECT * FROM public.badges LOOP
    IF (_badge.criteria_type = 'votes' AND _vote_count >= _badge.criteria_value) OR
       (_badge.criteria_type = 'comments' AND _comment_count >= _badge.criteria_value) OR
       (_badge.criteria_type = 'points' AND _points >= _badge.criteria_value) THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (_user_id, _badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_badges_on_vote
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();

CREATE TRIGGER check_badges_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();

-- Trigger to create notification when a trending story appears
CREATE OR REPLACE FUNCTION public.notify_trending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_trending = true AND (OLD.is_trending IS NULL OR OLD.is_trending = false) THEN
    INSERT INTO public.notifications (user_id, type, title, message, article_id)
    SELECT p.user_id, 'trending', '🔥 Trending Now!', NEW.headline, NEW.id
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_article_trending
AFTER UPDATE ON public.news_articles
FOR EACH ROW EXECUTE FUNCTION public.notify_trending();
