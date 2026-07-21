// wa-action — JWT-protected endpoint for AI/inbox control actions.
// Actions: pause_ai, reactivate_ai, send_message
// Only operates on conversations belonging to the caller's company.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authed = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const raw = await req.text();
    const clean = raw.replace(/[\n\r\t]/g, "").trim();
    const body = clean ? JSON.parse(clean) : {};
    const action = String(body?.action || "").toLowerCase();
    const conversationId = body?.conversation_id ? String(body.conversation_id) : null;
    const providedPhone = body?.phone ? String(body.phone) : null;
    const message = body?.message ? String(body.message) : null;

    if (!action) return json({ error: "action required" }, 400);
    if (!conversationId) return json({ error: "conversation_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Caller's company
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .maybeSingle();
    const callerCompany = profile?.company_id;
    if (!callerCompany) return json({ error: "user has no company" }, 403);

    // Fetch conversation and validate company
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, company_id, contact_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (convErr) throw convErr;
    if (!conv) return json({ error: "conversation not found" }, 404);
    if (conv.company_id !== callerCompany) return json({ error: "forbidden" }, 403);

    // Resolve phone from contact if not provided
    let phone = providedPhone;
    if (!phone && conv.contact_id) {
      const { data: contact } = await admin
        .from("contacts")
        .select("phone")
        .eq("id", conv.contact_id)
        .maybeSingle();
      phone = contact?.phone ?? null;
    }

    if (action === "pause_ai" || action === "reactivate_ai") {
      if (!phone) return json({ error: "phone not resolvable" }, 400);
      const status = action === "pause_ai" ? "paused" : "active";
      const telefone = phone.replace(/\D/g, "");
      const { error: upErr } = await admin
        .from("ai_control")
        .upsert(
          { company_id: String(conv.company_id), telefone, status, updated_at: new Date().toISOString() },
          { onConflict: "company_id,telefone" } as any
        );
      if (upErr) throw upErr;
      return json({ ok: true, action, status });
    }

    if (action === "send_message") {
      if (!phone) return json({ error: "phone not resolvable" }, 400);
      if (!message) return json({ error: "message required" }, 400);

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ phone, message }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) return json({ ok: false, error: payload?.error || `send failed (${resp.status})` }, 502);
      return json({ ok: true, action, result: payload });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e: any) {
    console.error("wa-action error:", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});
