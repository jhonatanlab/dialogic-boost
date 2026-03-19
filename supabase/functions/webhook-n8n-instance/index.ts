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

      // Build message content and type
      const messageType = media_type && media_type !== "text" ? media_type : "text";
      const messageContent = content || media_url || "";
      const messageDirection = direction === "outbound" ? "outbound" : "inbound";

      // Upsert message using external_id
      const { data: upserted, error: msgErr } = await supabase
        .from("messages")
        .upsert(
          {
            external_id: message_id,
            conversation_id: conversationId,
            contact_id: contactId,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: messageDirection,
            content: messageContent,
            message_type: messageType,
            status: status || "received",
            metadata: media_url ? { media_url, mimetype: mimetype || null } : null,
            created_at: sent_at || new Date().toISOString(),
          },
          { onConflict: "external_id" }
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
