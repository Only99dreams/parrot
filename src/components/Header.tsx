import { Link, useLocation } from "react-router-dom";
import { TrendingUp, MessageSquare, BarChart3, Menu, X, LogIn, LogOut, User, Flame, Sun, Moon, Brain, Clapperboard, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import NotificationBell from "./NotificationBell";
import CreatePost from "./CreatePost";

const navItems = [
  { to: "/", label: "Feed", icon: TrendingUp },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/nigeria-thinks", label: "Nigeria Thinks", icon: BarChart3 },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/reels", label: "Reels", icon: Clapperboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: MessageSquare },
];

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out 👋" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/newlogo.png" alt="ParrotNG" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-display text-base sm:text-lg font-bold leading-tight text-foreground">ParrotNG</h1>
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-muted-foreground">What Nigerians Really Think</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors" title="Toggle theme">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && <NotificationBell />}
          {user ? (
            <div className="flex items-center gap-1">
              <CreatePost />
              <Link
                to="/profile"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === "/profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" /> Profile
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          ) : (
            <Link to="/auth" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && <NotificationBell />}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border px-4 py-2 md:hidden">
          {user && (
            <div className="px-3 py-2">
              <CreatePost />
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}>
                <Icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                <User className="h-4 w-4" /> Profile
              </Link>
              <button onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary">
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
