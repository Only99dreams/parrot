import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommunities,
  useCommunity,
  useCommunityPosts,
  useCreateCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  useCreateCommunityPost,
  type Community,
} from "@/hooks/useCommunities";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, Plus, Users, X, ArrowLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Create Community Modal ────────────────────────────────────────────────────
function CreateCommunityModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const createCommunity = useCreateCommunity();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const id = await createCommunity.mutateAsync({ name, description, type });
      toast({ title: "Community created! 🎉" });
      onCreated(id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm mx-3 rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">New Community</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagos Tech Hub"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Privacy</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("public")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === "public" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Globe className="h-4 w-4" /> Public
              </button>
              <button
                type="button"
                onClick={() => setType("private")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === "private" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Lock className="h-4 w-4" /> Private
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={createCommunity.isPending}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createCommunity.isPending ? "Creating…" : "Create Community"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Community card ────────────────────────────────────────────────────────────
function CommunityCard({ community, onClick }: { community: Community; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl gradient-naija text-lg font-bold text-primary-foreground">
          {community.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-foreground truncate">{community.name}</p>
            {community.type === "private" ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {community.is_member && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">JOINED</span>
            )}
          </div>
          {community.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{community.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {community.member_count.toLocaleString()}</span>
            <span>{community.post_count} posts</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Community detail view ─────────────────────────────────────────────────────
function CommunityDetail({ communityId, onBack }: { communityId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { data: community } = useCommunity(communityId);
  const { data: posts = [], isLoading: postsLoading } = useCommunityPosts(communityId);
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();
  const createPost = useCreateCommunityPost();
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const { toast } = useToast();

  if (!community) return null;

  const handleJoin = async () => {
    if (!user) { window.location.href = "/auth"; return; }
    try {
      await joinCommunity.mutateAsync(communityId);
      toast({ title: `Joined ${community.name}! 🎉` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveCommunity.mutateAsync(communityId);
      toast({ title: `Left ${community.name}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    try {
      await createPost.mutateAsync({ communityId, content: postContent, title: postTitle });
      setPostContent("");
      setPostTitle("");
      setShowPostForm(false);
      toast({ title: "Posted! ✅" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to communities
        </button>
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 flex-shrink-0 flex items-center justify-center rounded-xl gradient-naija text-2xl font-bold text-primary-foreground">
            {community.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-lg text-foreground">{community.name}</h1>
              {community.type === "private" ? (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" /> Private
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Globe className="h-3 w-3" /> Public
                </span>
              )}
            </div>
            {community.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{community.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {community.member_count.toLocaleString()} members</span>
              <span>{community.post_count} posts</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {community.is_member ? (
              <button
                onClick={handleLeave}
                disabled={leaveCommunity.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Leave
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joinCommunity.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post form */}
      {community.is_member && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          {!showPostForm ? (
            <button
              onClick={() => setShowPostForm(true)}
              className="w-full text-left text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 px-4 py-2.5 hover:bg-muted/60"
            >
              Share something with the community…
            </button>
          ) : (
            <form onSubmit={handlePost} className="space-y-2">
              <input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                required
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPostForm(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createPost.isPending} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> {createPost.isPending ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Posts */}
      {postsLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading posts…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const authorName = post.author?.display_name || post.author?.username || "Member";
            return (
              <div key={post.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {authorName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{authorName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {post.title && <p className="font-semibold text-sm text-foreground mb-1">{post.title}</p>}
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>❤️ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CommunitiesPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const { data: communities = [], isLoading } = useCommunities();
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const displayed = filter === "mine" ? communities.filter((c) => c.is_member) : communities;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-6">
        {activeCommunityId ? (
          <CommunityDetail communityId={activeCommunityId} onBack={() => setActiveCommunityId(null)} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Communities
              </h1>
              {user && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Create
                </button>
              )}
            </div>

            {user && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("mine")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === "mine" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Joined
                </button>
              </div>
            )}

            {!user && (
              <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to join or create communities
              </div>
            )}

            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-12">Loading communities…</p>
            ) : displayed.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filter === "mine" ? "You haven't joined any communities yet." : "No communities yet — create the first one!"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {displayed.map((c) => (
                  <CommunityCard key={c.id} community={c} onClick={() => setActiveCommunityId(c.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); setActiveCommunityId(id); }}
        />
      )}

      <Footer />
    </div>
  );
}
