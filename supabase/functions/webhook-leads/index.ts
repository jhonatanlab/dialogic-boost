import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (p: string) => (p || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract token from path: /webhook-leads/{token}
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 1];

  if (!token || token === "webhook-leads") {
    return json({ error: "Missing token in path" }, 400);
  }

  // Validate token
  const { data: integration, error: intErr } = await supabase
    .from("webhook_integrations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (intErr || !integration) {
    return json({ error: "Invalid token" }, 404);
  }

  if (!integration.active) {
    return json({ error: "Integration inactive" }, 403);
  }

  // Parse body (sanitize for malformed JSON per project memory)
  let payload: any = {};
  try {
    const raw = await req.text();
    const sanitized = raw.replace(/[\n\r\t]/g, " ");
    payload = sanitized ? JSON.parse(sanitized) : {};
  } catch (e) {
    await supabase.from("webhook_logs").insert({
      integration_id: integration.id,
      payload: null,
      status: "error",
      error_message: `Invalid JSON: ${(e as Error).message}`,
    });
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const nome = payload.nome || payload.name || null;
    const telefone = normalizePhone(payload.telefone || payload.phone || "");
    const email = payload.email || null;
    const origem = payload.origem || payload.source || "webhook";
    const mensagem = payload.mensagem || payload.message || null;

    if (!telefone && !email) {
      await supabase.from("webhook_logs").insert({
        integration_id: integration.id,
        payload,
        status: "error",
        error_message: "Missing telefone/email",
      });
      return json({ error: "telefone or email required" }, 400);
    }

    // Upsert contact
    let contactId: string | null = null;
    if (telefone) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", integration.company_id)
        .eq("phone", telefone)
        .maybeSingle();
      if (existing) contactId = existing.id;
    }

    if (!contactId) {
      const { data: newContact, error: cErr } = await supabase
        .from("contacts")
        .insert({
          name: nome || `Lead ${telefone?.slice(-4) || ""}`,
          phone: telefone || null,
          email,
          source: origem,
          company_id: integration.company_id,
          user_id: integration.user_id,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      contactId = newContact.id;
    }

    await supabase.from("webhook_logs").insert({
      integration_id: integration.id,
      payload,
      status: "success",
      error_message: null,
    });

    return json({
      success: true,
      contact_id: contactId,
      welcome_message: integration.welcome_message,
      received: { nome, telefone, email, origem, mensagem },
    });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("webhook_logs").insert({
      integration_id: integration.id,
      payload,
      status: "error",
      error_message: msg,
    });
    return json({ error: msg }, 500);
  }
});
