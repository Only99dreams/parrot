import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AIReel } from "@/components/ReelCard";
import { UserPost } from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";
import { useAuth } from "@/contexts/AuthContext";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import {
  Heart,
  Download,
  Loader2,
  RefreshCw,
  Play,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const CATEGORIES = [
  "For You",
  "Entertainment",
  "Sports",
  "Tech",
  "Business",
  "Comedy",
  "Lifestyle",
  "Politics",
];

const INTEREST_MAP: Record<string, string> = {
  Politics: "Politics",
  Economy: "Business",
  Technology: "Tech",
  Sports: "Sports",
  Entertainment: "Entertainment",
  Culture: "Lifestyle",
  Geography: "Lifestyle",
  Education: "Tech",
  Health: "Lifestyle",
  Energy: "Business",
  Governance: "Politics",
};

type FeedItem =
  | { type: "ai"; data: AIReel }
  | { type: "user"; data: UserPost };

/** Interleave: ai, ai, user, ai, ai, user … */
function interleave(ai: AIReel[], user: UserPost[]): FeedItem[] {
  const result: FeedItem[] = [];
  let ai_i = 0,
    u_i = 0;
  while (ai_i < ai.length || u_i < user.length) {
    if (ai_i < ai.length) result.push({ type: "ai", data: ai[ai_i++] });
    if (ai_i < ai.length) result.push({ type: "ai", data: ai[ai_i++] });
    if (u_i < user.length) result.push({ type: "user", data: user[u_i++] });
  }
  return result;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Individual fullscreen reel card
function ReelItem({
  item,
  isActive,
}: {
  item: FeedItem;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);

  const isAI = item.type === "ai";
  const aiReel = isAI ? (item.data as AIReel) : null;
  const userPost = !isAI ? (item.data as UserPost) : null;

  const videoUrl = isAI
    ? aiReel!.video_url
    : (userPost?.media_urls?.[0] ?? "");
  const thumbnailUrl = isAI ? (aiReel!.thumbnail_url ?? null) : null;
  const title = isAI ? aiReel!.title : (userPost?.caption ?? "");
  const author = isAI
    ? (aiReel!.channel_name ?? "Creator")
    : (userPost?.profiles?.display_name ||
      userPost?.profiles?.username ||
      "User");
  const category = isAI ? aiReel!.category : "User Post";
  const likesCount = isAI ? (aiReel!.likes ?? 0) : (userPost?.likes ?? 0);

  const isDirectVideo = /\.(mp4|webm|mov)(\?|$)/i.test(videoUrl);
  const ytId = getYouTubeId(videoUrl);

  useEffect(() => {
    if (!videoRef.current || !isDirectVideo) return;
    videoRef.current.muted = muted;
  }, [muted, isDirectVideo]);

  useEffect(() => {
    if (!videoRef.current || !isDirectVideo) return;
    if (isActive) {
      videoRef.current.muted = muted;
      videoRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(async () => {
          // Autoplay can be blocked when unmuted. Fallback to muted autoplay.
          if (!videoRef.current) return;
          videoRef.current.muted = true;
          setMuted(true);
          try {
            await videoRef.current.play();
            setPlaying(true);
          } catch {
            setPlaying(false);
          }
        });
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isActive, isDirectVideo, muted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-black select-none">
      {isDirectVideo ? (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onClick={togglePlay}
        />
      ) : ytId && isActive ? (
        <iframe
          key={`yt-${ytId}-active`}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&rel=0&modestbranding=1&mute=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : ytId ? (
        <div className="absolute inset-0 h-full w-full bg-black">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover opacity-80"
            />
          ) : null}
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

      {isDirectVideo && !playing && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
        >
          <div className="rounded-full bg-black/40 p-5">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-16 left-3 right-20 text-white">
        <p className="mb-0.5 text-sm font-bold drop-shadow">@{author}</p>
        <p className="line-clamp-2 text-xs opacity-90 drop-shadow">{title}</p>
        <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur-sm">
          {category}
        </span>
      </div>

      <div className="absolute bottom-16 right-3 flex flex-col items-center gap-5 text-white">
        <button
          onClick={() => setLiked((l) => !l)}
          className="flex flex-col items-center gap-1"
        >
          <Heart
            className={`h-7 w-7 drop-shadow ${
              liked ? "fill-red-500 text-red-500" : ""
            }`}
          />
          <span className="text-[10px]">{liked ? likesCount + 1 : likesCount}</span>
        </button>

        {isDirectVideo && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex flex-col items-center gap-1"
          >
            {muted ? (
              <VolumeX className="h-6 w-6 drop-shadow" />
            ) : (
              <Volume2 className="h-6 w-6 drop-shadow" />
            )}
          </button>
        )}

        {isDirectVideo && (
          <a
            href={videoUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-6 w-6 drop-shadow" />
            <span className="text-[10px]">Save</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function Reels() {
  const { user } = useAuth();
  const { topCategories } = useReadingHistory();

  const [activeCategory, setActiveCategory] = useState("For You");
  const [aiReels, setAiReels] = useState<AIReel[]>([]);
  const [userReels, setUserReels] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const reelInterests = topCategories
    .map((c) => INTEREST_MAP[c] ?? c)
    .filter(Boolean)
    .slice(0, 5);

  const feed: FeedItem[] = interleave(aiReels, userReels);

  const loadAIReels = async (category: string) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/ai_reels`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "fetched_at.desc");
    url.searchParams.set("limit", "24");

    const cat = category === "For You" ? (reelInterests[0] ?? "Entertainment") : category;
    url.searchParams.set("category", `eq.${cat}`);

    const res = await fetch(url.toString(), {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data: AIReel[] = res.ok ? await res.json() : [];
    setAiReels(data);
  };

  const loadUserReels = async () => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/user_posts`);
    url.searchParams.set("select", "*");
    url.searchParams.set("post_type", "eq.reel");
    url.searchParams.set("is_published", "eq.true");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString(), {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return;
    const data: UserPost[] = await res.json();

    const userIds = [...new Set(data.map((p) => p.user_id))];
    const profileMap: Record<
      string,
      { username: string | null; display_name: string | null; avatar_url: string | null }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      (profiles ?? []).forEach((p) => {
        profileMap[p.user_id] = {
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      });
    }

    setUserReels(
      data.map((p) => ({
        ...(p as unknown as UserPost),
        profiles: profileMap[p.user_id] ?? {
          username: null,
          display_name: null,
          avatar_url: null,
        },
      }))
    );
  };

  const loadAll = async (category: string) => {
    setLoading(true);
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
    await Promise.all([loadAIReels(category), loadUserReels()]);
    setLoading(false);
  };

  const fetchFreshReels = async () => {
    setFetching(true);
    try {
      await supabase.functions.invoke("fetch-reels", {
        body: { category: activeCategory, interests: reelInterests, limit: 20 },
      });
      await loadAIReels(activeCategory);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadAll(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

  const scrollTo = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
      {/* Top bar */}
      <div className="z-30 flex flex-shrink-0 items-center gap-2 bg-gradient-to-b from-black/90 to-transparent px-3 pb-3 pt-2">
        <Link to="/" className="mr-1 rounded-full p-1.5 text-white hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="ml-1 flex flex-shrink-0 items-center gap-1">
          {user && (
            <CreatePost
              defaultType="reel"
              onPostCreated={() => loadAll(activeCategory)}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFreshReels}
            disabled={fetching}
            className="h-8 w-8 text-white hover:bg-white/10"
            title="Fetch fresh videos"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-white" />
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white">
          <p className="font-medium">No reels yet for "{activeCategory}"</p>
          <Button
            variant="outline"
            onClick={fetchFreshReels}
            disabled={fetching}
            className="gap-2 border-white text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Find Videos
          </Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll"
          style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {feed.map((item, i) => (
            <div
              key={item.type === "ai" ? `ai-${item.data.id}` : `user-${item.data.id}`}
              className="relative w-full"
              style={{ height: "100%", scrollSnapAlign: "start" }}
            >
              <ReelItem item={item} isActive={i === activeIndex} />
            </div>
          ))}
        </div>
      )}

      {!loading && feed.length > 1 && (
        <div className="pointer-events-none absolute bottom-1/3 right-4 z-40 hidden flex-col gap-2 sm:flex">
          <button
            className="pointer-events-auto rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/40"
            onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            className="pointer-events-auto rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/40"
            onClick={() => scrollTo(Math.min(feed.length - 1, activeIndex + 1))}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
