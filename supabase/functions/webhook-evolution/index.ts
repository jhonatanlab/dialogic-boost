// webhook-evolution — STANDBY. Deploy sim, tráfego não.
// Nenhum webhook Evolution existente é reapontado; N8N continua com 100% do tráfego.
// Testes apenas via chamada manual com header x-webhook-secret válido.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Status helpers (mesma hierarquia do webhook-n8n-instance) ──
const normalizeStatus = (status: string): string => {
  const s = (status || "").toLowerCase().trim();
  if (s === "played") return "read";
  if (s === "server_ack") return "sent";
  if (s === "received") return "delivered";
  if (s === "pending") return "sent";
  return s;
};

const statusPriority = (status: string): number => {
  switch (status) {
    case "sending": return 0;
    case "failed": return 1;
    case "sent":
    case "server_ack": return 2;
    case "delivered":
    case "received": return 3;
    case "read": return 4;
    case "replied": return 5;
    case "deleted": return 6;
    default: return -1;
  }
};

// ── Phone helpers ──
const normalizePhone = (phone: string): string => {
  const base = String(phone || "").split(":")[0].split("@")[0];
  return base.replace(/\D/g, "");
};

const brazilPhoneVariants = (digits: string): string[] => {
  if (!digits) return [];
  const set = new Set<string>([digits]);
  if (digits.length === 13 && digits.startsWith("55") && digits.charAt(4) === "9") {
    set.add(digits.slice(0, 4) + digits.slice(5));
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    set.add(digits.slice(0, 4) + "9" + digits.slice(4));
  }
  return Array.from(set);
};

// ── Media type mapping (Evolution messageType → nosso message_type) ──
const mapMessageType = (t: string): string => {
  const v = (t || "").toLowerCase();
  if (v.includes("audio") || v === "ptt" || v === "pttmessage") return "audio";
  if (v.includes("image") || v === "stickermessage") {
    return v === "stickermessage" ? "sticker" : "image";
  }
  if (v.includes("video")) return "video";
  if (v.includes("document")) return "document";
  return "text";
};

const extForMime = (mime?: string, fallbackType?: string): string => {
  const m = (mime || "").toLowerCase();
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("pdf")) return "pdf";
  if (fallbackType === "audio") return "ogg";
  if (fallbackType === "image") return "jpg";
  if (fallbackType === "video") return "mp4";
  if (fallbackType === "document") return "bin";
  return "bin";
};

const extractText = (message: Record<string, any> | undefined): string => {
  if (!message) return "";
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    ""
  );
};

const extractMimetype = (message: Record<string, any> | undefined): string | undefined => {
  if (!message) return undefined;
  return (
    message.audioMessage?.mimetype ??
    message.imageMessage?.mimetype ??
    message.videoMessage?.mimetype ??
    message.documentMessage?.mimetype ??
    message.stickerMessage?.mimetype
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Parse resiliente ──
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") return json({ error: "Empty request body" }, 400);

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      try {
        const sanitized = rawBody.replace(/[\n\r\t]/g, (m) => (m === "\n" ? "\\n" : m === "\r" ? "\\r" : "\\t"));
        body = JSON.parse(sanitized);
        console.warn("[webhook-evolution] JSON parsed after sanitizing control chars");
      } catch {
        return json({ error: "Invalid JSON", received: rawBody.substring(0, 200) }, 400);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ═══════════════════════════════════════════
    // 1. Resolver instância + auth
    // ═══════════════════════════════════════════
    const rawInstance = body?.instance ?? body?.instanceId ?? body?.instance_id;
    if (!rawInstance) return json({ error: "instance missing in payload" }, 400);

    const normalizedInstance = normalizePhone(String(rawInstance));
    const candidates = Array.from(new Set([String(rawInstance), normalizedInstance].filter(Boolean)));
    const orFilter = candidates
      .flatMap((c) => [`instance_id.eq.${c}`, `hash.eq.${c}`])
      .join(",");

    const { data: instance, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("id, company_id")
      .or(orFilter)
      .limit(1)
      .maybeSingle();

    if (instErr) throw instErr;
    if (!instance?.company_id) {
      console.error("[webhook-evolution] instance not found:", rawInstance);
      return json({ error: "Instance not found" }, 404);
    }

    const company_id = instance.company_id as string;

    // Fetch credentials via SECURITY DEFINER RPC
    const { data: credsRows, error: credsErr } = await supabase.rpc(
      "get_instance_evolution_credentials",
      { p_instance_id: instance.id },
    );
    if (credsErr) throw credsErr;
    const creds = Array.isArray(credsRows) ? credsRows[0] : credsRows;
    const expectedSecret: string | null = creds?.webhook_secret ?? null;
    const evolutionBaseUrl: string | null = creds?.base_url ?? null;
    const evolutionApiKey: string | null = creds?.api_key ?? null;

    const incomingSecret = req.headers.get("x-webhook-secret");
    if (expectedSecret) {
      if (incomingSecret !== expectedSecret) {
        console.error("[webhook-evolution] invalid x-webhook-secret for instance", instance.id);
        return json({ error: "Unauthorized" }, 401);
      }
    } else {
      console.warn("[webhook-evolution] webhook_secret NULL for instance", instance.id, "— accepting without auth");
    }

    // ── Helper: user_id da empresa ──
    const getUserForCompany = async (): Promise<string | null> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", company_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return profile?.user_id ?? null;
    };

    // ═══════════════════════════════════════════
    // 2. Roteamento por evento
    // ═══════════════════════════════════════════
    const event: string = body?.event ?? "";

    // ── messages.update: só sobe status, nunca desce ──
    if (event === "messages.update") {
      const items: any[] = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
      const results: any[] = [];
      for (const item of items) {
        const keyId: string | undefined = item?.key?.id ?? item?.keyId ?? item?.messageId;
        const rawStatus: string = item?.status ?? item?.update?.status ?? "";
        if (!keyId || !rawStatus) {
          results.push({ skipped: "missing key.id or status" });
          continue;
        }
        const mapped = normalizeStatus(rawStatus);
        const { data: current } = await supabase
          .from("messages")
          .select("id, status")
          .eq("company_id", company_id)
          .eq("message_id", keyId)
          .maybeSingle();
        if (!current) {
          results.push({ message_id: keyId, action: "not_found" });
          continue;
        }
        if (statusPriority(mapped) <= statusPriority(current.status)) {
          results.push({ message_id: keyId, action: "status_kept", kept: current.status });
          continue;
        }
        const { error: upErr } = await supabase
          .from("messages")
          .update({ status: mapped })
          .eq("id", current.id);
        if (upErr) throw upErr;
        results.push({ message_id: keyId, action: "updated", status: mapped });
      }
      return json({ success: true, event, results });
    }

    // ── outros eventos que não sejam upsert: log + 200 ──
    if (event !== "messages.upsert") {
      console.log("[webhook-evolution] ignored event:", event);
      return json({ success: true, ignored: event });
    }

    // ═══════════════════════════════════════════
    // 3-7. messages.upsert
    // ═══════════════════════════════════════════
    const dataItems: any[] = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
    const userId = await getUserForCompany();
    if (!userId) return json({ error: "No user found for company" }, 404);

    // Preload company AI settings (uma consulta por request)
    const { data: companyRow } = await supabase
      .from("companies")
      .select("ai_enabled, debounce_seconds")
      .eq("id", company_id)
      .maybeSingle();

    const results: any[] = [];

    for (const item of dataItems) {
      const key = item?.key ?? {};
      // 3. fromMe → ignora
      if (key?.fromMe === true) {
        results.push({ skipped: "fromMe" });
        continue;
      }

      const keyId: string | undefined = key?.id;
      const remoteJid: string | undefined = key?.remoteJid;
      if (!keyId || !remoteJid) {
        results.push({ skipped: "missing key.id or remoteJid" });
        continue;
      }

      // 4. Normalização
      const normalizedPhone = normalizePhone(remoteJid);
      if (!normalizedPhone) {
        results.push({ skipped: "empty phone" });
        continue;
      }
      const phoneVariants = brazilPhoneVariants(normalizedPhone);
      const messageObj = item?.message ?? {};
      const message_type = mapMessageType(item?.messageType ?? "");
      let content = extractText(messageObj);
      const mimetype = extractMimetype(messageObj);
      const ts = Number(item?.messageTimestamp ?? 0);
      const sent_at = ts > 0
        ? new Date(ts * 1000).toISOString()
        : new Date().toISOString();

      // 5. Dedup por (message_id + company_id)
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("company_id", company_id)
        .eq("message_id", keyId)
        .maybeSingle();
      if (existing) {
        results.push({ message_id: keyId, action: "dedup" });
        continue;
      }

      // Contato: findOrCreate
      let contactId: string | null = null;
      {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("company_id", company_id)
          .in("phone", phoneVariants)
          .limit(1)
          .maybeSingle();
        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact, error: contactErr } = await supabase
            .from("contacts")
            .insert({
              user_id: userId,
              company_id,
              name: `WhatsApp ${normalizedPhone.slice(-4)}`,
              phone: normalizedPhone,
              source: "whatsapp",
            })
            .select("id")
            .single();
          if (contactErr) throw contactErr;
          contactId = newContact.id;
        }
      }

      // Conversa: ativa por company + contact + whatsapp; reabre se closed
      let conversationId: string | null = null;
      {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id, status")
          .eq("company_id", company_id)
          .eq("contact_id", contactId)
          .eq("channel", "whatsapp")
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingConv) {
          conversationId = existingConv.id;
          if (existingConv.status === "closed") {
            await supabase
              .from("conversations")
              .update({ status: "open", assigned_to: null, assigned_team: null })
              .eq("id", existingConv.id);
          }
        } else {
          const { data: newConv, error: convErr } = await supabase
            .from("conversations")
            .insert({
              user_id: userId,
              company_id,
              contact_id: contactId!,
              channel: "whatsapp",
              status: "open",
              unread_count: 1,
            })
            .select("id")
            .single();
          if (convErr) throw convErr;
          conversationId = newConv.id;
        }
      }

      // 6. Mídia: baixar via Evolution getBase64FromMediaMessage e subir no bucket
      let media_url: string | null = null;
      if (message_type !== "text") {
        if (!evolutionBaseUrl || !evolutionApiKey) {
          content = content || "[mídia não recuperada]";
          console.warn("[webhook-evolution] missing evolution credentials for media fetch");
        } else {
          try {
            const url = `${evolutionBaseUrl.replace(/\/+$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(String(rawInstance))}`;
            const mediaResp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
              body: JSON.stringify({ message: item }),
            });
            if (!mediaResp.ok) throw new Error(`media fetch ${mediaResp.status}`);
            const mediaJson: any = await mediaResp.json();
            const b64: string | undefined = mediaJson?.base64 ?? mediaJson?.data ?? mediaJson?.body;
            if (!b64) throw new Error("no base64 in response");
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const ext = extForMime(mimetype, message_type);
            const path = `${company_id}/${conversationId}/${keyId}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("whatsapp-media")
              .upload(path, bin, { contentType: mimetype || "application/octet-stream", upsert: true });
            if (upErr) throw upErr;
            media_url = path;
          } catch (err) {
            console.error("[webhook-evolution] media download failed:", err instanceof Error ? err.message : err);
            content = content || "[mídia não recuperada]";
            media_url = null;
          }
        }
      }

      // 7. Persistência: messages + incoming_messages
      const metadata: Record<string, unknown> = {
        instance_id: String(rawInstance),
        raw: item,
      };
      if (media_url) metadata.media_url = media_url;
      if (mimetype) metadata.mimetype = mimetype;

      const { error: msgErr } = await supabase.from("messages").insert({
        message_id: keyId,
        conversation_id: conversationId,
        contact_id: contactId,
        user_id: userId,
        company_id,
        channel: "whatsapp",
        direction: "inbound",
        content,
        message_type,
        status: "delivered",
        metadata,
        created_at: sent_at,
        sent_at,
      });
      if (msgErr) throw msgErr;

      await supabase.from("incoming_messages").insert({
        user_id: userId,
        company_id,
        provider: "evolution",
        from_phone: normalizedPhone,
        message_text: content,
        message_type,
        raw_data: item,
      });

      // ═════════════════════════════════════════
      // 9. Kill switches (antes de bufferizar)
      // ═════════════════════════════════════════
      if (companyRow?.ai_enabled === false) {
        results.push({ message_id: keyId, action: "inserted", ai: "disabled_company" });
        continue;
      }

      const { data: aiPaused } = await supabase
        .from("ai_control")
        .select("telefone")
        .eq("company_id", company_id.toString())
        .in("telefone", phoneVariants)
        .eq("status", "paused")
        .limit(1)
        .maybeSingle();
      if (aiPaused) {
        results.push({ message_id: keyId, action: "inserted", ai: "paused_contact" });
        continue;
      }

      // ═════════════════════════════════════════
      // 10. message_buffer upsert
      // ═════════════════════════════════════════
      const debounce = Math.max(0, Number(companyRow?.debounce_seconds ?? 5));
      const now = new Date();
      const flushAt = new Date(now.getTime() + debounce * 1000).toISOString();
      const nowIso = now.toISOString();

      const { error: bufErr } = await supabase
        .from("message_buffer")
        .upsert(
          {
            company_id,
            conversation_id: conversationId!,
            contact_id: contactId!,
            flush_at: flushAt,
            last_message_at: nowIso,
            status: "pending",
            locked_at: null,
            attempts: 0,
          },
          { onConflict: "conversation_id" },
        );
      if (bufErr) throw bufErr;

      results.push({ message_id: keyId, action: "inserted", buffered: true });
    }

    return json({ success: true, event, count: results.length, results });
  } catch (error) {
    console.error("[webhook-evolution] unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
