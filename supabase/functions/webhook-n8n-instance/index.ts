import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Status mapping: 'played' → 'read' for display purposes
const KNOWN_STATUSES = new Set([
  "sending", "sent", "server_ack", "received", "delivered", "read", "failed", "played", "deleted",
]);

const normalizeStatus = (status: string): string => {
  if (status === "played") return "read";
  return status;
};

const statusPriority = (status: string): number => {
  switch (status) {
    case "sending": return 0;
    case "sent": case "server_ack": return 1;
    case "delivered": case "received": return 2;
    case "read": return 3;
    case "failed": return 4;
    case "deleted": return 5;
    default: return -1;
  }
};

// Normalize phone: strip everything except digits
const normalizePhone = (phone: string): string => {
  const basePhone = phone.split(':')[0];
  return basePhone.replace(/\D/g, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return json({ error: "Empty request body" }, 400);
    }

    let body: { action?: string; data?: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON", received: rawBody.substring(0, 200) }, 400);
    }

    const { action, data } = body;
    if (!action || !data) return json({ error: "Missing action or data" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Helper: get user_id for a company ──
    const getUserForCompany = async (company_id: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", company_id)
        .limit(1)
        .single();
      return profile?.user_id || null;
    };

    // ── Helper: find or create contact ──
    const findOrCreateContact = async (company_id: string, userId: string, normalizedPhone: string, contactName?: string) => {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("company_id", company_id)
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existing) {
        if (contactName && contactName.trim() && existing.name === normalizedPhone) {
          await supabase.from("contacts").update({ name: contactName.trim() }).eq("id", existing.id);
        }
        return existing.id;
      }

      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          company_id,
          name: contactName?.trim() || normalizedPhone,
          phone: normalizedPhone,
          source: "whatsapp",
        })
        .select("id")
        .single();
      if (error) throw error;
      return newContact.id;
    };

    // ── Helper: find or create conversation ──
    const findOrCreateConversation = async (company_id: string, userId: string, contactId: string, unreadIncrement = 0) => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, status")
        .eq("company_id", company_id)
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        if (existing.status === "closed") {
          await supabase.from("conversations").update({ status: "open" }).eq("id", existing.id);
        }
        return existing.id;
      }

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          company_id,
          contact_id: contactId,
          channel: "whatsapp",
          status: "open",
          unread_count: unreadIncrement,
        })
        .select("id")
        .single();
      if (error) throw error;
      return newConv.id;
    };

    // ═══════════════════════════════════════════
    // ACTION: upsert_instance
    // ═══════════════════════════════════════════
    if (action === "upsert_instance") {
      const { company_id, instance_id, instance_token, hash, status } = data as Record<string, string>;
      if (!company_id) return json({ error: "company_id is required" }, 400);

      const { data: existing } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("company_id", company_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({
            instance_id: instance_id || null,
            instance_token: instance_token || null,
            hash: hash || null,
            status: status || "disconnected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        return json({ success: true, action: "updated", id: existing.id });
      }

      const userId = await getUserForCompany(company_id);
      if (!userId) return json({ error: "No user found for this company" }, 404);

      const { data: company } = await supabase.from("companies").select("name").eq("id", company_id).single();

      const { data: inserted, error } = await supabase
        .from("whatsapp_instances")
        .insert({
          company_id,
          company_name: company?.name || "Unknown",
          instance_id: instance_id || null,
          instance_token: instance_token || null,
          hash: hash || null,
          status: status || "disconnected",
          user_id: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ success: true, action: "inserted", id: inserted.id });
    }

    // ═══════════════════════════════════════════
    // ACTION: get_instance_by_company
    // ═══════════════════════════════════════════
    if (action === "get_instance_by_company") {
      const { company_id } = data as Record<string, string>;
      if (!company_id) return json({ error: "company_id is required" }, 400);

      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", company_id)
        .maybeSingle();
      if (error) throw error;
      return json({ success: true, instance: instance || null });
    }

    // ═══════════════════════════════════════════
    // ACTION: update_instance_status
    // ═══════════════════════════════════════════
    if (action === "update_instance_status") {
      const { company_id, instance_id, status } = data as Record<string, string>;
      if (!company_id || !status) return json({ error: "company_id and status are required" }, 400);

      const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (instance_id) updatePayload.instance_id = instance_id;

      const { data: updated, error } = await supabase
        .from("whatsapp_instances")
        .update(updatePayload)
        .eq("company_id", company_id)
        .select("id, status")
        .maybeSingle();
      if (error) throw error;
      if (!updated) return json({ error: "No instance found for this company_id" }, 404);
      return json({ success: true, action: "updated_instance_status", id: updated.id, status: updated.status });
    }

    // ═══════════════════════════════════════════
    // ACTION: update_message_status
    // ═══════════════════════════════════════════
    if (action === "update_message_status") {
      const { message_id, status, company_id, phone_number } = data as Record<string, string>;
      if (!message_id || !status) return json({ error: "message_id and status are required" }, 400);

      console.log("[update_message_status] message_id:", message_id, "status:", status, "company_id:", company_id || "N/A", "phone:", phone_number || "N/A");

      if (!KNOWN_STATUSES.has(status)) {
        return json({ success: true, action: "status_ignored", message: `Status '${status}' not recognized, ignored` });
      }

      const mappedStatus = normalizeStatus(status);

      // 1. Try exact match update by message_id (most common — message already exists)
      const { data: updated, error: updateErr } = await supabase
        .from("messages")
        .update({ status: mappedStatus })
        .eq("message_id", message_id)
        .select("id")
        .maybeSingle();
      if (updateErr) throw updateErr;

      if (updated) {
        console.log("[update_message_status] found by message_id, id:", updated.id);
        return json({ success: true, action: "updated_status", id: updated.id, status: mappedStatus });
      }

      // 2. Race condition — status arrived before upsert_message. Create a placeholder row via upsert.
      if (!company_id) {
        console.log("[update_message_status] no match and no company_id — deferring");
        return json({ success: true, action: "status_deferred", message: "Message not yet in DB and no company_id to create placeholder" });
      }

      const userId = await getUserForCompany(company_id);
      if (!userId) {
        return json({ success: true, action: "status_deferred", message: "No user found for company, deferring" });
      }

      // Find or create a contact + conversation if phone_number is provided
      let contactId: string | null = null;
      let conversationId: string | null = null;

      if (phone_number) {
        const normalizedPhone = normalizePhone(phone_number);
        contactId = await findOrCreateContact(company_id, userId, normalizedPhone);
        conversationId = await findOrCreateConversation(company_id, userId, contactId, 0);
      }

      if (!contactId || !conversationId) {
        console.log("[update_message_status] cannot resolve contact/conversation — deferring");
        return json({ success: true, action: "status_deferred", message: "Cannot resolve contact, deferring" });
      }

      const { data: upserted, error: upsertErr } = await supabase
        .from("messages")
        .upsert({
          message_id,
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: userId,
          company_id,
          channel: "whatsapp",
          direction: "outbound",
          content: "",
          message_type: "text",
          status: mappedStatus,
          metadata: { pending_content: true },
        }, { onConflict: "message_id" })
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;

      console.log("[update_message_status] placeholder created via upsert, id:", upserted.id);
      return json({ success: true, action: "upserted_placeholder", id: upserted.id, status: mappedStatus });
    }

    // ═══════════════════════════════════════════
    // ACTION: upsert_message
    // ═══════════════════════════════════════════
    if (action === "upsert_message") {
      const {
        company_id, instance_id, message_id, phone_number,
        contact_name, direction, content, media_type,
        media_url, mimetype, status, sent_at, internal_id,
      } = data as Record<string, string>;

      if (!company_id || !message_id || !phone_number) {
        return json({ error: "company_id, message_id and phone_number are required" }, 400);
      }

      const normalizedPhone = normalizePhone(phone_number);
      const userId = await getUserForCompany(company_id);
      if (!userId) return json({ error: "No user found for this company" }, 404);

      const contactId = await findOrCreateContact(company_id, userId, normalizedPhone, contact_name);
      const messageDirection = direction === "outbound" ? "outbound" : "inbound";
      const conversationId = await findOrCreateConversation(company_id, userId, contactId, messageDirection === "inbound" ? 1 : 0);

      // ── Build message fields ──
      const messageType = media_type && media_type !== "text" ? media_type : "text";
      const messageContent = typeof content === "string" ? content : "";
      const rawStatus = status || "received";
      const mappedStatus = normalizeStatus(rawStatus);
      const messageMetadata: Record<string, unknown> = {};
      if (instance_id) messageMetadata.instance_id = instance_id;
      if (media_url) messageMetadata.media_url = media_url;
      if (mimetype) messageMetadata.mimetype = mimetype;
      messageMetadata.pending_content = false;
      const metaValue = Object.keys(messageMetadata).length > 0 ? messageMetadata : null;

      let upsertedId: string;

      // ── Helper: resolve final status respecting hierarchy ──
      const resolveStatus = async (targetMessageId: string, incomingStatus: string): Promise<string> => {
        const { data: row } = await supabase
          .from("messages")
          .select("status")
          .eq("message_id", targetMessageId)
          .maybeSingle();
        if (row && statusPriority(row.status) > statusPriority(incomingStatus)) {
          console.log("[upsert_message] preserving higher status:", row.status, ">", incomingStatus);
          return row.status;
        }
        return incomingStatus;
      };

      // ── Reconciliation: if internal_id is provided, update existing row ──
      if (internal_id) {
        console.log("[upsert_message] internal_id provided:", internal_id, "→ official message_id:", message_id);

        const { data: existing } = await supabase
          .from("messages")
          .select("id, status")
          .eq("message_id", internal_id)
          .maybeSingle();

        if (existing) {
          // Preserve status if existing is more advanced
          const finalStatus = statusPriority(existing.status) > statusPriority(mappedStatus)
            ? existing.status
            : mappedStatus;
          console.log("[upsert_message] reconcile status:", existing.status, "→", finalStatus);

          const { error: updateErr } = await supabase
            .from("messages")
            .update({
              message_id,
              conversation_id: conversationId,
              contact_id: contactId,
              status: finalStatus,
              content: messageContent || undefined,
              message_type: messageType,
              metadata: metaValue,
            })
            .eq("id", existing.id);
          if (updateErr) throw updateErr;

          upsertedId = existing.id;
          console.log("[upsert_message] reconciled internal_id →", existing.id);
        } else {
          // internal_id not found — fall through to normal upsert
          console.log("[upsert_message] internal_id not found in DB, doing normal upsert");
          const finalStatus = await resolveStatus(message_id, mappedStatus);
          const fullRow = {
            message_id,
            conversation_id: conversationId,
            contact_id: contactId,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: messageDirection,
            content: messageContent,
            message_type: messageType,
            status: finalStatus,
            metadata: metaValue,
            created_at: sent_at || new Date().toISOString(),
          };
          const { data: upserted, error: msgErr } = await supabase
            .from("messages")
            .upsert(fullRow, { onConflict: "message_id" })
            .select("id")
            .single();
          if (msgErr) throw msgErr;
          upsertedId = upserted.id;
        }
      } else {
        // ── Normal upsert (inbound messages or no internal_id) ──
        const finalStatus = await resolveStatus(message_id, mappedStatus);
        const fullRow = {
          message_id,
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: userId,
          company_id,
          channel: "whatsapp",
          direction: messageDirection,
          content: messageContent,
          message_type: messageType,
          status: finalStatus,
          metadata: metaValue,
          created_at: sent_at || new Date().toISOString(),
        };
        const { data: upserted, error: msgErr } = await supabase
          .from("messages")
          .upsert(fullRow, { onConflict: "message_id" })
          .select("id")
          .single();
        if (msgErr) throw msgErr;
        upsertedId = upserted.id;
      }

      // ── Update conversation ──
      const updateData: Record<string, unknown> = {
        last_message_at: sent_at || new Date().toISOString(),
      };
      if (messageDirection === "inbound") {
        const { data: conv } = await supabase
          .from("conversations")
          .select("unread_count")
          .eq("id", conversationId)
          .single();
        updateData.unread_count = (conv?.unread_count || 0) + 1;
      }
      await supabase.from("conversations").update(updateData).eq("id", conversationId);

      return json({ success: true, action: "upserted_message", id: upsertedId });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error.message }, 500);
  }
});
