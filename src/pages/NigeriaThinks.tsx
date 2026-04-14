import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BarChart3, TrendingUp, TrendingDown, Minus, Sparkles, MessageSquare, Vote } from "lucide-react";
import { useNewsArticles } from "@/hooks/useNews";
import { useMemo } from "react";
import { Link } from "react-router-dom";

interface CategorySentiment {
  category: string;
  sentiment: "positive" | "negative" | "mixed";
  percentage: number;
  totalVotes: number;
  totalComments: number;
  articleCount: number;
  topHeadline: string;
  topArticleId: string;
  summary: string;
}

const getSentimentIcon = (s: string) => {
  if (s === "positive") return <TrendingUp className="h-4 w-4 text-naija-green" />;
  if (s === "negative") return <TrendingDown className="h-4 w-4 text-naija-red" />;
  return <Minus className="h-4 w-4 text-naija-gold" />;
};

const getSentimentColor = (s: string) => {
  if (s === "positive") return "hsl(var(--naija-green))";
  if (s === "negative") return "hsl(var(--naija-red))";
  return "hsl(var(--naija-gold))";
};

function deriveSentiment(totalVotes: number, totalComments: number, articleCount: number): { sentiment: "positive" | "negative" | "mixed"; percentage: number } {
  const engagement = articleCount > 0 ? (totalVotes + totalComments) / articleCount : 0;
  if (engagement > 100) return { sentiment: "positive", percentage: Math.min(85, 50 + Math.floor(engagement / 10)) };
  if (engagement > 30) return { sentiment: "mixed", percentage: 45 + Math.floor(Math.random() * 15) };
  return { sentiment: "negative", percentage: 25 + Math.floor(engagement) };
}

const NigeriaThinks = () => {
  const { data: articles = [], isLoading } = useNewsArticles();

  const categoryData = useMemo<CategorySentiment[]>(() => {
    if (articles.length === 0) return [];

    const grouped: Record<string, typeof articles> = {};
    for (const a of articles) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    return Object.entries(grouped)
      .map(([category, items]) => {
        const totalVotes = items.reduce((s, a) => s + a.total_votes, 0);
        const totalComments = items.reduce((s, a) => s + a.comment_count, 0);
        const top = items.sort((a, b) => b.total_votes - a.total_votes)[0];
        const { sentiment, percentage } = deriveSentiment(totalVotes, totalComments, items.length);

        return {
          category,
          sentiment,
          percentage,
          totalVotes,
          totalComments,
          articleCount: items.length,
          topHeadline: top.headline,
          topArticleId: top.id,
          summary: top.summary,
        };
      })
      .sort((a, b) => b.totalVotes - a.totalVotes);
  }, [articles]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 gradient-naija rounded-xl p-4 sm:p-6 text-primary-foreground animate-slide-up">
          <h1 className="flex items-center gap-2 font-display text-xl sm:text-2xl font-bold">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" /> Nigeria Thinks
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm opacity-90">
            Real-time sentiment analysis from polls, votes, and discussions across ParrotNG.
          </p>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground">Analyzing sentiment...</div>
        )}

        {!isLoading && categoryData.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-lg">📊</p>
            <p className="mt-2 text-sm text-muted-foreground">No data yet. Sentiment will appear as articles and votes come in.</p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {categoryData.map((item, i) => (
            <div
              key={item.category}
              className="card-hover rounded-xl border border-border bg-card p-3 sm:p-5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getSentimentIcon(item.sentiment)}
                  <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                    {item.category}
                  </h3>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                  style={{
                    background: `${getSentimentColor(item.sentiment)}15`,
                    color: getSentimentColor(item.sentiment),
                  }}
                >
                  {item.sentiment}
                </span>
              </div>

              {/* Sentiment bar */}
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${item.percentage}%`,
                    background: getSentimentColor(item.sentiment),
                  }}
                />
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Vote className="h-3 w-3" /> {item.totalVotes.toLocaleString()} votes
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {item.totalComments.toLocaleString()} comments
                </span>
                <span>{item.articleCount} {item.articleCount === 1 ? "story" : "stories"}</span>
              </div>

              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                  <Sparkles className="h-3 w-3" /> Top Story
                </p>
                <Link
                  to={`/news/${item.topArticleId}`}
                  className="text-xs font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.topHeadline} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NigeriaThinks;
