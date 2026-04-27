import { Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Loader2,
  Star,
  TrendingUp,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const CREATOR_THRESHOLD = 5_000_000;
// 1,000,000 points = ₦1,000
const POINTS_PER_NAIRA = 1_000;

interface PayoutRequest {
  id: string;
  points_at_request: number;
  amount_ngn: number;
  payment_method: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  status: "pending" | "approved" | "processing" | "paid" | "rejected";
  admin_notes: string | null;
  created_at: string;
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "opay", label: "OPay" },
  { value: "palmpay", label: "PalmPay" },
  { value: "moniepoint", label: "Moniepoint" },
];

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Wema Bank",
  "Zenith Bank",
  "Kuda Bank",
  "OPay Digital Services",
  "PalmPay",
  "Moniepoint MFB",
  "Carbon (One Finance)",
  "VFD Microfinance Bank",
];

function statusBadge(status: PayoutRequest["status"]) {
  const map: Record<PayoutRequest["status"], { label: string; icon: React.ReactNode; className: string }> = {
    pending: { label: "Pending Review", icon: <Clock className="h-3 w-3" />, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved: { label: "Approved", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-blue-100 text-blue-800 border-blue-200" },
    processing: { label: "Processing", icon: <Loader2 className="h-3 w-3 animate-spin" />, className: "bg-purple-100 text-purple-800 border-purple-200" },
    paid: { label: "Paid ✅", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: "Rejected", icon: <XCircle className="h-3 w-3" />, className: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, icon, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>
      {icon} {label}
    </span>
  );
}

export default function CreatorStudio() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { toast } = useToast();

  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  const points = profile?.points ?? 0;
  const isEligible = points >= CREATOR_THRESHOLD;
  const nairaValue = Math.floor(points / POINTS_PER_NAIRA);
  const progressPct = Math.min((points / CREATOR_THRESHOLD) * 100, 100);

  // Has a pending or approved request already?
  const hasPendingRequest = requests.some((r) =>
    r.status === "pending" || r.status === "approved" || r.status === "processing"
  );

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingRequests(true);
      const { data } = await supabase
        .from("creator_payout_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRequests((data as PayoutRequest[]) ?? []);
      setLoadingRequests(false);
    };
    load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isEligible) return;

    if (!accountNumber.trim() || !accountName.trim() || !bankName.trim()) {
      toast({ title: "Please fill all payment details.", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      toast({ title: "Account number must be 10 digits.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const amount_ngn = Math.floor(points / POINTS_PER_NAIRA);
      const { error } = await supabase.from("creator_payout_requests").insert({
        user_id: user.id,
        points_at_request: points,
        amount_ngn,
        payment_method: paymentMethod,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        bank_name: bankName,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Payout request submitted! 🎉", description: "We'll review and process it within 3–5 business days." });
      setShowForm(false);
      setAccountNumber("");
      setAccountName("");
      setBankName("");

      // Refresh list
      const { data } = await supabase
        .from("creator_payout_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRequests((data as PayoutRequest[]) ?? []);
    } catch (err: unknown) {
      toast({ title: "Submission failed", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6 space-y-5">

        {/* Hero banner */}
        <div className="rounded-xl bg-gradient-to-br from-naija-green via-primary to-naija-gold p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Link to="/profile" className="rounded-full p-1 hover:bg-white/20 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 fill-white" /> Creator Studio
            </h1>
          </div>
          <p className="text-sm text-white/80 ml-7">
            Earn real money from your points. Reach 5 million points to unlock payouts.
          </p>
        </div>

        {/* Points status card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your Points</p>
              <p className="text-3xl font-bold text-foreground">{points.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Worth</p>
              <p className="text-2xl font-bold text-naija-green">
                ₦{nairaValue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{points.toLocaleString()} pts</span>
              <span>Goal: {CREATOR_THRESHOLD.toLocaleString()} pts</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isEligible ? "bg-naija-green" : "bg-primary"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {!isEligible && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-0.5" />
                {(CREATOR_THRESHOLD - points).toLocaleString()} more points needed to unlock payouts
              </p>
            )}
          </div>

          {isEligible && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                You're eligible for payouts! 🎉 You can withdraw up to ₦{nairaValue.toLocaleString()}.
              </p>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> How Creator Payouts Work
          </h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-none">
            {[
              ["🏆", "Earn points", "Comment, vote on polls, complete quizzes, and streak daily."],
              ["🎯", "Hit 5,000,000 points", "Once you cross the threshold, payouts unlock."],
              ["💸", "Request payout", "Submit your Nigerian bank / mobile money details."],
              ["✅", "Get paid", "We review and transfer within 3–5 business days."],
            ].map(([icon, title, desc]) => (
              <li key={title} className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            <strong>Rate:</strong> 1,000,000 points = ₦1,000. Minimum payout is ₦5,000 (5,000,000 points).
            Payouts are processed manually and subject to verification.
          </div>
        </div>

        {/* Request payout button / form */}
        {isEligible && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" /> Request Payout
            </h2>

            {hasPendingRequest ? (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
                <Clock className="inline h-4 w-4 mr-1" />
                You already have a payout request in progress. We'll notify you once it's processed.
              </div>
            ) : !showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full gap-2">
                <Banknote className="h-4 w-4" /> Request ₦{nairaValue.toLocaleString()} Payout
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Payment method */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Bank name */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Bank / Provider Name
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select bank or provider</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Account number */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Account Number (10 digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="0123456789"
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Account name */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Account Name (as on bank records)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="JOHN DOE"
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  You're requesting <strong>₦{nairaValue.toLocaleString()}</strong> for{" "}
                  <strong>{points.toLocaleString()} points</strong>. Your points balance will remain
                  unchanged until the payout is marked as paid.
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                    {submitting ? "Submitting…" : "Submit Request"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Payout history */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Payout History
          </h2>

          {loadingRequests ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payout requests yet.{" "}
              {!isEligible && "Keep earning points to unlock payouts!"}
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-border p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-foreground">
                      ₦{Number(req.amount_ngn).toLocaleString()}
                    </span>
                    {statusBadge(req.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{req.bank_name} · {req.account_number} · {req.account_name}</p>
                    <p>{req.points_at_request.toLocaleString()} pts · {req.payment_method.replace("_", " ")}</p>
                    <p>Submitted {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
                  </div>
                  {req.admin_notes && (
                    <p className="text-xs rounded bg-muted/60 px-2 py-1 text-muted-foreground">
                      <strong>Note:</strong> {req.admin_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Not eligible — motivation */}
        {!isEligible && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center space-y-2">
            <p className="font-bold text-foreground">Keep grinding, Naija! 💪</p>
            <p className="text-sm text-muted-foreground">
              You need <strong>{(CREATOR_THRESHOLD - points).toLocaleString()}</strong> more points.
              Comment on articles, vote on polls, complete the daily quiz, and build your streak.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Link to="/quiz">
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">📝 Daily Quiz</Badge>
              </Link>
              <Link to="/nigeria-thinks">
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">🗳️ Vote & Debate</Badge>
              </Link>
              <Link to="/community">
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">💬 Community</Badge>
              </Link>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
