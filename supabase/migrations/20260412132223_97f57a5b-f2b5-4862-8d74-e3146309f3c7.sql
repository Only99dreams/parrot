
-- Fix overly permissive policies on news_articles
DROP POLICY IF EXISTS "Authenticated can insert news" ON public.news_articles;
DROP POLICY IF EXISTS "Authenticated can update news" ON public.news_articles;

CREATE POLICY "Admins can insert news"
ON public.news_articles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news"
ON public.news_articles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix overly permissive policy on poll_options
DROP POLICY IF EXISTS "Authenticated can insert poll options" ON public.poll_options;

CREATE POLICY "Admins can insert poll options"
ON public.poll_options FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
