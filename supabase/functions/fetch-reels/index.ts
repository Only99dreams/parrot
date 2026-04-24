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

function buildSearchQueries(category: string, interests: string[]) {
  const base = pickSearchQuery(category, interests);
  const fallbackByCategory: Record<string, string[]> = {
    "For You": ["viral short videos", "trending short clips"],
    Politics: ["political debate clips", "policy explainer short videos"],
    Entertainment: ["music performance short videos", "celebrity entertainment clips"],
    Sports: ["sports highlights short videos", "football basketball highlights reels"],
    Tech: ["technology gadget short videos", "ai innovation clips"],
    Business: ["business finance short videos", "startup entrepreneurship clips"],
    Comedy: ["funny skits short videos", "standup comedy clips"],
    Lifestyle: ["travel food lifestyle short videos", "wellness lifestyle reels"],
  };

  const queries = [base, ...(fallbackByCategory[category] ?? []), `${category} short videos`];
  return [...new Set(queries.filter(Boolean))].slice(0, 4);
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
    const parsedLimit = Number(body.limit);
    const limit: number = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;
    const query = pickSearchQuery(category, interests);
    const queries = buildSearchQueries(category, interests);
    const tags = mapInterestTags(category, interests);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!PEXELS_API_KEY && !YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "No reel provider key found. Configure PEXELS_API_KEY and/or YOUTUBE_API_KEY.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pexelsInserted = 0;
    let youtubeInserted = 0;
    const sourceErrors: string[] = [];

    // Source 1: Pexels direct video files (playable + downloadable in-app)
    if (PEXELS_API_KEY) {
      try {
        const byVideoUrl = new Map<string, Record<string, unknown>>();

        for (const q of queries) {
          if (byVideoUrl.size >= limit) break;

          const pexelsUrl = new URL("https://api.pexels.com/videos/search");
          pexelsUrl.searchParams.set("query", q);
          pexelsUrl.searchParams.set("per_page", String(Math.min(limit, 20)));
          pexelsUrl.searchParams.set("orientation", "portrait");

          const pexelsRes = await fetch(pexelsUrl.toString(), {
            headers: { Authorization: PEXELS_API_KEY },
          });
          const pexelsData = await pexelsRes.json().catch(() => ({}));

          if (!pexelsRes.ok || !Array.isArray(pexelsData.videos)) continue;

          for (const video of pexelsData.videos as PexelsVideo[]) {
            const file = (video.video_files || [])
              .filter((f) => f.file_type === "video/mp4")
              .sort((a, b) => (b.height * b.width) - (a.height * a.width))[0];

            if (!file?.link) continue;

            byVideoUrl.set(file.link, {
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
            });
          }
        }

        const reels = [...byVideoUrl.values()].slice(0, limit);
        if (reels.length > 0) {
          const { error: upsertError } = await supabase
            .from("ai_reels")
            .upsert(reels, { onConflict: "video_url", ignoreDuplicates: true });

          if (upsertError) {
            sourceErrors.push(`pexels_upsert: ${upsertError.message}`);
          } else {
            pexelsInserted = reels.length;
          }
        }
      } catch (pexelsErr) {
        sourceErrors.push(`pexels_fetch: ${String(pexelsErr)}`);
      }
    }

    // Source 2: YouTube (embeddable source to complement direct-file providers)
    if (YOUTUBE_API_KEY) {
      try {
        const byVideoUrl = new Map<string, Record<string, unknown>>();

        for (const q of queries) {
          if (byVideoUrl.size >= limit) break;

          const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
          ytUrl.searchParams.set("part", "snippet");
          ytUrl.searchParams.set("q", q);
          ytUrl.searchParams.set("type", "video");
          ytUrl.searchParams.set("maxResults", String(Math.min(limit, 20)));
          ytUrl.searchParams.set("order", "relevance");
          ytUrl.searchParams.set("videoDuration", "short");
          ytUrl.searchParams.set("relevanceLanguage", "en");
          ytUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const ytRes = await fetch(ytUrl.toString());
          const ytData = await ytRes.json().catch(() => ({}));

          if (!ytRes.ok || !Array.isArray(ytData.items)) continue;

          for (const item of ytData.items as YouTubeItem[]) {
            const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
            byVideoUrl.set(videoUrl, {
              title: item.snippet.title,
              video_url: videoUrl,
              downloadable_url: null,
              thumbnail_url:
                item.snippet.thumbnails?.high?.url ??
                item.snippet.thumbnails?.medium?.url ??
                item.snippet.thumbnails?.default?.url ??
                null,
              description: item.snippet.description?.slice(0, 500) ?? null,
              source: "YouTube",
              source_url: videoUrl,
              channel_name: item.snippet.channelTitle ?? null,
              category,
              tags,
              fetched_at: new Date().toISOString(),
            });
          }
        }

        const reels = [...byVideoUrl.values()].slice(0, limit);
        if (reels.length > 0) {
          const { error: upsertError } = await supabase
            .from("ai_reels")
            .upsert(reels, { onConflict: "video_url", ignoreDuplicates: true });

          if (upsertError) {
            sourceErrors.push(`youtube_upsert: ${upsertError.message}`);
          } else {
            youtubeInserted = reels.length;
          }
        }
      } catch (youtubeErr) {
        sourceErrors.push(`youtube_fetch: ${String(youtubeErr)}`);
      }
    }

    if (pexelsInserted === 0 && youtubeInserted === 0) {
      return new Response(
        JSON.stringify({
          error: "No reels fetched from configured providers",
          category,
          query,
          queries,
          details: sourceErrors,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        category,
        query,
        queries,
        inserted_total: pexelsInserted + youtubeInserted,
        inserted_by_source: {
          pexels: pexelsInserted,
          youtube: youtubeInserted,
        },
        warnings: sourceErrors,
      }),
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
