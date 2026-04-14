import { useState, useRef, useEffect } from "react";
import { Send, Users, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useComments, useAddComment } from "@/hooks/useNews";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "text-green-500", "text-blue-500", "text-purple-500", "text-orange-500",
  "text-pink-500", "text-cyan-500", "text-yellow-500", "text-red-400",
];

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface LiveDiscussionProps {
  articleId: string;
  headline: string;
}

const LiveDiscussion = ({ articleId, headline }: LiveDiscussionProps) => {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(articleId);
  const addComment = useAddComment();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Subscribe to realtime comment inserts for this article
  useEffect(() => {
    const channelName = `live-chat-${articleId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `article_id=eq.${articleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["comments", articleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId, queryClient]);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, isExpanded]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    addComment.mutate(
      { articleId, content: text },
      {
        onSuccess: () => {
          toast({ title: "Message sent! 💬" });
        },
        onError: () => {
          toast({ title: "Failed to send", variant: "destructive" });
          setInput(text);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show last few messages in collapsed view (reversed since comments are desc)
  const sortedComments = [...comments].reverse();

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 w-full text-left hover:bg-primary/10 transition-colors"
      >
        <MessageCircle className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-primary">Live Discussion</span>
          <span className="text-[10px] text-muted-foreground ml-2">
            {comments.length > 0 ? `${comments.length} messages` : "Start the conversation!"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Live Discussion</span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
          <span className="text-[10px] text-muted-foreground">({comments.length})</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Minimize
        </button>
      </div>

      <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No messages yet. Be the first to comment!</p>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const displayName = comment.profiles?.display_name || comment.profiles?.username || "Anonymous";
            return (
              <div key={comment.id} className="flex gap-2">
                <span className={`text-xs font-bold flex-shrink-0 ${getUserColor(displayName)}`}>
                  {displayName}:
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground break-words">{comment.content}</span>
                  <span className="ml-1.5 text-[9px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {user ? (
        <div className="flex items-center gap-2 border-t border-border p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something..."
            maxLength={280}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || addComment.isPending}
            className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="border-t border-border p-3 text-center">
          <Link to="/auth" className="text-xs font-medium text-primary hover:underline">
            Sign in to join the discussion →
          </Link>
        </div>
      )}
    </div>
  );
};

export default LiveDiscussion;
