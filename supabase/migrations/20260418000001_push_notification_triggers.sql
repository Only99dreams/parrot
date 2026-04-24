-- Trigger function to call send-push edge function on key events
-- This uses pg_net (available on Supabase) to make async HTTP calls

-- Notify on new quiz
CREATE OR REPLACE FUNCTION public.notify_new_quiz()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- Only send if vault secrets are configured
  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'title', '🧠 New Daily Quiz!',
        'message', COALESCE(NEW.question, 'A new quiz is waiting for you. Test your knowledge!'),
        'url', '/quiz',
        'tag', 'daily-quiz',
        'topic', 'new_quiz'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify on new poll (via news_articles with poll_question)
CREATE OR REPLACE FUNCTION public.notify_new_poll()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Only fire if the article has a poll question
  IF NEW.poll_question IS NULL OR NEW.poll_question = '' THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'title', '📊 New Poll: Have Your Say!',
        'message', NEW.poll_question,
        'url', '/news/' || NEW.id,
        'tag', 'new-poll',
        'topic', 'new_poll'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers (drop first to be idempotent)
DROP TRIGGER IF EXISTS trg_notify_new_poll ON public.news_articles;
CREATE TRIGGER trg_notify_new_poll
  AFTER INSERT ON public.news_articles
  FOR EACH ROW
  WHEN (NEW.poll_question IS NOT NULL AND NEW.poll_question <> '')
  EXECUTE FUNCTION public.notify_new_poll();
