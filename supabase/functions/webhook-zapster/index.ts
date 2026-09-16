// webhook-zapster — recebe os eventos da Zapster API (https://developer.zapsterapi.com)
// Autenticação: segredo na query string (?s=<webhook_secret>), pois a Zapster não envia headers customizados.
// Eventos tratados: message.received, message.sent|delivered|read|failed, instance.connected|disconnected|qrcode
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-instance-id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Hierarquia de status (igual aos outros webhooks) ──
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

const mapMessageType = (t: string): string => {
  const v = (t || "").toLowerCase();
  if (v === "ptt" || v.includes("audio")) return "audio";
  if (v === "sticker") return "sticker";
  if (v.includes("image")) return "image";
  if (v.includes("video")) return "video";
  if (v.includes("document") || v === "file") return "document";
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

    // ── 1. Resolver instância (X-Instance-ID) + validar segredo ──
    const headerInstance = req.headers.get("x-instance-id") ?? body?.instance_id ?? null;
    let query = supabase
      .from("whatsapp_instances")
      .select("id, company_id, instance_id, webhook_secret")
      .eq("provider", "zapster")
      .eq("webhook_secret", providedSecret);
    if (headerInstance) query = query.eq("instance_id", String(headerInstance));

    const { data: instance, error: instErr } = await query.limit(1).maybeSingle();
    if (instErr) throw instErr;
    if (!instance) {
      console.error("[webhook-zapster] instance/secret mismatch", { headerInstance });
      return json({ error: "Unauthorized" }, 401);
    }

    const company_id = instance.company_id as string;
    const eventType: string = body?.type ?? "";
    const data: any = body?.data ?? {};

    // ── 2. Eventos de instância ──
    if (eventType === "instance.connected" || eventType === "instance.disconnected" || eventType === "instance.forbidden") {
      await supabase
        .from("whatsapp_instances")
        .update({
          status: eventType === "instance.connected" ? "connected" : "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instance.id);
      return json({ success: true, event: eventType });
    }

    if (eventType === "instance.qrcode") {
      return json({ success: true, event: eventType, ignored: true });
    }

    // ── 3. Status de mensagens enviadas ──
    const statusMap: Record<string, string> = {
      "message.sent": "sent",
      "message.delivered": "delivered",
      "message.read": "read",
      "message.failed": "failed",
    };
    if (statusMap[eventType]) {
      const messageId: string | undefined = data?.id;
      if (!messageId) return json({ success: true, skipped: "missing data.id" });
      const mapped = statusMap[eventType];
      const { data: current } = await supabase
        .from("messages")
        .select("id, status")
        .eq("company_id", company_id)
        .eq("message_id", messageId)
        .maybeSingle();
      if (!current) return json({ success: true, event: eventType, action: "not_found" });
      if (mapped !== "failed" && statusPriority(mapped) <= statusPriority(current.status)) {
        return json({ success: true, event: eventType, action: "status_kept", kept: current.status });
      }
      const { error: upErr } = await supabase.from("messages").update({ status: mapped }).eq("id", current.id);
      if (upErr) throw upErr;
      return json({ success: true, event: eventType, action: "updated", status: mapped });
    }

    if (eventType !== "message.received") {
      console.log("[webhook-zapster] ignored event:", eventType);
      return json({ success: true, ignored: eventType });
    }

    // ── 4. Mensagem recebida ──
    const messageId: string | undefined = data?.id;
    const senderId: string = String(data?.sender?.id ?? "");
    if (!messageId || !senderId) return json({ success: true, skipped: "missing id or sender" });
    if (data?.recipient?.type === "group") {
      return json({ success: true, skipped: "group message" });
    }

    const normalizedPhone = normalizePhone(senderId);
    if (!normalizedPhone) return json({ success: true, skipped: "sender is not a phone" });
    const phoneVariants = brazilPhoneVariants(normalizedPhone);

    const message_type = mapMessageType(String(data?.type ?? "text"));
    let content = String(data?.content?.text ?? "");
    const mediaUrlRemote: string | null = data?.content?.media?.url ?? null;
    const originalFileName: string | undefined =
      data?.content?.media?.file_name ?? data?.content?.media?.fileName ?? undefined;
    const sent_at = data?.sent_at ? new Date(data.sent_at).toISOString() : new Date().toISOString();

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
            name: String(data?.sender?.name || `WhatsApp ${normalizedPhone.slice(-4)}`),
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

    // Mídia: baixar da URL da Zapster e guardar no bucket privado
    let media_url: string | null = null;
    let mimetype: string | undefined;
    if (message_type !== "text" && mediaUrlRemote) {
      try {
        const mediaResp = await fetch(mediaUrlRemote);
        if (!mediaResp.ok) throw new Error(`media fetch ${mediaResp.status}`);
        mimetype = mediaResp.headers.get("content-type") ?? undefined;
        const bin = new Uint8Array(await mediaResp.arrayBuffer());
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
        console.error("[webhook-zapster] media download failed:", err instanceof Error ? err.message : err);
        content = content || "[mídia não recuperada]";
      }
    } else if (message_type !== "text") {
      content = content || "[mídia não recuperada]";
    }

    const metadata: Record<string, unknown> = {
      instance_id: instance.instance_id,
      provider: "zapster",
      raw: body,
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
      provider: "zapster",
      from_phone: normalizedPhone,
      message_text: content,
      message_type,
      raw_data: body,
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

    return json({ success: true, action: "inserted", buffered: true });
  } catch (error) {
    console.error("[webhook-zapster] error:", error);
    const msg = error instanceof Error ? error.message : "unknown error";
    return json({ error: msg }, 500);
  }
});
