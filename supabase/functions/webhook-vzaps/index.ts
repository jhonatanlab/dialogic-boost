// webhook-vzaps — recebe os eventos da VZaps (https://docs.vzaps.com)
// Autenticação: segredo na query string (?s=<webhook_secret>), pois a VZaps não assina o payload.
// Eventos tratados: Message, ReadReceipt (state: Delivered|Read|ReadSelf), Connected, Disconnected
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vzapsBase, vzapsData, vzapsHeaders } from "../_shared/vzaps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-instance-id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const statusPriority = (status: string): number => {
  switch (status) {
    case "sending": return 0;
    case "failed": return 1;
    case "sent": return 2;
    case "delivered": return 3;
    case "read": return 4;
    case "replied": return 5;
    case "deleted": return 6;
    default: return -1;
  }
};

const normalizePhone = (phone: string): string =>
  String(phone || "").split(":")[0].split("@")[0].replace(/\D/g, "");

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

const base64ToBytes = (b64: string): Uint8Array => {
  const clean = b64.includes(",") ? b64.split(",").pop()! : b64;
  const bin = atob(clean.replace(/\s/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// camelCase → snake_case, exigido pelos endpoints /chat/download*
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    out[k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()] = v;
  }
  return out;
};

const parseJsonValue = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const findEventPayload = (value: unknown, depth = 0): Record<string, any> | null => {
  if (depth > 6) return null;
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object") return null;
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findEventPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = parsed as Record<string, any>;
  const eventName = typeof obj.type === "string"
    ? obj.type
    : typeof obj.event === "string"
    ? obj.event
    : typeof obj.event_type === "string"
    ? obj.event_type
    : "";
  const normalized = eventName.toLowerCase().replace(/[^a-z]/g, "");
  if (
    normalized.startsWith("message") ||
    normalized.includes("readreceipt") ||
    normalized.includes("connected") ||
    normalized.includes("disconnected")
  ) return obj;

  for (const key of ["event", "json_data", "data", "payload", "body"]) {
    if (!(key in obj)) continue;
    const found = findEventPayload(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("s") ?? req.headers.get("x-webhook-secret");
    if (!providedSecret) return json({ error: "Unauthorized" }, 401);

    const rawBody = await req.text();
    if (!rawBody.trim()) return json({ error: "Empty request body" }, 400);

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      try {
        body = JSON.parse(rawBody.replace(/[\n\r\t]/g, (m) => (m === "\n" ? "\\n" : m === "\r" ? "\\r" : "\\t")));
      } catch {
        return json({ error: "Invalid JSON", received: rawBody.substring(0, 200) }, 400);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. Resolver instância + validar segredo ──
    const headerInstance = req.headers.get("x-instance-id") ?? body?.instance_id ?? null;
    let query = supabase
      .from("whatsapp_instances")
      .select("id, company_id, instance_id, webhook_secret, evolution_base_url, vzaps_client_token")
      .eq("provider", "vzaps")
      .eq("webhook_secret", providedSecret);
    if (headerInstance) query = query.eq("instance_id", String(headerInstance));

    const { data: instance, error: instErr } = await query.limit(1).maybeSingle();
    if (instErr) throw instErr;
    if (!instance) {
      console.error("[webhook-vzaps] instance/secret mismatch", { headerInstance });
      return json({ error: "Unauthorized" }, 401);
    }

    const company_id = instance.company_id as string;
    const eventPayload: any = findEventPayload(body);
    const data: any = eventPayload ?? vzapsData(body) ?? {};
    const rawEvent = String(
      eventPayload?.type ??
        (typeof body?.event === "string" ? body.event : undefined) ??
        body?.type ??
        body?.event_type ??
        body?.eventType ??
        body?.Event ??
        body?.name ??
        data?.type ??
        (typeof data?.event === "string" ? data.event : undefined) ??
        "",
    );
    // Normaliza nomes como "message", "MESSAGE", "message.received", "read_receipt".
    const norm = rawEvent.toLowerCase().replace(/[^a-z]/g, "");
    const eventType = norm.startsWith("message") || norm.includes("messagereceived") || norm === "messages"
      ? "Message"
      : norm.includes("readreceipt") || norm.includes("ack") || norm.includes("status")
      ? "ReadReceipt"
      : norm.includes("connected") && !norm.includes("dis")
      ? "Connected"
      : norm.includes("disconnected")
      ? "Disconnected"
      : rawEvent;

    // ── 2. Eventos de conexão ──
    if (eventType === "Connected" || eventType === "Disconnected") {
      await supabase
        .from("whatsapp_instances")
        .update({
          status: eventType === "Connected" ? "connected" : "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instance.id);
      return json({ success: true, event: eventType });
    }

    // ── 3. Recibos de entrega/leitura ──
    if (eventType === "ReadReceipt") {
      const receiptRaw = parseJsonValue(data?.event ?? data?.Event);
      const receipt = (receiptRaw && typeof receiptRaw === "object" ? receiptRaw : data) as any;
      const stateRaw = data?.state ?? data?.State ?? receipt?.state ?? receipt?.State ??
        data?.status ?? data?.Status ?? data?.ack ?? data?.Ack ?? receipt?.type ?? receipt?.Type ?? "";
      const stateNorm = String(stateRaw).toLowerCase().replace(/[^a-z0-9]/g, "");

      // Coleta identificadores em qualquer um dos formatos conhecidos.
      const ids: string[] = [];
      const pushId = (v: unknown) => {
        if (typeof v === "string" && v.trim() && !ids.includes(v.trim())) ids.push(v.trim());
      };
      const pushList = (v: unknown) => {
        if (Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === "string") pushId(item);
            else if (item && typeof item === "object") {
              pushId((item as any).id ?? (item as any).ID ?? (item as any).message_id);
            }
          }
        }
      };
      for (const src of [receipt, data]) {
        if (!src || typeof src !== "object") continue;
        pushList(
          (src as any).message_i_ds ?? (src as any).MessageIDs ?? (src as any).message_ids ??
            (src as any).messageIds ?? (src as any).ids ?? (src as any).IDs,
        );
        pushList((src as any).keys ?? (src as any).Keys);
        for (
          const candidate of [
            (src as any).MessageID,
            (src as any).message_id,
            (src as any).messageId,
            (src as any).id,
            (src as any).ID,
            (src as any).key?.id,
            (src as any).Key?.ID,
            (src as any).info?.id,
            (src as any).Info?.ID,
            (src as any).message?.id,
            (src as any).message?.key?.id,
          ]
        ) pushId(candidate);
      }

      console.log("[webhook-vzaps] receipt", {
        stateRaw: typeof stateRaw === "string" ? stateRaw : typeof stateRaw,
        idCount: ids.length,
      });

      if (stateNorm === "readself" || stateNorm === "played") {
        return json({ success: true, event: eventType, skipped: "read_self" });
      }
      const mapped = /read|4/.test(stateNorm)
        ? "read"
        : /deliver|3/.test(stateNorm)
        ? "delivered"
        : /sent|server|2/.test(stateNorm)
        ? "sent"
        : null;
      if (!mapped) return json({ success: true, event: eventType, skipped: `state ${stateNorm || "empty"}` });
      if (!ids.length) return json({ success: true, event: eventType, skipped: "no message ids" });

      let updated = 0;
      for (const messageId of ids) {
        let { data: current } = await supabase
          .from("messages")
          .select("id, status")
          .eq("company_id", company_id)
          .eq("message_id", messageId)
          .maybeSingle();
        if (!current) {
          const fallback = await supabase
            .from("messages")
            .select("id, status")
            .eq("company_id", company_id)
            .eq("client_message_id", messageId)
            .maybeSingle();
          current = fallback.data as any;
        }
        if (!current) continue;
        if (statusPriority(mapped) <= statusPriority(current.status)) continue;
        const { error: upErr } = await supabase.from("messages").update({ status: mapped }).eq("id", current.id);
        if (upErr) throw upErr;
        updated++;
      }
      return json({ success: true, event: eventType, status: mapped, updated });
    }

    if (eventType !== "Message") {
      console.log("[webhook-vzaps] ignored event", {
        eventType: eventType || "empty",
        rootKeys: body && typeof body === "object" ? Object.keys(body).slice(0, 12) : [],
        jsonDataType: typeof body?.json_data,
        eventValueType: typeof body?.event,
      });
      return json({ success: true, ignored: eventType });
    }

    // ── 4. Mensagem ──
    const info: any = data?.Info ?? data?.info ?? data?.event?.Info ?? data?.event?.info ?? {};
    const waMessage: any = data?.Message ?? data?.message ?? data?.event?.Message ?? data?.event?.message ?? {};

    const messageId: string | undefined = info?.ID ?? info?.Id ?? info?.id ?? data?.id ?? undefined;
    const rawChatJid: string = String(info?.Chat ?? info?.chat ?? info?.Sender ?? info?.sender ?? data?.from ?? "");
    const alternateSender: string = String(info?.SenderAlt ?? info?.sender_alt ?? info?.RecipientAlt ?? info?.recipient_alt ?? "");
    const chatJid = rawChatJid.includes("@lid") && alternateSender ? alternateSender : rawChatJid;
    const fromMe: boolean = info?.IsFromMe === true || info?.isFromMe === true || info?.is_from_me === true || data?.from_me === true;

    if (!messageId || !chatJid) {
      console.log("[webhook-vzaps] message skipped: missing id or chat", { eventType });
      return json({ success: true, skipped: "missing id or chat" });
    }
    // A VZaps pode disparar primeiro uma cópia parcial contendo apenas o LID.
    // Aguarda a cópia seguinte com sender_alt para não criar o contato com um identificador incorreto.
    if (rawChatJid.includes("@lid") && !alternateSender) {
      console.log("[webhook-vzaps] message skipped: awaiting alternate sender", { messageId });
      return json({ success: true, skipped: "lid without alternate sender" });
    }
    if (chatJid.includes("@g.us") || info?.IsGroup === true) {
      return json({ success: true, skipped: "group message" });
    }
    if (fromMe) {
      // Mensagens enviadas por nós já são persistidas pelo EloChat no envio.
      return json({ success: true, skipped: "from_me" });
    }

    const normalizedPhone = normalizePhone(chatJid);
    if (!normalizedPhone) return json({ success: true, skipped: "chat is not a phone" });
    const phoneVariants = brazilPhoneVariants(normalizedPhone);

    // Tipo + conteúdo
    const mediaNodeKey = waMessage?.imageMessage
      ? "image"
      : waMessage?.videoMessage
      ? "video"
      : waMessage?.audioMessage
      ? "audio"
      : waMessage?.documentMessage
      ? "document"
      : waMessage?.stickerMessage
      ? "sticker"
      : null;
    const message_type = mediaNodeKey === "sticker" ? "sticker" : (mediaNodeKey ?? "text");
    const mediaNode: any =
      mediaNodeKey && mediaNodeKey !== "sticker"
        ? waMessage[`${mediaNodeKey}Message`]
        : waMessage?.stickerMessage ?? null;

    let content = String(
      waMessage?.conversation ??
        waMessage?.extendedTextMessage?.text ??
        mediaNode?.caption ??
        data?.text ??
        "",
    );
    const originalFileName: string | undefined = mediaNode?.fileName ?? mediaNode?.file_name ?? undefined;
    let mimetype: string | undefined = mediaNode?.mimetype ?? undefined;
    const timestamp = info?.Timestamp ?? info?.timestamp;
    const sent_at = timestamp
      ? new Date(timestamp).toISOString()
      : body?.created_at
      ? new Date(body.created_at).toISOString()
      : new Date().toISOString();

    // Dedupe
    const { data: existing } = await supabase
      .from("messages")
      .select("id")
      .eq("company_id", company_id)
      .eq("message_id", messageId)
      .maybeSingle();
    if (existing) return json({ success: true, action: "dedup" });

    // user_id da empresa
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("company_id", company_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const userId = profile?.user_id;
    if (!userId) return json({ error: "No user found for company" }, 404);

    // Contato
    let contactId: string;
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
            name: String(info?.PushName || info?.push_name || data?.push_name || `WhatsApp ${normalizedPhone.slice(-4)}`),
            phone: normalizedPhone,
            source: "whatsapp",
          })
          .select("id")
          .single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }
    }

    // Conversa
    let conversationId: string;
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
            contact_id: contactId,
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

    // ── Mídia: media_url pronta ou descriptografia pela própria VZaps ──
    let media_url: string | null = null;
    if (message_type !== "text") {
      const remoteUrl: string | null = data?.media_url ?? data?.mediaUrl ?? null;
      try {
        let bin: Uint8Array | null = null;

        if (remoteUrl) {
          const mediaResp = await fetch(remoteUrl);
          if (!mediaResp.ok) throw new Error(`media fetch ${mediaResp.status}`);
          mimetype = mediaResp.headers.get("content-type") ?? mimetype;
          bin = new Uint8Array(await mediaResp.arrayBuffer());
        } else if (mediaNode && mediaNodeKey && mediaNodeKey !== "sticker") {
          const { data: credRows } = await supabase
            .rpc("get_instance_evolution_credentials", { p_instance_id: instance.id });
          const cred = Array.isArray(credRows) ? credRows[0] : credRows;
          const base = vzapsBase(cred?.base_url ?? (instance as any).evolution_base_url);
          const instanceToken = (cred?.api_key || "").trim();
          if (!instanceToken) throw new Error("token da instância VZaps ausente");

          const resp = await fetch(
            `${base}/instances/${encodeURIComponent(instance.instance_id as string)}/chat/download${mediaNodeKey}`,
            {
              method: "POST",
              headers: vzapsHeaders(instanceToken, (instance as any).vzaps_client_token),
              body: JSON.stringify(toSnakeCase(mediaNode)),
            },
          );
          const payload = await resp.json().catch(() => null);
          if (!resp.ok) throw new Error(`download ${resp.status}`);
          const dl = vzapsData(payload) ?? {};
          const b64 = dl?.data ?? dl?.file ?? dl?.base64 ?? dl?.media ?? null;
          if (!b64) throw new Error("download sem conteúdo");
          mimetype = dl?.mimetype ?? mimetype;
          bin = base64ToBytes(String(b64));
        }

        if (!bin) throw new Error("mídia indisponível");

        const nameExt = originalFileName?.includes(".")
          ? originalFileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)
          : "";
        const ext = nameExt || extForMime(mimetype, message_type);
        const path = `${company_id}/${conversationId}/${messageId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("whatsapp-media")
          .upload(path, bin, { contentType: mimetype || "application/octet-stream", upsert: true });
        if (upErr) throw upErr;
        media_url = path;
      } catch (err) {
        console.error("[webhook-vzaps] media failed:", err instanceof Error ? err.message : err);
        content = content || "[mídia não recuperada]";
      }
    }

    const metadata: Record<string, unknown> = {
      instance_id: instance.instance_id,
      provider: "vzaps",
      raw: data,
    };
    if (media_url) metadata.media_url = media_url;
    if (mimetype) metadata.mimetype = mimetype;
    if (originalFileName) metadata.file_name = originalFileName;

    const { error: msgErr } = await supabase.from("messages").insert({
      message_id: messageId,
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
      provider: "vzaps",
      from_phone: normalizedPhone,
      message_text: content,
      message_type,
      raw_data: data,
    });

    // ── 5. Kill switches da IA ──
    const { data: companyRow } = await supabase
      .from("companies")
      .select("ai_enabled, ai_pipeline_enabled, debounce_seconds")
      .eq("id", company_id)
      .maybeSingle();

    if (companyRow?.ai_enabled === false || companyRow?.ai_pipeline_enabled === false) {
      return json({ success: true, action: "inserted", ai: "disabled_company" });
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
      return json({ success: true, action: "inserted", ai: "paused_contact" });
    }

    // ── 6. Buffer para o pipeline de IA ──
    const debounce = Math.max(0, Number(companyRow?.debounce_seconds ?? 5));
    const now = new Date();
    const { error: bufErr } = await supabase.from("message_buffer").upsert(
      {
        company_id,
        conversation_id: conversationId,
        contact_id: contactId,
        flush_at: new Date(now.getTime() + debounce * 1000).toISOString(),
        last_message_at: now.toISOString(),
        status: "pending",
        locked_at: null,
        attempts: 0,
      },
      { onConflict: "conversation_id" },
    );
    if (bufErr) throw bufErr;

    console.log("[webhook-vzaps] message processed", { messageId, conversationId, company_id });
    return json({ success: true, action: "inserted", buffered: true });
  } catch (error) {
    console.error("[webhook-vzaps] error:", error);
    const msg = error instanceof Error ? error.message : "unknown error";
    return json({ error: msg }, 500);
  }
});
