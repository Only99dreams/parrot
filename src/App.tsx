import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import NewsDetail from "./pages/NewsDetail.tsx";
import NigeriaThinks from "./pages/NigeriaThinks.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import Trending from "./pages/Trending.tsx";
import DailyQuiz from "./pages/DailyQuiz.tsx";
import Reels from "./pages/Reels.tsx";
import CommunityFeed from "./pages/CommunityFeed.tsx";
import CreatorStudio from "./pages/CreatorStudio.tsx";
import InstallAppPrompt from "@/components/InstallAppPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InstallAppPrompt />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/nigeria-thinks" element={<NigeriaThinks />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/quiz" element={<DailyQuiz />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/community" element={<CommunityFeed />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/creator-studio" element={<CreatorStudio />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
