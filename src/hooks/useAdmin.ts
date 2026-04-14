import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      return (data && data.length > 0) || false;
    },
    enabled: !!user,
  });
}

export function useAdminArticles() {
  return useQuery({
    queryKey: ["admin_articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminComments() {
  return useQuery({
    queryKey: ["admin_comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string | null; display_name: string | null }> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = { username: p.username, display_name: p.display_name };
      });

      return data.map((c) => ({
        ...c,
        profiles: profileMap[c.user_id] || { username: null, display_name: null },
      }));
    },
  });
}

export function useToggleSponsored() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_sponsored }: { id: string; is_sponsored: boolean }) => {
      const { error } = await supabase
        .from("news_articles")
        .update({ is_sponsored })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_articles"] });
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
    },
  });
}

export function useToggleTrending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_trending }: { id: string; is_trending: boolean }) => {
      const { error } = await supabase
        .from("news_articles")
        .update({ is_trending })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_articles"] });
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_articles"] });
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_comments"] });
    },
  });
}

export function useFetchNews() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-news");
      if (error) throw error;
      return data;
    },
  });
}
