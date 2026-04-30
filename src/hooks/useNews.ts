import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function scoreTrendingArticle(article: {
  created_at: string;
  total_votes: number;
  comment_count: number;
  is_trending: boolean;
}) {
  const hoursOld = Math.max(
    1,
    (Date.now() - new Date(article.created_at).getTime()) / 36e5,
  );
  const recencyBoost = Math.max(0, 72 - hoursOld);
  const engagementScore = article.total_votes + article.comment_count * 4;
  const flagBoost = article.is_trending ? 200 : 0;

  return flagBoost + engagementScore + recencyBoost;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  why_it_matters: string | null;
  poll_question: string | null;
  debate_hook: string | null;
  perspectives: any;
  category: string;
  source: string;
  source_url: string | null;
  image_url: string | null;
  is_sponsored: boolean;
  is_trending: boolean;
  ai_generated: boolean;
  total_votes: number;
  comment_count: number;
  created_at: string;
  poll_options: PollOption[];
}

export interface PollOption {
  id: string;
  article_id: string;
  option_text: string;
  votes: number;
}

export interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  likes: number;
  is_ai: boolean;
  created_at: string;
  profiles?: { username: string | null; display_name: string | null };
}

export function useNewsArticles() {
  const queryClient = useQueryClient();

  // Auto-refresh the feed whenever a new article is published.
  // Use a unique channel name per mount so React StrictMode's double-invoke
  // doesn't try to add listeners to an already-subscribed channel instance.
  useEffect(() => {
    const channelName = `news_articles_realtime_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_articles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["news_articles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["news_articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*, poll_options(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((article) => ({
        ...article,
        poll_options: article.poll_options || [],
      })) as NewsArticle[];
    },
  });
}

export function useNewsArticle(id: string) {
  return useQuery({
    queryKey: ["news_article", id],
    queryFn: async () => {
      const { data: article, error } = await supabase
        .from("news_articles")
        .select("*, poll_options(*)")
        .eq("id", id)
        .single();
      if (error) throw error;

      return { ...article, poll_options: article.poll_options || [] } as NewsArticle;
    },
    enabled: !!id,
  });
}

export function useVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ articleId, optionId }: { articleId: string; optionId: string }) => {
      if (!user) throw new Error("Must be logged in to vote");
      const { error } = await supabase.from("votes").insert({
        user_id: user.id,
        article_id: articleId,
        option_id: optionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
      queryClient.invalidateQueries({ queryKey: ["news_article"] });
      queryClient.invalidateQueries({ queryKey: ["user_votes"] });
    },
  });
}

export function useUserVotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_votes", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from("votes")
        .select("article_id, option_id")
        .eq("user_id", user.id);
      const map: Record<string, string> = {};
      (data || []).forEach((v) => { map[v.article_id] = v.option_id; });
      return map;
    },
    enabled: !!user,
  });
}

export function useComments(articleId: string) {
  return useQuery({
    queryKey: ["comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for comment authors
      const userIds = [...new Set(data.map((c) => c.user_id))].filter(Boolean);
      let profileMap: Record<string, { username: string | null; display_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        (profiles || []).forEach((p) => { profileMap[p.user_id] = { username: p.username, display_name: p.display_name }; });
      }

      return data.map((c) => ({
        ...c,
        profiles: profileMap[c.user_id] || { username: null, display_name: null },
      })) as Comment[];
    },
    enabled: !!articleId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ articleId, content }: { articleId: string; content: string }) => {
      if (!user) throw new Error("Must be logged in to comment");
      const { error } = await supabase.from("comments").insert({
        article_id: articleId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, { articleId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", articleId] });
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
      queryClient.invalidateQueries({ queryKey: ["news_article"] });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("points", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useTrendingArticles() {
  return useQuery({
    queryKey: ["trending_articles"],
    queryFn: async () => {
      const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString();
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, headline, category, total_votes, comment_count, is_trending, created_at")
        .or(`is_trending.eq.true,created_at.gte.${recentThreshold}`)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;

      return (data || [])
        .sort((left, right) => scoreTrendingArticle(right) - scoreTrendingArticle(left))
        .slice(0, 6);
    },
  });
}
