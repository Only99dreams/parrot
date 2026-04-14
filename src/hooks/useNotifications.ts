import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  article_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export function useNotifications() {
  const { user } = useAuth();
  const [realtime, setRealtime] = useState<Notification[]>([]);

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const channelName = `user-notifications-${user.id}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!cancelled) {
            setRealtime((prev) => [payload.new as Notification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const all = [...realtime, ...(query.data || [])];
  // Deduplicate
  const seen = new Set<string>();
  const notifications = all.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setRealtime((prev) => prev.map((n) => ({ ...n, is_read: true })));
    query.refetch();
  };

  return { notifications, unreadCount, markAllRead, isLoading: query.isLoading };
}

export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: ["user_badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: userBadges, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;

      const { data: badges } = await supabase.from("badges").select("*");
      const badgeMap: Record<string, Badge> = {};
      (badges || []).forEach((b: Badge) => { badgeMap[b.id] = b; });

      return (userBadges || []).map((ub: any) => ({
        ...ub,
        badge: badgeMap[ub.badge_id],
      })) as UserBadge[];
    },
    enabled: !!userId,
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: ["all_badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*");
      if (error) throw error;
      return data as Badge[];
    },
  });
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ["user_profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Auto-create profile for new users
      const { data: created, error: createErr } = await supabase
        .from("profiles")
        .insert({ user_id: userId })
        .select()
        .single();
      if (createErr) throw createErr;
      return created;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { display_name?: string; username?: string } }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user_profile", data.user_id], data);
    },
  });
}

export function useUserVoteHistory(userId?: string) {
  return useQuery({
    queryKey: ["user_vote_history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: votes, error } = await supabase
        .from("votes")
        .select("*, poll_options(*), news_articles(headline, category)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return votes;
    },
    enabled: !!userId,
  });
}

export function useUserCommentHistory(userId?: string) {
  return useQuery({
    queryKey: ["user_comment_history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("*, news_articles(headline)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
