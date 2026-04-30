import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  points_awarded: number;
  created_at: string;
  referred_profile?: {
    username: string | null;
    display_name: string | null;
  };
}

export function useMyReferralCode() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["referral-code", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data?.referral_code as string | null;
    },
  });
}

export function useMyReferrals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_id, points_awarded, created_at")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [] as Referral[];

      // Hydrate with referred user profiles
      const ids = data.map((r) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", ids);

      const profileMap: Record<string, { username: string | null; display_name: string | null }> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = { username: p.username, display_name: p.display_name };
      });

      return data.map((r) => ({
        ...r,
        referrer_id: user!.id,
        referred_profile: profileMap[r.referred_id] ?? { username: null, display_name: null },
      })) as Referral[];
    },
  });
}

export function useApplyReferral() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (referralCode: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.rpc("handle_referral", {
        p_referral_code: referralCode,
        p_new_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-referrals"] });
    },
  });
}
