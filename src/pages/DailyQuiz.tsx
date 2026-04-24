import { useState } from "react";
import Header from "@/components/Header";
import { useDailyQuiz } from "@/hooks/useDailyQuiz";
import { useStreak } from "@/hooks/useStreak";
import { Brain, CheckCircle2, XCircle, Trophy, Share2, Clock, MessageCircle, Facebook, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const DailyQuiz = () => {
  const { questions, answers, score, completed, totalQuizzesTaken, bestScore, loading, answer } = useDailyQuiz();
  const { currentStreak } = useStreak();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(0);
  const [copied, setCopied] = useState(false);

  const question = questions[currentQ];
  const answered = question ? answers[question.id] !== undefined : false;
  const selectedAnswer = question ? answers[question.id] : undefined;
  const isCorrect = question ? selectedAnswer === question.correctIndex : false;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://parrot.com.ng";
  const quizUrl = `${baseUrl}/quiz`;

  const getScoreEmoji = () => {
    if (score === 100) return "🏆";
    if (score >= 80) return "🔥";
    if (score >= 60) return "💪";
    if (score >= 40) return "🤔";
    return "📚";
  };

  const shareText = `${getScoreEmoji()} I scored ${score}/100 on today's ParrotNG Daily Quiz! 🧠\n\n🔥 ${currentStreak} day streak\n${"🟩".repeat(Math.round(score / 20))}${"⬜".repeat(5 - Math.round(score / 20))}\n\nHow well do YOU know Nigeria? 🇳🇬\nTake the quiz 👉 ${quizUrl}`;

  const handleAnswer = (index: number) => {
    if (!question || answered) return;
    answer(question.id, index);
    if (index === question.correctIndex) {
      toast({ title: "✅ Correct! +20 points" });
    } else {
      toast({ title: "❌ Wrong answer", description: question.explanation });
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "ParrotNG Daily Quiz", text: shareText, url: quizUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        toast({ title: "Copied to clipboard! 📋" });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quizUrl)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(quizUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      toast({ title: "Copied to clipboard! 📋" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Brain className="h-10 w-10 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading today's questions…</p>
          </div>
        ) : (
        <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Daily Naija Quiz</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Test your knowledge about Nigeria. New questions daily!</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{score}/100</p>
              <p className="text-[10px] text-muted-foreground">Today's Score</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-foreground">{totalQuizzesTaken}</p>
              <p className="text-[10px] text-muted-foreground">Quizzes Taken</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-orange-500">{bestScore}/100</p>
              <p className="text-[10px] text-muted-foreground">Best Score</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4 flex items-center gap-2">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`flex-1 h-2 rounded-full transition-colors ${
                answers[q.id] !== undefined
                  ? answers[q.id] === q.correctIndex
                    ? "bg-green-500"
                    : "bg-destructive"
                  : i === currentQ
                  ? "bg-primary/40"
                  : "bg-muted"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground flex-shrink-0">{answeredCount}/5</span>
        </div>

        {completed ? (
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
            <div className="mb-4">
              {score >= 80 ? (
                <div className="text-5xl mb-2">🏆</div>
              ) : score >= 60 ? (
                <div className="text-5xl mb-2">🎉</div>
              ) : score >= 40 ? (
                <div className="text-5xl mb-2">💪</div>
              ) : (
                <div className="text-5xl mb-2">📚</div>
              )}
              <h2 className="font-display text-2xl font-bold text-foreground">Quiz Complete!</h2>
              <p className="text-3xl font-bold text-primary mt-2">{score}/100</p>
              <p className="text-sm text-muted-foreground mt-1">
                {score === 100
                  ? "Perfect score! You're a true Naija expert! 🇳🇬"
                  : score >= 80
                  ? "Amazing! You know your Nigeria! 💯"
                  : score >= 60
                  ? "Good job! Keep reading ParrotNG to learn more! 📰"
                  : score >= 40
                  ? "Not bad! There's always tomorrow. 🔥"
                  : "Keep learning! Read more news to boost your knowledge. 📖"}
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-6">
              {/* Score visual */}
              <div className="flex justify-center gap-1.5">
                {questions.map((q) => {
                  const userAns = answers[q.id];
                  const correct = userAns === q.correctIndex;
                  return (
                    <span key={q.id} className="text-xl">{correct ? "🟩" : "🟥"}</span>
                  );
                })}
              </div>

              <p className="text-xs font-medium text-muted-foreground">Share your score</p>

              {/* Social share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366]/10 px-4 py-3 text-sm font-bold text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
                <button
                  onClick={shareTwitter}
                  className="flex items-center justify-center gap-2 rounded-lg bg-foreground/5 px-4 py-3 text-sm font-bold text-foreground hover:bg-foreground/10 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter/X
                </button>
                <button
                  onClick={shareFacebook}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2]/10 px-4 py-3 text-sm font-bold text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
                >
                  <Facebook className="h-4 w-4" /> Facebook
                </button>
                <button
                  onClick={shareTelegram}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#0088cc]/10 px-4 py-3 text-sm font-bold text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors"
                >
                  <span className="text-base">✈️</span> Telegram
                </button>
              </div>

              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {copied ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Score Card</>}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                New quiz drops at midnight!
              </div>
            </div>

            {/* Review answers */}
            <div className="mt-6 space-y-3 text-left">
              <h3 className="text-sm font-bold text-foreground">Review</h3>
              {questions.map((q) => {
                const userAns = answers[q.id];
                const correct = userAns === q.correctIndex;
                return (
                  <div key={q.id} className={`rounded-lg p-3 text-xs ${correct ? "bg-green-500/10" : "bg-destructive/10"}`}>
                    <div className="flex items-start gap-2">
                      {correct ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{q.question}</p>
                        {!correct && (
                          <p className="text-muted-foreground mt-1">
                            Your answer: {q.options[userAns]} → Correct: {q.options[q.correctIndex]}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-1">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : question ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                {question.category}
              </span>
              <span className="text-xs text-muted-foreground">Question {currentQ + 1} of 5</span>
            </div>

            <h2 className="font-display text-base sm:text-lg font-bold text-foreground mb-4">
              {question.question}
            </h2>

            <div className="space-y-2">
              {question.options.map((option, i) => {
                const isSelected = selectedAnswer === i;
                const isCorrectOption = i === question.correctIndex;
                const showResult = answered;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left rounded-lg border p-3 sm:p-4 text-sm font-medium transition-all ${
                      showResult
                        ? isCorrectOption
                          ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                          : isSelected
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground"
                        : "border-border hover:border-primary/40 hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        showResult
                          ? isCorrectOption
                            ? "bg-green-500 text-white"
                            : isSelected
                            ? "bg-destructive text-white"
                            : "bg-muted text-muted-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {showResult ? (isCorrectOption ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </div>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                💡 {question.explanation}
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
                className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                disabled={currentQ === questions.length - 1}
                className="rounded-lg px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
        </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DailyQuiz;
