import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // sendBeacon sends as Blob; sanitize input
    const raw = await req.text();
    const cleaned = raw.replace(/[\n\r\t]/g, "").trim();
    const body = cleaned ? JSON.parse(cleaned) : {};
    const userId = body.user_id;
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cur } = await admin
      .from("user_presence")
      .select("session_started_at, last_seen_at, total_online_seconds")
      .eq("user_id", userId)
      .maybeSingle();

    let addSec = 0;
    if (cur?.session_started_at) {
      const end = new Date().getTime();
      const start = new Date(cur.session_started_at).getTime();
      addSec = Math.max(0, Math.floor((end - start) / 1000));
    }

    const newTotal = (cur?.total_online_seconds || 0) + addSec;

    await admin
      .from("user_presence")
      .update({
        is_online: false,
        last_seen_at: new Date().toISOString(),
        session_started_at: null,
        total_online_seconds: newTotal,
      })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ ok: true, added_seconds: addSec }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
