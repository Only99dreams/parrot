-- =============================================
-- User Posts table (images, videos, reels)
-- =============================================
create table if not exists public.user_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  caption       text,
  media_urls    jsonb not null default '[]'::jsonb,
  media_types   jsonb not null default '[]'::jsonb,  -- array of 'image' | 'video'
  post_type     text not null default 'post'           -- 'post' | 'reel'
                  check (post_type in ('post', 'reel')),
  likes         int not null default 0,
  comments_count int not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.user_posts enable row level security;

-- Everyone can read published posts
create policy "Anyone can view published posts"
  on public.user_posts for select
  using (is_published = true);

-- Only the owner can insert
create policy "Users can create their own posts"
  on public.user_posts for insert
  with check (auth.uid() = user_id);

-- Only the owner can update
create policy "Users can update their own posts"
  on public.user_posts for update
  using (auth.uid() = user_id);

-- Only the owner can delete
create policy "Users can delete their own posts"
  on public.user_posts for delete
  using (auth.uid() = user_id);

-- Allow service role to update like counts
create policy "Service role can update posts"
  on public.user_posts for update
  using (true);

-- =============================================
-- Post Likes table
-- =============================================
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  post_id    uuid references public.user_posts(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

alter table public.post_likes enable row level security;

create policy "Anyone can view post likes"
  on public.post_likes for select using (true);

create policy "Users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- =============================================
-- AI Reels table (internet-sourced videos)
-- =============================================
create table if not exists public.ai_reels (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  video_url     text not null unique,
  thumbnail_url text,
  description   text,
  source        text default 'YouTube',
  source_url    text,
  category      text not null default 'Nigeria',
  duration      text,
  channel_name  text,
  views         int default 0,
  likes         int default 0,
  fetched_at    timestamptz not null default now()
);

alter table public.ai_reels enable row level security;

-- Everyone can read AI reels
create policy "Anyone can view ai reels"
  on public.ai_reels for select using (true);

-- Only service role can insert/update (edge function)
create policy "Service role can manage ai reels"
  on public.ai_reels for all
  using (true)
  with check (true);

-- =============================================
-- Storage bucket for user media uploads
-- =============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  true,
  52428800,  -- 50 MB per file
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime','video/avi']
)
on conflict (id) do nothing;

-- Storage RLS: anyone can read, authenticated users can upload own files
create policy "Public read access for user-media"
  on storage.objects for select
  using (bucket_id = 'user-media');

create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check (
    bucket_id = 'user-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own media"
  on storage.objects for delete
  using (
    bucket_id = 'user-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- Indexes
-- =============================================
create index if not exists user_posts_user_id_idx   on public.user_posts (user_id);
create index if not exists user_posts_created_at_idx on public.user_posts (created_at desc);
create index if not exists user_posts_type_idx       on public.user_posts (post_type);
create index if not exists ai_reels_category_idx     on public.ai_reels (category);
create index if not exists ai_reels_fetched_at_idx   on public.ai_reels (fetched_at desc);

-- =============================================
-- Updated_at trigger for user_posts
-- =============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_posts_updated_at on public.user_posts;
create trigger set_user_posts_updated_at
  before update on public.user_posts
  for each row execute procedure public.handle_updated_at();
