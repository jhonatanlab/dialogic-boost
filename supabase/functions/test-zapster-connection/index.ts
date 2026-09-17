// test-zapster-connection — ações administrativas da conexão Zapster (JWT obrigatório).
// actions: test (status da instância) | qrcode | register_webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WEBHOOK_EVENTS, zapsterBase, zapsterErrorMessage, zapsterHeaders } from "../_shared/zapster.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ ok: false, error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const raw = await req.text();
    const body = JSON.parse((raw || "{}").replace(/[\r\n\t]/g, " "));
    const instanceRowId = body?.instance_id as string | undefined;
    const action = String(body?.action || "test").toLowerCase();
    if (!instanceRowId) return json({ ok: false, error: "missing instance_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles").select("company_id").eq("user_id", userId).maybeSingle();
    const { data: inst } = await admin
      .from("whatsapp_instances")
      .select("company_id, instance_id, provider, user_id")
      .eq("id", instanceRowId)
      .maybeSingle();

    // Permite o admin da mesma empresa ou o admin que criou a conexão (Admin SaaS).
    if (!inst || (!(profile && profile.company_id === inst.company_id) && (inst as any).user_id !== userId)) {
      return json({ ok: false, error: "forbidden" }, 403);
    }
    if (!inst.instance_id) return json({ ok: false, error: "instância sem ID da Zapster" }, 400);

    const { data: credRows, error: credErr } = await admin
      .rpc("get_instance_evolution_credentials", { p_instance_id: instanceRowId });
    if (credErr) throw credErr;
    const cred = Array.isArray(credRows) ? credRows[0] : credRows;
    const base = zapsterBase(cred?.base_url);
    const apiToken = (cred?.api_key || "").trim();
    const webhookSecret = (cred?.webhook_secret || "").trim();

    if (!apiToken) return json({ ok: false, error: "token da Zapster não configurado" }, 400);

    const headers = zapsterHeaders(apiToken);
    const zapsterInstance = encodeURIComponent(inst.instance_id);

    // ── QR Code ──
    if (action === "qrcode") {
      const resp = await fetch(`${base}/wa/instances/${zapsterInstance}/qrcode`, { headers });
      const contentType = resp.headers.get("content-type") ?? "";
      if (!resp.ok || contentType.includes("application/json")) {
        const payload = await resp.json().catch(() => null);
        return json({ ok: false, error: zapsterErrorMessage(payload, resp.status), status: resp.status });
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      let binary = "";
      for (const byte of buf) binary += String.fromCharCode(byte);
      return json({ ok: true, qr: `data:image/png;base64,${btoa(binary)}` });
    }

    // ── Registrar webhook ──
    if (action === "register_webhook") {
      if (!webhookSecret) return json({ ok: false, error: "segredo do webhook não configurado" }, 400);
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-zapster?s=${encodeURIComponent(webhookSecret)}`;
      const resp = await fetch(`${base}/wa/instances/${zapsterInstance}/webhooks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url, name: `EloChat ${inst.instance_id}`, events: WEBHOOK_EVENTS, enabled: true }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        return json({ ok: false, error: zapsterErrorMessage(payload, resp.status), status: resp.status });
      }
      return json({ ok: true, webhook_url: url, result: payload });
    }

    // ── Teste de conexão (default) ──
    const started = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let resp: Response;
    try {
      resp = await fetch(`${base}/wa/instances/${zapsterInstance}`, { headers, signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      return json({ ok: false, error: e instanceof Error ? e.message : "network error" });
    }
    clearTimeout(timeoutId);
    const latency = Date.now() - started;
    const payload = await resp.json().catch(() => null);
    if (!resp.ok) {
      return json({ ok: false, status: resp.status, error: zapsterErrorMessage(payload, resp.status) });
    }

    const state = (payload as any)?.status ?? null;
    // Mantém o status local em sincronia com a Zapster.
    await admin
      .from("whatsapp_instances")
      .update({ status: state === "connected" ? "connected" : "disconnected", updated_at: new Date().toISOString() })
      .eq("id", instanceRowId);

    return json({
      ok: true,
      latency_ms: latency,
      connection_state: state,
      connected: state === "connected",
      instance: payload,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return json({ ok: false, error: msg }, 500);
  }
});
