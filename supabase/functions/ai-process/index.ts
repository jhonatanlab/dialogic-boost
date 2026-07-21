// ai-process — invoked per buffer_id. Service role. Runs LLM, persists outbound
// message. Does NOT send via WhatsApp. Fase 3 standby.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { complete, type LlmMessage } from "../_shared/llm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let bufferId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    bufferId = typeof body?.buffer_id === "string" ? body.buffer_id : null;
    if (!bufferId) return json({ ok: false, error: "buffer_id required" }, 400);

    const { data: buffer, error: bufErr } = await admin
      .from("message_buffer")
      .select("id, company_id, conversation_id, contact_id, status, attempts")
      .eq("id", bufferId)
      .maybeSingle();

    if (bufErr) throw bufErr;
    if (!buffer) return json({ ok: true, skipped: "not_found" });
    if (buffer.status !== "processing") return json({ ok: true, skipped: `status:${buffer.status}` });

    // Kill switches
    const { data: company, error: coErr } = await admin
      .from("companies")
      .select("id, ai_enabled, ai_pipeline_enabled, system_prompt, agent_name")
      .eq("id", buffer.company_id)
      .maybeSingle();
    if (coErr) throw coErr;
    if (!company?.ai_enabled || !(company as any)?.ai_pipeline_enabled) {
      await admin.from("message_buffer").update({ status: "done", locked_at: null }).eq("id", buffer.id);
      return json({ ok: true, skipped: "ai_off" });
    }

    // Credentials
    const { data: credRows, error: credErr } = await admin
      .rpc("get_company_llm_credentials", { p_company_id: buffer.company_id });
    if (credErr) throw credErr;
    const cred = Array.isArray(credRows) ? credRows[0] : credRows;
    const provider = (cred?.provider || "").toLowerCase();
    const model = cred?.model || "";
    const apiKey = cred?.api_key || "";
    const systemPrompt = (company as any)?.system_prompt || "";

    if (!provider || !model || !apiKey || !systemPrompt) {
      return await fail(admin, buffer.id, buffer.attempts, "missing_llm_config");
    }

    // Conversation restarted_at for history cutoff
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, restarted_at")
      .eq("id", buffer.conversation_id)
      .maybeSingle();
    if (convErr) throw convErr;

    const historyFrom = (conv as any)?.restarted_at ?? "1970-01-01T00:00:00Z";

    const { data: msgRows, error: msgErr } = await admin
      .from("messages")
      .select("direction, content, sent_at")
      .eq("conversation_id", buffer.conversation_id)
      .gte("sent_at", historyFrom)
      .order("sent_at", { ascending: true })
      .limit(50);
    if (msgErr) throw msgErr;

    const messages: LlmMessage[] = (msgRows || [])
      .filter((m) => {
        const c = (m.content || "").trim();
        if (!c) return false;
        if (c === "[mídia não recuperada]") return false;
        return true;
      })
      .map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      })) as LlmMessage[];

    if (messages.length === 0) {
      // Nothing to reply to — mark done, no outbound.
      await admin.from("message_buffer").update({ status: "done", locked_at: null }).eq("id", buffer.id);
      return json({ ok: true, skipped: "empty_history" });
    }

    let text = "";
    let latency = 0;
    try {
      const out = await complete({
        provider,
        model,
        apiKey,
        systemPrompt,
        messages,
        maxTokens: 512,
        timeoutMs: 30_000,
      });
      text = (out.text || "").trim();
      latency = out.latency_ms;
    } catch (e: any) {
      return await fail(admin, buffer.id, buffer.attempts, `llm_error: ${e?.message || String(e)}`);
    }

    if (!text) {
      return await fail(admin, buffer.id, buffer.attempts, "empty_llm_response");
    }

    // Resolve a user_id (messages.user_id is NOT NULL). Prefer an admin/owner of the company.
    const { data: ownerRow } = await admin
      .from("profiles")
      .select("user_id, role")
      .eq("company_id", buffer.company_id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();
    const userId = (ownerRow as any)?.user_id;
    if (!userId) {
      return await fail(admin, buffer.id, buffer.attempts, "no_company_user");
    }

    const { error: insErr } = await admin.from("messages").insert({
      conversation_id: buffer.conversation_id,
      contact_id: buffer.contact_id,
      company_id: buffer.company_id,
      user_id: userId,
      channel: "whatsapp",
      direction: "outbound",
      content: text,
      message_type: "text",
      status: "pending",
      metadata: { source: "ai", model, latency_ms: latency, agent_name: (company as any)?.agent_name || null },
      sent_at: new Date().toISOString(),
    });
    if (insErr) {
      return await fail(admin, buffer.id, buffer.attempts, `insert_failed: ${insErr.message}`);
    }

    await admin.from("message_buffer").update({ status: "done", locked_at: null, last_error: null }).eq("id", buffer.id);
    return json({ ok: true, latency_ms: latency });
  } catch (err: any) {
    if (bufferId) {
      try {
        const { data: b } = await admin
          .from("message_buffer").select("attempts").eq("id", bufferId).maybeSingle();
        await fail(admin, bufferId, (b as any)?.attempts ?? 0, err?.message || String(err));
      } catch (_) { /* ignore */ }
    }
    return json({ ok: false, error: err?.message || String(err) }, 500);
  }
});

async function fail(admin: any, bufferId: string, attempts: number, message: string) {
  const nextAttempts = (attempts || 0) + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await admin.from("message_buffer").update({
      status: "failed",
      attempts: nextAttempts,
      last_error: message,
      locked_at: null,
    }).eq("id", bufferId);
  } else {
    await admin.from("message_buffer").update({
      status: "pending",
      attempts: nextAttempts,
      last_error: message,
      locked_at: null,
      flush_at: new Date(Date.now() + RETRY_DELAY_SECONDS * 1000).toISOString(),
    }).eq("id", bufferId);
  }
  return json({ ok: false, error: message, attempts: nextAttempts });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
