import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Zap, Trophy, TrendingUp } from "lucide-react";

interface EngagementPromptsProps {
  totalVoters?: number;
  articleCount?: number;
}

const EngagementPrompts = ({ totalVoters = 0, articleCount = 0 }: EngagementPromptsProps) => {
  const { user } = useAuth();

  if (user) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Social proof banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-2 sm:gap-3">
          <div className="hidden xs:flex flex-shrink-0 -space-x-2">
            {["🧑🏿", "👩🏽", "🧑🏾", "👨🏿"].map((emoji, i) => (
              <span
                key={i}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs sm:text-sm"
              >
                {emoji}
              </span>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {totalVoters > 0 ? `${totalVoters.toLocaleString()}+ Nigerians` : "Thousands of Nigerians"} have voted today
            </p>
            <p className="text-xs text-muted-foreground">Join the conversation. Your opinion matters! 🇳🇬</p>
          </div>
        </div>
        <Link
          to="/auth"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg gradient-naija px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Zap className="h-4 w-4" />
          Join ParrotNG — It's Free!
        </Link>
      </div>

      {/* FOMO ticker */}
      <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs">
        <TrendingUp className="h-3.5 w-3.5 text-accent" />
        <span className="font-medium text-accent-foreground">
          <strong>{articleCount} hot topics</strong> being debated right now
        </span>
      </div>
    </div>
  );
};

export default EngagementPrompts;
