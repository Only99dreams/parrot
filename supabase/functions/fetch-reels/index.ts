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

// Category-to-topic map — Nigeria-focused queries for relatable content.
const QUERY_MAP: Record<string, string> = {
  "For You": "Nigeria trending videos 2025",
  Politics: "Nigeria politics news 2025",
  Entertainment: "Afrobeats Nollywood Nigerian entertainment",
  Sports: "Nigeria football AFCON Super Eagles highlights",
  Tech: "Nigerian tech startups Africa innovation",
  Business: "Nigeria business economy entrepreneurship",
  Comedy: "Nigerian comedy skits funny naija",
  Lifestyle: "Nigeria lifestyle food culture Naija",
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
    return `Nigeria ${interests.slice(0, 2).join(" ")} short videos`;
  }
  return QUERY_MAP[category] ?? `Nigeria ${category} short videos`;
}

function mapInterestTags(category: string, interests: string[]) {
  const base = category === "For You" ? interests : [category, ...interests.slice(0, 2)];
  return ["Nigeria", "Naija", ...base].filter(Boolean).slice(0, 6);
}

function buildSearchQueries(category: string, interests: string[]) {
  const base = pickSearchQuery(category, interests);
  const fallbackByCategory: Record<string, string[][]> = {
    "For You": [
      ["Naija viral videos 2025", "Nigeria trending reels", "Nigeria funny moments"],
      ["Nigeria top videos 2025", "Naija short clips", "Nigeria social media viral"],
    ],
    Politics: [
      ["Nigeria government news 2025", "Tinubu Nigeria politics clips"],
      ["Nigeria National Assembly politics", "Nigeria state government news"],
    ],
    Entertainment: [
      ["Afrobeats music video 2025", "Nollywood movie clips Nigerian"],
      ["Burna Boy Wizkid Davido 2025", "Nigerian music new release"],
    ],
    Sports: [
      ["Super Eagles Nigeria football 2025", "AFCON Nigeria highlights"],
      ["Nigerian Premier League goals", "Nigeria sports highlights 2025"],
    ],
    Tech: [
      ["Nigerian tech startup 2025", "Africa fintech innovation Nigeria"],
      ["Nigeria Silicon Lagoon startup", "Paystack Flutterwave Africa tech"],
    ],
    Business: [
      ["Nigeria economy business 2025", "Naija entrepreneur hustle"],
      ["Lagos business market Nigeria", "Nigeria investment opportunities"],
    ],
    Comedy: [
      ["Nigerian comedy skits 2025", "Naija funny skits Mr Macaroni"],
      ["Nigeria comedian skit makers", "Naija funny video clips"],
    ],
    Lifestyle: [
      ["Nigeria food culture lifestyle", "Lagos life vlog Nigeria"],
      ["Nigerian wedding fashion 2025", "Naija street food culture"],
    ],
  };

  // Pick a random fallback variant so each fetch returns different queries
  const variants = fallbackByCategory[category] ?? [[]];
  const chosenVariant = variants[Math.floor(Math.random() * variants.length)];
  const queries = [base, ...chosenVariant, `Nigeria ${category} short videos`];
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

    // Always purge all reels for this category before inserting fresh ones.
    // This guarantees every fetch call delivers new/different videos.
    await supabase
      .from("ai_reels")
      .delete()
      .eq("category", category);

    let pexelsInserted = 0;
    let youtubeInserted = 0;
    const sourceErrors: string[] = [];

    // Source 1: Pexels direct video files (playable + downloadable in-app)
    if (PEXELS_API_KEY) {
      try {
        const byVideoUrl = new Map<string, Record<string, unknown>>();

        for (const q of queries) {
          if (byVideoUrl.size >= limit) break;

          // Random page (1–5) so repeated fetches return different videos
          const randomPage = Math.floor(Math.random() * 5) + 1;

          const pexelsUrl = new URL("https://api.pexels.com/videos/search");
          pexelsUrl.searchParams.set("query", q);
          pexelsUrl.searchParams.set("per_page", String(Math.min(limit, 20)));
          pexelsUrl.searchParams.set("page", String(randomPage));
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
              description: `Nigerian ${category.toLowerCase()} content — discover the best of Naija.`,
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
            .upsert(reels, { onConflict: "video_url" });

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

        // publishedAfter = 30 days ago — ensures truly recent content
        const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        for (const q of queries) {
          if (byVideoUrl.size >= limit) break;

          const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
          ytUrl.searchParams.set("part", "snippet");
          ytUrl.searchParams.set("q", q);
          ytUrl.searchParams.set("type", "video");
          ytUrl.searchParams.set("maxResults", String(Math.min(limit, 20)));
          ytUrl.searchParams.set("order", "date");
          ytUrl.searchParams.set("videoDuration", "short");
          ytUrl.searchParams.set("relevanceLanguage", "en");
          ytUrl.searchParams.set("regionCode", "NG");
          ytUrl.searchParams.set("publishedAfter", publishedAfter);
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
            .upsert(reels, { onConflict: "video_url" });

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
