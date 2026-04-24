import { Download, X, Share } from "lucide-react";
import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";

const InstallAppPrompt = () => {
  const { canInstall, isIOS, install } = usePWAInstall();
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("pwa-prompt-dismissed") === "true";
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const installed = await install();
    if (installed && isSupported && !isSubscribed) {
      await subscribe();
    }
  };

  if (!canInstall || dismissed) return null;

  return (
    <>
      {/* Bottom banner */}
      <div className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom animate-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto max-w-5xl px-3 pb-3">
          <div className="relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-semibold text-foreground">Get the ParrotNG App</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                Instant access & notifications for trending news, polls & quizzes
              </p>
            </div>

            <Button size="sm" onClick={handleInstall} className="flex-shrink-0 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
          </div>
        </div>
      </div>

      {/* iOS instruction modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowIOSGuide(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-display font-bold text-foreground mb-4">Install ParrotNG</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <p>
                  Tap the <Share className="inline h-4 w-4 text-primary -mt-0.5" /> <strong>Share</strong> button in Safari's toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <p>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <p>
                  Tap <strong>"Add"</strong> to install the app
                </p>
              </div>
            </div>
            <Button onClick={() => setShowIOSGuide(false)} className="mt-5 w-full">
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppPrompt;
