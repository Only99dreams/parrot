import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useVote, useUserVotes, type NewsArticle } from "@/hooks/useNews";
import { useToast } from "@/hooks/use-toast";
import ShareablePollCard from "./ShareablePollCard";

interface PollCardProps {
  article: NewsArticle;
  compact?: boolean;
}

const PollCard = ({ article, compact = false }: PollCardProps) => {
  const { user } = useAuth();
  const vote = useVote();
  const { data: userVotes = {} } = useUserVotes();
  const { toast } = useToast();

  const voted = userVotes[article.id] || null;
  const totalVotes = article.poll_options.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = (optionId: string) => {
    if (voted) return;
    if (!user) {
      toast({ title: "Sign in to vote! 🗳️", description: "Create an account to make your voice heard." });
      return;
    }
    vote.mutate(
      { articleId: article.id, optionId },
      {
        onError: (err: any) => {
          toast({ title: "Already voted!", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  if (!article.poll_question || article.poll_options.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className={`font-medium text-foreground ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>
        {article.poll_question}
      </p>
      <div className="space-y-1.5 sm:space-y-2">
        {article.poll_options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = voted === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!voted || vote.isPending}
              className={`relative w-full overflow-hidden rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm font-medium transition-all ${
                voted
                  ? isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              }`}
            >
              {voted && (
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? "hsl(var(--naija-green) / 0.12)"
                      : "hsl(var(--muted))",
                  }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>{option.option_text}</span>
                {voted && (
                  <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} votes</p>
        {voted && <ShareablePollCard article={article} />}
      </div>
    </div>
  );
};

export default PollCard;
