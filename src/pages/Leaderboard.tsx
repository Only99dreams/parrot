import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/useNews";

const badges = ["🏆", "🥈", "🥉", "⭐", "⭐", "⭐", "⭐", "⭐", "⭐", "⭐"];

const Leaderboard = () => {
  const { data: leaders = [], isLoading } = useLeaderboard();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 gradient-gold rounded-xl p-4 sm:p-6 animate-slide-up">
          <h1 className="flex items-center gap-2 font-display text-xl sm:text-2xl font-bold text-foreground">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" /> Top Contributors
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-foreground/80">
            The most active voices shaping Nigeria's conversation. Comment, vote, and climb the ranks!
          </p>
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-12">Loading...</p>}

        {!isLoading && leaders.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-lg font-bold text-foreground">No contributors yet!</p>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to vote and comment to appear on the leaderboard. 🇳🇬</p>
          </div>
        )}

        {leaders.length > 0 && (
          <>
            <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
              {leaders.slice(0, 3).map((user, i) => (
                <div
                  key={user.id}
                  className={`card-hover rounded-xl border bg-card p-2.5 sm:p-4 text-center animate-slide-up ${
                    i === 0 ? "border-naija-gold" : "border-border"
                  }`}
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-1 sm:mb-2 text-2xl sm:text-3xl">{badges[i]}</div>
                  <p className="font-display text-xs sm:text-sm font-bold text-foreground truncate">
                    {user.display_name || user.username || "Anonymous"}
                  </p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-primary">{(user.points ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {leaders.map((user, i) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 ${
                    i !== leaders.length - 1 ? "border-b border-border" : ""
                  } ${i < 3 ? "bg-primary/5" : ""}`}
                >
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <span className="text-xl">{badges[i] || "⭐"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {user.display_name || user.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.comment_count ?? 0} comments</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{(user.points ?? 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
