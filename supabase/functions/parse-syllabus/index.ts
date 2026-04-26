import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, requireUser } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const { pdfText, courseName, universityName } = await req.json();

    if (!pdfText || !courseName) {
      return new Response(JSON.stringify({ error: "pdfText and courseName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert academic syllabus parser. Your job is to extract individual topics/lessons from a university course syllabus PDF text. Return a structured list of topics that students will study in this course.

Rules:
- Extract each distinct topic, lecture, or unit from the syllabus
- Keep topic names concise but descriptive (max 80 chars)
- Group related sub-topics under main topic headings when appropriate
- If the text is in a non-English language, keep the original language for topic names
- Remove administrative info (exam dates, office hours, etc.)
- Focus on actual course content/learning material`;

    const userPrompt = `Parse the following syllabus for the course "${courseName}" at "${universityName || 'unknown university'}". Extract all topics/lessons as a structured list.

Syllabus text:
${pdfText.slice(0, 15000)}`;

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
        tools: [{
          type: "function",
          function: {
            name: "extract_syllabus_topics",
            description: "Extract structured topics from a course syllabus",
            parameters: {
              type: "object",
              properties: {
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Topic/lesson name" },
                      section: { type: "string", description: "Optional section/module header" },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["topics"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_syllabus_topics" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-syllabus error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
