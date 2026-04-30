import { Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PostCard, { UserPost } from "@/components/PostCard";
import {
  useUserProfile,
  useUpdateProfile,
  useUserBadges,
  useAllBadges,
  useUserVoteHistory,
  useUserCommentHistory,
} from "@/hooks/useNotifications";
import { useStreak } from "@/hooks/useStreak";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useMyReferralCode, useMyReferrals } from "@/hooks/useReferral";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Vote, Award, Star, Pencil, Check, X, Flame, BookOpen, Banknote, ChevronRight, Copy, Users, Camera, Share2, Gift } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Profile = () => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: userBadges = [] } = useUserBadges(user?.id);
  const { data: allBadges = [] } = useAllBadges();
  const { data: voteHistory = [] } = useUserVoteHistory(user?.id);
  const { data: commentHistory = [] } = useUserCommentHistory(user?.id);
  const updateProfile = useUpdateProfile();
  const { currentStreak, longestStreak, totalPoints: streakPoints } = useStreak();
  const { totalRead, topCategories, history: readingHistory } = useReadingHistory();
  const { data: referralCode } = useMyReferralCode();
  const { data: referrals = [] } = useMyReferrals();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Please upload a JPG, PNG, WebP or GIF image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5 MB", variant: "destructive" });
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { avatar_url: publicUrl },
      });
      toast({ title: "Profile photo updated! 📸" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      // reset so same file can be re-picked
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadMyPosts = async () => {
      setPostsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? SUPABASE_KEY;

        const url = new URL(`${SUPABASE_URL}/rest/v1/user_posts`);
        url.searchParams.set("select", "*");
        url.searchParams.set("user_id", `eq.${user.id}`);
        url.searchParams.set("is_published", "eq.true");
        url.searchParams.set("order", "created_at.desc");
        url.searchParams.set("limit", "50");

        const res = await fetch(url.toString(), {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
        });
        const data: UserPost[] = res.ok ? await res.json() : [];
        setMyPosts(data.map((p) => ({ ...p, profiles: undefined })));
      } finally {
        setPostsLoading(false);
      }
    };
    loadMyPosts();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "User";
  const username = profile?.username || user.email?.split("@")[0] || "user";
  const avatarLetter = displayName[0].toUpperCase();

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditUsername(profile?.username || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          display_name: editName.trim() || null,
          username: editUsername.trim() || null,
        },
      });
      setEditing(false);
      toast({ title: "Profile updated! ✅" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Profile Header */}
        <div className="mb-4 sm:mb-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar with upload */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full overflow-hidden gradient-naija focus:outline-none"
                title="Change profile photo"
              >
                {(profile as unknown as { avatar_url?: string })?.avatar_url ? (
                  <img
                    src={(profile as unknown as { avatar_url?: string }).avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-primary-foreground">{avatarLetter}</span>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Username</label>
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateProfile.isPending}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> {updateProfile.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">
                      {displayName}
                    </h1>
                    <button
                      onClick={startEdit}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit profile"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Member since {profile?.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : "recently"}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Star className="h-4 w-4" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground">{profile?.points || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Points</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Flame className="h-4 w-4" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-orange-500">{currentStreak}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground">{totalRead}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Articles Read</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Vote className="h-4 w-4" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground">{voteHistory.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Votes</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground">{profile?.comment_count || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Comments</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 text-center">
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground">{longestStreak}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>

          {topCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Top interests:</span>
              {topCategories.slice(0, 4).map((cat) => (
                <span key={cat} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{cat}</span>
              ))}
            </div>
          )}

          {/* Creator Studio CTA */}
          {(() => {
            const pts = profile?.points ?? 0;
            const THRESHOLD = 5_000_000;
            const isEligible = pts >= THRESHOLD;
            const progressPct = Math.min((pts / THRESHOLD) * 100, 100);
            return (
              <Link
                to="/creator-studio"
                className={`mt-3 flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  isEligible
                    ? "border-naija-gold bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-border bg-muted/30"
                }`}
              >
                <Banknote className={`h-5 w-5 flex-shrink-0 ${isEligible ? "text-naija-gold" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1">
                    Creator Studio
                    {isEligible && <span className="rounded-full bg-naija-gold px-1.5 py-0.5 text-[9px] text-black font-bold">ELIGIBLE</span>}
                  </p>
                  {isEligible ? (
                    <p className="text-[10px] text-muted-foreground">You can request a payout — ₦{Math.floor(pts / 1000).toLocaleString()} available</p>
                  ) : (
                    <div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{pts.toLocaleString()} / {THRESHOLD.toLocaleString()} pts to unlock</p>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })()}
        </div>

        {/* ── REFERRAL BANNER (always visible) ── */}
        <div className="mb-4 sm:mb-6 rounded-xl border-2 border-naija-gold bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-5 w-5 text-naija-gold flex-shrink-0" />
            <h2 className="font-display font-bold text-base text-foreground">Refer &amp; Earn</h2>
            <span className="rounded-full bg-naija-gold px-2 py-0.5 text-[10px] font-bold text-black uppercase tracking-wide">1,000 pts per friend</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Share your code — every friend who signs up earns you <span className="font-bold text-foreground">1,000 points</span> instantly. No limit!
          </p>

          {/* Code display */}
          {referralCode ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 rounded-lg border-2 border-naija-gold bg-white dark:bg-black/20 px-4 py-2.5 font-mono text-2xl font-black text-foreground tracking-[0.3em] text-center select-all">
                  {referralCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode);
                    toast({ title: "Referral code copied! 📋" });
                  }}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border-2 border-naija-gold bg-white dark:bg-black/20 hover:bg-yellow-50 transition-colors"
                  title="Copy code"
                >
                  <Copy className="h-5 w-5 text-naija-gold" />
                </button>
              </div>

              {/* Share link button */}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/auth?ref=${referralCode}`;
                  if (navigator.share) {
                    navigator.share({
                      title: "Join me on ParrotNG!",
                      text: `Use my referral code ${referralCode} and we both win — sign up at ParrotNG 🇳🇬`,
                      url: shareUrl,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Referral link copied! 🔗" });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-naija-gold py-2.5 text-sm font-bold text-black hover:bg-yellow-400 transition-colors"
              >
                <Share2 className="h-4 w-4" /> Share Referral Link
              </button>

              {/* Stats strip */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-white/60 dark:bg-white/10 py-2">
                  <p className="text-xl font-black text-foreground">{referrals.length}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Friends Referred</p>
                </div>
                <div className="rounded-lg bg-white/60 dark:bg-white/10 py-2">
                  <p className="text-xl font-black text-primary">{(referrals.length * 1000).toLocaleString()}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Points Earned</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          )}
        </div>

        {/* Badges */}
        <div className="mb-4 sm:mb-6 rounded-xl border border-border bg-card p-3 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Award className="h-5 w-5 text-primary" /> Badges
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center rounded-lg border p-2 sm:p-3 text-center transition-all ${
                    earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/20 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <p className="mt-1 text-xs font-semibold text-foreground">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="mb-4">
            <TabsTrigger value="posts">My Posts</TabsTrigger>
            <TabsTrigger value="votes">Vote History</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="reading">Reading History</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {postsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading posts…</p>
            ) : myPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">You haven't posted anything yet. Create your first post!</p>
            ) : (
              <div className="flex flex-col gap-4">
                {myPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={{
                      ...post,
                      profiles: {
                        username: profile?.username ?? null,
                        display_name: profile?.display_name ?? null,
                        avatar_url: (profile as unknown as { avatar_url?: string })?.avatar_url ?? null,
                      },
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="votes">
            <div className="space-y-2">
              {voteHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No votes yet. Start voting on polls!</p>
              ) : (
                voteHistory.map((v: any) => (
                  <Link
                    key={v.id}
                    to={`/news/${v.article_id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {v.news_articles?.headline || "Article"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Voted: {v.poll_options?.option_text || "—"}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {v.news_articles?.category || "—"}
                      </Badge>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <div className="space-y-2">
              {commentHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No comments yet. Join the discussion!</p>
              ) : (
                commentHistory.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/news/${c.article_id}`}
                    className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-xs font-medium text-primary">{c.news_articles?.headline || "Article"}</p>
                    <p className="mt-1 text-sm text-foreground line-clamp-2">{c.content}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>❤️ {c.likes} likes</span>
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reading">
            <div className="space-y-2">
              {readingHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No reading history yet. Start reading stories!</p>
              ) : (
                readingHistory.map((entry) => (
                  <Link
                    key={entry.articleId}
                    to={`/news/${entry.articleId}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{entry.headline}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] ml-3 flex-shrink-0">
                      {entry.category}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="referrals">
            {/* Referral code card */}
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Your Referral Code
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Share your code and earn <span className="font-semibold text-primary">1,000 points</span> for every person who signs up!
              </p>
              {referralCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-muted px-4 py-2.5 font-mono text-lg font-bold text-foreground tracking-widest text-center">
                    {referralCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      toast({ title: "Copied! 📋" });
                    }}
                    className="rounded-lg border border-border p-2.5 hover:bg-muted transition-colors"
                    title="Copy code"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading code…</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Total referrals: <span className="font-semibold text-foreground">{referrals.length}</span> &nbsp;·&nbsp;
                Points earned: <span className="font-semibold text-primary">{(referrals.length * 1000).toLocaleString()}</span>
              </p>
            </div>

            {/* Referral list */}
            {referrals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No referrals yet. Share your code to earn points!</p>
            ) : (
              <div className="space-y-2">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.referred_profile?.display_name || r.referred_profile?.username || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">+1,000 pts</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
