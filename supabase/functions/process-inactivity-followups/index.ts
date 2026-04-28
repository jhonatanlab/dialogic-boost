import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get active inactivity automations (ordered by inactivity_minutes ascending)
    const { data: automations, error: autoErr } = await supabase
      .from("automations")
      .select("*")
      .eq("status", "active")
      .eq("trigger_type", "inactivity")
      .not("inactivity_minutes", "is", null)
      .order("inactivity_minutes", { ascending: true });

    if (autoErr) throw autoErr;
    if (!automations || automations.length === 0) {
      return new Response(JSON.stringify({ message: "No inactivity automations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    // IDs de todas as automações de inatividade (para identificar follow-ups passados)
    const inactivityAutomationIds = automations.map((a: any) => a.id);

    for (const automation of automations) {
      const companyId = automation.company_id;
      const inactivityMinutes = automation.inactivity_minutes;
      const maxFollowups = automation.max_followups ?? 1;
      const automationCreatedAt = new Date(automation.created_at).getTime();

      // 2. Get ONLY open conversations without an assigned agent
      const { data: conversations, error: convErr } = await supabase
        .from("conversations")
        .select("id, contact_id, company_id, contacts(id, company_id)")
        .eq("company_id", companyId)
        .eq("status", "open")
        .is("assigned_to", null)
        .limit(50);

      if (convErr || !conversations || conversations.length === 0) continue;

      for (const conv of conversations) {
        const linkedContact = Array.isArray((conv as any).contacts)
          ? (conv as any).contacts[0]
          : (conv as any).contacts;

        if (conv.company_id !== companyId || linkedContact?.company_id !== companyId) {
          console.error("[process-inactivity-followups] skipped company mismatch", {
            automation_id: automation.id,
            company_id: companyId,
            conversation_id: conv.id,
            conversation_company_id: conv.company_id,
            contact_id: conv.contact_id,
            contact_company_id: linkedContact?.company_id,
          });
          continue;
        }

        // 2.1 Re-check defensivo: garantir que conversa ainda está na fila (status=open, sem atendente)
        const { data: convFresh } = await supabase
          .from("conversations")
          .select("status, assigned_to")
          .eq("id", conv.id)
          .single();

        if (!convFresh || convFresh.status !== "open" || convFresh.assigned_to !== null) {
          continue; // saiu da fila → encerra follow-ups
        }

        // 2.2 Bloquear se já existe Resumo IA para o contato
        const { data: aiSummary } = await supabase
          .from("contact_ai_summaries")
          .select("id")
          .eq("contact_id", conv.contact_id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (aiSummary) continue; // resumo IA gerado → bloqueia follow-ups

        // 2.3 Verificar última mensagem da conversa (qualquer direção)
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("direction, sent_at")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastMsg?.sent_at) continue;

        // Se a última mensagem foi outbound, só liberar se for um follow-up anterior
        if (lastMsg.direction === "outbound") {
          const sentAt = new Date(lastMsg.sent_at).getTime();
          const { data: nearbyExec } = await supabase
            .from("automation_executions")
            .select("id")
            .eq("conversation_id", conv.id)
            .in("automation_id", inactivityAutomationIds)
            .gte("executed_at", new Date(sentAt - 60_000).toISOString())
            .lte("executed_at", new Date(sentAt + 60_000).toISOString())
            .limit(1)
            .maybeSingle();

          if (!nearbyExec) continue; // outbound não é follow-up → bloqueia
          // se for follow-up, segue para checagens abaixo
        }

        // 2.4 Cooldown global por conversa entre automações de follow-up:
        // se já existe um follow-up enviado para esta conversa (de qualquer automação)
        // E o cliente NÃO respondeu desde então, exigir que tenha decorrido a janela
        // desta automação a partir do último follow-up — não a partir do último inbound.
        // Isso evita cascata (30min, 2h, 24h, 2d disparando em sequência).
        const { data: lastFollowupAny } = await supabase
          .from("automation_followups")
          .select("last_followup_at, automation_id")
          .eq("conversation_id", conv.id)
          .not("last_followup_at", "is", null)
          .order("last_followup_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastFollowupAny?.last_followup_at) {
          const lastFollowupTs = new Date(lastFollowupAny.last_followup_at).getTime();

          const { data: inboundAfter } = await supabase
            .from("messages")
            .select("id")
            .eq("conversation_id", conv.id)
            .eq("direction", "inbound")
            .gt("sent_at", lastFollowupAny.last_followup_at)
            .limit(1)
            .maybeSingle();

          if (!inboundAfter) {
            const thresholdMs = inactivityMinutes * 60 * 1000;
            if (Date.now() - lastFollowupTs < thresholdMs) continue;
          }
        }

        // 3. Get last inbound message time (usado para janela de inatividade)
        const { data: lastInbound } = await supabase
          .from("messages")
          .select("sent_at")
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastInbound?.sent_at) continue;

        const lastInboundAt = new Date(lastInbound.sent_at).getTime();
        const threshold = inactivityMinutes * 60 * 1000;
        const now = Date.now();

        // Skip if not yet inactive
        if (now - lastInboundAt < threshold) continue;

        // Skip if last inbound message is older than the automation itself
        if (lastInboundAt < automationCreatedAt) continue;

        // 4. Check followup count for THIS automation
        const { data: existingFollowup } = await supabase
          .from("automation_followups")
          .select("id, followup_count, last_followup_at")
          .eq("automation_id", automation.id)
          .eq("conversation_id", conv.id)
          .single();

        const currentCount = existingFollowup?.followup_count || 0;
        if (currentCount >= maxFollowups) continue;

        // 5. Cooldown per-automation
        if (existingFollowup?.last_followup_at) {
          const lastFollowupAt = new Date(existingFollowup.last_followup_at).getTime();
          if (now - lastFollowupAt < threshold) continue;
        }

        // 6. (Removido) Cooldown cruzado entre automações.
        //    Cada automação de follow-up roda independentemente, respeitando apenas:
        //    - seu próprio max_followups
        //    - sua própria janela de inatividade
        //    - inatividade real do contato (última mensagem inbound)
        //    Isso permite que 30min, 2h, 24h e 2d coexistam sem se bloquearem.

        // 7. Execute automation
        try {
          const execRes = await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              automation_id: automation.id,
              conversation_id: conv.id,
              contact_id: conv.contact_id,
              company_id: companyId,
            }),
          });
          await execRes.text();

          // 8. Upsert followup record
          if (existingFollowup) {
            await supabase
              .from("automation_followups")
              .update({
                followup_count: currentCount + 1,
                last_followup_at: new Date().toISOString(),
              })
              .eq("id", existingFollowup.id);
          } else {
            await supabase
              .from("automation_followups")
              .insert({
                automation_id: automation.id,
                conversation_id: conv.id,
                contact_id: conv.contact_id,
                company_id: companyId,
                followup_count: 1,
                last_followup_at: new Date().toISOString(),
              });
          }

          totalProcessed++;
        } catch (execErr) {
          console.error(`Error executing automation ${automation.id} for conv ${conv.id}:`, execErr);
        }
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-inactivity-followups error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
