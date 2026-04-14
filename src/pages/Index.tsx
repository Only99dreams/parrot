import { useState, useMemo } from "react";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
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
import { mockNews } from "@/data/mockNews";
import NewsCardMock from "@/components/NewsCardMock";

const Index = () => {
  const { data: articles, isLoading } = useNewsArticles();
  const hasRealData = articles && articles.length > 0;
  const [category, setCategory] = useState("");
  const [feedMode, setFeedMode] = useState<"latest" | "foryou">("latest");
  const { forYouArticles, forYouMock, hasPreferences, topCategories } = useForYouFeed(articles, mockNews);

  const filtered = useMemo(() => {
    if (!hasRealData) return [];
    const source = feedMode === "foryou" ? forYouArticles : articles;
    if (!category) return source;
    return source.filter((a) => a.category === category);
  }, [articles, forYouArticles, category, hasRealData, feedMode]);

  const filteredMock = useMemo(() => {
    if (hasRealData) return [];
    const source = feedMode === "foryou" ? forYouMock : mockNews;
    if (!category) return source;
    return source.filter((n) => n.category === category);
  }, [hasRealData, category, feedMode, forYouMock]);

  const totalVotes = hasRealData
    ? articles.reduce((sum, a) => sum + a.total_votes, 0)
    : mockNews.reduce((sum, n) => sum + n.totalVotes, 0);

  const articleCount = hasRealData ? articles.length : mockNews.length;

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

            {hasRealData
              ? filtered.map((article, i) => (
                  <NewsCard key={article.id} article={article} index={i} />
                ))
              : !isLoading &&
                filteredMock.map((news, i) => (
                  <NewsCardMock key={news.id} news={news} index={i} />
                ))}

            {!isLoading && hasRealData && filtered.length === 0 && category && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-lg">🤷</p>
                <p className="mt-2 text-sm text-muted-foreground">No stories in <strong>{category}</strong> yet.</p>
                <button onClick={() => setCategory("")} className="mt-2 text-sm font-medium text-primary hover:underline">
                  Show all stories
                </button>
              </div>
            )}

            {/* Viral CTA after 3rd article */}
            {((hasRealData && filtered.length > 3) || (!hasRealData && !isLoading && filteredMock.length > 3)) && (
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
