import { useNewsArticles } from "@/hooks/useNews";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const BreakingNewsTicker = () => {
  const { data: articles } = useNewsArticles();

  const breaking = (articles || [])
    .filter((a) => a.is_trending)
    .slice(0, 5);

  if (breaking.length === 0) return null;

  return (
    <div className="bg-destructive/90 text-destructive-foreground overflow-hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-1.5">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Breaking</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker flex whitespace-nowrap gap-12">
            {[...breaking, ...breaking].map((article, i) => (
              <Link
                key={`${article.id}-${i}`}
                to={`/news/${article.id}`}
                className="inline-block text-xs sm:text-sm font-medium hover:underline"
              >
                {article.headline}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNewsTicker;
