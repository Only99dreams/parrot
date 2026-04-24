import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CreatePost from "@/components/CreatePost";
import PostCard, { UserPost } from "@/components/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users } from "lucide-react";

export default function CommunityFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_posts")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((post) => post.user_id))];
    let profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      (profiles || []).forEach((profile) => {
        profileMap[profile.user_id] = {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        };
      });
    }

    const hydrated = data.map((post) => ({
      ...(post as unknown as UserPost),
      profiles: profileMap[post.user_id] || {
        username: null,
        display_name: null,
        avatar_url: null,
      },
    }));

    setPosts(hydrated);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-6 sm:px-4">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Community</h1>
          </div>
          {user && <CreatePost onPostCreated={loadPosts} />}
        </div>

        {!user && (
          <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            <a href="/auth" className="text-primary hover:underline font-medium">
              Sign in
            </a>{" "}
            to share posts, images, and videos with the community.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No posts yet</p>
            {user ? (
              <p className="text-sm mt-1">
                Be the first to share something with the community!
              </p>
            ) : (
              <p className="text-sm mt-1">
                <a href="/auth" className="text-primary hover:underline">
                  Sign in
                </a>{" "}
                to create the first post!
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
