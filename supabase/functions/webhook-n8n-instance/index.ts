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
  // Strip Evolution API device suffix (:XX) first, then remove non-digits
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

      // Unknown statuses: ignore silently, return 200
      if (!KNOWN_STATUSES.has(status)) {
        return json({ success: true, action: "status_ignored", message: `Status '${status}' not recognized, ignored` });
      }

      const mappedStatus = normalizeStatus(status);

      // 1. Try exact match update first (most common path)
      const { data: updated, error: updateErr } = await supabase
        .from("messages")
        .update({ status: mappedStatus })
        .eq("message_id", message_id)
        .select("id")
        .maybeSingle();
      if (updateErr) throw updateErr;

      if (updated) {
        console.log("[update_message_status] exact match found, id:", updated.id);
        return json({ success: true, action: "updated_status", id: updated.id, status: mappedStatus });
      }

      // 2. Fallback: find most recent outbound app-* message and reconcile
      console.log("[update_message_status] no exact match, trying fallback reconciliation...");
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();

      let query = supabase
        .from("messages")
        .select("id, message_id")
        .eq("direction", "outbound")
        .like("message_id", "app-%")
        .in("status", ["sending", "sent", "server_ack"])
        .gte("created_at", twoMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (company_id) {
        query = query.eq("company_id", company_id);
      }

      const { data: fallback } = await query.maybeSingle();

      if (fallback) {
        console.log("[update_message_status] fallback match:", fallback.id, "old message_id:", fallback.message_id, "→ new:", message_id);
        const { error: reconErr } = await supabase
          .from("messages")
          .update({ message_id, status: mappedStatus })
          .eq("id", fallback.id);
        if (reconErr) throw reconErr;
        return json({ success: true, action: "reconciled_and_updated", id: fallback.id, status: mappedStatus });
      }

      // 3. Status arrived before message creation — create shell with real conversation
      console.log("[update_message_status] no match found, creating shell record for message_id:", message_id);

      if (!company_id || !phone_number) {
        console.log("[update_message_status] missing company_id or phone_number, cannot create shell. Storing status only.");
        return json({ success: true, action: "status_deferred", message: "No match found and missing company_id/phone_number for shell creation" });
      }

      const userId = await getUserForCompany(company_id);
      if (!userId) {
        return json({ error: "No user found for this company" }, 404);
      }

      const normalizedPhone = normalizePhone(phone_number);

      // Find or create contact
      let contactId: string;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", company_id)
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id,
            name: normalizedPhone,
            phone: normalizedPhone,
            source: "whatsapp",
          })
          .select("id")
          .single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      // Find or create conversation
      let conversationId: string;
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("company_id", company_id)
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            company_id,
            contact_id: contactId,
            channel: "whatsapp",
            status: "open",
            unread_count: 0,
          })
          .select("id")
          .single();
        if (convErr) throw convErr;
        conversationId = newConv.id;
      }

      // Upsert shell message with real FK references
      const { data: upserted, error: upsertErr } = await supabase
        .from("messages")
        .upsert({
          message_id,
          status: mappedStatus,
          direction: "outbound",
          channel: "whatsapp",
          content: "",
          message_type: "text",
          company_id,
          user_id: userId,
          contact_id: contactId,
          conversation_id: conversationId,
        }, { onConflict: "message_id" })
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;

      console.log("[update_message_status] shell upserted with real conversation, id:", upserted.id);
      return json({ success: true, action: "shell_created", id: upserted.id, status: mappedStatus });
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
        if (contact_name && contact_name.trim() && existingContact.name === normalizedPhone) {
          await supabase.from("contacts").update({ name: contact_name.trim() }).eq("id", contactId);
        }
      } else {
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id,
            name: contact_name?.trim() || normalizedPhone,
            phone: normalizedPhone,
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
      const metaValue = Object.keys(messageMetadata).length > 0 ? messageMetadata : null;

      let upsertedId: string;

      // For outbound messages: try to match an existing app-generated message first
      if (messageDirection === "outbound") {
        // 1. Check if message_id already exists (standard upsert path)
        const { data: existingById } = await supabase
          .from("messages")
          .select("id")
          .eq("message_id", message_id)
          .maybeSingle();

        if (existingById) {
          // Update existing message
          await supabase.from("messages")
            .update({ status: mappedStatus, metadata: metaValue })
            .eq("id", existingById.id);
          upsertedId = existingById.id;
        } else {
          // 2. Try to find a recent app-originated message with matching content in same conversation
          const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
          const { data: appMsg } = await supabase
            .from("messages")
            .select("id, message_id")
            .eq("conversation_id", conversationId)
            .eq("direction", "outbound")
            .eq("content", messageContent)
            .gte("created_at", oneMinuteAgo)
            .like("message_id", "app-%")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (appMsg) {
            // Update the app message with the real Evolution message_id + status
            await supabase.from("messages")
              .update({ message_id, status: mappedStatus, metadata: metaValue })
              .eq("id", appMsg.id);
            upsertedId = appMsg.id;
          } else {
            // 3. No match found — insert new
            const { data: inserted, error: insErr } = await supabase
              .from("messages")
              .insert({
                message_id, conversation_id: conversationId, contact_id: contactId,
                user_id: userId, company_id, channel: "whatsapp",
                direction: messageDirection, content: messageContent,
                message_type: messageType, status: mappedStatus, metadata: metaValue,
                created_at: sent_at || new Date().toISOString(),
              })
              .select("id").single();
            if (insErr) throw insErr;
            upsertedId = inserted.id;
          }
        }
      } else {
        // Inbound: standard upsert by message_id
        const { data: upserted, error: msgErr } = await supabase
          .from("messages")
          .upsert(
            {
              message_id, conversation_id: conversationId, contact_id: contactId,
              user_id: userId, company_id, channel: "whatsapp",
              direction: messageDirection, content: messageContent,
              message_type: messageType, status: mappedStatus, metadata: metaValue,
              created_at: sent_at || new Date().toISOString(),
            },
            { onConflict: "message_id" }
          )
          .select("id").single();
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
