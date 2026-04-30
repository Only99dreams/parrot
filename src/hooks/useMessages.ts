import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConversationMember {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  updated_at: string;
  members: ConversationMember[];
  last_message?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// ── List all conversations for the current user ──────────────────────────────
export function useConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get conversations the user belongs to
      const { data: memberRows, error: mErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      if (mErr) throw mErr;
      if (!memberRows || memberRows.length === 0) return [] as Conversation[];

      const convIds = memberRows.map((r) => r.conversation_id);

      const { data: convs, error: cErr } = await supabase
        .from("conversations")
        .select("id, type, name, avatar_url, created_by, updated_at")
        .in("id", convIds)
        .order("updated_at", { ascending: false });
      if (cErr) throw cErr;
      if (!convs) return [] as Conversation[];

      // Fetch all members for these conversations
      const { data: allMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      const userIds = [...new Set((allMembers || []).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, ConversationMember> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = {
          user_id: p.user_id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      });

      const membersByConv: Record<string, ConversationMember[]> = {};
      (allMembers || []).forEach((m) => {
        if (!membersByConv[m.conversation_id]) membersByConv[m.conversation_id] = [];
        const profile = profileMap[m.user_id];
        if (profile) membersByConv[m.conversation_id].push(profile);
      });

      // Fetch last message for each conversation
      const lastMessages: Record<string, string | null> = {};
      await Promise.all(
        convIds.map(async (cid) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", cid)
            .order("created_at", { ascending: false })
            .limit(1);
          lastMessages[cid] = msgs?.[0]?.content ?? null;
        })
      );

      return convs.map((c) => ({
        ...c,
        type: c.type as "direct" | "group",
        members: membersByConv[c.id] || [],
        last_message: lastMessages[c.id],
      })) as Conversation[];
    },
  });

  // Real-time: refresh when a new message lands in any of our conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-conversations-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return query;
}

// ── Messages inside a conversation ───────────────────────────────────────────
export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      if (!data) return [] as Message[];

      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", senderIds);

      const pMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach((p) => {
        pMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
      });

      return data.map((m) => ({ ...m, sender: pMap[m.sender_id] })) as Message[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => { qc.invalidateQueries({ queryKey: ["messages", conversationId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user, qc]);

  return query;
}

// ── Send a message ────────────────────────────────────────────────────────────
export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: (_d, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

// ── Start or open a DM with another user ────────────────────────────────────
export function useStartDM() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      // Check if a direct conversation already exists between these two users
      const { data: myMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myMemberships && myMemberships.length > 0) {
        const myConvIds = myMemberships.map((m) => m.conversation_id);
        const { data: otherMemberships } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", myConvIds);

        if (otherMemberships && otherMemberships.length > 0) {
          // Filter to direct conversations
          const sharedConvIds = otherMemberships.map((m) => m.conversation_id);
          const { data: directConvs } = await supabase
            .from("conversations")
            .select("id")
            .in("id", sharedConvIds)
            .eq("type", "direct");

          if (directConvs && directConvs.length > 0) {
            return directConvs[0].id; // Existing DM
          }
        }
      }

      // Create new DM
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct", created_by: user.id })
        .select("id")
        .single();
      if (convErr) throw convErr;

      // Add both members
      const { error: mErr } = await supabase
        .from("conversation_members")
        .insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: otherUserId },
        ]);
      if (mErr) throw mErr;

      return conv.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ── Create a group chat ───────────────────────────────────────────────────────
export function useCreateGroupChat() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "group", name, created_by: user.id })
        .select("id")
        .single();
      if (convErr) throw convErr;

      const members = [user.id, ...memberIds.filter((id) => id !== user.id)];
      const { error: mErr } = await supabase
        .from("conversation_members")
        .insert(members.map((uid) => ({ conversation_id: conv.id, user_id: uid })));
      if (mErr) throw mErr;

      return conv.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
