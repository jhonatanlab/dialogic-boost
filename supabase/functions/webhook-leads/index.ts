import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const normalizePhone = (p: string) => (p || "").toString().replace(/\D/g, "");

// Ensure Brazilian country code (55) prefix for local-format numbers
const ensureBrazilCountryCode = (digits: string): string => {
  if (!digits) return digits;
  // Already has 55 prefix with valid BR length (12 or 13 digits)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  // BR local format: 10 (fixed) or 11 (mobile with 9) digits → prefix 55
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  // Other lengths: leave as-is (international numbers)
  return digits;
};

// Returns possible variants of a BR phone (with/without the leading 9 of mobile).
// Handles the classic "9 do celular" duplication issue.
const brazilPhoneVariants = (digits: string): string[] => {
  if (!digits) return [];
  const set = new Set<string>([digits]);
  // 13 digits: 55 + DDD(2) + 9 + 8 digits  →  also add 12-digit variant without the 9
  if (digits.length === 13 && digits.startsWith("55") && digits.charAt(4) === "9") {
    set.add(digits.slice(0, 4) + digits.slice(5));
  }
  // 12 digits: 55 + DDD(2) + 8 digits  →  also add 13-digit variant with a 9 inserted
  if (digits.length === 12 && digits.startsWith("55")) {
    set.add(digits.slice(0, 4) + "9" + digits.slice(4));
  }
  return Array.from(set);
};

// Pick first non-empty value from payload by alias list (case-insensitive keys)
const pick = (obj: Record<string, any>, keys: string[]): string | null => {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(obj || {})) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return null;
};

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

  if (intErr || !integration) return json({ error: "Invalid token" }, 404);
  if (!integration.active) return json({ error: "Integration inactive" }, 403);

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
    const nome = pick(payload, ["nome", "name", "nome_completo", "fullname", "full_name"]);
    const telefoneRaw = pick(payload, ["telefone", "phone", "whatsapp", "celular", "numero", "tel", "mobile"]);
    const telefone = ensureBrazilCountryCode(normalizePhone(telefoneRaw || ""));
    const email = pick(payload, ["email", "e-mail", "mail"]);
    const origem = pick(payload, ["origem", "source", "utm_source"]) || "webhook";
    const mensagem = pick(payload, ["mensagem", "message", "msg", "texto"]);

    if (!telefone) {
      await supabase.from("webhook_logs").insert({
        integration_id: integration.id,
        payload,
        status: "error",
        error_message: "Missing telefone (aliases: telefone, phone, whatsapp, celular, numero, tel)",
      });
      return json({ error: "telefone is required (aliases accepted: telefone, phone, whatsapp, celular, numero, tel)" }, 400);
    }

    const company_id = integration.company_id;
    const user_id = integration.user_id;

    // Build extras (everything not already mapped) for metadata + variables
    const reservedKeys = new Set([
      "nome","name","nome_completo","fullname","full_name",
      "telefone","phone","whatsapp","celular","numero","tel","mobile",
      "email","e-mail","mail",
      "origem","source","utm_source",
      "mensagem","message","msg","texto",
    ]);
    const extras: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload || {})) {
      if (!reservedKeys.has(k.toLowerCase()) && v !== null && v !== undefined) {
        extras[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }

    // Upsert contact (by phone within company, matching BR 12/13-digit variants)
    let contactId: string | null = null;
    const phoneVariants = brazilPhoneVariants(telefone);
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, phone")
      .eq("company_id", company_id)
      .in("phone", phoneVariants)
      .maybeSingle();

    if (existing) {
      contactId = existing.id;
      const patch: Record<string, unknown> = {};
      if (nome) patch.name = nome;
      if (email) patch.email = email;
      // Canonicalize to 13-digit (with leading 9) form when we matched the 12-digit variant
      if (existing.phone !== telefone && telefone.length === 13) {
        patch.phone = telefone;
      }
      if (Object.keys(patch).length) {
        await supabase.from("contacts").update(patch).eq("id", contactId);
      }
    } else {
      const { data: newContact, error: cErr } = await supabase
        .from("contacts")
        .insert({
          name: nome || `Lead ${telefone.slice(-4)}`,
          phone: telefone,
          email,
          source: origem,
          company_id,
          user_id,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      contactId = newContact.id;
    }

    // Get or create conversation
    let conversationId: string | null = null;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("company_id", company_id)
      .eq("contact_id", contactId)
      .eq("channel", "whatsapp")
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      await supabase
        .from("conversations")
        .update({ status: "open", last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } else {
      const defaultAssignedTo: string | null = integration.default_assigned_to ?? null;
      const defaultTeamId: string | null = integration.default_team_id ?? null;
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          company_id,
          user_id,
          contact_id: contactId,
          channel: "whatsapp",
          status: defaultAssignedTo ? "in_progress" : "open",
          assigned_to: defaultAssignedTo,
          assigned_team: defaultTeamId,
        })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversationId = newConv.id;

      // Audit events for initial assignment coming from the webhook
      if (defaultTeamId) {
        await supabase.from("conversation_events").insert({
          conversation_id: conversationId,
          company_id,
          event_type: "transferred_team",
          to_team_id: defaultTeamId,
          note: `Atribuída via webhook: ${integration.name}`,
        });
      }
      if (defaultAssignedTo) {
        await supabase.from("conversation_events").insert({
          conversation_id: conversationId,
          company_id,
          event_type: "transferred_agent",
          to_user_id: defaultAssignedTo,
          note: `Atribuída via webhook: ${integration.name}`,
        });
      }
    }

    // If client sent a message, save it as inbound
    if (mensagem) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        contact_id: contactId,
        user_id,
        company_id,
        channel: "whatsapp",
        direction: "inbound",
        content: mensagem,
        message_type: "text",
        status: "delivered",
        metadata: { source: "webhook-leads", integration_id: integration.id, origem, extras },
      });
    }

    // Send welcome message (same flow as Automations)
    let messageStatus: "sent" | "failed" | "skipped" = "skipped";
    const welcome = (integration.welcome_message || "").trim();

    if (welcome) {
      // Build variable map: known + all extras
      const vars: Record<string, string> = {
        nome: nome || "",
        telefone,
        email: email || "",
        origem: origem || "",
        ...extras,
      };

      let replaced = welcome;
      for (const [k, v] of Object.entries(vars)) {
        const re = new RegExp(`\\{${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`, "gi");
        replaced = replaced.replace(re, v ?? "");
      }

      const tempMessageId = `app-${crypto.randomUUID()}`;

      await supabase.from("messages").insert({
        client_message_id: tempMessageId,
        conversation_id: conversationId,
        contact_id: contactId,
        user_id,
        company_id,
        channel: "whatsapp",
        direction: "outbound",
        content: replaced,
        message_type: "text",
        status: "sending",
        metadata: {
          source: "webhook-leads",
          integration_id: integration.id,
          integration_name: integration.name,
          extras,
        },
      });

      // Resolve send endpoint (automation_outbound > company > user)
      let sendEndpoint: string | null = null;
      let resolvedVia = "";

      const { data: autoEnabled } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "n8n_automation_enabled")
        .eq("company_id", company_id)
        .maybeSingle();

      if (autoEnabled?.setting_value === "true") {
        const { data: autoOutbound } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "n8n_automation_outbound")
          .eq("company_id", company_id)
          .maybeSingle();
        if (autoOutbound?.setting_value) {
          sendEndpoint = autoOutbound.setting_value;
          resolvedVia = "automation_outbound";
        }
      }

      if (!sendEndpoint) {
        const { data: s1 } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "n8n_send_message")
          .eq("company_id", company_id)
          .maybeSingle();
        if (s1?.setting_value) {
          sendEndpoint = s1.setting_value;
          resolvedVia = "company_id";
        }
      }

      if (!sendEndpoint) {
        const { data: s2 } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "n8n_send_message")
          .eq("user_id", user_id)
          .maybeSingle();
        if (s2?.setting_value) {
          sendEndpoint = s2.setting_value;
          resolvedVia = "user_id";
        }
      }

      if (!sendEndpoint) {
        console.error("[webhook-leads] n8n_send_message endpoint NOT FOUND for company", company_id);
        await supabase.from("messages").update({ status: "failed" }).eq("client_message_id", tempMessageId);
        messageStatus = "failed";
      } else {
        console.log(`[webhook-leads] Resolved endpoint via ${resolvedVia}: ${sendEndpoint}`);

        const sendPayload: Record<string, string> = {
          company_id,
          number: telefone,
          text: replaced,
          type: "text",
          internal_id: tempMessageId,
        };

        try {
          const resp = await fetch(sendEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sendPayload),
          });
          const respText = await resp.text();
          console.log(`[webhook-leads] Send response: status=${resp.status} body=${respText.substring(0, 200)}`);

          if (!resp.ok) {
            await supabase.from("messages").update({ status: "failed" }).eq("client_message_id", tempMessageId);
            messageStatus = "failed";
          } else {
            await supabase.from("messages").update({ status: "sent" }).eq("client_message_id", tempMessageId);
            messageStatus = "sent";
          }
        } catch (sendErr) {
          console.error("[webhook-leads] Error sending message:", sendErr);
          await supabase.from("messages").update({ status: "failed" }).eq("client_message_id", tempMessageId);
          messageStatus = "failed";
        }
      }
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
      conversation_id: conversationId,
      welcome_message_status: messageStatus,
      extras_received: Object.keys(extras),
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[webhook-leads] Error:", e);
    await supabase.from("webhook_logs").insert({
      integration_id: integration.id,
      payload,
      status: "error",
      error_message: msg,
    });
    return json({ error: msg }, 500);
  }
});
