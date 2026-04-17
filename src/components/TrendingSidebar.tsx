import { Flame, Trophy } from "lucide-react";
import { useLeaderboard, useTrendingArticles } from "@/hooks/useNews";
import { Link } from "react-router-dom";

const TrendingSidebar = () => {
  const { data: leaders = [] } = useLeaderboard();
  const { data: trendingArticles = [] } = useTrendingArticles();

  const badges = ["🏆", "🥈", "🥉", "⭐", "⭐"];

  return (
    <aside className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Flame className="h-4 w-4 text-naija-orange" /> Trending Now
        </h3>
        <div className="space-y-3">
          {trendingArticles.length > 0
            ? trendingArticles.map((article, i) => (
                <Link to={`/news/${article.id}`} key={article.id} className="flex items-start gap-3 group">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary cursor-pointer transition-colors truncate">
                      {article.headline}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {article.total_votes.toLocaleString()} votes · {article.comment_count} comments
                    </p>
                  </div>
                </Link>
              ))
            : (
                <p className="text-xs text-muted-foreground">No trending stories yet. Check back soon! 🇳🇬</p>
              )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Trophy className="h-4 w-4 text-naija-gold" /> Top Contributors
        </h3>
        <div className="space-y-3">
          {leaders.length === 0 ? (
            <p className="text-xs text-muted-foreground">Be the first contributor! 🇳🇬</p>
          ) : (
            leaders.slice(0, 5).map((user, i) => (
              <div key={user.id} className="flex items-center gap-3">
                <span className="text-base">{badges[i] || "⭐"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.display_name || user.username || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.points?.toLocaleString()} pts · {user.comment_count} comments
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center">
        <p className="text-xs font-medium text-muted-foreground">AD SPACE</p>
        <p className="mt-1 text-[10px] text-muted-foreground">Google AdSense placement</p>
      </div>
    </aside>
  );
};

export default TrendingSidebar;
