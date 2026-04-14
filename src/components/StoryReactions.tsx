import { useReactions, REACTION_EMOJIS } from "@/hooks/useReactions";

interface StoryReactionsProps {
  articleId: string;
  compact?: boolean;
}

const StoryReactions = ({ articleId, compact }: StoryReactionsProps) => {
  const { reactions, userReaction, react } = useReactions(articleId);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <div className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`}>
      {REACTION_EMOJIS.map(({ key, emoji, label }) => {
        const count = reactions[key] || 0;
        const isActive = userReaction === key;
        return (
          <button
            key={key}
            onClick={() => react(key)}
            title={label}
            className={`flex items-center gap-0.5 rounded-full transition-all ${
              compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"
            } ${
              isActive
                ? "bg-primary/15 ring-1 ring-primary/30 scale-110"
                : "hover:bg-muted hover:scale-105"
            }`}
          >
            <span className={compact ? "text-xs" : "text-sm"}>{emoji}</span>
            {count > 0 && (
              <span className={`font-medium ${isActive ? "text-primary" : "text-muted-foreground"} ${compact ? "text-[9px]" : "text-xs"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
      {!compact && totalReactions > 0 && (
        <span className="ml-1 text-[10px] text-muted-foreground">{totalReactions} reactions</span>
      )}
    </div>
  );
};

export default StoryReactions;
