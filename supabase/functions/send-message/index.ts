import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalSecret = req.headers.get('x-internal-secret');
    const isInternal = !!SERVICE_ROLE && internalSecret === SERVICE_ROLE;

    const body = await req.json();
    const { phone, message } = body || {};
    let companyId: string | null = body?.company_id ?? null;
    let userId: string | null = null;

    if (!isInternal) {
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

      userId = claimsData.claims.sub as string;
    }

    if (!phone || !message) {
      throw new Error("Missing required fields: phone, message");
    }

    console.log("Send message request:", { userId, phone, internal: isInternal });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      SERVICE_ROLE
    );

    if (!companyId && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();
      companyId = profile?.company_id ?? null;
    }

    if (!companyId) {
      throw new Error("Company not resolved");
    }

    let sendResult: unknown = null;

    // ── 1) Evolution (whatsapp_instances) FIRST ──
    try {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_id, provider, status')
        .eq('company_id', companyId)
        .eq('provider', 'evolution')
        .eq('status', 'connected')
        .maybeSingle();

      if (instance) {
        const { data: credRows, error: credErr } = await supabase
          .rpc('get_instance_evolution_credentials', { p_instance_id: instance.id });
        if (credErr) throw credErr;
        const cred = Array.isArray(credRows) ? credRows[0] : credRows;
        const baseUrl = (cred?.base_url || '').replace(/\/+$/, '');
        const apiKey = cred?.api_key || '';
        if (!baseUrl || !apiKey) throw new Error('missing evolution credentials');

        const url = `${baseUrl}/message/sendText/${instance.instance_id}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify({ number: phone, text: message }),
        });
        const payload = await resp.json().catch(() => ({ status: resp.status }));
        if (!resp.ok) throw new Error(`evolution error: ${JSON.stringify(payload)}`);

        console.log("Message sent via Evolution");
        return new Response(
          JSON.stringify({ success: true, provider: 'evolution', result: payload }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (evoErr) {
      console.error("Evolution branch failed, falling back:", evoErr);
      // fall through to existing branches
    }

    // ── 2) Existing Meta / Z-API integration ──
    const { data: integration } = await supabase
      .from('whatsapp_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'connected')
      .maybeSingle();

    if (integration) {
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
    } else {
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
          let userSetting: any = null;
          if (userId) {
            const { data } = await supabase
              .from('admin_settings')
              .select('setting_value')
              .eq('user_id', userId)
              .eq('setting_key', 'n8n_send_message')
              .maybeSingle();
            userSetting = data;
          }

          if (!userSetting?.setting_value) {
            throw new Error("No active WhatsApp integration found");
          }

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
