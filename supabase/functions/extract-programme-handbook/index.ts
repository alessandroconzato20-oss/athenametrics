import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, requireUser } from "../_shared/cors.ts";

/**
 * Extracts a structured programme overview (courses, blocking exams, exam
 * periods) from the raw text of a university programme handbook PDF.
 *
 * Client extracts text via pdfjs-dist and POSTs it here so we can run a
 * tool-call against the Lovable AI Gateway and return clean JSON.
 */
serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const { pdfText, universityName } = await req.json();
    if (!pdfText || typeof pdfText !== "string") {
      return new Response(JSON.stringify({ error: "pdfText is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert academic catalogue parser. Extract programme structure from a university handbook. Return JSON only via the provided tool call. Use null for any value you cannot determine with confidence — never guess. Course names and topics should preserve the original language of the document.`;

    const userPrompt = `University: ${universityName || "(unknown)"}\n\nHandbook text (truncated to first 60k chars):\n${pdfText.slice(0, 60000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_programme",
            description: "Extract programme structure from a university handbook.",
            parameters: {
              type: "object",
              properties: {
                programme_name: { type: ["string", "null"] },
                programme_length_years: { type: ["integer", "null"] },
                academic_year_structure: { type: ["string", "null"], enum: ["semester", "trimester", "annual", null] },
                country: { type: ["string", "null"] },
                courses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      course_name: { type: "string" },
                      year: { type: ["integer", "null"] },
                      semester: { type: ["integer", "null"] },
                      credits: { type: ["number", "null"] },
                      topics: { type: "array", items: { type: "string" } },
                    },
                    required: ["course_name", "topics"],
                    additionalProperties: false,
                  },
                },
                blocking_exams: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      exam_name: { type: "string" },
                      blocks_progression_to_year: { type: ["integer", "null"] },
                    },
                    required: ["exam_name"],
                    additionalProperties: false,
                  },
                },
                exam_periods: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      approximate_month: { type: ["integer", "null"] },
                      duration_weeks: { type: ["integer", "null"] },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["courses", "blocking_exams", "exam_periods"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_programme" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract-programme-handbook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
