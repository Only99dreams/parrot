import { Link } from "react-router-dom";
import { MessageSquare, Share2, Flame, Clock, Bookmark, BookmarkCheck } from "lucide-react";
import { type NewsItem } from "@/data/mockNews";
import { useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useToast } from "@/hooks/use-toast";

interface NewsCardMockProps {
  news: NewsItem;
  index: number;
}

const NewsCardMock = ({ news, index }: NewsCardMockProps) => {
  const [voted, setVoted] = useState<string | null>(null);
  const [options, setOptions] = useState(news.pollOptions);
  const { toggle, isBookmarked } = useBookmarks();
  const { toast } = useToast();
  const saved = isBookmarked(news.id);

  const handleBookmark = () => {
    toggle(news.id);
    toast({ title: saved ? "Bookmark removed" : "Bookmarked! 🔖" });
  };
  const totalVotes = options.reduce((s, o) => s + o.votes, 0);

  const handleVote = (id: string) => {
    if (voted) return;
    setVoted(id);
    setOptions((p) => p.map((o) => (o.id === id ? { ...o, votes: o.votes + 1 } : o)));
  };

  return (
    <article
      className="card-hover rounded-xl border border-border bg-card p-3 sm:p-5 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="pulse-badge">{news.category}</span>
          {news.isTrending && (
            <span className="fire-badge"><Flame className="mr-1 h-3 w-3" /> Trending</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />{news.timeAgo}
        </div>
      </div>

      <Link to={`/news/${news.id}`}>
        <h2 className="mb-2 font-display text-base sm:text-lg font-bold leading-snug text-foreground hover:text-primary transition-colors">
          {news.headline}
        </h2>
      </Link>

      <p className="mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">{news.summary}</p>

      <div className="mb-3 sm:mb-4 rounded-lg border border-border bg-muted/30 p-3 sm:p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">{news.pollQuestion}</p>
        {options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = voted === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!voted}
              className={`relative w-full overflow-hidden rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                voted ? (isSelected ? "border-primary bg-primary/5" : "border-border bg-card") : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              }`}
            >
              {voted && (
                <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                  style={{ width: `${pct}%`, background: isSelected ? "hsl(var(--naija-green) / 0.12)" : "hsl(var(--muted))" }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>{option.text}</span>
                {voted && <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{pct}%</span>}
              </span>
            </button>
          );
        })}
        <p className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} votes</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to={`/news/${news.id}`} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare className="h-4 w-4" />{news.commentCount} comments
          </Link>
          <span className="text-xs text-muted-foreground">{news.source}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Share2 className="h-4 w-4" /></button>
          <button
            onClick={handleBookmark}
            className={`rounded-lg p-2 transition-colors ${
              saved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
};

export default NewsCardMock;
