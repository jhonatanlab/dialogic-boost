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

// Normalize phone: strip everything except digits
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, "");
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
      const { message_id, status } = data as Record<string, string>;
      if (!message_id || !status) return json({ error: "message_id and status are required" }, 400);

      // Unknown statuses: ignore silently, return 200
      if (!KNOWN_STATUSES.has(status)) {
        return json({ success: true, action: "status_ignored", message: `Status '${status}' not recognized, ignored` });
      }

      const mappedStatus = normalizeStatus(status);

      const { data: updated, error } = await supabase
        .from("messages")
        .update({ status: mappedStatus })
        .eq("message_id", message_id)
        .select("id")
        .maybeSingle();
      if (error) throw error;

      // If message not found, return success silently
      return json({ success: true, action: "updated_status", id: updated?.id || null, status: mappedStatus });
    }

    // ═══════════════════════════════════════════
    // ACTION: upsert_message
    // ═══════════════════════════════════════════
    if (action === "upsert_message") {
      const {
        company_id, instance_id, message_id, phone_number,
        contact_name, direction, content, media_type,
        media_url, mimetype, status, sent_at,
      } = data as Record<string, string>;

      if (!company_id || !message_id || !phone_number) {
        return json({ error: "company_id, message_id and phone_number are required" }, 400);
      }

      // Normalize phone to digits only for consistent matching
      const normalizedPhone = normalizePhone(phone_number);

      const userId = await getUserForCompany(company_id);
      if (!userId) return json({ error: "No user found for this company" }, 404);

      // ── Find or create contact by normalized phone + company_id ──
      let contactId: string;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("company_id", company_id)
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Sync name if pushName provided and current name is just the phone
        if (contact_name && contact_name.trim() && existingContact.name === phone_number) {
          await supabase.from("contacts").update({ name: contact_name.trim() }).eq("id", contactId);
        }
      } else {
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id,
            name: contact_name?.trim() || phone_number,
            phone: phone_number,
            source: "whatsapp",
          })
          .select("id")
          .single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      // ── Find or create conversation by contact_id + company_id ──
      let conversationId: string;
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, status")
        .eq("company_id", company_id)
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        if (existingConv.status === "closed") {
          await supabase.from("conversations").update({ status: "open" }).eq("id", conversationId);
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
            unread_count: direction === "inbound" ? 1 : 0,
          })
          .select("id")
          .single();
        if (convErr) throw convErr;
        conversationId = newConv.id;
      }

      // ── Build and upsert message ──
      const messageType = media_type && media_type !== "text" ? media_type : "text";
      const messageContent = typeof content === "string" ? content : "";
      const messageDirection = direction === "outbound" ? "outbound" : "inbound";
      const rawStatus = status || "received";
      const mappedStatus = normalizeStatus(rawStatus);
      const messageMetadata: Record<string, unknown> = {};
      if (instance_id) messageMetadata.instance_id = instance_id;
      if (media_url) messageMetadata.media_url = media_url;
      if (mimetype) messageMetadata.mimetype = mimetype;

      const { data: upserted, error: msgErr } = await supabase
        .from("messages")
        .upsert(
          {
            message_id,
            conversation_id: conversationId,
            contact_id: contactId,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: messageDirection,
            content: messageContent,
            message_type: messageType,
            status: mappedStatus,
            metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : null,
            created_at: sent_at || new Date().toISOString(),
          },
          { onConflict: "message_id" }
        )
        .select("id")
        .single();
      if (msgErr) throw msgErr;

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

      return json({ success: true, action: "upserted_message", id: upserted.id });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error.message }, 500);
  }
});
