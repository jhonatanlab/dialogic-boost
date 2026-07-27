import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const raw = await req.text();
    const body = JSON.parse(raw.replace(/[\r\n\t]/g, ' ') || '{}');
    const instanceRowId = body?.instance_id as string | undefined;
    if (!instanceRowId) {
      return new Response(JSON.stringify({ ok: false, error: 'missing instance_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await admin
      .from('profiles').select('company_id').eq('user_id', userId).maybeSingle();
    const { data: inst } = await admin
      .from('whatsapp_instances')
      .select('company_id, instance_id')
      .eq('id', instanceRowId).maybeSingle();

    if (!inst || !profile || profile.company_id !== inst.company_id) {
      return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: credRows, error: credErr } = await admin
      .rpc('get_instance_evolution_credentials', { p_instance_id: instanceRowId });
    if (credErr) throw credErr;
    const cred = Array.isArray(credRows) ? credRows[0] : credRows;
    const baseUrl = (cred?.base_url || '').replace(/\/+$/, '');
    const apiKey = (cred?.api_key || '').replace(/[\r\n\t]/g, '').trim();

    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'missing evolution credentials' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instanceName = inst.instance_id;
    const url = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName!)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    });
    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, status: resp.status, error: text.slice(0, 500) }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // Evolution typically returns { base64, code, pairingCode } or { qrcode: { base64, code } }
    const qr = data?.base64 || data?.qrcode?.base64 || data?.qr_code || data?.code || data?.qrcode?.code || null;
    const pairingCode = data?.pairingCode || data?.qrcode?.pairingCode || null;

    return new Response(JSON.stringify({ ok: true, qr, pairingCode, raw: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
