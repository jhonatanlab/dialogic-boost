import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const resolveCampaignMediaType = (mediaType?: string, attachmentUrl?: string | null) => {
  const normalized = (mediaType || "").toLowerCase().trim();

  const map: Record<string, string> = {
    text: "text",
    texto: "text",
    image: "image",
    imagem: "image",
    photo: "image",
    video: "video",
    audio: "audio",
    voice: "audio",
    document: "document",
    documento: "document",
    file: "document",
    arquivo: "document",
  };

  if (map[normalized]) return map[normalized];

  if (attachmentUrl?.startsWith("data:image/")) return "image";
  if (attachmentUrl?.startsWith("data:video/")) return "video";
  if (attachmentUrl?.startsWith("data:audio/")) return "audio";
  if (attachmentUrl?.startsWith("data:application/")) return "document";

  return "text";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find campaigns that are scheduled and whose scheduled_at has passed
    const now = new Date().toISOString();
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      console.log("No scheduled campaigns to process.");
      return new Response(
        JSON.stringify({ message: "No campaigns to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${campaigns.length} scheduled campaign(s) to process.`);

    const results = [];

    for (const campaign of campaigns) {
      console.log(`Processing campaign: ${campaign.id} - ${campaign.name}`);

      // Mark as sending
      await supabase
        .from("campaigns")
        .update({ status: "sending" })
        .eq("id", campaign.id);

      // Get campaign contacts
      const { data: campaignContacts, error: ccError } = await supabase
        .from("campaign_contacts")
        .select("id, contact_id, status")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending");

      if (ccError) {
        console.error(`Error fetching contacts for campaign ${campaign.id}:`, ccError);
        results.push({ campaignId: campaign.id, error: ccError.message });
        continue;
      }

      if (!campaignContacts || campaignContacts.length === 0) {
        console.log(`No pending contacts for campaign ${campaign.id}`);
        await supabase
          .from("campaigns")
          .update({ status: "sent", sent_at: now })
          .eq("id", campaign.id);
        results.push({ campaignId: campaign.id, sent: 0, failed: 0 });
        continue;
      }

      // Get contact details
      const contactIds = campaignContacts.map((c) => c.contact_id);
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, phone, name, email")
        .in("id", contactIds);

      const contactsMap = new Map(
        (contacts || []).map((c) => [c.id, c])
      );

      // Get n8n endpoint
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "n8n_send_message")
        .eq("company_id", campaign.company_id)
        .maybeSingle();

      // Fallback: try without company filter
      let endpoint = settings?.setting_value;
      if (!endpoint) {
        const { data: fallbackSettings } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "n8n_send_message")
          .maybeSingle();
        endpoint = fallbackSettings?.setting_value;
      }

      if (!endpoint) {
        console.error(`No n8n endpoint configured for campaign ${campaign.id}`);
        await supabase
          .from("campaign_contacts")
          .update({ status: "failed", error_message: "Endpoint de envio não configurado" })
          .eq("campaign_id", campaign.id)
          .eq("status", "pending");
        await supabase
          .from("campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", campaign.id);
        results.push({ campaignId: campaign.id, error: "No endpoint" });
        continue;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < campaignContacts.length; i++) {
        const cc = campaignContacts[i];
        const contact = contactsMap.get(cc.contact_id);

        if (!contact?.phone) {
          await supabase
            .from("campaign_contacts")
            .update({ status: "failed", error_message: "Contato sem telefone" })
            .eq("id", cc.id);
          failedCount++;
          continue;
        }

        // Interval between messages (2 seconds default, skip first)
        if (i > 0) {
          await sleep(2000);
        }

        try {
          // Resolve variables
          const resolvedMessage = campaign.message
            .replace(/\{nome\}/gi, contact.name || "")
            .replace(/\{telefone\}/gi, contact.phone || "")
            .replace(/\{email\}/gi, contact.email || "");

          const mediaType = resolveCampaignMediaType(campaign.media_type, campaign.attachment_url);

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_id: campaign.company_id,
              number: contact.phone,
              text: resolvedMessage,
              type: mediaType,
              ...(campaign.attachment_url ? { media_url: campaign.attachment_url } : {}),
              internal_id: `campaign|${campaign.id}|${contact.id}`,
              contact_name: contact.name,
              campaign_id: campaign.id,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
          }

          await supabase
            .from("campaign_contacts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", cc.id);
          sentCount++;
        } catch (err: any) {
          console.error(`Failed to send to ${contact.phone}:`, err.message);
          await supabase
            .from("campaign_contacts")
            .update({ status: "failed", error_message: err.message?.substring(0, 500) || "Erro desconhecido" })
            .eq("id", cc.id);
          failedCount++;
        }
      }

      await supabase
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);

      console.log(`Campaign ${campaign.id} done: ${sentCount} sent, ${failedCount} failed`);
      results.push({ campaignId: campaign.id, sent: sentCount, failed: failedCount });
    }

    return new Response(
      JSON.stringify({ processed: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing scheduled campaigns:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
