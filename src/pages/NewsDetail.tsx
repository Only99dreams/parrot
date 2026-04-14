import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Flame, MessageSquare, Lightbulb, Users, Sparkles } from "lucide-react";
import SocialShare from "@/components/SocialShare";
import StoryReactions from "@/components/StoryReactions";
import LiveDiscussion from "@/components/LiveDiscussion";
import Header from "@/components/Header";
import PollCard from "@/components/PollCard";
import { useNewsArticle, useComments, useAddComment } from "@/hooks/useNews";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const NewsDetail = () => {
  const { id } = useParams();
  const { data: article, isLoading } = useNewsArticle(id || "");
  const { data: comments = [] } = useComments(id || "");
  const addComment = useAddComment();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const { markRead } = useReadingHistory();

  useEffect(() => {
    if (article) {
      document.title = `${article.headline} — ParrotNG`;
      markRead(article.id, article.category, article.headline);
    }
    return () => { document.title = "ParrotNG — What Nigerians Really Think"; };
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Story not found</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Back to feed</Link>
        </div>
      </div>
    );
  }

  const perspectives = Array.isArray(article.perspectives) ? article.perspectives : [];
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });

  const handleComment = () => {
    if (!user) {
      toast({ title: "Sign in to comment! 🗣️" });
      return;
    }
    if (!commentText.trim()) return;
    addComment.mutate(
      { articleId: article.id, content: commentText },
      {
        onSuccess: () => {
          setCommentText("");
          toast({ title: "Comment posted! 🎉" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
        <Link to="/" className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-6 animate-slide-up">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
            <span className="pulse-badge">{article.category}</span>
            {article.is_trending && (
              <span className="fire-badge"><Flame className="mr-1 h-3 w-3" /> Trending</span>
            )}
            <span className="text-xs text-muted-foreground">{article.source} · {timeAgo}</span>
          </div>

          <h1 className="mb-3 sm:mb-4 font-display text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-foreground">
            {article.headline}
          </h1>

          <p className="mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed text-muted-foreground">{article.summary}</p>

          {article.why_it_matters && (
            <div className="mb-4 sm:mb-6 rounded-lg border-l-4 border-primary bg-primary/5 p-3 sm:p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
                <Lightbulb className="h-4 w-4" /> Why It Matters
              </h3>
              <p className="text-sm text-foreground">{article.why_it_matters}</p>
            </div>
          )}

          <div className="mb-4 sm:mb-6 rounded-lg border border-border bg-muted/30 p-3 sm:p-5">
            <PollCard article={article} />
          </div>

          {article.debate_hook && (
            <div className="mb-4 sm:mb-6 rounded-lg gradient-gold p-3 sm:p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
                <Flame className="h-4 w-4" /> Debate This
              </h3>
              <p className="text-sm font-medium text-foreground">{article.debate_hook}</p>
            </div>
          )}

          {perspectives.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="mb-2 sm:mb-3 flex items-center gap-2 font-display text-sm sm:text-base font-bold text-foreground">
                <Users className="h-4 w-4" /> Multiple Perspectives
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {perspectives.map((p: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 sm:p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">{p.label}</p>
                    <p className="text-sm text-muted-foreground">{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SocialShare
            title={article.headline}
            summary={article.summary}
            articleId={article.id}
            pollQuestion={article.poll_question}
          />

          <div className="mt-4 sm:mt-6">
            <StoryReactions articleId={article.id} />
          </div>
        </article>

        <div className="mt-4 sm:mt-6 animate-slide-up" style={{ animationDelay: "80ms" }}>
          <LiveDiscussion articleId={article.id} headline={article.headline} />
        </div>

        <section className="mt-4 sm:mt-6 rounded-xl border border-border bg-card p-4 sm:p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h3 className="mb-3 sm:mb-4 flex items-center gap-2 font-display text-base sm:text-lg font-bold text-foreground">
            <MessageSquare className="h-5 w-5" /> What People Are Saying ({comments.length})
          </h3>

          <div className="mb-4 sm:mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? "Drop your own take... 🗣️" : "Sign in to comment..."}
              disabled={!user}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-50"
              rows={3}
            />
            <button
              onClick={handleComment}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={!commentText.trim() || addComment.isPending}
            >
              {addComment.isPending ? "Posting..." : "Post Comment"}
            </button>
          </div>

          <div className="space-y-4">
            {comments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No comments yet. Be the first to share your take! 🇳🇬
              </p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg border p-3 sm:p-4 ${
                  comment.is_ai ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="mb-1.5 sm:mb-2 flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {comment.profiles?.display_name || comment.profiles?.username || "Anonymous"}
                    </span>
                    {comment.is_ai && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Sparkles className="h-3 w-3" /> AI Summary
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{comment.content}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NewsDetail;
