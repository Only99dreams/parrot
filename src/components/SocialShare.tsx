import { Share2, X, MessageCircle, Facebook, Link2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  title: string;
  summary: string;
  articleId: string;
  pollQuestion?: string | null;
  compact?: boolean;
}

const SocialShare = ({ title, summary, articleId, pollQuestion, compact = false }: SocialShareProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://parrot.com.ng";
  const shareUrl = `${baseUrl}/news/${articleId}`;
  const shareText = pollQuestion
    ? `🦜 *ParrotNG* — What Nigerians Really Think\n\n📊 *${pollQuestion}*\n\n🗳️ Cast your vote now!\n👉 ${shareUrl}\n\n_Join 🇳🇬 millions debating the issues that matter_`
    : `🦜 *ParrotNG*\n\n📰 *${title}*\n\n${summary.slice(0, 120)}...\n\n🗳️ Read, vote & join the debate!\n👉 ${shareUrl}\n\n_🇳🇬 What Nigerians Really Think_`;

  const platforms = [
    {
      name: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      color: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20",
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Twitter/X",
      icon: <X className="h-5 w-5" />,
      color: "bg-foreground/5 text-foreground hover:bg-foreground/10",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      color: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Telegram",
      icon: <span className="text-lg">✈️</span>,
      color: "bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20",
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied! 🔗", description: "Share it anywhere!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: shareText, url: shareUrl });
    } else {
      setOpen(true);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={handleNativeShare}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-3 shadow-xl animate-slide-up">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Share to...</p>
              <div className="space-y-1">
                {platforms.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${p.color}`}
                  >
                    {p.icon}
                    {p.name}
                  </a>
                ))}
                <button
                  onClick={copyLink}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="h-5 w-5 text-primary" /> : <Link2 className="h-5 w-5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => (
        <a
          key={p.name}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${p.color}`}
        >
          {p.icon}
          {p.name}
        </a>
      ))}
      <button
        onClick={copyLink}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
};

export default SocialShare;
