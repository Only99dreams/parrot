import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NIGERIAN_SOURCES = [
  { url: "https://punchng.com", name: "Punch News" },
  { url: "https://www.vanguardngr.com", name: "Vanguard" },
  { url: "https://guardian.ng", name: "The Guardian" },
  { url: "https://www.premiumtimesng.com", name: "Premium Times" },
  { url: "https://www.thecable.ng", name: "The Cable" },
  { url: "https://www.channelstv.com", name: "Channels TV" },
  { url: "https://dailypost.ng", name: "Daily Post" },
  { url: "https://saharareporters.com", name: "Sahara Reporters" },
  { url: "https://www.thisdaylive.com", name: "ThisDay" },
  { url: "https://businessday.ng", name: "BusinessDay" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Scrape Nigerian news sources
    const source = NIGERIAN_SOURCES[Math.floor(Math.random() * NIGERIAN_SOURCES.length)];
    console.log(`Scraping: ${source.url}`);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: source.url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errText = await scrapeResponse.text();
      console.error("Firecrawl error:", scrapeResponse.status, errText);
      throw new Error(`Firecrawl error: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    const rawContent = scrapeData.data?.markdown || scrapeData.markdown || "";

    if (!rawContent || rawContent.length < 100) {
      return new Response(JSON.stringify({ success: false, error: "No content scraped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Use AI to transform news content
    const aiPrompt = `You are a Nigerian news analyst for "ParrotNG". From this raw news content, extract the TOP 3 most important and SERIOUS stories and transform each into our format.

PRIORITY: Focus on stories that directly affect everyday Nigerians — politics, economy, security, governance, corruption, infrastructure, health, education, energy/fuel, cost of living, and national debates. These are the issues Nigerians care about most.

AVOID: Do NOT pick sports, celebrity gossip, entertainment, or trivial stories unless there is absolutely nothing else. Nigerian users come here for SERIOUS trending issues.

RAW CONTENT:
${rawContent.substring(0, 4000)}

For EACH story, return a JSON array with objects containing:
- headline: Catchy headline mixing English and light Pidgin (max 80 chars)
- summary: 2-3 sentence summary in conversational Nigerian English/Pidgin tone
- why_it_matters: One paragraph explaining real impact on Nigerians
- poll_question: Engaging yes/no/maybe style question in Pidgin
- poll_options: Array of 3 options with emoji (e.g. ["Yes! Na good start! 💪", "No, e no reach 😤", "Make dem try harder 🤔"])
- debate_hook: A provocative question to spark debate
- perspectives: Array of 3 objects with "label" and "text" showing different viewpoints
- category: One of Politics, Economy, Security, Education, Energy, Infrastructure, Health, Technology, Governance, Environment (use Sports or Entertainment ONLY if the story has real national significance)

CRITICAL: Return ONLY valid JSON array. No markdown. No explanation. Just the JSON array.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a Nigerian news analyst. Return only valid JSON. No markdown formatting." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean up potential markdown wrapping
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let stories;
    try {
      stories = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(stories) || stories.length === 0) {
      throw new Error("AI returned no stories");
    }

    // Step 3: Insert stories into database
    const insertedArticles = [];
    for (const story of stories) {
      const { data: article, error: articleError } = await supabase
        .from("news_articles")
        .insert({
          headline: story.headline,
          summary: story.summary,
          why_it_matters: story.why_it_matters,
          poll_question: story.poll_question,
          debate_hook: story.debate_hook,
          perspectives: story.perspectives || [],
          category: story.category || "General",
          source: source.name,
          source_url: source.url,
          ai_generated: true,
          is_trending: Math.random() > 0.6,
        })
        .select()
        .single();

      if (articleError) {
        console.error("Insert article error:", articleError);
        continue;
      }

      // Insert poll options
      if (story.poll_options && Array.isArray(story.poll_options)) {
        const pollInserts = story.poll_options.map((text: string) => ({
          article_id: article.id,
          option_text: text,
        }));
        const { error: pollError } = await supabase.from("poll_options").insert(pollInserts);
        if (pollError) console.error("Insert poll error:", pollError);
      }

      insertedArticles.push(article);
    }

    // Send push notification for new trending articles
    if (insertedArticles.length > 0) {
      const trending = insertedArticles.find((a) => a.is_trending) || insertedArticles[0];
      try {
        const pushUrl = `${supabaseUrl}/functions/v1/send-push`;
        await fetch(pushUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `🔥 ${trending.category}: Trending Now`,
            message: trending.headline,
            url: `/news/${trending.id}`,
            tag: "trending-news",
            topic: "trending_news",
          }),
        });
      } catch (pushErr) {
        console.error("Push notification failed (non-blocking):", pushErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        articles_created: insertedArticles.length,
        source: source.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-news error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
