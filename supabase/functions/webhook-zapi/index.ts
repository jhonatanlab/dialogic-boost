import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Z-API Webhook received:", req.method);

    if (req.method === 'POST') {
      const body = await req.json();
      console.log("Z-API webhook event received:", JSON.stringify(body, null, 2));

      // Process incoming messages from Z-API
      if (body.phone && body.text) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = await import("https://esm.sh/@supabase/supabase-js@2.7.1").then(
            (mod) => mod.createClient(supabaseUrl, supabaseKey)
          );

          // Get integration by instance to find user_id
          const { data: integration } = await supabase
            .from('whatsapp_integrations')
            .select('user_id')
            .eq('instance_id', body.instanceId || '')
            .eq('provider', 'zapi')
            .single();

          if (integration) {
            await supabase.from('incoming_messages').insert({
              user_id: integration.user_id,
              provider: 'zapi',
              from_phone: body.phone,
              message_text: body.text?.message || body.text,
              message_type: 'text',
              raw_data: body,
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error("Error processing Z-API webhook:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
