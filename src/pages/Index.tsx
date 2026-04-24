import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import PostCard, { UserPost } from "@/components/PostCard";
import TrendingSidebar from "@/components/TrendingSidebar";
import CategoryFilter from "@/components/CategoryFilter";
import EngagementPrompts from "@/components/EngagementPrompts";
import ViralCTA from "@/components/ViralCTA";
import BreakingNewsTicker from "@/components/BreakingNewsTicker";
import DailyStreak from "@/components/DailyStreak";
import ThisDayInNigeria from "@/components/ThisDayInNigeria";
import Footer from "@/components/Footer";
import { useNewsArticles } from "@/hooks/useNews";
import { useForYouFeed } from "@/hooks/useForYouFeed";
import CreatePost from "@/components/CreatePost";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeedItem =
  | { id: string; type: "news"; created_at: string; article: NonNullable<ReturnType<typeof useForYouFeed>["forYouArticles"]>[number] }
  | { id: string; type: "post"; created_at: string; post: UserPost };

const FEED_PAGE_SIZE = 8;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const Index = () => {
  const { data: articles, isLoading, refetch: refetchArticles } = useNewsArticles();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [feedMode, setFeedMode] = useState<"latest" | "foryou">("latest");
  const [feedPage, setFeedPage] = useState(0);
  const { forYouArticles, hasPreferences, topCategories } = useForYouFeed(articles);

  const { data: userPosts = [], refetch: refetchUserPosts } = useQuery({
    queryKey: ["home_feed_posts"],
    queryFn: async () => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/user_posts`);
      url.searchParams.set("select", "*");
      url.searchParams.set("is_published", "eq.true");
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", "24");

      const response = await fetch(url.toString(), {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load community posts for the home feed");
      }

      const data = (await response.json()) as UserPost[];

      const userIds = [...new Set(data.map((post) => post.user_id))];
      const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};

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

      return data.map((post) => ({
        ...post,
        profiles: profileMap[post.user_id] || {
          username: null,
          display_name: null,
          avatar_url: null,
        },
      }));
    },
    enabled: Boolean(SUPABASE_URL && SUPABASE_KEY),
  });

  const filtered = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    const source = feedMode === "foryou" ? forYouArticles : articles;
    if (!category) return source;
    return source.filter((a) => a.category === category);
  }, [articles, forYouArticles, category, feedMode]);

  const mixedFeed = useMemo<FeedItem[]>(() => {
    const newsItems: FeedItem[] = filtered.map((article) => ({
      id: `news-${article.id}`,
      type: "news",
      created_at: article.created_at,
      article,
    }));

    if (category) {
      return newsItems;
    }

    const postItems: FeedItem[] = userPosts.map((post) => ({
      id: `post-${post.id}`,
      type: "post",
      created_at: post.created_at,
      post,
    }));

    return [...newsItems, ...postItems].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }, [filtered, userPosts, category]);

  const visibleFeed = useMemo(() => {
    if (mixedFeed.length <= FEED_PAGE_SIZE) return mixedFeed;

    const start = (feedPage * FEED_PAGE_SIZE) % mixedFeed.length;
    const end = start + FEED_PAGE_SIZE;

    if (end <= mixedFeed.length) {
      return mixedFeed.slice(start, end);
    }

    return [...mixedFeed.slice(start), ...mixedFeed.slice(0, end - mixedFeed.length)];
  }, [mixedFeed, feedPage]);

  useEffect(() => {
    setFeedPage(0);
  }, [category, feedMode]);

  const refreshFeed = async () => {
    await refetchArticles();
    if (!category) {
      await refetchUserPosts();
    }
    setFeedPage((current) => current + 1);
  };

  const handlePostCreated = async () => {
    await refetchUserPosts();
    setFeedPage(0);
  };

  const totalVotes = articles ? articles.reduce((sum, a) => sum + a.total_votes, 0) : 0;
  const articleCount = articles ? articles.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <BreakingNewsTicker />
      <main className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-4 sm:space-y-5">
            <div className="gradient-naija rounded-xl p-3 sm:p-4 text-primary-foreground">
              <p className="font-display text-base sm:text-lg font-bold">🇳🇬 What's Nigeria Talking About Today?</p>
              <p className="mt-1 text-xs sm:text-sm opacity-90">
                Vote, debate, and see what millions of Nigerians really think.
              </p>
            </div>

            <DailyStreak />

            <ThisDayInNigeria />

            <EngagementPrompts totalVoters={totalVotes} articleCount={articleCount} />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex items-center gap-2">
                {user && <CreatePost onPostCreated={handlePostCreated} />}
                <button
                  onClick={refreshFeed}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Feed
                </button>
              </div>
            </div>

            {/* Feed mode tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setFeedMode("latest")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  feedMode === "latest" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🕐 Latest
              </button>
              <button
                onClick={() => setFeedMode("foryou")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  feedMode === "foryou" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✨ For You {hasPreferences && <span className="ml-1 text-[9px] text-primary">•</span>}
              </button>
            </div>

            {feedMode === "foryou" && hasPreferences && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Based on your interests:</span>
                {topCategories.map((cat) => (
                  <span key={cat} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{cat}</span>
                ))}
              </div>
            )}

            <CategoryFilter selected={category} onChange={setCategory} />

            {isLoading && (
              <div className="py-12 text-center text-muted-foreground">Loading stories...</div>
            )}

            {!isLoading && visibleFeed.length > 0 &&
              visibleFeed.map((item, i) => (
                item.type === "news" ? (
                  <NewsCard key={item.id} article={item.article} index={i} />
                ) : (
                  <PostCard key={item.id} post={item.post} />
                )
              ))}

            {!isLoading && visibleFeed.length === 0 && category && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-lg">🤷</p>
                <p className="mt-2 text-sm text-muted-foreground">No stories in <strong>{category}</strong> yet.</p>
                <button onClick={() => setCategory("")} className="mt-2 text-sm font-medium text-primary hover:underline">
                  Show all stories
                </button>
              </div>
            )}

            {!isLoading && articleCount === 0 && !category && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-3xl">🦜</p>
                <p className="mt-3 font-display text-base font-bold text-foreground">No stories yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Real Nigerian news will appear here once stories are published.</p>
              </div>
            )}

            {/* Viral CTA after 3rd article */}
            {visibleFeed.length > 3 && (
              <ViralCTA />
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <TrendingSidebar />
              <ViralCTA />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
