import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Categories to rotate through — keeps quizzes diverse
const CATEGORY_POOLS = [
  ["Politics", "Economy", "History", "Culture", "Geography"],
  ["Technology", "Sports", "Entertainment", "Education", "Health"],
  ["Energy", "Security", "Governance", "Environment", "Infrastructure"],
  ["Economy", "History", "Culture", "Sports", "Technology"],
  ["Politics", "Geography", "Entertainment", "Education", "Energy"],
  ["Governance", "Infrastructure", "Health", "Security", "History"],
  ["Culture", "Economy", "Technology", "Politics", "Environment"],
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine target date (today or passed in body)
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || new Date().toISOString().split("T")[0];
    } catch {
      targetDate = new Date().toISOString().split("T")[0];
    }

    // Check if questions already exist for this date
    const { data: existing } = await supabase
      .from("daily_quiz_questions")
      .select("id")
      .eq("quiz_date", targetDate)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Questions already exist for this date", date: targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick category pool based on day of year for variety
    const dayOfYear = Math.floor(
      (new Date(targetDate).getTime() - new Date(targetDate.slice(0, 4) + "-01-01").getTime()) / 86400000
    );
    const categories = CATEGORY_POOLS[dayOfYear % CATEGORY_POOLS.length];

    // Fetch recent questions to avoid repeats
    const { data: recentQuestions } = await supabase
      .from("daily_quiz_questions")
      .select("question")
      .gte("quiz_date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0])
      .order("quiz_date", { ascending: false })
      .limit(70);

    const recentList = recentQuestions?.map((q) => q.question).join("\n- ") || "None";

    const aiPrompt = `Generate exactly 5 NEW and UNIQUE trivia questions about Nigeria for a daily quiz app called "ParrotNG".

DATE: ${targetDate}
CATEGORIES (one question per category, in this order): ${categories.join(", ")}

RULES:
- Questions must be about Nigeria — its people, politics, economy, history, geography, culture, technology, sports, entertainment, education, health, energy, infrastructure, environment, security, or governance.
- Mix difficulty: 2 easy, 2 medium, 1 hard.
- Each question MUST have exactly 4 options.
- Include a short explanation (1-2 sentences) for each correct answer.
- Questions must be FACTUAL and VERIFIABLE.
- DO NOT repeat or closely paraphrase any of these recent questions:
- ${recentList}

Return ONLY a valid JSON array of 5 objects, each with:
- "question": string (the question text)
- "options": string[] (exactly 4 answer options)  
- "correctIndex": number (0-3, index of correct option)
- "category": string (from the assigned categories above)
- "explanation": string (why the correct answer is right)

NO markdown. NO explanation outside the JSON. ONLY the JSON array.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a Nigerian trivia expert. Return only valid JSON arrays. No markdown.",
          },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(questions) || questions.length < 5) {
      throw new Error(`Expected 5 questions, got ${questions?.length || 0}`);
    }

    // Validate and insert
    const rows = questions.slice(0, 5).map((q: any, i: number) => ({
      quiz_date: targetDate,
      question_number: i + 1,
      question: String(q.question),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct_index: Number(q.correctIndex),
      category: String(q.category || categories[i]),
      explanation: String(q.explanation || ""),
    }));

    // Validate each row
    for (const row of rows) {
      if (row.options.length !== 4) throw new Error(`Question "${row.question}" has ${row.options.length} options, expected 4`);
      if (row.correct_index < 0 || row.correct_index > 3) throw new Error(`Invalid correctIndex for "${row.question}"`);
    }

    const { error: insertError } = await supabase.from("daily_quiz_questions").insert(rows);
    if (insertError) throw insertError;

    // Send push notification about new quiz
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "🧠 New Daily Quiz!",
          message: "5 fresh Nigeria trivia questions are waiting. Can you score 100?",
          url: "/quiz",
          tag: "daily-quiz",
          topic: "new_quiz",
        }),
      });
    } catch (pushErr) {
      console.error("Push notification failed (non-blocking):", pushErr);
    }

    return new Response(
      JSON.stringify({ success: true, date: targetDate, questions_created: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-quiz error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
