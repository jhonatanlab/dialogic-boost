import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { complete, type LlmMessage } from "../_shared/llm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("company_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ ok: false, error: "Empresa não encontrada" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "owner"].includes(String(profile.role))) {
      return new Response(JSON.stringify({ ok: false, error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "preview" ? "preview" : "ping";
    const userMessage: string = typeof body?.message === "string" && body.message.trim().length > 0
      ? body.message : "ping";

    // Load credentials + settings
    const { data: credRows, error: credErr } = await admin
      .rpc("get_company_llm_credentials", { p_company_id: profile.company_id });
    if (credErr) throw credErr;
    const cred = Array.isArray(credRows) ? credRows[0] : credRows;
    if (!cred?.api_key) {
      return new Response(JSON.stringify({ ok: false, error: "Chave de API não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let systemPrompt = "";
    if (mode === "preview") {
      const { data: company } = await admin
        .from("companies")
        .select("system_prompt")
        .eq("id", profile.company_id)
        .maybeSingle();
      systemPrompt = (company as any)?.system_prompt || "";
    }

    const provider = (cred.provider || "").toLowerCase();
    const model = cred.model || "";
    if (!provider || !model) {
      return new Response(JSON.stringify({ ok: false, error: "Provider/modelo não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const started = Date.now();
    let response = "";
    try {
      if (provider === "openai") {
        const msgs = mode === "preview"
          ? [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: userMessage },
            ]
          : [{ role: "user", content: "ping" }];
        response = await callOpenAI(cred.api_key, model, msgs);
      } else if (provider === "anthropic") {
        response = await callAnthropic(
          cred.api_key,
          model,
          mode === "preview" ? (systemPrompt || undefined) : undefined,
          mode === "preview" ? userMessage : "ping",
        );
      } else if (provider === "groq") {
        const msgs = mode === "preview"
          ? [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: userMessage },
            ]
          : [{ role: "user", content: "ping" }];
        response = await callGroq(cred.api_key, model, msgs);
      } else {
        return new Response(JSON.stringify({ ok: false, error: `Provider desconhecido: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e?.message || String(e), latency_ms: Date.now() - started }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      latency_ms: Date.now() - started,
      response: mode === "preview" ? response : undefined,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
