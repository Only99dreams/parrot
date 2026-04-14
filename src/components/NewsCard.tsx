import { Link } from "react-router-dom";
import { MessageSquare, Flame, Clock, Bookmark, BookmarkCheck } from "lucide-react";
import PollCard from "./PollCard";
import SocialShare from "./SocialShare";
import StoryReactions from "./StoryReactions";
import { type NewsArticle } from "@/hooks/useNews";
import { formatDistanceToNow } from "date-fns";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useToast } from "@/hooks/use-toast";

interface NewsCardProps {
  article: NewsArticle;
  index: number;
}

const categoryColors: Record<string, string> = {
  Economy: "pulse-badge",
  Education: "fire-badge",
  Energy: "pulse-badge",
  Infrastructure: "pulse-badge",
  Sports: "fire-badge",
  Politics: "pulse-badge",
  Entertainment: "fire-badge",
  Technology: "pulse-badge",
  Health: "pulse-badge",
};

const NewsCard = ({ article, index }: NewsCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });
  const { toggle, isBookmarked } = useBookmarks();
  const { markRead, isRead } = useReadingHistory();
  const { toast } = useToast();
  const saved = isBookmarked(article.id);
  const read = isRead(article.id);

  const handleClick = () => {
    markRead(article.id, article.category, article.headline);
  };

  const handleBookmark = () => {
    toggle(article.id);
    toast({ title: saved ? "Bookmark removed" : "Bookmarked! 🔖" });
  };

  return (
    <article
      className="card-hover rounded-xl border border-border bg-card p-3 sm:p-5 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={categoryColors[article.category] || "pulse-badge"}>
            {article.category}
          </span>
          {article.is_trending && (
            <span className="fire-badge">
              <Flame className="mr-1 h-3 w-3" /> Trending
            </span>
          )}
          {article.is_sponsored && (
            <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Sponsored
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </div>
      </div>

      <Link to={`/news/${article.id}`} onClick={handleClick}>
        <h2 className={`mb-2 font-display text-base sm:text-lg font-bold leading-snug transition-colors ${
          read ? "text-muted-foreground hover:text-primary" : "text-foreground hover:text-primary"
        }`}>
          {article.headline}
        </h2>
      </Link>

      <p className="mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">{article.summary}</p>

      <div className="mb-3 sm:mb-4 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
        <PollCard article={article} compact />
      </div>

      <div className="mb-3 sm:mb-4">
        <StoryReactions articleId={article.id} compact />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to={`/news/${article.id}`}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {article.comment_count} comments
          </Link>
          <span className="hidden sm:inline text-xs text-muted-foreground">{article.source}</span>
        </div>
        <div className="flex items-center gap-1">
          <SocialShare
            title={article.headline}
            summary={article.summary}
            articleId={article.id}
            pollQuestion={article.poll_question}
            compact
          />
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

export default NewsCard;
