import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, Share2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface UserPost {
  id: string;
  user_id: string;
  caption: string;
  media_urls: string[];
  media_types: string[];
  post_type: "post" | "reel";
  likes: number;
  comments_count: number;
  impressions?: number;
  is_published: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function PostCard({ post }: { post: UserPost }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<HTMLElement | null>(null);
  const [likes, setLikes] = useState(post.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [impressions, setImpressions] = useState(post.impressions ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [activeMedia, setActiveMedia] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const mediaUrls: string[] = Array.isArray(post.media_urls) ? post.media_urls : [];
  const mediaTypes: string[] = Array.isArray(post.media_types) ? post.media_types : [];

  const displayName =
    post.profiles?.display_name || post.profiles?.username || "User";
  const avatarUrl = post.profiles?.avatar_url ?? undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  const loadComments = async () => {
    const commentsUrl = new URL(`${SUPABASE_URL}/rest/v1/post_comments`);
    commentsUrl.searchParams.set("select", "id,post_id,user_id,content,created_at");
    commentsUrl.searchParams.set("post_id", `eq.${post.id}`);
    commentsUrl.searchParams.set("order", "created_at.desc");
    commentsUrl.searchParams.set("limit", "50");

    const response = await fetch(commentsUrl.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!response.ok) return;

    const data = (await response.json()) as PostComment[];
    const userIds = [...new Set(data.map((comment) => comment.user_id))];
    let profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      (profiles || []).forEach((profile) => {
        profileMap[profile.user_id] = {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        };
      });
    }

    setComments(
      data.map((comment) => ({
        ...comment,
        profiles: profileMap[comment.user_id] || {
          username: null,
          display_name: null,
          avatar_url: null,
        },
      })),
    );
  };

  useEffect(() => {
    if (!commentsOpen) return;
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsOpen]);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY || !cardRef.current) return;

    const seenRaw = sessionStorage.getItem("parrotng-post-impressions") || "{}";
    const seen: Record<string, boolean> = JSON.parse(seenRaw);
    if (seen[post.id]) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        seen[post.id] = true;
        sessionStorage.setItem("parrotng-post-impressions", JSON.stringify(seen));

        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || SUPABASE_KEY;

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_post_impressions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ p_post_id: post.id }),
        });

        if (response.ok) {
          setImpressions((prev) => prev + 1);
        }

        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id]);

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      setLikes((l) => Math.max(0, l - 1));
      setLiked(false);
      await supabase
        .from("post_likes")
        .delete()
        .match({ user_id: user.id, post_id: post.id });
      await supabase
        .from("user_posts")
        .update({ likes: Math.max(0, likes - 1) })
        .eq("id", post.id);
    } else {
      setLikes((l) => l + 1);
      setLiked(true);
      await supabase
        .from("post_likes")
        .upsert({ user_id: user.id, post_id: post.id });
      await supabase
        .from("user_posts")
        .update({ likes: likes + 1 })
        .eq("id", post.id);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: displayName, text: post.caption, url });
      toast({ title: "Post shared" });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Post link copied" });
    }
  };

  const handleCommentSubmit = async () => {
    if (!user || !commentInput.trim()) return;
    setSubmittingComment(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast({ title: "Sign in to comment", variant: "destructive" });
        setSubmittingComment(false);
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/post_comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          post_id: post.id,
          user_id: user.id,
          content: commentInput.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not add comment");
      }

      setCommentInput("");
      setCommentsCount((prev) => prev + 1);
      await loadComments();
    } catch {
      toast({ title: "Failed to comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <article ref={cardRef} className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Author header */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        {post.post_type === "reel" && (
          <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5 flex-shrink-0">
            🎬 Reel
          </span>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="px-3 pb-2 text-sm leading-relaxed">{post.caption}</p>
      )}

      {/* Media carousel */}
      {mediaUrls.length > 0 && (
        <div className="relative bg-black">
          {mediaTypes[activeMedia] === "video" ? (
            <video
              src={mediaUrls[activeMedia]}
              controls
              playsInline
              className="w-full max-h-[500px] object-contain"
            />
          ) : (
            <img
              src={mediaUrls[activeMedia]}
              alt="Post media"
              className="w-full max-h-[500px] object-contain"
              loading="lazy"
            />
          )}

          {/* Carousel navigation */}
          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={() => setActiveMedia((i) => Math.max(0, i - 1))}
                disabled={activeMedia === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                aria-label="Previous media"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setActiveMedia((i) => Math.min(mediaUrls.length - 1, i + 1))
                }
                disabled={activeMedia === mediaUrls.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                aria-label="Next media"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMedia(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeMedia
                        ? "bg-white w-4"
                        : "bg-white/40 w-1.5 hover:bg-white/60"
                    }`}
                    aria-label={`Go to media ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-4 px-3 py-2.5">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked
              ? "text-red-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          <span>{likes}</span>
        </button>

        <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span>{commentsCount}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Comments</DialogTitle>
            </DialogHeader>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
              ) : (
                comments.map((comment) => {
                  const commentName =
                    comment.profiles?.display_name ||
                    comment.profiles?.username ||
                    "User";
                  return (
                    <div key={comment.id} className="rounded-lg border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">{commentName}</p>
                      <p className="mt-1 text-sm text-foreground/90">{comment.content}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={user ? "Write a comment..." : "Sign in to comment"}
                disabled={!user || submittingComment}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                size="sm"
                onClick={handleCommentSubmit}
                disabled={!user || !commentInput.trim() || submittingComment}
              >
                Send
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{impressions.toLocaleString()}</span>
        </span>

        <button
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
