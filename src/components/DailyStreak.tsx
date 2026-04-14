import { useStreak } from "@/hooks/useStreak";
import { Flame, Gift, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DailyStreak = () => {
  const { currentStreak, longestStreak, totalPoints, dailyCheckedIn, checkIn } = useStreak();
  const { toast } = useToast();

  const handleCheckIn = () => {
    if (dailyCheckedIn) return;
    checkIn();
    const bonus = Math.min(currentStreak * 2, 20);
    toast({
      title: `🔥 Daily Check-in! +${10 + bonus} points`,
      description: `${currentStreak} day streak! Keep it going tomorrow.`,
    });
  };

  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((m) => m > currentStreak) || 100;
  const prevMilestone = milestones.filter((m) => m <= currentStreak).pop() || 0;
  const progress = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStreak >= 7 ? "bg-orange-500/20" : "bg-primary/10"}`}>
            <Flame className={`h-5 w-5 ${currentStreak >= 7 ? "text-orange-500 animate-streak-glow" : "text-primary"}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{currentStreak} Day Streak</p>
            <p className="text-[10px] text-muted-foreground">Best: {longestStreak} days • {totalPoints} pts</p>
          </div>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={dailyCheckedIn}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            dailyCheckedIn
              ? "bg-muted text-muted-foreground cursor-default"
              : "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse"
          }`}
        >
          {dailyCheckedIn ? (
            <>✅ Checked In</>
          ) : (
            <><Gift className="h-3.5 w-3.5" /> Check In</>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Next reward: {nextMilestone} days</span>
          <span>{currentStreak}/{nextMilestone}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[...Array(7)].map((_, i) => {
          const dayNum = i + 1;
          const reached = currentStreak >= dayNum;
          return (
            <div
              key={i}
              className={`flex-1 h-6 rounded flex items-center justify-center text-[9px] font-bold ${
                reached
                  ? "bg-primary/20 text-primary"
                  : dayNum === currentStreak + 1
                  ? "bg-muted border border-dashed border-primary/40 text-primary/60"
                  : "bg-muted text-muted-foreground/50"
              }`}
            >
              {reached ? "🔥" : dayNum}
            </div>
          );
        })}
      </div>

      {currentStreak >= 7 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-500 font-medium">
          <Trophy className="h-3 w-3" />
          You're on fire! Weekly warrior badge earned 🏅
        </div>
      )}
    </div>
  );
};

export default DailyStreak;
