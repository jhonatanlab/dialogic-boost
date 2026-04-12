import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { phone, message } = await req.json();

    if (!phone || !message) {
      throw new Error("Missing required fields: phone, message");
    }

    console.log("Send message request:", { userId, phone });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .maybeSingle();

    const companyId = profile?.company_id;

    // Try to find active integration in whatsapp_integrations (Meta or Z-API)
    const { data: integration } = await supabase
      .from('whatsapp_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .maybeSingle();

    let sendResult;

    if (integration) {
      // Use Meta or Z-API integration
      if (integration.provider === 'meta') {
        const metaUrl = `https://graph.facebook.com/v18.0/${integration.phone_number_id}/messages`;

        const response = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: message }
          }),
        });

        sendResult = await response.json();

        if (!response.ok) {
          console.error("Meta API error:", sendResult);
          throw new Error(`Meta API error: ${JSON.stringify(sendResult)}`);
        }

        console.log("Message sent via Meta:", sendResult);

      } else if (integration.provider === 'zapi') {
        const zapiUrl = `https://api.z-api.io/instances/${integration.instance_id}/token/${integration.api_token}/send-text`;

        const response = await fetch(zapiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message }),
        });

        sendResult = await response.json();

        if (!response.ok) {
          console.error("Z-API error:", sendResult);
          throw new Error(`Z-API error: ${JSON.stringify(sendResult)}`);
        }

        console.log("Message sent via Z-API:", sendResult);
      }
    } else if (companyId) {
      // Fallback: check if API Automação is enabled for this company
      const { data: automationSettings } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('company_id', companyId)
        .in('setting_key', ['n8n_automation_enabled', 'n8n_automation_outbound']);

      const settingsMap: Record<string, string> = {};
      for (const s of automationSettings || []) {
        if (s.setting_key && s.setting_value) {
          settingsMap[s.setting_key] = s.setting_value;
        }
      }

      if (settingsMap['n8n_automation_enabled'] === 'true' && settingsMap['n8n_automation_outbound']) {
        const outboundUrl = settingsMap['n8n_automation_outbound'];
        console.log("Sending via API Automação outbound:", outboundUrl);

        const response = await fetch(outboundUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            company_id: companyId,
            phone_number: phone,
            message,
          }),
        });

        sendResult = await response.json().catch(() => ({ status: response.status }));

        if (!response.ok) {
          console.error("Automation outbound error:", sendResult);
          throw new Error(`Automation outbound error: ${JSON.stringify(sendResult)}`);
        }

        console.log("Message sent via API Automação:", sendResult);
      } else {
        // Check n8n_send_message as last fallback (API Nativa)
        const { data: nativeSetting } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('company_id', companyId)
          .eq('setting_key', 'n8n_send_message')
          .maybeSingle();

        if (!nativeSetting?.setting_value) {
          // Also try by user_id
          const { data: userSetting } = await supabase
            .from('admin_settings')
            .select('setting_value')
            .eq('user_id', userId)
            .eq('setting_key', 'n8n_send_message')
            .maybeSingle();

          if (!userSetting?.setting_value) {
            throw new Error("No active WhatsApp integration found");
          }

          // Use user-level n8n_send_message
          const nativeUrl = userSetting.setting_value;
          console.log("Sending via n8n_send_message (user):", nativeUrl);

          const response = await fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message, company_id: companyId }),
          });

          sendResult = await response.json().catch(() => ({ status: response.status }));
          if (!response.ok) throw new Error(`n8n send error: ${JSON.stringify(sendResult)}`);
        } else {
          const nativeUrl = nativeSetting.setting_value;
          console.log("Sending via n8n_send_message (company):", nativeUrl);

          const response = await fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message, company_id: companyId }),
          });

          sendResult = await response.json().catch(() => ({ status: response.status }));
          if (!response.ok) throw new Error(`n8n send error: ${JSON.stringify(sendResult)}`);
        }
      }
    } else {
      throw new Error("No active WhatsApp integration found");
    }

    return new Response(
      JSON.stringify({ success: true, result: sendResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
