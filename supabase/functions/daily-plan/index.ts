import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cognitiveReadiness, burnoutRisk, peakWindow, studyCapacity, studyBlock, pastFeedback } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const feedbackContext = pastFeedback && pastFeedback.length > 0
      ? `\n\nIMPORTANT - The student has previously disagreed with recommendations. Adapt the plan based on their feedback:\n${pastFeedback.map((f: any) => `- Disagreed with "${f.feedback_type}": "${f.reason}"`).join("\n")}`
      : "";

    const blockContext = studyBlock
      ? `\n\nSTUDY BLOCK STRUCTURE (MUST follow): Each study session must be exactly ${studyBlock.blockMinutes} minutes long${studyBlock.breakMinutes > 0 ? `, followed by a ${studyBlock.breakMinutes}-minute break` : " (no break needed between sessions)"}. The student's readiness tier is "${studyBlock.tier}". Structure ALL tasks to fit this block pattern.`
      : "";

    const systemPrompt = `You are a medical student study coach. Based on the student's daily health metrics, create a personalized daily study plan.

Return a JSON array of 3-5 plan items. Each item must have:
- "time": time label (e.g. "9:00 AM", "Morning", "After lunch")
- "task": concise task description including duration matching the block structure (max 15 words)
- "reason": why this is recommended (max 12 words)

Consider: high burnout = fewer/lighter sessions; high cognitive readiness = harder material first; peak window = schedule hardest work there. IMPORTANT: All study sessions MUST follow the prescribed block/break structure.${blockContext}${feedbackContext}`;

    const userPrompt = `Metrics:
- Cognitive Readiness: ${cognitiveReadiness}/100
- Burnout Risk: ${burnoutRisk}/100  
- Peak Study Window: ${peakWindow}
- Study Capacity: ${studyCapacity}
- Study Block: ${studyBlock ? `${studyBlock.blockMinutes}min sessions${studyBlock.breakMinutes > 0 ? ` with ${studyBlock.breakMinutes}min breaks` : ", no breaks needed"}` : "flexible"}
- Current time: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}

Generate my personalized study plan for today following the block structure.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_study_plan",
              description: "Create a daily study plan",
              parameters: {
                type: "object",
                properties: {
                  plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string" },
                        task: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["time", "task", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["plan"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_study_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No plan generated");
  } catch (e) {
    console.error("daily-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
