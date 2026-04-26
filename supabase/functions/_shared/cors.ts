// Shared CORS + JWT helpers for Athena Metrics edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Allow-list of trusted origins. Update if you publish to additional domains.
const ALLOWED_ORIGINS = [
  "https://cofactorstudent.lovable.app",
  "https://id-preview--1d7f9619-6e84-4bc6-9f65-279f0f143863.lovable.app",
  // Capacitor (iOS) origins
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://localhost:5173",
];

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export interface AuthResult {
  userId: string;
  email: string | null;
  jwt: string;
}

export async function requireUser(req: Request): Promise<AuthResult | { error: Response }> {
  const cors = buildCorsHeaders(req);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      }),
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      }),
    };
  }
  return { userId: data.user.id, email: data.user.email ?? null, jwt: token };
}
