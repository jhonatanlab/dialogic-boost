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
    const body = await req.json();
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
