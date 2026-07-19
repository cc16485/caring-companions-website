// Cara chat — Supabase Edge Function
// Deploy:  supabase functions deploy cara-chat --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Then in the website, set (e.g. in a small inline script before cara-widget.js):
//   window.CC_CARA_ENDPOINT = "https://<project-ref>.functions.supabase.co/cara-chat";

// mode "empathy" (Cara consultation acknowledgment step) uses a different prompt.
const EMPATHY_PROMPT =
  "You are Cara, a warm, calm care coordinator at a home care agency. A family " +
  "member just described their situation in their own words. Respond with ONLY " +
  "1-2 short, warm, empathetic sentences (under 40 words total) acknowledging " +
  "what they shared and validating that looking into this now is a good step. " +
  "Do not give advice, recommendations, diagnoses, or mention pricing. Do not " +
  "ask a question. Just acknowledge with warmth.";

const SYSTEM_PROMPT =
  "You are Cara, a warm, knowledgeable care coordinator for Caring Companions, " +
  "a Missouri home care agency (Springfield, serving Greene, Christian, Douglas, " +
  "Phelps, Taney, and Webster counties). Answer questions about home care, " +
  "Medicaid/HCBS waivers, VA benefits, and aging-at-home topics concisely " +
  "(under 80 words), in plain language. These are the ONLY published rates - " +
  "quote them exactly and never invent others: Wellness Care from $30/hour, " +
  "Personal Care from $32/hour, Advanced Care from $34/hour, 24-Hour Care " +
  "$28-$32/hour, Live-In Care $450/day (includes a $25/day caregiver meal fee), " +
  "HomeTogether virtual check-ins from $75/month. Exact quotes depend on the " +
  "care plan - offer a free consultation at (417) 234-8494. If asked something " +
  "you cannot know (specific medical advice, legal advice, availability), " +
  "suggest calling (417) 234-8494 or starting the full Cara consultation. " +
  "Never fabricate facility names, prices, or legal advice. Reply in plain " +
  "sentences only - no markdown, no asterisks, no bullet lists (your reply " +
  "renders as plain text in a small chat bubble).";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }
  try {
    const { messages, mode } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const safeMessages = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: mode === "empathy" ? 120 : 300,
        system: mode === "empathy" ? EMPATHY_PROMPT : SYSTEM_PROMPT,
        messages: safeMessages,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "chat_failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
