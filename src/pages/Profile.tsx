import { Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Vote, Award, Star, Pencil, Check, X, Flame, BookOpen } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");

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
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full gradient-naija text-xl sm:text-2xl font-bold text-primary-foreground flex-shrink-0">
              {avatarLetter}
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
        <Tabs defaultValue="votes">
          <TabsList className="mb-4">
            <TabsTrigger value="votes">Vote History</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="reading">Reading History</TabsTrigger>
          </TabsList>

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
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
