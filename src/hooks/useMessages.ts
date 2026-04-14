import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  contact_id: string;
  user_id: string;
  channel: string;
  direction: "inbound" | "outbound";
  content: string;
  message_type: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  message_id?: string | null;
}

export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  // Fetch agent names for outbound messages
  const outboundUserIds = useMemo(() => {
    if (!messages) return [];
    const ids = new Set<string>();
    messages.forEach((m) => {
      if (m.direction === "outbound" && m.user_id) ids.add(m.user_id);
    });
    return Array.from(ids);
  }, [messages]);

  const { data: agentProfiles } = useQuery({
    queryKey: ["agent-profiles", outboundUserIds],
    queryFn: async () => {
      if (outboundUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .in("user_id", outboundUserIds);
      if (error) throw error;
      return data || [];
    },
    enabled: outboundUserIds.length > 0,
  });

  const agentNames: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    (agentProfiles || []).forEach((p: any) => {
      if (p.full_name) {
        map[p.user_id] = p.full_name;
      }
    });
    return map;
  }, [agentProfiles]);

  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId, contactId, content, phone, companyId,
      mediaType, mediaUrl, mimetype, fileName, ptt, internalId,
    }: {
      conversationId: string; contactId: string; content: string;
      phone: string; companyId: string;
      mediaType?: string; mediaUrl?: string; mimetype?: string; fileName?: string; ptt?: boolean;
      internalId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const effectiveMediaType = mediaType || "text";
      const messageContent = content || "";
      const tempMessageId = internalId || `app-${crypto.randomUUID()}`;

      // 1. Insert message into DB with temporary ID and 'sending' status
      const metadata: Record<string, unknown> = {};
      if (mediaUrl) metadata.media_url = mediaUrl;
      if (mimetype) metadata.mimetype = mimetype;
      if (fileName) metadata.file_name = fileName;

      const { error: insertError } = await supabase
        .from("messages")
        .insert([{
client_message_id: tempMessageId,
          message_id: null,
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: user.id,
          company_id: companyId,
          channel: "whatsapp",
          direction: "outbound",
          content: messageContent,
          message_type: effectiveMediaType,
          status: "sending",
          sent_at: new Date().toISOString(),
          metadata: Object.keys(metadata).length > 0 ? (metadata as any) : null,
        }] as any);

      if (insertError) throw insertError;

      // Invalidate immediately so the message appears in the chat
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });

      // 2. Build payload for n8n with internal_id
      const payload: Record<string, string> = {
        company_id: companyId,
        number: phone,
        text: messageContent,
        type: effectiveMediaType,
        internal_id: tempMessageId,
      };
      if (mediaUrl) payload.media_url = mediaUrl;
      if (mimetype) payload.mimetype = mimetype;
      if (fileName) payload.file_name = fileName;
      if (ptt) payload.ptt = "true";

      // Fetch all relevant settings for this company
      const { data: allSettings } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .eq("company_id", companyId)
        .in("setting_key", ["n8n_automation_enabled", "n8n_automation_outbound", "n8n_send_message"]);

      const settingsMap: Record<string, string> = {};
      (allSettings || []).forEach((s: any) => {
        if (s.setting_value) settingsMap[s.setting_key] = s.setting_value;
      });

      const automationEnabled = settingsMap["n8n_automation_enabled"] === "true";
      const automationOutbound = settingsMap["n8n_automation_outbound"];
      const nativeSendEndpoint = settingsMap["n8n_send_message"];

      let result: any;

      if (automationEnabled && automationOutbound) {
        // API Automação: POST direto para o endpoint outbound
        const res = await fetch(automationOutbound, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          await (supabase as any)
            .from("messages")
            .update({ status: "failed" })
            .eq("client_message_id", tempMessageId);
          throw new Error(`Erro no envio via API Automação: ${res.status}`);
        }
        result = await res.json().catch(() => ({ success: true }));
      } else if (nativeSendEndpoint) {
        // API Nativa: POST via proxy-n8n
        const response = await supabase.functions.invoke("proxy-n8n", {
          body: { endpoint: nativeSendEndpoint, payload },
        });
        if (response.error) {
          await (supabase as any)
            .from("messages")
            .update({ status: "failed" })
            .eq("client_message_id", tempMessageId);
          throw new Error(response.error.message);
        }
        result = response.data;
      } else {
        await (supabase as any)
          .from("messages")
          .update({ status: "failed" })
          .eq("client_message_id", tempMessageId);
        throw new Error("Nenhuma integração de envio configurada");
      }
      if (result?.success === false) {
        await (supabase as any)
          .from("messages")
          .update({ status: "failed" })
          .eq("client_message_id", tempMessageId);
        throw new Error(result.error || "Erro no envio via n8n");
      }

      // last_message_at is now updated automatically by a database trigger

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      console.error("Error sending message:", error);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (convId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", convId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Realtime: listen INSERT + UPDATE
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`msgs-${conversationId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return { messages, isLoading, sendMessage, markAsRead };
};
