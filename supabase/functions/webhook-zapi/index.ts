import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Z-API Webhook received:", req.method);

    if (req.method === 'POST') {
      const body = await req.json();
      console.log("Z-API webhook event received:", JSON.stringify(body, null, 2));

      if (body.phone && body.text) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: integration } = await supabase
          .from('whatsapp_integrations')
          .select('user_id')
          .eq('instance_id', body.instanceId || '')
          .eq('provider', 'zapi')
          .single();

        if (integration) {
          const phone = normalizePhone(body.phone);
          const content = typeof body.text === 'string' ? body.text : body.text?.message || '';

          // Create or get contact
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
            // Create or get conversation
            let { data: conversation } = await supabase
              .from('conversations')
              .select('id, unread_count')
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
                .select('id, unread_count')
                .single();
              conversation = newConv;
            } else {
              // Update conversation
              await supabase
                .from('conversations')
                .update({
                  last_message_at: new Date().toISOString(),
                  unread_count: conversation.unread_count + 1,
                  status: 'open',
                })
                .eq('id', conversation.id);
            }

            if (conversation) {
              // Save message
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                contact_id: contact.id,
                user_id: integration.user_id,
                channel: 'whatsapp',
                direction: 'inbound',
                content: content,
                message_type: 'text',
                status: 'delivered',
                metadata: body,
              });
            }
          }

          // Also save to incoming_messages
          await supabase.from('incoming_messages').insert({
            user_id: integration.user_id,
            provider: 'zapi',
            from_phone: phone,
            message_text: content,
            message_type: 'text',
            raw_data: body,
          });
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
