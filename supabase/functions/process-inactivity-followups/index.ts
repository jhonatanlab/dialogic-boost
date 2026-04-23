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

        // 3. Get last inbound message time
        const { data: lastInbound } = await supabase
          .from("messages")
          .select("sent_at")
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound")
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();

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

        // 6. Cross-automation cooldown: skip if ANY inactivity followup was sent
        //    for this conversation in the last 24 hours
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentAnyFollowup } = await supabase
          .from("automation_followups")
          .select("id")
          .eq("conversation_id", conv.id)
          .eq("company_id", companyId)
          .gte("last_followup_at", twentyFourHoursAgo)
          .limit(1);

        if (recentAnyFollowup && recentAnyFollowup.length > 0) continue;

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
