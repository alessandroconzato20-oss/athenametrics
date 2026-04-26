import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, requireUser } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const { logs } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!logs || !Array.isArray(logs) || logs.length < 3) {
      return new Response(JSON.stringify({ error: "Need at least 3 study logs for analysis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap logs to prevent abuse
    const trimmed = logs.slice(0, 100);
    const logsForContext = trimmed.map((l: any) => ({
      subject: l.subject,
      topic: l.topic,
      duration_minutes: l.duration_minutes,
      difficulty: l.difficulty,
      stress: l.stress_level,
      distraction: l.distraction_level,
      energy: l.energy_level,
      date: l.studied_at,
      notes: typeof l.notes === "string" ? l.notes.slice(0, 500) : null,
    }));

    const systemPrompt = `You are an AI study coach for a university student using "Athena Metrics" app. Analyze their study session logs and provide personalized insights.

Your analysis should cover:
1. **Pattern Recognition**: Identify when they study best (time of day, energy levels, etc.)
2. **Difficulty Patterns**: Note which subjects/topics they find hard vs easy, and how this correlates with stress, energy, and distraction.
3. **Optimal Conditions**: Based on their data, what conditions lead to their best study sessions.
4. **Risk Factors**: Warn about burnout patterns — high stress + high difficulty + low energy combos.
5. **Actionable Recommendations**: 2-3 specific, personalized tips based on their actual data.

Be concise, warm, and encouraging. Use specific data points from their logs. Keep the response under 250 words. This is research-grade guidance, not medical advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are my recent study session logs:\n\n${JSON.stringify(logsForContext, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Unable to generate insights.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-habits error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
