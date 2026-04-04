import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { automation_id, contact_id, conversation_id, company_id, message_text } = await req.json();

    if (!automation_id || !contact_id || !conversation_id || !company_id) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch automation
    const { data: automation, error: autoErr } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automation_id)
      .single();

    if (autoErr || !automation) {
      return json({ error: "Automation not found" }, 404);
    }

    const flowData = automation.flow_data as { nodes: FlowNode[]; edges: FlowEdge[] };
    if (!flowData?.nodes?.length) {
      return json({ success: true, message: "No nodes to execute" });
    }

    // Get user_id for this company
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("company_id", company_id)
      .limit(1)
      .single();

    if (!profile) {
      return json({ error: "No user found for company" }, 404);
    }

    const userId = profile.user_id;

    // Get contact info for variable substitution
    const { data: contact } = await supabase
      .from("contacts")
      .select("name, phone, email")
      .eq("id", contact_id)
      .single();

    const replaceVars = (text: string): string => {
      return text
        .replace(/\{nome\}/gi, contact?.name || "")
        .replace(/\{telefone\}/gi, contact?.phone || "")
        .replace(/\{email\}/gi, contact?.email || "");
    };

    // Build adjacency map
    const adjacency = new Map<string, string[]>();
    for (const edge of flowData.edges) {
      const key = edge.sourceHandle ? `${edge.source}::${edge.sourceHandle}` : edge.source;
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key)!.push(edge.target);
      // Also add without handle for fallback
      if (edge.sourceHandle) {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
        // Don't add duplicate
      }
    }

    const nodeMap = new Map<string, FlowNode>();
    for (const node of flowData.nodes) {
      nodeMap.set(node.id, node);
    }

    // Find start node (trigger node or first node with no incoming edges)
    const targetNodes = new Set(flowData.edges.map(e => e.target));
    let startNodeId = flowData.nodes.find(n => n.type === "trigger" || n.type === "triggerNode")?.id;
    if (!startNodeId) {
      startNodeId = flowData.nodes.find(n => !targetNodes.has(n.id))?.id;
    }
    if (!startNodeId) {
      startNodeId = flowData.nodes[0]?.id;
    }

    // Get next nodes from a given node
    const getNextNodes = (nodeId: string, handle?: string): string[] => {
      if (handle) {
        const withHandle = adjacency.get(`${nodeId}::${handle}`);
        if (withHandle?.length) return withHandle;
      }
      // Fallback: edges from this source without handle consideration
      return flowData.edges
        .filter(e => e.source === nodeId && (!handle || e.sourceHandle === handle || !e.sourceHandle))
        .map(e => e.target);
    };

    // Execute nodes sequentially following the graph
    const executed: string[] = [];
    const queue: string[] = getNextNodes(startNodeId); // Skip trigger node itself

    const MAX_NODES = 50; // safety limit
    let count = 0;

    while (queue.length > 0 && count < MAX_NODES) {
      const currentId = queue.shift()!;
      if (executed.includes(currentId)) continue;
      
      const node = nodeMap.get(currentId);
      if (!node) continue;

      executed.push(currentId);
      count++;

      const nodeType = (node.type || "").toLowerCase().replace("node", "");
      const nodeData = node.data || {};

      console.log(`[execute-automation] Executing node ${currentId} type=${nodeType}`);

      if (nodeType === "message" || nodeType === "question") {
        // Send message
        const msgContent = replaceVars(String(nodeData.message || nodeData.content || nodeData.text || ""));
        if (msgContent.trim()) {
          // Insert message into messages table
          await supabase.from("messages").insert({
            conversation_id,
            contact_id,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: "outbound",
            content: msgContent,
            message_type: "text",
            status: "sent",
            metadata: { automation_id, node_id: currentId },
          });

          // Try to send via n8n proxy
          try {
            const { data: settings } = await supabase
              .from("admin_settings")
              .select("setting_value")
              .eq("setting_key", "sendMessageEndpoint")
              .eq("company_id", company_id)
              .maybeSingle();

            if (settings?.setting_value) {
              const { data: instance } = await supabase
                .from("whatsapp_instances")
                .select("instance_id, instance_token")
                .eq("company_id", company_id)
                .maybeSingle();

              if (instance) {
                const phone = contact?.phone?.replace(/\D/g, "") || "";
                await fetch(settings.setting_value, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    instanceName: instance.instance_id,
                    number: phone,
                    text: msgContent,
                  }),
                });
                console.log(`[execute-automation] Message sent to ${phone}`);
              }
            }
          } catch (sendErr) {
            console.error("[execute-automation] Error sending message:", sendErr);
          }
        }

        // Continue to next nodes
        const nextNodes = getNextNodes(currentId);
        queue.push(...nextNodes);

      } else if (nodeType === "delay") {
        // Wait for specified duration (max 25s to stay within edge function limits)
        const delaySeconds = Math.min(Number(nodeData.delay || nodeData.seconds || 5), 25);
        console.log(`[execute-automation] Delaying ${delaySeconds}s`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

        const nextNodes = getNextNodes(currentId);
        queue.push(...nextNodes);

      } else if (nodeType === "condition") {
        // Evaluate condition
        const conditionField = String(nodeData.field || "message").toLowerCase();
        const conditionOp = String(nodeData.operator || "contains").toLowerCase();
        const conditionValue = String(nodeData.value || "").toLowerCase();
        
        let fieldValue = "";
        if (conditionField === "message" || conditionField === "text") {
          fieldValue = (message_text || "").toLowerCase();
        } else if (conditionField === "name" || conditionField === "nome") {
          fieldValue = (contact?.name || "").toLowerCase();
        }

        let matches = false;
        if (conditionOp === "contains" || conditionOp === "contém") {
          matches = fieldValue.includes(conditionValue);
        } else if (conditionOp === "equals" || conditionOp === "igual") {
          matches = fieldValue === conditionValue;
        } else if (conditionOp === "starts_with" || conditionOp === "começa com") {
          matches = fieldValue.startsWith(conditionValue);
        }

        console.log(`[execute-automation] Condition: ${conditionField} ${conditionOp} "${conditionValue}" → ${matches}`);

        // Follow "yes" or "no" handle
        const handle = matches ? "yes" : "no";
        const nextNodes = getNextNodes(currentId, handle);
        // Fallback: if no handle-specific edges, follow all
        if (nextNodes.length === 0) {
          queue.push(...getNextNodes(currentId));
        } else {
          queue.push(...nextNodes);
        }

      } else if (nodeType === "tag") {
        // Add tag to contact
        const tagName = String(nodeData.tag || nodeData.tagName || "");
        if (tagName) {
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("company_id", company_id)
            .ilike("name", tagName)
            .maybeSingle();

          if (existingTag) {
            await supabase.from("contact_tags").upsert(
              { contact_id, tag_id: existingTag.id, company_id },
              { onConflict: "contact_id,tag_id" }
            ).select();
            console.log(`[execute-automation] Tag "${tagName}" added to contact`);
          }
        }

        const nextNodes = getNextNodes(currentId);
        queue.push(...nextNodes);

      } else if (nodeType === "transfer") {
        // Transfer conversation to team/agent
        const targetTeam = String(nodeData.team || nodeData.teamId || "");
        const targetAgent = String(nodeData.agent || nodeData.agentId || "");

        const updatePayload: Record<string, unknown> = {};
        if (targetTeam) updatePayload.assigned_team = targetTeam;
        if (targetAgent) updatePayload.assigned_to = targetAgent;
        if (Object.keys(updatePayload).length > 0) {
          updatePayload.status = "in_progress";
          await supabase.from("conversations").update(updatePayload).eq("id", conversation_id);
          console.log(`[execute-automation] Conversation transferred`);
        }

        const nextNodes = getNextNodes(currentId);
        queue.push(...nextNodes);

      } else {
        // Unknown node type — just continue
        console.log(`[execute-automation] Skipping unknown node type: ${nodeType}`);
        const nextNodes = getNextNodes(currentId);
        queue.push(...nextNodes);
      }
    }

    // Update automation stats
    await supabase
      .from("automations")
      .update({
        execution_count: (automation.execution_count || 0) + 1,
        last_execution: new Date().toISOString(),
      })
      .eq("id", automation_id);

    console.log(`[execute-automation] Completed. Executed ${executed.length} nodes.`);
    return json({ success: true, executed_nodes: executed.length });

  } catch (error) {
    console.error("[execute-automation] Error:", error);
    return json({ error: error.message }, 500);
  }
});
