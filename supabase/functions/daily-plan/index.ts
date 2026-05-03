import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, requireUser } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const { cognitiveReadiness, burnoutRisk, peakWindow, studyCapacity, studyBlock, pastFeedback, persona, currentCourses, crossSemesterCourses, carryOverCourses, recentStudyLogs, topicMastery, year, semester } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const feedbackContext = pastFeedback && pastFeedback.length > 0
      ? `\n\nIMPORTANT - The student has previously disagreed with recommendations. Adapt the plan based on their feedback:\n${pastFeedback.map((f: any) => `- Disagreed with "${f.feedback_type}": "${f.reason}"`).join("\n")}`
      : "";

    const blockContext = studyBlock
      ? `\n\nSTUDY BLOCK STRUCTURE (MUST follow): Each study session must be exactly ${studyBlock.blockMinutes} minutes long${studyBlock.breakMinutes > 0 ? `, followed by a ${studyBlock.breakMinutes}-minute break` : " (no break needed between sessions)"}. The student's readiness tier is "${studyBlock.tier}". Structure ALL tasks to fit this block pattern.`
      : "";

    // Build persona context
    const personaContext = persona
      ? `\n\nSTUDENT PERSONA:
- Study style: ${persona.study_style || "unknown"}
- Preferred session length: ${persona.preferred_session_length || "unknown"}
- Learning method: ${persona.learning_method || "unknown"}
- Motivation type: ${persona.motivation_type || "unknown"}
- Biggest challenge: ${persona.biggest_challenge || "unknown"}
- Stress management: ${persona.stress_management || "unknown"}
- Weekly study hours target: ${persona.weekly_study_hours || "unknown"}
- Goals: ${(persona.goals || []).join(", ") || "none specified"}
Tailor tasks, language, and scheduling to match their study style and preferences.`
      : "";

    // Build curriculum context
    const carryOverContext = carryOverCourses && carryOverCourses.length > 0
      ? `\n\nCARRY-OVER EXAMS (from earlier years, NOT yet passed — student is still studying these alongside current-year material; allocate time and treat as high priority when exam dates approach):\n${carryOverCourses.map((c: any) => `- ${c.name} (Year ${c.fromYear}, ${c.credits} credits)`).join("\n")}`
      : "";

    const coursesContext = currentCourses && currentCourses.length > 0
      ? `\n\nCURRENT COURSES (Year ${year}, Semester ${semester}) — prioritize by credit weight:
${currentCourses.map((c: any) => `- ${c.name} (${c.credits} credits)`).join("\n")}${carryOverContext}${
        crossSemesterCourses && crossSemesterCourses.length > 0
          ? `\n\nOTHER COURSES the student has logged recently (resit/review):\n${crossSemesterCourses.map((c: any) => `- ${c.name} (${c.credits} credits)`).join("\n")}`
          : ""
      }`
      : "";

    // Build topic mastery context
    const masteryContext = topicMastery && Object.keys(topicMastery).length > 0
      ? `\n\nTOPIC MASTERY STATUS (red = needs heavy focus, orange = moderate effort, green = revise later):
${Object.entries(topicMastery).map(([course, topics]: [string, any]) => {
  const redTopics = topics.filter((t: any) => t.status === "red").map((t: any) => t.topic);
  const orangeTopics = topics.filter((t: any) => t.status === "orange").map((t: any) => t.topic);
  const greenTopics = topics.filter((t: any) => t.status === "green").map((t: any) => t.topic);
  return `${course}:\n  🔴 Needs Focus: ${redTopics.join(", ") || "none"}\n  🟠 In Progress: ${orangeTopics.join(", ") || "none"}\n  🟢 Confident: ${greenTopics.join(", ") || "none"}`;
}).join("\n")}
CRITICAL: Prioritize RED topics in today's plan — schedule them during peak study windows with longer blocks. ORANGE topics get moderate time. GREEN topics should only appear as quick revision if time permits.`
      : "";

    // Build recent activity context
    const recentContext = recentStudyLogs && recentStudyLogs.length > 0
      ? `\n\nRECENT STUDY ACTIVITY (last sessions):\n${recentStudyLogs.map((l: any) => `- ${l.subject}: ${l.topic} (${l.duration_minutes}min, difficulty ${l.difficulty}/5)`).join("\n")}\nAvoid repeating the same topics unless revision is needed. Prioritize courses not recently studied.`
      : "";

    const systemPrompt = `You are a medical student study coach at Humanitas University. Based on the student's daily health metrics, persona, and actual curriculum, create a personalized daily study plan.

Return a JSON array of 3-5 plan items. Each item must have:
- "time": time label (e.g. "9:00 AM", "Morning", "After lunch")
- "task": concise task description referencing ACTUAL course names and including duration matching block structure (max 18 words)
- "reason": why this is recommended based on their persona and metrics (max 15 words)

Rules:
- Reference real course names from their curriculum — never invent subjects
- Higher-credit courses should get more study time proportionally
- If the student has cross-semester courses (exam prep), include at least one session for those
- Match the study approach to their persona (e.g. visual learner = diagrams, pomodoro fan = timed blocks)
- High burnout = fewer/lighter sessions; high cognitive readiness = harder/heavier-credit material first
- Peak window = schedule hardest work there
- IMPORTANT: All study sessions MUST follow the prescribed block/break structure${blockContext}${personaContext}${coursesContext}${masteryContext}${recentContext}${feedbackContext}`;

    const userPrompt = `Metrics:
- Cognitive Readiness: ${cognitiveReadiness}/100
- Burnout Risk: ${burnoutRisk}/100  
- Peak Study Window: ${peakWindow}
- Study Capacity: ${studyCapacity}
- Study Block: ${studyBlock ? `${studyBlock.blockMinutes}min sessions${studyBlock.breakMinutes > 0 ? ` with ${studyBlock.breakMinutes}min breaks` : ", no breaks needed"}` : "flexible"}
- Current time: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}

Generate my personalized study plan for today, referencing my actual courses and matching my study style.`;

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
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly.", fallback: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted.", fallback: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: `AI gateway error: ${response.status}`, fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
