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
    console.log("Meta Webhook received:", req.method);

    // Verification for Meta Webhook
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log("Meta verification request:", { mode, token, challenge });

      if (mode === 'subscribe' && token === 'lovable_meta_webhook_token') {
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 200,
        });
      }

      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Handle POST webhook events
    if (req.method === 'POST') {
      const body = await req.json();
      console.log("Meta webhook event received:", JSON.stringify(body, null, 2));

      // Process incoming messages
      if (body.entry && body.entry[0]?.changes) {
        const changes = body.entry[0].changes;
        
        for (const change of changes) {
          if (change.value?.messages) {
            const messages = change.value.messages;
            const phone_number_id = change.value.metadata?.phone_number_id;

            // Get integration by phone_number_id to find user_id
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            
            if (supabaseUrl && supabaseKey) {
              const supabase = await import("https://esm.sh/@supabase/supabase-js@2.7.1").then(
                (mod) => mod.createClient(supabaseUrl, supabaseKey)
              );

              const { data: integration } = await supabase
                .from('whatsapp_integrations')
                .select('user_id')
                .eq('phone_number_id', phone_number_id)
                .eq('provider', 'meta')
                .single();

              if (integration) {
                // Save messages to database
                for (const message of messages) {
                  await supabase.from('incoming_messages').insert({
                    user_id: integration.user_id,
                    provider: 'meta',
                    from_phone: message.from,
                    message_text: message.text?.body || '',
                    message_type: message.type,
                    raw_data: message,
                  });
                }
              }
            }
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
    console.error("Error processing Meta webhook:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
