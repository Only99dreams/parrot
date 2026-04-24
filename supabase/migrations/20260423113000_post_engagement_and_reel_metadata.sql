-- Add post impressions to user posts
alter table public.user_posts
  add column if not exists impressions int not null default 0;

-- Comments on user posts
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.user_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "Anyone can view post comments"
  on public.post_comments for select
  using (true);

create policy "Authenticated users can add post comments"
  on public.post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own post comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

create index if not exists post_comments_post_id_idx on public.post_comments(post_id, created_at desc);

-- Keep user_posts.comments_count in sync with post_comments table
create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.user_posts
      set comments_count = comments_count + 1
      where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.user_posts
      set comments_count = greatest(0, comments_count - 1)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comments_count_insert on public.post_comments;
create trigger trg_sync_post_comments_count_insert
  after insert on public.post_comments
  for each row execute function public.sync_post_comments_count();

drop trigger if exists trg_sync_post_comments_count_delete on public.post_comments;
create trigger trg_sync_post_comments_count_delete
  after delete on public.post_comments
  for each row execute function public.sync_post_comments_count();

-- RPC to increment impressions once a card is seen by a user/session.
create or replace function public.increment_post_impressions(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_posts
    set impressions = impressions + 1
    where id = p_post_id;
end;
$$;

grant execute on function public.increment_post_impressions(uuid) to anon, authenticated;

-- Reel metadata for direct playable/downloadable sources
alter table public.ai_reels
  add column if not exists downloadable_url text,
  add column if not exists tags jsonb not null default '[]'::jsonb;

create index if not exists ai_reels_tags_idx on public.ai_reels using gin(tags);
