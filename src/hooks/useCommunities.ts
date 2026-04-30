import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Community {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  type: "public" | "private";
  created_by: string;
  member_count: number;
  post_count: number;
  created_at: string;
  is_member?: boolean;
  creator?: { username: string | null; display_name: string | null };
}

export interface CommunityPost {
  id: string;
  community_id: string;
  user_id: string;
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: { username: string | null; display_name: string | null; avatar_url: string | null };
}

// ── List communities ───────────────────────────────────────────────────────────
export function useCommunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["communities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, description, avatar_url, type, created_by, member_count, post_count, created_at")
        .order("member_count", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data) return [] as Community[];

      let memberSet = new Set<string>();
      if (user) {
        const { data: mems } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", user.id);
        (mems || []).forEach((m) => memberSet.add(m.community_id));
      }

      const creatorIds = [...new Set(data.map((c) => c.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", creatorIds);
      const pMap: Record<string, { username: string | null; display_name: string | null }> = {};
      (profiles || []).forEach((p) => { pMap[p.user_id] = { username: p.username, display_name: p.display_name }; });

      return data.map((c) => ({
        ...c,
        type: c.type as "public" | "private",
        banner_url: null,
        is_member: user ? memberSet.has(c.id) : false,
        creator: pMap[c.created_by],
      })) as Community[];
    },
  });
}

// ── Single community ──────────────────────────────────────────────────────────
export function useCommunity(communityId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community", communityId, user?.id],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId!)
        .single();
      if (error) throw error;

      let isMember = false;
      if (user) {
        const { data: m } = await supabase
          .from("community_members")
          .select("id")
          .eq("community_id", communityId!)
          .eq("user_id", user.id)
          .single();
        isMember = !!m;
      }

      return { ...data, type: data.type as "public" | "private", is_member: isMember } as Community;
    },
  });
}

// ── Community posts ───────────────────────────────────────────────────────────
export function useCommunityPosts(communityId: string | null) {
  return useQuery({
    queryKey: ["community-posts", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, community_id, user_id, title, content, image_url, likes_count, comments_count, created_at")
        .eq("community_id", communityId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!data) return [] as CommunityPost[];

      const uids = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", uids);
      const pMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach((p) => { pMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }; });

      return data.map((p) => ({ ...p, author: pMap[p.user_id] })) as CommunityPost[];
    },
  });
}

// ── Create community ──────────────────────────────────────────────────────────
export function useCreateCommunity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; description: string; type: "public" | "private" }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: community, error } = await supabase
        .from("communities")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;

      // Auto-join as admin
      await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id,
        role: "admin",
      });

      return community.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

// ── Join / leave community ────────────────────────────────────────────────────
export function useJoinCommunity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: communityId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: (_d, communityId) => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["community", communityId] });
    },
  });
}

export function useLeaveCommunity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_d, communityId) => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["community", communityId] });
    },
  });
}

// ── Post to community ─────────────────────────────────────────────────────────
export function useCreateCommunityPost() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { communityId: string; content: string; title?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("community_posts").insert({
        community_id: payload.communityId,
        user_id: user.id,
        content: payload.content,
        title: payload.title || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, { communityId }) => {
      qc.invalidateQueries({ queryKey: ["community-posts", communityId] });
      qc.invalidateQueries({ queryKey: ["community", communityId] });
    },
  });
}
