import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellRing, MessageCircle, Users, Newspaper } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

function notificationIcon(type: string) {
  if (type === "new_message") return <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />;
  if (type === "community_post") return <Users className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />;
  return <Newspaper className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />;
}

function notificationHref(type: string, articleId: string | null) {
  if (type === "new_message") return "/messages";
  if (type === "community_post") return "/communities";
  if (articleId) return `/news/${articleId}`;
  return "/";
}

const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);

  const handleEnablePush = async () => {
    await subscribe();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-sm font-bold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {isSupported && !isSubscribed && permission !== "denied" && (
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={handleEnablePush}>
                <BellRing className="h-3 w-3" /> Enable Push
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={notificationHref(n.type, n.article_id)}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                {notificationIcon(n.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
