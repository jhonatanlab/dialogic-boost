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

    // Get user's active integration using verified user ID
    const { data: integration, error: integrationError } = await supabase
      .from('whatsapp_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      throw new Error("No active WhatsApp integration found for this user");
    }

    let sendResult;

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
