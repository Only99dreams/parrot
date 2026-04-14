import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useNewsArticles } from "@/hooks/useNews";
import { Flame, BarChart3, MessageSquare, TrendingUp, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import PollCard from "@/components/PollCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Trending = () => {
  const { data: articles = [] } = useNewsArticles();
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number; votes: number; comments: number }[]>([]);

  // Compute category stats from articles
  useEffect(() => {
    if (!articles.length) return;
    const map: Record<string, { count: number; votes: number; comments: number }> = {};
    articles.forEach((a) => {
      if (!map[a.category]) map[a.category] = { count: 0, votes: 0, comments: 0 };
      map[a.category].count++;
      map[a.category].votes += a.total_votes;
      map[a.category].comments += a.comment_count;
    });
    const stats = Object.entries(map)
      .map(([category, s]) => ({ category, ...s }))
      .sort((a, b) => b.votes + b.comments - (a.votes + a.comments));
    setCategoryStats(stats);
  }, [articles]);

  const trendingArticles = articles
    .filter((a) => a.is_trending)
    .sort((a, b) => b.total_votes - a.total_votes);

  const hottestPolls = [...articles]
    .filter((a) => a.poll_question && a.poll_options.length > 0)
    .sort((a, b) => b.total_votes - a.total_votes)
    .slice(0, 6);

  const mostDebated = [...articles]
    .sort((a, b) => b.comment_count - a.comment_count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 gradient-naija rounded-xl p-4 sm:p-5 text-primary-foreground">
          <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 sm:h-7 sm:w-7" /> Trending Now
          </h1>
          <p className="mt-1 text-xs sm:text-sm opacity-90">
            The hottest topics, most debated categories, and polls Nigerians are voting on right now.
          </p>
        </div>

        {/* Category Heatmap */}
        <section className="mb-6 sm:mb-8">
          <h2 className="font-display text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" /> Most Debated Categories
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {categoryStats.map((cat, i) => {
              const heat = Math.min(1, (cat.votes + cat.comments) / 500);
              return (
                <div
                  key={cat.category}
                  className="rounded-xl border border-border bg-card p-3 sm:p-4 card-hover cursor-pointer"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: `hsl(${152 - heat * 120} ${60 + heat * 40}% ${30 + heat * 20}%)`,
                  }}
                >
                  <p className="font-display text-sm font-bold text-foreground">{cat.category}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {cat.votes.toLocaleString()} votes</p>
                    <p className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {cat.comments.toLocaleString()} comments</p>
                    <p>{cat.count} {cat.count === 1 ? "story" : "stories"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hottest Polls */}
        <section className="mb-6 sm:mb-8">
          <h2 className="font-display text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-naija-gold" /> Hottest Polls Right Now
          </h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {hottestPolls.map((article) => (
              <div key={article.id} className="rounded-xl border border-border bg-card p-3 sm:p-4 card-hover">
                <Link to={`/news/${article.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">
                  {article.headline}
                </Link>
                <div className="mt-3">
                  <PollCard article={article} compact />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                  <span>{article.total_votes.toLocaleString()} votes</span>
                  <span>{article.comment_count} comments</span>
                  <span className="ml-auto text-naija-green font-medium">{article.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Most Debated Stories */}
        <section>
          <h2 className="font-display text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-naija-orange" /> Most Debated Stories
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {mostDebated.map((article, i) => (
              <Link
                key={article.id}
                to={`/news/${article.id}`}
                className="flex items-start gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 card-hover"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-display text-sm font-bold text-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{article.headline}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                    <span className="fire-badge">{article.comment_count} comments 🔥</span>
                    <span>{article.total_votes.toLocaleString()} votes</span>
                    <span>{article.source}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Trending;
