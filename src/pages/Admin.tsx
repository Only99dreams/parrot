import { useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import {
  useIsAdmin,
  useAdminArticles,
  useAdminComments,
  useToggleSponsored,
  useToggleTrending,
  useDeleteArticle,
  useDeleteComment,
  useFetchNews,
} from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, RefreshCw, Newspaper, MessageSquare, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: articles = [], isLoading: articlesLoading } = useAdminArticles();
  const { data: comments = [], isLoading: commentsLoading } = useAdminComments();
  const toggleSponsored = useToggleSponsored();
  const toggleTrending = useToggleTrending();
  const deleteArticle = useDeleteArticle();
  const deleteComment = useDeleteComment();
  const fetchNews = useFetchNews();
  const { toast } = useToast();

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleFetchNews = () => {
    fetchNews.mutate(undefined, {
      onSuccess: (data) => {
        toast({ title: "News fetched! 🎉", description: `${data?.articles_created || 0} articles created from ${data?.source || "source"}` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <Button onClick={handleFetchNews} disabled={fetchNews.isPending} className="gradient-naija w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${fetchNews.isPending ? "animate-spin" : ""}`} />
            {fetchNews.isPending ? "Fetching..." : "Fetch News Now"}
          </Button>
        </div>

        <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground"><Newspaper className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xs sm:text-sm">Articles</span></div>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-foreground">{articles.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xs sm:text-sm">Comments</span></div>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-foreground">{comments.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground"><Megaphone className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xs sm:text-sm">Sponsored</span></div>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-foreground">{articles.filter((a) => a.is_sponsored).length}</p>
          </div>
        </div>

        <Tabs defaultValue="articles">
          <TabsList className="mb-4">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            {articlesLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Headline</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Trending</TableHead>
                      <TableHead>Sponsored</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-xs truncate font-medium">{a.headline}</TableCell>
                        <TableCell><Badge variant="secondary">{a.category}</Badge></TableCell>
                        <TableCell>{a.total_votes}</TableCell>
                        <TableCell>
                          <Switch
                            checked={a.is_trending}
                            onCheckedChange={(checked) => toggleTrending.mutate({ id: a.id, is_trending: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={a.is_sponsored}
                            onCheckedChange={(checked) => toggleSponsored.mutate({ id: a.id, is_sponsored: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this article?")) deleteArticle.mutate(a.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments">
            {commentsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.profiles?.display_name || c.profiles?.username || "Anon"}</TableCell>
                        <TableCell className="max-w-md truncate">{c.content}</TableCell>
                        <TableCell>{c.likes}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this comment?")) deleteComment.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
