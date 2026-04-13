import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Status mapping: 'played' → 'read' for display purposes
const KNOWN_STATUSES = new Set([
  "sending", "sent", "server_ack", "received", "delivered", "read", "failed", "played", "deleted", "pending",
]);

const normalizeStatus = (status: string): string => {
  const normalized = (status || "").toLowerCase().trim();

  if (normalized === "played") return "read";
  if (normalized === "server_ack") return "sent";
  if (normalized === "received") return "delivered";
  if (normalized === "pending") return "sent";

  return normalized;
};

const statusPriority = (status: string): number => {
  switch (status) {
    case "sending": return 0;
    case "failed": return 1;
    case "sent": case "server_ack": return 2;
    case "delivered": case "received": return 3;
    case "read": return 4;
    case "replied": return 5;
    case "deleted": return 6;
    default: return -1;
  }
};

// Normalize phone: strip everything except digits
const normalizePhone = (phone: string): string => {
  const basePhone = phone.split(':')[0];
  return basePhone.replace(/\D/g, "");
};

const parseCampaignInternalId = (value?: string | null) => {
  if (!value) return null;

  // New safe format: campaign|{campaignId}|{contactId}
  if (value.startsWith("campaign|")) {
    const [, campaignId, contactId] = value.split("|");
    if (campaignId && contactId) return { campaignId, contactId };
  }

  // Legacy format: campaign-{campaignId}-{contactId}
  const uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const match = value.match(new RegExp(`^campaign-(${uuidPattern})-(${uuidPattern})$`));
  if (match) {
    return { campaignId: match[1], contactId: match[2] };
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate shared secret for webhook authentication
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    if (expectedSecret) {
      const incomingSecret = req.headers.get("x-webhook-secret");
      if (incomingSecret !== expectedSecret) {
        console.error("Webhook auth failed: invalid or missing x-webhook-secret header");
        return json({ error: "Unauthorized" }, 401);
      }
    } else {
      console.warn("N8N_WEBHOOK_SECRET not configured — webhook running without authentication");
    }
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return json({ error: "Empty request body" }, 400);
    }

    let body: { action?: string; data?: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      // Attempt to fix unescaped newlines/tabs inside JSON string values (common n8n issue)
      try {
        const sanitized = rawBody.replace(/[\n\r\t]/g, (match) => {
          if (match === '\n') return '\\n';
          if (match === '\r') return '\\r';
          if (match === '\t') return '\\t';
          return match;
        });
        body = JSON.parse(sanitized);
        console.warn("JSON parsed after sanitizing unescaped control characters");
      } catch {
        return json({ error: "Invalid JSON", received: rawBody.substring(0, 200) }, 400);
      }
    }

    const { action, data } = body;
    if (!action || !data) return json({ error: "Missing action or data" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Helper: get user_id for a company ──
    const getUserForCompany = async (company_id: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", company_id)
        .limit(1)
        .single();
      return profile?.user_id || null;
    };

    // ── Helper: find or create contact ──
    const findOrCreateContact = async (company_id: string, userId: string, normalizedPhone: string, contactName?: string) => {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("company_id", company_id)
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existing) {
        if (contactName && contactName.trim() && existing.name === normalizedPhone) {
          await supabase.from("contacts").update({ name: contactName.trim() }).eq("id", existing.id);
        }
        return existing.id;
      }

      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          company_id,
          name: contactName?.trim() || normalizedPhone,
          phone: normalizedPhone,
          source: "whatsapp",
        })
        .select("id")
        .single();
      if (error) throw error;
      return newContact.id;
    };

    // ── Helper: find or create conversation ──
    const findOrCreateConversation = async (company_id: string, userId: string, contactId: string, unreadIncrement = 0) => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, status")
        .eq("company_id", company_id)
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        if (existing.status === "closed") {
          await supabase.from("conversations").update({ status: "open", assigned_to: null, assigned_team: null }).eq("id", existing.id);
        }
        return existing.id;
      }

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          company_id,
          contact_id: contactId,
          channel: "whatsapp",
          status: "open",
          unread_count: unreadIncrement,
        })
        .select("id")
        .single();
      if (error) throw error;
      return newConv.id;
    };

    const campaignStatusPriority = (status: string): number => {
      switch (normalizeStatus(status)) {
        case "pending": return 0;
        case "sent": return 1;
        case "delivered": return 2;
        case "read": return 3;
        case "replied": return 4;
        case "failed": return 5;
        default: return -1;
      }
    };

    const lowerCampaignStatuses = (status: string): string[] => {
      const p = campaignStatusPriority(status);
      if (p <= 0) return [];
      return ["pending", "sent", "delivered", "read", "replied", "failed"]
        .filter((s) => campaignStatusPriority(s) < p);
    };

    const syncCampaignContactStatus = async (
      campaignId: string,
      contactId: string,
      nextStatus: string,
      source: string,
    ) => {
      const normalized = normalizeStatus(nextStatus);
      const { error: rpcError } = await supabase.rpc("update_campaign_contact_status", {
        p_campaign_id: campaignId,
        p_contact_id: contactId,
        p_new_status: normalized,
      });

      if (!rpcError) {
        console.log(`[${source}] campaign sync (atomic):`, campaignId, "→", normalized);
        return;
      }

      console.error(`[${source}] campaign sync rpc error:`, rpcError.message);

      const allowedPrevious = lowerCampaignStatuses(normalized);
      if (allowedPrevious.length === 0) return;

      const { error: fallbackError } = await supabase
        .from("campaign_contacts")
        .update({ status: normalized })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contactId)
        .in("status", allowedPrevious);

      if (fallbackError) {
        console.error(`[${source}] campaign sync fallback error:`, fallbackError.message);
      } else {
        console.log(`[${source}] campaign sync fallback applied:`, campaignId, "→", normalized);
      }
    };

    const resolveCampaignRefForMessage = async (
      messageRowId: string,
      fallbackInternalId?: string | null,
    ): Promise<{ campaignId: string; contactId: string } | null> => {
      const { data: msgRow } = await supabase
        .from("messages")
        .select("client_message_id, metadata, contact_id, company_id")
        .eq("id", messageRowId)
        .maybeSingle();

      if (!msgRow) return parseCampaignInternalId(fallbackInternalId || null);

      let parsed = parseCampaignInternalId(msgRow.client_message_id || null);
      if (!parsed) parsed = parseCampaignInternalId(fallbackInternalId || null);
      if (parsed) return parsed;

      const metadata = (msgRow.metadata || {}) as Record<string, unknown>;
      const metadataCampaignId = typeof metadata.campaign_id === "string" ? metadata.campaign_id : null;
      if (metadataCampaignId && msgRow.contact_id) {
        return { campaignId: metadataCampaignId, contactId: msgRow.contact_id };
      }

      if (msgRow.contact_id && msgRow.company_id) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: fallbackCc } = await supabase
          .from("campaign_contacts")
          .select("campaign_id, contact_id")
          .eq("contact_id", msgRow.contact_id)
          .eq("company_id", msgRow.company_id)
          .gte("created_at", twoHoursAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackCc) {
          console.log("[resolveCampaignRefForMessage] campaign sync fallback:", fallbackCc.campaign_id);
          return { campaignId: fallbackCc.campaign_id, contactId: fallbackCc.contact_id };
        }
      }

      return null;
    };

    // ═══════════════════════════════════════════
    // ACTION: upsert_instance
    // ═══════════════════════════════════════════
    if (action === "upsert_instance") {
      const { company_id, instance_id, instance_token, hash, status } = data as Record<string, string>;
      if (!company_id) return json({ error: "company_id is required" }, 400);

      const { data: existing } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("company_id", company_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({
            instance_id: instance_id || null,
            instance_token: instance_token || null,
            hash: hash || null,
            status: status || "disconnected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        return json({ success: true, action: "updated", id: existing.id });
      }

      const userId = await getUserForCompany(company_id);
      if (!userId) return json({ error: "No user found for this company" }, 404);

      const { data: company } = await supabase.from("companies").select("name").eq("id", company_id).single();

      const { data: inserted, error } = await supabase
        .from("whatsapp_instances")
        .insert({
          company_id,
          company_name: company?.name || "Unknown",
          instance_id: instance_id || null,
          instance_token: instance_token || null,
          hash: hash || null,
          status: status || "disconnected",
          user_id: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ success: true, action: "inserted", id: inserted.id });
    }

    // ═══════════════════════════════════════════
    // ACTION: get_instance_by_company
    // ═══════════════════════════════════════════
    if (action === "get_instance_by_company") {
      const { company_id } = data as Record<string, string>;
      if (!company_id) return json({ error: "company_id is required" }, 400);

      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("id, company_id, company_name, instance_id, status, created_at, updated_at")
        .eq("company_id", company_id)
        .maybeSingle();
      if (error) throw error;
      return json({ success: true, instance: instance || null });
    }

    // ═══════════════════════════════════════════
    // ACTION: update_instance_status
    // ═══════════════════════════════════════════
    if (action === "update_instance_status") {
      const { company_id, instance_id, status } = data as Record<string, string>;
      if (!company_id || !status) return json({ error: "company_id and status are required" }, 400);

      const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (instance_id) updatePayload.instance_id = instance_id;

      const { data: updated, error } = await supabase
        .from("whatsapp_instances")
        .update(updatePayload)
        .eq("company_id", company_id)
        .select("id, status")
        .maybeSingle();
      if (error) throw error;
      if (!updated) return json({ error: "No instance found for this company_id" }, 404);
      return json({ success: true, action: "updated_instance_status", id: updated.id, status: updated.status });
    }

    // ═══════════════════════════════════════════
    // ACTION: update_message_status
    // ═══════════════════════════════════════════
    if (action === "update_message_status") {
      const { message_id, status, company_id, phone_number, internal_id } = data as Record<string, string>;
      if (!message_id || !status) return json({ error: "message_id and status are required" }, 400);

      console.log("[update_message_status] message_id:", message_id, "status:", status, "company_id:", company_id || "N/A", "phone:", phone_number || "N/A");

      const incomingStatus = (status || "").toLowerCase().trim();
      if (!KNOWN_STATUSES.has(incomingStatus)) {
        return json({ success: true, action: "status_ignored", message: `Status '${status}' not recognized, ignored` });
      }

      const mappedStatus = normalizeStatus(incomingStatus);

      // 1. Try exact match by message_id — check hierarchy before updating
      const { data: current, error: findErr } = await supabase
        .from("messages")
        .select("id, status")
        .eq("message_id", message_id)
        .maybeSingle();
      if (findErr) throw findErr;

      if (current) {
        // Only update if new status is higher in hierarchy
        if (statusPriority(mappedStatus) <= statusPriority(current.status)) {
          console.log("[update_message_status] keeping higher status:", current.status, "≥", mappedStatus);
          return json({ success: true, action: "status_kept", id: current.id, kept: current.status, ignored: mappedStatus });
        }

        const { error: updateErr } = await supabase
          .from("messages")
          .update({ status: mappedStatus })
          .eq("id", current.id);
        if (updateErr) throw updateErr;

        // Sync campaign_contacts if this is a campaign message
        if (current.id) {
          const parsedCampaignRef = await resolveCampaignRefForMessage(current.id, internal_id || null);

          if (parsedCampaignRef) {
            await syncCampaignContactStatus(
              parsedCampaignRef.campaignId,
              parsedCampaignRef.contactId,
              mappedStatus,
              "update_message_status",
            );
          } else {
            console.log("[update_message_status] campaign sync skipped: no campaign reference found");
          }
        }

        console.log("[update_message_status] updated status:", current.status, "→", mappedStatus, "id:", current.id);
        return json({ success: true, action: "updated_status", id: current.id, status: mappedStatus });
      }

      // 2. No exact match by message_id — try reconciliation BEFORE creating contacts
      if (!company_id) {
        console.log("[update_message_status] no match and no company_id — deferring");
        return json({ success: true, action: "status_deferred", message: "Message not yet in DB and no company_id to create placeholder" });
      }

      const userId = await getUserForCompany(company_id);
      if (!userId) {
        return json({ success: true, action: "status_deferred", message: "No user found for company, deferring" });
      }

      // ── RECONCILIATION FIRST: find recent outbound messages without message_id ──
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: pendingMsgs } = await supabase
        .from("messages")
        .select("id, status, conversation_id, contact_id")
        .eq("company_id", company_id)
        .eq("direction", "outbound")
        .is("message_id", null)
        .gte("created_at", twoMinAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pendingMsgs && pendingMsgs.length > 0) {
        // Reconcile with the most recent one
        const target = pendingMsgs[0];
        const finalStatus = statusPriority(mappedStatus) > statusPriority(target.status) ? mappedStatus : target.status;
        const { error: reconErr } = await supabase
          .from("messages")
          .update({ message_id, status: finalStatus })
          .eq("id", target.id);
        if (reconErr) throw reconErr;
        console.log("[update_message_status] reconciled (company-wide):", target.id, "→ message_id:", message_id, "status:", finalStatus);

        // Sync campaign if applicable
        const parsedRef = await resolveCampaignRefForMessage(target.id, internal_id || null);
        if (parsedRef) {
          await syncCampaignContactStatus(parsedRef.campaignId, parsedRef.contactId, mappedStatus, "update_message_status_reconciled");
        }

        return json({ success: true, action: "reconciled_temp", id: target.id, status: finalStatus });
      }

      // ── INSTANCE NUMBER PROTECTION: don't create contacts for our own WhatsApp number ──
      if (phone_number) {
        const normalizedPhone = normalizePhone(phone_number);
        const { data: ownInstance } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("company_id", company_id)
          .or(`instance_id.eq.${normalizedPhone},hash.eq.${normalizedPhone}`)
          .maybeSingle();

        if (ownInstance) {
          console.log("[update_message_status] phone_number matches own instance, skipping contact creation:", normalizedPhone);
          return json({ success: true, action: "status_deferred", message: "Phone matches own instance, deferring" });
        }
      }

      // ── Check cutoff: don't create contacts/placeholders for old messages ──
      {
        const { data: cutoffSetting } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "data_cutoff_timestamp")
          .eq("company_id", company_id)
          .maybeSingle();

        if (cutoffSetting?.setting_value) {
          // For status events without sent_at, we check if the message_id pattern suggests old data
          // But primarily this blocks placeholder creation for old history
          console.log("[update_message_status] cutoff active, skipping placeholder creation for unknown message:", message_id);
          return json({ success: true, action: "status_deferred_cutoff", message: "Cutoff active, deferring unknown message" });
        }
      }

      // ── FALLBACK: create contact/conversation only if phone is a real recipient ──
      let contactId: string | null = null;
      let conversationId: string | null = null;

      if (phone_number) {
        const normalizedPhone = normalizePhone(phone_number);
        contactId = await findOrCreateContact(company_id, userId, normalizedPhone);
        conversationId = await findOrCreateConversation(company_id, userId, contactId, 0);
      }

      if (!contactId || !conversationId) {
        console.log("[update_message_status] cannot resolve contact/conversation — deferring");
        return json({ success: true, action: "status_deferred", message: "Cannot resolve contact, deferring" });
      }

      // Last resort: create placeholder shell
      const { data: upserted, error: upsertErr } = await supabase
        .from("messages")
        .upsert({
          message_id,
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: userId,
          company_id,
          channel: "whatsapp",
          direction: "outbound",
          content: "",
          message_type: "text",
          status: mappedStatus,
          metadata: { pending_content: true },
        }, { onConflict: "message_id" })
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;

      console.log("[update_message_status] placeholder created via upsert, id:", upserted.id);
      return json({ success: true, action: "upserted_placeholder", id: upserted.id, status: mappedStatus });
    }

    // ═══════════════════════════════════════════
    // ACTION: upsert_message
    // ═══════════════════════════════════════════
    if (action === "upsert_message") {
      const {
        company_id, instance_id, message_id, phone_number,
        contact_name, direction, content, media_type,
        media_url, mimetype, status, sent_at, internal_id,
        file_name, campaign_id,
      } = data as Record<string, string>;

      if (!company_id || !message_id || !phone_number) {
        return json({ error: "company_id, message_id and phone_number are required" }, 400);
      }

      // ── Check cutoff timestamp: ignore old messages from history sync ──
      if (sent_at) {
        const { data: cutoffSetting } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "data_cutoff_timestamp")
          .eq("company_id", company_id)
          .maybeSingle();

        if (cutoffSetting?.setting_value) {
          const cutoff = new Date(cutoffSetting.setting_value).getTime();
          const msgTime = new Date(sent_at).getTime();
          if (msgTime < cutoff) {
            console.log("[upsert_message] ignored old message, sent_at:", sent_at, "< cutoff:", cutoffSetting.setting_value);
            return json({ success: true, action: "ignored_old_message" });
          }
        }
      }

      const normalizedPhone = normalizePhone(phone_number);
      const userId = await getUserForCompany(company_id);
      if (!userId) return json({ error: "No user found for this company" }, 404);

      const contactId = await findOrCreateContact(company_id, userId, normalizedPhone, contact_name);
      const messageDirection = direction === "outbound" ? "outbound" : "inbound";
      const conversationId = await findOrCreateConversation(company_id, userId, contactId, messageDirection === "inbound" ? 1 : 0);

      // ── Build message fields ──
      const messageType = media_type && media_type !== "text" ? media_type : "text";
      const messageContent = typeof content === "string" ? content : "";
      const rawStatus = (status || "received").toLowerCase().trim();
      const mappedStatus = normalizeStatus(rawStatus);
      const messageMetadata: Record<string, unknown> = {};
      if (instance_id) messageMetadata.instance_id = instance_id;
      if (media_url) messageMetadata.media_url = media_url;
      if (mimetype) messageMetadata.mimetype = mimetype;
      if (file_name) messageMetadata.file_name = file_name;
      if (campaign_id) messageMetadata.campaign_id = campaign_id;
      // Only set campaign_contact_id when there's actual campaign evidence
      const parsedCampaignOnUpsert = parseCampaignInternalId(internal_id || null);
      if (parsedCampaignOnUpsert) {
        messageMetadata.campaign_contact_id = parsedCampaignOnUpsert.contactId;
      }
      messageMetadata.pending_content = false;
      const metaValue = Object.keys(messageMetadata).length > 0 ? messageMetadata : null;

      let upsertedId: string;

      // ── Helper: resolve final status respecting hierarchy ──
      const resolveStatus = async (targetMessageId: string, incomingStatus: string): Promise<string> => {
        const { data: row } = await supabase
          .from("messages")
          .select("status")
          .eq("message_id", targetMessageId)
          .maybeSingle();
        if (row && statusPriority(row.status) > statusPriority(incomingStatus)) {
          console.log("[upsert_message] preserving higher status:", row.status, ">", incomingStatus);
          return row.status;
        }
        return incomingStatus;
      };

      // ── Reconciliation: if internal_id is provided, find the temp row by client_message_id ──
      if (internal_id) {
        console.log("[upsert_message] internal_id provided:", internal_id, "→ official message_id:", message_id);

        // Strategy 1: Find by client_message_id (new flow)
        const { data: byClient } = await supabase
          .from("messages")
          .select("id, status, metadata")
          .eq("client_message_id", internal_id)
          .maybeSingle();

        // Strategy 2: Legacy — find by message_id = internal_id (old flow)
        let existing = byClient;
        if (!existing) {
          const { data: byMsgId } = await supabase
            .from("messages")
            .select("id, status, metadata")
            .eq("message_id", internal_id)
            .maybeSingle();
          existing = byMsgId;
        }

        // Strategy 3: Fuzzy match — same conversation, direction outbound, similar content or media_url, recent
        if (!existing) {
          // Try by media_url if content is empty/generic and media_url exists
          const incomingMediaUrl = media_url || messageMetadata?.media_url;
          if ((!messageContent || messageContent.trim() === "") && incomingMediaUrl) {
            const { data: fuzzyMedia } = await supabase
              .from("messages")
              .select("id, status, message_id, client_message_id, metadata")
              .eq("conversation_id", conversationId)
              .eq("direction", "outbound")
              .is("message_id", null)
              .order("created_at", { ascending: false })
              .limit(5);
            if (fuzzyMedia) {
              const match = fuzzyMedia.find((r: any) => {
                const meta = r.metadata || (r as any).metadata;
                return meta?.media_url === incomingMediaUrl;
              });
              if (match) {
                console.log("[upsert_message] fuzzy media_url match found:", match.id);
                existing = match;
              }
            }
          }
          // Fallback: match by content
          if (!existing && messageContent && messageContent.trim() !== "") {
            const { data: fuzzy } = await supabase
              .from("messages")
              .select("id, status, message_id, client_message_id")
              .eq("conversation_id", conversationId)
              .eq("direction", "outbound")
              .eq("content", messageContent)
              .is("message_id", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (fuzzy) {
              console.log("[upsert_message] fuzzy content match found:", fuzzy.id);
              existing = fuzzy;
            }
          }
        }

        if (existing) {
          // Preserve status if existing is more advanced
          const finalStatus = statusPriority(existing.status) > statusPriority(mappedStatus)
            ? existing.status
            : mappedStatus;
          console.log("[upsert_message] reconcile status:", existing.status, "→", finalStatus);

          // Merge metadata: preserve file_name, mimetype etc from temp row
          const existingMeta = (existing as any).metadata || {};
          const mergedMeta = { ...existingMeta, ...messageMetadata, pending_content: false };

          const { error: updateErr } = await supabase
            .from("messages")
            .update({
              message_id: message_id,
              client_message_id: internal_id || undefined,
              conversation_id: conversationId,
              contact_id: contactId,
              status: finalStatus,
              content: messageContent || undefined,
              message_type: messageType,
              metadata: mergedMeta,
              sent_at: sent_at || undefined,
            })
            .eq("id", existing.id);
          if (updateErr) throw updateErr;

          upsertedId = existing.id;
          console.log("[upsert_message] reconciled →", existing.id);
        } else {
          // internal_id not found — fall through to normal upsert
          console.log("[upsert_message] internal_id not found in DB, doing normal upsert");
          const finalStatus = await resolveStatus(message_id, mappedStatus);
          const fullRow = {
            message_id,
            client_message_id: internal_id,
            conversation_id: conversationId,
            contact_id: contactId,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: messageDirection,
            content: messageContent,
            message_type: messageType,
            status: finalStatus,
            metadata: metaValue,
            created_at: sent_at || new Date().toISOString(),
            sent_at: sent_at || new Date().toISOString(),
          };
          const { data: upserted, error: msgErr } = await supabase
            .from("messages")
            .upsert(fullRow, { onConflict: "message_id" })
            .select("id")
            .single();
          if (msgErr) throw msgErr;
          upsertedId = upserted.id;
        }
      } else {
        // ── Normal upsert (inbound messages or no internal_id) ──
        // For outbound media without internal_id, try to find an existing temp row first
        let reconciledOutbound = false;
        if (messageDirection === "outbound" && media_url) {
          const { data: tempCandidate } = await supabase
            .from("messages")
            .select("id, status, metadata")
            .eq("conversation_id", conversationId)
            .eq("direction", "outbound")
            .is("message_id", null)
            .order("created_at", { ascending: false })
            .limit(5);
          if (tempCandidate) {
            const match = tempCandidate.find((r: any) => {
              const meta = r.metadata || {};
              return meta.media_url === media_url;
            });
            if (match) {
              const finalStatus = statusPriority(match.status) > statusPriority(mappedStatus) ? match.status : mappedStatus;
              const mergedMeta = { ...(match.metadata || {}), ...messageMetadata, pending_content: false };
              const { error: reconErr } = await supabase
                .from("messages")
                .update({ message_id, status: finalStatus, metadata: mergedMeta, content: messageContent || undefined, message_type: messageType, sent_at: sent_at || undefined })
                .eq("id", match.id);
              if (reconErr) throw reconErr;
              upsertedId = match.id;
              reconciledOutbound = true;
              console.log("[upsert_message] reconciled outbound media (no internal_id):", match.id);
            }
          }
        }

        if (!reconciledOutbound) {
          const finalStatus = await resolveStatus(message_id, mappedStatus);
          const fullRow = {
            message_id,
            conversation_id: conversationId,
            contact_id: contactId,
            user_id: userId,
            company_id,
            channel: "whatsapp",
            direction: messageDirection,
            content: messageContent,
            message_type: messageType,
            status: finalStatus,
            metadata: metaValue,
            created_at: sent_at || new Date().toISOString(),
            sent_at: sent_at || new Date().toISOString(),
          };
          const { data: upserted, error: msgErr } = await supabase
            .from("messages")
            .upsert(fullRow, { onConflict: "message_id" })
            .select("id")
            .single();
          if (msgErr) throw msgErr;
          upsertedId = upserted.id;
        }
      }

      // ── Update conversation ──
      const updateData: Record<string, unknown> = {
        last_message_at: sent_at || new Date().toISOString(),
      };
      if (messageDirection === "inbound") {
        const { data: conv } = await supabase
          .from("conversations")
          .select("unread_count")
          .eq("id", conversationId)
          .single();
        updateData.unread_count = (conv?.unread_count || 0) + 1;
      }
      await supabase.from("conversations").update(updateData).eq("id", conversationId);

      // ── Sync campaign_contacts status ──
      const resolvedCampaignRef = await resolveCampaignRefForMessage(upsertedId, internal_id || null);
      if (resolvedCampaignRef) {
        await syncCampaignContactStatus(
          resolvedCampaignRef.campaignId,
          resolvedCampaignRef.contactId,
          mappedStatus,
          "upsert_message",
        );
      } else if (campaign_id) {
        await syncCampaignContactStatus(campaign_id, contactId, mappedStatus, "upsert_message_fallback_campaign_id");
      }

      // ── Track replies to campaigns (inbound messages) ──
      if (messageDirection === "inbound") {
        const { data: recentCampaignContact } = await supabase
          .from("campaign_contacts")
          .select("campaign_id, contact_id")
          .eq("contact_id", contactId)
          .eq("company_id", company_id)
          .in("status", ["sent", "delivered", "read"])
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentCampaignContact) {
          await syncCampaignContactStatus(
            recentCampaignContact.campaign_id,
            contactId,
            "replied",
            "upsert_message_reply_tracking",
          );
        }

        // ── Forward to custom automation inbound endpoint if configured ──
        try {
          const { data: autoEnabledSetting } = await supabase
            .from("admin_settings")
            .select("setting_value")
            .eq("setting_key", "n8n_automation_enabled")
            .eq("company_id", company_id)
            .maybeSingle();

          if (autoEnabledSetting?.setting_value === "true") {
            const { data: autoInboundSetting } = await supabase
              .from("admin_settings")
              .select("setting_value")
              .eq("setting_key", "n8n_automation_inbound")
              .eq("company_id", company_id)
              .maybeSingle();

            if (autoInboundSetting?.setting_value) {
              console.log("[upsert_message] Forwarding inbound to custom automation endpoint:", autoInboundSetting.setting_value);
              const fwdPayload = {
                company_id,
                contact_id: contactId,
                conversation_id: conversationId,
                message_id,
                phone: normalizedPhone,
                text: messageContent,
                contact_name: contact_name || normalizedPhone,
                message_type: messageType,
                media_url: media_url || null,
              };
              fetch(autoInboundSetting.setting_value, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fwdPayload),
              }).catch((err) => console.error("[automation-inbound-fwd] error:", err));
            }
          }
        } catch (autoInboundErr) {
          console.error("[upsert_message] automation inbound forward error:", autoInboundErr);
        }

        // ── Trigger automations for inbound messages ──
        try {
          const { data: activeAutomations } = await supabase
            .from("automations")
            .select("id, trigger_type, keyword, flow_data")
            .eq("company_id", company_id)
            .eq("status", "active");

          if (activeAutomations && activeAutomations.length > 0) {
            const incomingText = (messageContent || "").toLowerCase().trim();
            console.log("[automation-check] inbound text:", JSON.stringify(incomingText), "automations found:", activeAutomations.length);

            // Check if this is the first message (conversation was just created)
            const { count: msgCount } = await supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", conversationId)
              .eq("direction", "inbound");

            const isFirstMessage = (msgCount || 0) <= 1;

            for (const auto of activeAutomations) {
              // Resolve trigger from table columns; fallback to flow_data trigger node
              let effectiveTriggerType = auto.trigger_type;
              let effectiveKeyword = auto.keyword;

              // If table columns are missing/inconsistent, derive from flow_data
              if (!effectiveTriggerType || (effectiveTriggerType === "keyword" && !effectiveKeyword)) {
                const flowData = auto.flow_data as any;
                if (flowData?.nodes && Array.isArray(flowData.nodes)) {
                  const triggerNode = flowData.nodes.find((n: any) => n.type === "trigger");
                  if (triggerNode?.data) {
                    if (triggerNode.data.triggerType) {
                      effectiveTriggerType = triggerNode.data.triggerType;
                    }
                    if (triggerNode.data.keyword) {
                      effectiveKeyword = triggerNode.data.keyword;
                    }
                    console.log("[automation-check] derived trigger from flow_data node:", effectiveTriggerType, "keyword:", effectiveKeyword);
                  }
                }
              }

              let shouldTrigger = false;

              if (effectiveTriggerType === "keyword" && effectiveKeyword) {
                const keywords = effectiveKeyword.toLowerCase().split(",").map((k: string) => k.trim());
                shouldTrigger = keywords.some((kw: string) => kw && incomingText.includes(kw));
                console.log("[automation-check] id:", auto.id, "keyword match:", shouldTrigger, "keywords:", keywords.join(","));
              } else if (effectiveTriggerType === "first_message") {
                shouldTrigger = isFirstMessage;
                console.log("[automation-check] id:", auto.id, "first_message check:", shouldTrigger);
              } else if (effectiveTriggerType === "all_messages") {
                shouldTrigger = true;
              } else {
                console.log("[automation-check] id:", auto.id, "unrecognized trigger_type:", effectiveTriggerType);
              }

              if (shouldTrigger) {
                console.log("[automation-trigger] Firing automation:", auto.id, "type:", effectiveTriggerType);

                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                
                try {
                  const execResp = await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                      automation_id: auto.id,
                      contact_id: contactId,
                      conversation_id: conversationId,
                      company_id,
                      message_text: messageContent,
                    }),
                  });
                  const execBody = await execResp.text();
                  console.log("[automation-trigger] response:", execResp.status, execBody.substring(0, 300));
                } catch (fetchErr) {
                  console.error("[automation-trigger] fetch error:", fetchErr);
                }
              }
            }
          }
        } catch (autoErr) {
          console.error("[upsert_message] automation trigger error:", autoErr);
        }
      }

      return json({ success: true, action: "upserted_message", id: upsertedId });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error.message }, 500);
  }
});
