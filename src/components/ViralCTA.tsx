import { Share2, Sparkles } from "lucide-react";

const ViralCTA = () => {
  const shareApp = () => {
    const text = "🦜 *ParrotNG* — What Nigerians Really Think!\n\n📊 Vote on the hottest topics\n💬 Join heated debates\n🗳️ Make your voice count\n\n🇳🇬 Join millions of Nigerians now 👇";
    const url = typeof window !== "undefined" ? window.location.origin : "https://parrot.com.ng";

    if (navigator.share) {
      navigator.share({ title: "ParrotNG", text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
    }
  };

  return (
    <div className="rounded-xl gradient-naija p-3 sm:p-5 text-primary-foreground">
      <div className="flex items-start gap-2 sm:gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm sm:text-base font-bold">Your opinion too matter! 🗣️</p>
          <p className="mt-1 text-xs sm:text-sm opacity-90">
            Share ParrotNG with your group chat. Make una vote together!
          </p>
          <button
            onClick={shareApp}
            className="mt-2 sm:mt-3 flex items-center gap-2 rounded-lg bg-primary-foreground/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold hover:bg-primary-foreground/30 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share with Friends
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViralCTA;
