
-- Drop overly permissive policies
DROP POLICY "Service role can insert news" ON public.news_articles;
DROP POLICY "Service role can update news" ON public.news_articles;
DROP POLICY "Service role can insert poll options" ON public.poll_options;

-- News articles: only authenticated users can insert (edge functions use service role which bypasses RLS anyway)
CREATE POLICY "Authenticated can insert news" ON public.news_articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update news" ON public.news_articles FOR UPDATE TO authenticated USING (true);

-- Poll options: only authenticated users
CREATE POLICY "Authenticated can insert poll options" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (true);
