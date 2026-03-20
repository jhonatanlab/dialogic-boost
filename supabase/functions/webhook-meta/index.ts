import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

Deno.serve(async (req) => {
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

      const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
      if (!verifyToken) {
        console.error("META_WEBHOOK_VERIFY_TOKEN not configured");
        return new Response('Server configuration error', { status: 500, headers: corsHeaders });
      }

      if (mode === 'subscribe' && token === verifyToken) {
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

      if (body.entry && body.entry[0]?.changes) {
        const changes = body.entry[0].changes;

        for (const change of changes) {
          if (change.value?.messages) {
            const messages = change.value.messages;
            const phone_number_id = change.value.metadata?.phone_number_id;

            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            const { data: integration } = await supabase
              .from('whatsapp_integrations')
              .select('user_id')
              .eq('phone_number_id', phone_number_id)
              .eq('provider', 'meta')
              .single();

            if (integration) {
              for (const message of messages) {
                const phone = normalizePhone(message.from);
                const content = message.text?.body || '';
                const messageType = message.type || 'text';

                let { data: contact } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('user_id', integration.user_id)
                  .eq('phone', phone)
                  .single();

                if (!contact) {
                  const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                      user_id: integration.user_id,
                      name: `WhatsApp ${phone.slice(-4)}`,
                      phone: phone,
                    })
                    .select('id')
                    .single();
                  contact = newContact;
                }

                if (contact) {
                  let { data: conversation } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('user_id', integration.user_id)
                    .eq('contact_id', contact.id)
                    .eq('channel', 'whatsapp')
                    .single();

                  if (!conversation) {
                    const { data: newConv } = await supabase
                      .from('conversations')
                      .insert({
                        user_id: integration.user_id,
                        contact_id: contact.id,
                        channel: 'whatsapp',
                        status: 'open',
                      })
                      .select('id')
                      .single();
                    conversation = newConv;
                  } else {
                    await supabase
                      .from('conversations')
                      .update({
                        last_message_at: new Date().toISOString(),
                        unread_count: (conversation as any).unread_count + 1,
                        status: 'open',
                      })
                      .eq('id', conversation.id);
                  }

                  if (conversation) {
                    await supabase.from('messages').insert({
                      conversation_id: conversation.id,
                      contact_id: contact.id,
                      user_id: integration.user_id,
                      channel: 'whatsapp',
                      direction: 'inbound',
                      content: content,
                      message_type: messageType,
                      status: 'delivered',
                      message_id: message.id,
                      metadata: message,
                    });
                  }
                }

                await supabase.from('incoming_messages').insert({
                  user_id: integration.user_id,
                  provider: 'meta',
                  from_phone: phone,
                  message_text: content,
                  message_type: messageType,
                  raw_data: message,
                });
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
