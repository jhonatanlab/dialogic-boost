import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Build a timestamptz string for date + "HH:MM" in São Paulo (UTC-03:00, no DST)
// EloChat opera no Brasil; consistente com timezone padrão do projeto.
function buildBrtIso(dateStr: string, time: string) {
  return `${dateStr}T${time}:00-03:00`;
}

function minutesToHHMM(total: number) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: require service role bearer (mesmo padrão do n8n no projeto)
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== SERVICE_ROLE_KEY) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Robust body parse (sanitize control chars antes de JSON.parse)
    const raw = await req.text();
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      body = JSON.parse(raw.replace(/[\n\r\t]/g, " "));
    }

    const company_id: string | undefined = body?.company_id;
    const user_id: string | null = body?.user_id ?? null;
    const date: string | undefined = body?.date;
    let duration_minutes: number = Number(body?.duration_minutes ?? 60);
    const slot_step_minutes: number = Math.max(5, Number(body?.slot_step_minutes ?? 15));

    if (!company_id || !/^[0-9a-f-]{36}$/i.test(company_id)) {
      return json({ error: "company_id (uuid) é obrigatório" }, 400);
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "date (YYYY-MM-DD) é obrigatório" }, 400);
    }
    if (user_id && !/^[0-9a-f-]{36}$/i.test(user_id)) {
      return json({ error: "user_id inválido" }, 400);
    }
    if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
      duration_minutes = 60;
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Resolve rules
    const { data: rules, error: rulesErr } = await supabase.rpc(
      "resolve_appointment_rules" as any,
      { p_company_id: company_id, p_user_id: user_id },
    );
    if (rulesErr) return json({ error: rulesErr.message }, 500);

    const r = rules as any;
    const fixed_duration_enforced = !!r?.fixed_duration_enabled;
    if (fixed_duration_enforced) {
      duration_minutes = Number(r.fixed_duration_minutes) || duration_minutes;
    }

    // Day of week (in BRT) → key
    const [y, m, d] = date.split("-").map(Number);
    // Use UTC to get DOW deterministically for the calendar date provided
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const key = DOW_KEYS[dow];
    const windows: Array<{ start: string; end: string }> =
      (r?.weekly_schedule?.[key] as any) ?? [];

    // Build candidate slots
    type Slot = { start: string; end: string; available: boolean; reason?: string };
    const slots: Slot[] = [];

    for (const w of windows) {
      const winStart = hhmmToMinutes(w.start);
      const winEnd = hhmmToMinutes(w.end);
      for (let t = winStart; t + duration_minutes <= winEnd; t += slot_step_minutes) {
        const startIso = buildBrtIso(date, minutesToHHMM(t));
        const endIso = buildBrtIso(date, minutesToHHMM(t + duration_minutes));
        slots.push({ start: startIso, end: endIso, available: false });
      }
    }

    // Validate each slot via simulate_appointment_rules
    const checked: Slot[] = [];
    for (const s of slots) {
      const { data: sim, error: simErr } = await supabase.rpc(
        "simulate_appointment_rules" as any,
        {
          p_company_id: company_id,
          p_user_id: user_id,
          p_scheduled_at: s.start,
          p_duration_minutes: duration_minutes,
        },
      );
      if (simErr) {
        checked.push({ ...s, available: false, reason: simErr.message });
        continue;
      }
      const ok = !!(sim as any)?.ok;
      let reason: string | undefined;
      if (!ok) {
        const failed = ((sim as any)?.checks ?? []).find((c: any) => c?.ok === false);
        reason = failed?.detail || failed?.label || "indisponível";
      }
      checked.push({ ...s, available: ok, reason });
    }

    return json({
      date,
      duration_minutes,
      fixed_duration_enforced,
      resolved_scope: r?.user_id ? "user" : r?.id ? "company" : "defaults",
      windows,
      slots: checked,
      available_slots: checked.filter((s) => s.available).map((s) => s.start),
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal_error" }, 500);
  }
});
