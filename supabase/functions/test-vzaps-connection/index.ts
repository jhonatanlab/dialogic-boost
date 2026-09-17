// test-vzaps-connection — ações administrativas da conexão VZaps (JWT obrigatório).
// actions: test (status da sessão) | qrcode | register_webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VZAPS_WEBHOOK_EVENTS, vzapsBase, vzapsData, vzapsErrorMessage, vzapsHeaders } from "../_shared/vzaps.ts";

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
      .select("company_id, instance_id, provider, vzaps_client_token, user_id")
      .eq("id", instanceRowId)
      .maybeSingle();

    // Permite o admin da mesma empresa ou o admin que criou a conexão (Admin SaaS).
    if (!inst || (!(profile && profile.company_id === inst.company_id) && (inst as any).user_id !== userId)) {
      return json({ ok: false, error: "forbidden" }, 403);
    }
    if (!inst.instance_id) return json({ ok: false, error: "instância sem ID da VZaps" }, 400);

    const { data: credRows, error: credErr } = await admin
      .rpc("get_instance_evolution_credentials", { p_instance_id: instanceRowId });
    if (credErr) throw credErr;
    const cred = Array.isArray(credRows) ? credRows[0] : credRows;
    const base = vzapsBase(cred?.base_url);
    const instanceToken = (cred?.api_key || "").trim();
    const webhookSecret = (cred?.webhook_secret || "").trim();

    if (!instanceToken) return json({ ok: false, error: "token da instância VZaps não configurado" }, 400);

    const headers = vzapsHeaders(instanceToken, (inst as any).vzaps_client_token);
    const vzInstance = encodeURIComponent(inst.instance_id);

    // ── QR Code ──
    if (action === "qrcode") {
      const resp = await fetch(`${base}/instances/${vzInstance}/session/qr`, { headers });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        return json({ ok: false, error: vzapsErrorMessage(payload, resp.status), status: resp.status });
      }
      const data = vzapsData(payload) ?? {};
      const qr = data.qr_code ?? data.QRCode ?? null;
      const pairingStatus = data.pairing_status ?? data.status ?? data.Status ?? null;
      if (!qr) {
        return json({
          ok: false,
          pairing_status: pairingStatus,
          error:
            pairingStatus === "connected"
              ? "O WhatsApp desta instância já está conectado."
              : String(data.error || `QR Code não disponível (${pairingStatus ?? "sem status"})`),
        });
      }
      const qrData = String(qr).startsWith("data:") ? String(qr) : `data:image/png;base64,${qr}`;
      return json({ ok: true, qr: qrData, pairing_status: pairingStatus });
    }

    // ── Registrar webhook ──
    if (action === "register_webhook") {
      if (!webhookSecret) return json({ ok: false, error: "segredo do webhook não configurado" }, 400);
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-vzaps?s=${encodeURIComponent(webhookSecret)}`;
      const resp = await fetch(`${base}/instances/${vzInstance}/webhook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ webhookURL: url, events: VZAPS_WEBHOOK_EVENTS }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        return json({ ok: false, error: vzapsErrorMessage(payload, resp.status), status: resp.status });
      }
      return json({ ok: true, webhook_url: url, result: payload });
    }

    // ── Teste de conexão (default) ──
    const started = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let resp: Response;
    try {
      resp = await fetch(`${base}/instances/${vzInstance}/session/status`, { headers, signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      return json({ ok: false, error: e instanceof Error ? e.message : "network error" });
    }
    clearTimeout(timeoutId);
    const latency = Date.now() - started;
    const payload = await resp.json().catch(() => null);
    if (!resp.ok) {
      return json({ ok: false, status: resp.status, error: vzapsErrorMessage(payload, resp.status) });
    }

    const data = vzapsData(payload) ?? {};
    const connected = data.connected === true;
    // Mantém o status local em sincronia com a VZaps.
    await admin
      .from("whatsapp_instances")
      .update({ status: connected ? "connected" : "disconnected", updated_at: new Date().toISOString() })
      .eq("id", instanceRowId);

    return json({
      ok: true,
      latency_ms: latency,
      connection_state: connected ? "connected" : "disconnected",
      connected,
      instance: data,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return json({ ok: false, error: msg }, 500);
  }
});
