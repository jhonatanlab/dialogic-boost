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
    const nome = payload.nome || payload.name || null;
    const telefone = normalizePhone(payload.telefone || payload.phone || "");
    const email = payload.email || null;
    const origem = payload.origem || payload.source || "webhook";
    const mensagem = payload.mensagem || payload.message || null;

    if (!telefone) {
      await supabase.from("webhook_logs").insert({
        integration_id: integration.id,
        payload,
        status: "error",
        error_message: "Missing telefone",
      });
      return json({ error: "telefone is required" }, 400);
    }

    const company_id = integration.company_id;
    const user_id = integration.user_id;

    // Upsert contact (by phone within company)
    let contactId: string | null = null;
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("company_id", company_id)
      .eq("phone", telefone)
      .maybeSingle();

    if (existing) {
      contactId = existing.id;
      // Update name/email if missing
      const patch: Record<string, unknown> = {};
      if (nome) patch.name = nome;
      if (email) patch.email = email;
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
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          company_id,
          user_id,
          contact_id: contactId,
          channel: "whatsapp",
          status: "open",
        })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversationId = newConv.id;
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
        metadata: { source: "webhook-leads", integration_id: integration.id, origem },
      });
    }

    // Send welcome message (same flow as Automations)
    let messageStatus: "sent" | "failed" | "skipped" = "skipped";
    const welcome = (integration.welcome_message || "").trim();

    if (welcome) {
      const replaced = welcome
        .replace(/\{nome\}/gi, nome || "")
        .replace(/\{telefone\}/gi, telefone)
        .replace(/\{email\}/gi, email || "")
        .replace(/\{origem\}/gi, origem || "");

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

        // Same payload contract as Inbox / execute-automation
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
