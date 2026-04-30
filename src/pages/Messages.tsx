import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useStartDM,
  useCreateGroupChat,
  type Conversation,
} from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Search,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

function getConvDisplayName(conv: Conversation, myUserId: string): string {
  if (conv.type === "group") return conv.name || "Group Chat";
  const other = conv.members.find((m) => m.user_id !== myUserId);
  return other?.display_name || other?.username || "Unknown User";
}

function getConvAvatar(conv: Conversation, myUserId: string): string {
  if (conv.type === "group") return conv.avatar_url || "";
  const other = conv.members.find((m) => m.user_id !== myUserId);
  return other?.avatar_url || "";
}

// ── Conversation list item ────────────────────────────────────────────────────
function ConvItem({
  conv,
  myUserId,
  active,
  onClick,
}: {
  conv: Conversation;
  myUserId: string;
  active: boolean;
  onClick: () => void;
}) {
  const name = getConvDisplayName(conv, myUserId);
  const letter = name[0]?.toUpperCase() || "?";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60 ${
        active ? "bg-primary/10" : ""
      }`}
    >
      <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full gradient-naija text-sm font-bold text-primary-foreground">
        {letter}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {conv.last_message && (
          <p className="truncate text-xs text-muted-foreground">{conv.last_message}</p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
      </p>
    </button>
  );
}

// ── New DM / Group Chat modal ─────────────────────────────────────────────────
function NewChatModal({
  onClose,
  onDMCreated,
  onGroupCreated,
}: {
  onClose: () => void;
  onDMCreated: (id: string) => void;
  onGroupCreated: (id: string) => void;
}) {
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searching, setSearching] = useState(false);
  const startDM = useStartDM();
  const createGroup = useCreateGroupChat();
  const { toast } = useToast();

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(10);
      setResults((data || []) as UserResult[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDM = async (u: UserResult) => {
    try {
      const id = await startDM.mutateAsync(u.user_id);
      onDMCreated(id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast({ title: "Add a group name and at least one member", variant: "destructive" });
      return;
    }
    try {
      const id = await createGroup.mutateAsync({
        name: groupName,
        memberIds: selectedUsers.map((u) => u.user_id),
      });
      onGroupCreated(id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleUser = (u: UserResult) => {
    setSelectedUsers((prev) =>
      prev.find((x) => x.user_id === u.user_id)
        ? prev.filter((x) => x.user_id !== u.user_id)
        : [...prev, u]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm mx-3 rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">New Message</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tab */}
        <div className="flex rounded-lg overflow-hidden border border-border mb-4">
          <button
            onClick={() => setTab("dm")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "dm" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setTab("group")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "group" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Group Chat
          </button>
        </div>

        {tab === "group" && (
          <div className="mb-3">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <span key={u.user_id} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {u.display_name || u.username}
                    <button onClick={() => toggleUser(u)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="max-h-52 overflow-y-auto space-y-1">
          {searching && <p className="text-center text-sm text-muted-foreground py-4">Searching…</p>}
          {!searching && results.length === 0 && search.trim() && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}
          {results.map((u) => {
            const isSelected = !!selectedUsers.find((x) => x.user_id === u.user_id);
            return (
              <button
                key={u.user_id}
                onClick={() => (tab === "dm" ? handleDM(u) : toggleUser(u))}
                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 text-left"
              >
                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(u.display_name || u.username || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
                  {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                </div>
                {tab === "group" && isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {tab === "group" && (
          <button
            onClick={handleCreateGroup}
            disabled={createGroup.isPending}
            className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createGroup.isPending ? "Creating…" : "Create Group"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Chat window ───────────────────────────────────────────────────────────────
function ChatWindow({ convId, myUserId }: { convId: string; myUserId: string }) {
  const { data: messages = [], isLoading } = useMessages(convId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setText("");
    await sendMessage.mutateAsync({ conversationId: convId, content: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello 👋</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === myUserId;
          const senderName = msg.sender?.display_name || msg.sender?.username || "User";
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                {!isMine && (
                  <p className="mb-0.5 text-[10px] font-medium text-muted-foreground pl-1">{senderName}</p>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground px-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none max-h-28"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConvId, setActiveConvId] = useState<string | null>(
    searchParams.get("conv") ?? null
  );
  const [showNew, setShowNew] = useState(false);
  const { data: conversations = [], isLoading } = useConversations();

  useEffect(() => {
    if (activeConvId) setSearchParams({ conv: activeConvId }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [activeConvId]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;
  const convName = activeConv ? getConvDisplayName(activeConv, user.id) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col mx-auto w-full max-w-5xl px-0 sm:px-4 py-0 sm:py-6">
        <div className="flex flex-1 h-[calc(100vh-9rem)] sm:h-[calc(100vh-12rem)] rounded-none sm:rounded-xl border-0 sm:border border-border overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`${
              activeConvId ? "hidden sm:flex" : "flex"
            } w-full sm:w-72 flex-col border-r border-border bg-card`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Messages
              </h2>
              <button
                onClick={() => setShowNew(true)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                title="New message"
              >
                <Plus className="h-4 w-4 text-primary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {isLoading && (
                <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
              )}
              {!isLoading && conversations.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <button
                    onClick={() => setShowNew(true)}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Start a chat
                  </button>
                </div>
              )}
              {conversations.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  myUserId={user.id}
                  active={activeConvId === conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                />
              ))}
            </div>
          </aside>

          {/* Chat area */}
          <div
            className={`${
              activeConvId ? "flex" : "hidden sm:flex"
            } flex-col flex-1 bg-background`}
          >
            {activeConvId && activeConv ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="sm:hidden rounded-lg p-1 hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full gradient-naija text-xs font-bold text-primary-foreground">
                    {activeConv.type === "group" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      convName[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{convName}</p>
                    {activeConv.type === "group" && (
                      <p className="text-[10px] text-muted-foreground">
                        {activeConv.members.length} members
                      </p>
                    )}
                  </div>
                </div>
                <ChatWindow convId={activeConvId} myUserId={user.id} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
                <button
                  onClick={() => setShowNew(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  New Message
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showNew && (
        <NewChatModal
          onClose={() => setShowNew(false)}
          onDMCreated={(id) => { setActiveConvId(id); setShowNew(false); }}
          onGroupCreated={(id) => { setActiveConvId(id); setShowNew(false); }}
        />
      )}

      <Footer />
    </div>
  );
}
