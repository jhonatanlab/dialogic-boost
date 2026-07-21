// wa-process-buffer — cron target. Picks pending buffers, locks atomically,
// fires ai-process fire-and-forget. Service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Atomic lock: pick up to 10 rows still pending and not locked (or lock expired).
    // We use UPDATE ... WHERE id IN (SELECT ...) RETURNING for atomicity via RPC-less SQL.
    // Since there's no exec_sql available, we do a two-step read-then-update filtered by locked_at.
    const { data: candidates, error: selErr } = await admin
      .from("message_buffer")
      .select("id, locked_at")
      .eq("status", "pending")
      .lte("flush_at", new Date().toISOString())
      .or(`locked_at.is.null,locked_at.lt.${new Date(Date.now() - 5 * 60_000).toISOString()}`)
      .order("flush_at", { ascending: true })
      .limit(10);

    if (selErr) throw selErr;
    if (!candidates || candidates.length === 0) {
      return json({ ok: true, picked: 0 });
    }

    const nowIso = new Date().toISOString();
    const locked: string[] = [];

    // Attempt to claim each id with a status guard for atomicity.
    for (const row of candidates) {
      const { data: upd, error: updErr } = await admin
        .from("message_buffer")
        .update({ status: "processing", locked_at: nowIso })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updErr) continue;
      if (upd?.id) locked.push(upd.id);
    }

    // Fire-and-forget invocations
    for (const buffer_id of locked) {
      fetch(`${SUPABASE_URL}/functions/v1/ai-process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ buffer_id }),
      }).catch(() => { /* swallow */ });
    }

    return json({ ok: true, picked: locked.length });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
