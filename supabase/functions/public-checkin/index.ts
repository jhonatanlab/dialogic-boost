import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { urlToken } = await req.json();

    if (!urlToken || typeof urlToken !== "string") {
      return new Response(
        JSON.stringify({ error: "urlToken é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch checkin link
    const { data: checkinLink, error: linkError } = await supabaseAdmin
      .from("checkin_links")
      .select("*")
      .eq("url_token", urlToken)
      .maybeSingle();

    if (linkError || !checkinLink) {
      return new Response(
        JSON.stringify({ error: "Link de check-in não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine WhatsApp number: from link, or fallback to company phone
    let whatsappNumber = checkinLink.whatsapp_number;

    if (!whatsappNumber && checkinLink.company_id) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("phone")
        .eq("id", checkinLink.company_id)
        .maybeSingle();

      if (company?.phone) {
        whatsappNumber = company.phone.replace(/\D/g, "");
      }
    }

    // Generate token
    const token = crypto.randomUUID().substring(0, 8).toUpperCase();

    // Insert checkin record
    const { error: recordError } = await supabaseAdmin
      .from("checkin_records")
      .insert({
        checkin_link_id: checkinLink.id,
        user_id: checkinLink.user_id,
        status: "pending",
        token,
        company_id: checkinLink.company_id,
      });

    if (recordError) {
      console.error("Erro ao inserir checkin_record:", recordError);
      return new Response(
        JSON.stringify({ error: "Erro ao registrar check-in" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        token,
        linkName: checkinLink.name,
        whatsappNumber: whatsappNumber || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro no public-checkin:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
