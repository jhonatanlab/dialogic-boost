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

    // 1. Get active inactivity automations
    const { data: automations, error: autoErr } = await supabase
      .from("automations")
      .select("*")
      .eq("status", "active")
      .eq("trigger_type", "inactivity")
      .not("inactivity_minutes", "is", null);

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
      const maxFollowups = automation.max_followups || 1;

      // 2. Get open/in_progress conversations for this company
      const { data: conversations, error: convErr } = await supabase
        .from("conversations")
        .select("id, contact_id")
        .eq("company_id", companyId)
        .in("status", ["open", "in_progress"])
        .limit(50);

      if (convErr || !conversations || conversations.length === 0) continue;

      for (const conv of conversations) {
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

        if (now - lastInboundAt < threshold) continue;

        // 4. Check followup count
        const { data: existingFollowup } = await supabase
          .from("automation_followups")
          .select("id, followup_count, last_followup_at")
          .eq("automation_id", automation.id)
          .eq("conversation_id", conv.id)
          .single();

        const currentCount = existingFollowup?.followup_count || 0;
        if (currentCount >= maxFollowups) continue;

        // 5. Check cooldown - don't re-trigger if last followup was within the inactivity window
        if (existingFollowup?.last_followup_at) {
          const lastFollowupAt = new Date(existingFollowup.last_followup_at).getTime();
          if (now - lastFollowupAt < threshold) continue;
        }

        // 6. Execute automation
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
          await execRes.text(); // consume body

          // 7. Upsert followup record
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
