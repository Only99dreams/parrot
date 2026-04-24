import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Category-to-topic map for broad, non-country-locked reel discovery.
const QUERY_MAP: Record<string, string> = {
  "For You": "trending reels",
  Politics: "world politics analysis",
  Entertainment: "music dance entertainment",
  Sports: "sports highlights",
  Tech: "technology innovation",
  Business: "business finance entrepreneurship",
  Comedy: "funny comedy skits",
  Lifestyle: "lifestyle travel food",
};

interface YouTubeItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface PexelsVideo {
  id: number;
  duration: number;
  user?: { name?: string };
  image?: string;
  url?: string;
  video_files?: Array<{
    id: number;
    quality: string;
    width: number;
    height: number;
    link: string;
    file_type: string;
  }>;
}

function pickSearchQuery(category: string, interests: string[]) {
  if (category === "For You" && interests.length > 0) {
    return `${interests.slice(0, 3).join(" ")} reels short videos`;
  }
  return QUERY_MAP[category] ?? `${category} reels short videos`;
}

function mapInterestTags(category: string, interests: string[]) {
  const base = category === "For You" ? interests : [category, ...interests.slice(0, 2)];
  return base.filter(Boolean).slice(0, 5);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const category: string = body.category ?? "For You";
    const interests: string[] = Array.isArray(body.interests)
      ? body.interests.map((x: unknown) => String(x)).filter(Boolean)
      : [];
    const limit: number = Math.min(Number(body.limit) ?? 20, 50);
    const query = pickSearchQuery(category, interests);
    const tags = mapInterestTags(category, interests);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Primary source: Pexels direct video files (playable + downloadable in-app)
    if (PEXELS_API_KEY) {
      const pexelsUrl = new URL("https://api.pexels.com/videos/search");
      pexelsUrl.searchParams.set("query", query);
      pexelsUrl.searchParams.set("per_page", String(limit));
      pexelsUrl.searchParams.set("orientation", "portrait");

      const pexelsRes = await fetch(pexelsUrl.toString(), {
        headers: { Authorization: PEXELS_API_KEY },
      });

      const pexelsData = await pexelsRes.json();

      if (pexelsRes.ok && Array.isArray(pexelsData.videos)) {
        const reels = (pexelsData.videos as PexelsVideo[])
          .map((video) => {
            const file = (video.video_files || [])
              .filter((f) => f.file_type === "video/mp4")
              .sort((a, b) => (b.height * b.width) - (a.height * a.width))[0];

            if (!file?.link) return null;

            return {
              title: `Reel #${video.id}`,
              video_url: file.link,
              downloadable_url: file.link,
              thumbnail_url: video.image ?? null,
              description: `Discover ${category.toLowerCase()} clips selected for you.`,
              source: "Pexels",
              source_url: video.url ?? null,
              channel_name: video.user?.name ?? "Pexels Creator",
              category,
              duration: video.duration ? `${video.duration}s` : null,
              tags,
              fetched_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (reels.length > 0) {
          const { error: upsertError } = await supabase
            .from("ai_reels")
            .upsert(reels, { onConflict: "video_url", ignoreDuplicates: true });

          if (upsertError) {
            console.error("Supabase upsert error (pexels):", upsertError);
            return new Response(
              JSON.stringify({ error: upsertError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ inserted: reels.length, category, source: "pexels" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fallback source: YouTube (embeddable but not always directly downloadable)
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "No reel provider key found. Configure PEXELS_API_KEY and/or YOUTUBE_API_KEY.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    ytUrl.searchParams.set("part", "snippet");
    ytUrl.searchParams.set("q", query);
    ytUrl.searchParams.set("type", "video");
    ytUrl.searchParams.set("maxResults", String(limit));
    ytUrl.searchParams.set("order", "relevance");
    ytUrl.searchParams.set("videoDuration", "short"); // short = under 4 min, good for reels
    ytUrl.searchParams.set("relevanceLanguage", "en");
    ytUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const ytRes = await fetch(ytUrl.toString());
    const ytData = await ytRes.json();

    if (!ytRes.ok || !ytData.items) {
      console.error("YouTube API error:", ytData);
      return new Response(
        JSON.stringify({ error: ytData.error?.message ?? "YouTube API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reels = (ytData.items as YouTubeItem[]).map((item) => ({
      title: item.snippet.title,
      video_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      downloadable_url: null,
      thumbnail_url:
        item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
      description: item.snippet.description?.slice(0, 500) ?? null,
      source: "YouTube",
      source_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channel_name: item.snippet.channelTitle ?? null,
      category,
      tags,
      fetched_at: new Date().toISOString(),
    }));

    // Upsert – skip duplicates by video_url unique constraint
    const { error: upsertError } = await supabase
      .from("ai_reels")
      .upsert(reels, { onConflict: "video_url", ignoreDuplicates: true })
      .select("id", { head: true });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ inserted: reels.length, category, source: "youtube" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-reels unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
