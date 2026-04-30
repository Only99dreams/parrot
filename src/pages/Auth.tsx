import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useApplyReferral } from "@/hooks/useReferral";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState(
    (searchParams.get("ref") ?? "").toUpperCase()
  );
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const applyReferral = useApplyReferral();

  // If a ref param is present, jump straight to sign-up
  useEffect(() => {
    if (searchParams.get("ref")) setIsLogin(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast({ title: "Welcome back! 🇳🇬" });
        navigate("/");
      } else {
        await signUp(email, password, username);
        // Try to apply referral code after sign-up (best-effort)
        if (referralCodeInput.trim()) {
          try {
            await applyReferral.mutateAsync(referralCodeInput.trim());
          } catch {}
        }
        toast({
          title: "Account created! 🎉",
          description: "You can now sign in with your credentials.",
        });
        setIsLogin(true);
        setPassword("");
        setReferralCodeInput("");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-3 sm:px-4 py-8 sm:py-12">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 animate-slide-up">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-naija">
              <span className="text-xl font-bold text-primary-foreground">P</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {isLogin ? "Welcome Back" : "Join ParrotNG"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to vote, comment and join the debate"
                : "Create your account and make your voice heard"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ChiefObiora"
                  required={!isLogin}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  maxLength={10}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 font-mono tracking-widest ${
                    referralCodeInput
                      ? "border-naija-gold focus:border-naija-gold focus:ring-naija-gold"
                      : "border-border focus:border-primary focus:ring-primary"
                  }`}
                />
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">+1,000 pts</span>
                  Your friend earns 1,000 points when you sign up with their code!
                </p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
