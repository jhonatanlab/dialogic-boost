import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log("Raw body received:", rawBody?.substring(0, 500));
    console.log("Content-Type:", req.headers.get("content-type"));

    if (!rawBody || rawBody.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Empty request body. Send a JSON with 'action' and 'data' fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", received: rawBody.substring(0, 200) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, data } = body;

    if (!action || !data) {
      return new Response(
        JSON.stringify({ error: "Missing action or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "upsert_instance") {
      const { company_id, instance_id, instance_token, hash, status } = data;

      if (!company_id) {
        return new Response(
          JSON.stringify({ error: "company_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if instance already exists for this company
      const { data: existing } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("company_id", company_id)
        .maybeSingle();

      if (existing) {
        // Update existing
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

        return new Response(
          JSON.stringify({ success: true, action: "updated", id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Get company name for the insert
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", company_id)
          .single();

        // Insert new - use a service-level user_id placeholder since this comes from n8n
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("company_id", company_id)
          .limit(1)
          .single();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: "No user found for this company" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: inserted, error } = await supabase
          .from("whatsapp_instances")
          .insert({
            company_id,
            company_name: company?.name || "Unknown",
            instance_id: instance_id || null,
            instance_token: instance_token || null,
            hash: hash || null,
            status: status || "disconnected",
            user_id: profile.user_id,
          })
          .select("id")
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action: "inserted", id: inserted.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "upsert_message") {
      const {
        company_id,
        instance_id,
        message_id,
        phone_number,
        contact_name,
        direction,
        content,
        media_type,
        media_url,
        mimetype,
        status,
        sent_at,
      } = data;

      if (!company_id || !message_id || !phone_number) {
        return new Response(
          JSON.stringify({ error: "company_id, message_id and phone_number are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find a user for this company
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", company_id)
        .limit(1)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "No user found for this company" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = profile.user_id;

      // Find or create contact by phone
      let contactId: string;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", company_id)
        .eq("phone", phone_number)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id,
            name: contact_name || phone_number,
            phone: phone_number,
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
        .eq("status", "open")
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
            unread_count: direction === "inbound" ? 1 : 0,
          })
          .select("id")
          .single();

        if (convErr) throw convErr;
        conversationId = newConv.id;
      }

      // Build message payload using message_id as the official WhatsApp message identifier
      const messageType = media_type && media_type !== "text" ? media_type : "text";
      const messageContent = typeof content === "string" ? content : "";
      const messageDirection = direction === "outbound" ? "outbound" : "inbound";
      const messageMetadata =
        media_url || mimetype || instance_id
          ? {
              instance_id: instance_id || null,
              media_url: media_url || null,
              mimetype: mimetype || null,
            }
          : null;

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
            status: status || "received",
            metadata: messageMetadata,
            created_at: sent_at || new Date().toISOString(),
          },
          { onConflict: "message_id" }
        )
        .select("id")
        .single();

      if (msgErr) throw msgErr;

      // Update conversation last_message_at and unread_count
      const updateData: Record<string, unknown> = {
        last_message_at: sent_at || new Date().toISOString(),
      };
      if (messageDirection === "inbound") {
        // Increment unread
        const { data: conv } = await supabase
          .from("conversations")
          .select("unread_count")
          .eq("id", conversationId)
          .single();
        updateData.unread_count = (conv?.unread_count || 0) + 1;
      }
      await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversationId);

      return new Response(
        JSON.stringify({ success: true, action: "upserted_message", id: upserted.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_instance_by_company") {
      const { company_id } = data;

      if (!company_id) {
        return new Response(
          JSON.stringify({ error: "company_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", company_id)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, instance: instance || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_message_status") {
      const { message_id, status } = data;

      if (!message_id || !status) {
        return new Response(
          JSON.stringify({ error: "message_id and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validStatuses = ["sent", "delivered", "read", "failed", "received", "server_ack"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to update; if message doesn't exist yet, ignore silently
      const { data: updated, error } = await supabase
        .from("messages")
        .update({ status })
        .eq("message_id", message_id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, action: "updated_status", id: updated?.id || null, status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_instance_status") {
      const { company_id, instance_id, status } = data;

      if (!company_id || !status) {
        return new Response(
          JSON.stringify({ error: "company_id and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validStatuses = ["connected", "disconnected", "connecting"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (instance_id) updatePayload.instance_id = instance_id;

      const { data: updated, error } = await supabase
        .from("whatsapp_instances")
        .update(updatePayload)
        .eq("company_id", company_id)
        .select("id, status")
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        return new Response(
          JSON.stringify({ error: "No instance found for this company_id" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "updated_instance_status", id: updated.id, status: updated.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
