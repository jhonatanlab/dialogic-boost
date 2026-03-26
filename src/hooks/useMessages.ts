import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId, contactId, content, phone, companyId,
      mediaType, mediaUrl, mimetype,
    }: {
      conversationId: string; contactId: string; content: string;
      phone: string; companyId: string;
      mediaType?: string; mediaUrl?: string; mimetype?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const effectiveMediaType = mediaType || "text";
      const messageContent = content || "";
      const tempMessageId = `app-${crypto.randomUUID()}`;

      // 1. Insert message into DB with temporary ID and 'sending' status
      const metadata: Record<string, unknown> = {};
      if (mediaUrl) metadata.media_url = mediaUrl;
      if (mimetype) metadata.mimetype = mimetype;

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

      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "n8n_send_message")
        .maybeSingle();

      const sendEndpoint = settingsData?.setting_value || "https://primary-production-b2b0f.up.railway.app/webhook/send-message";

      const response = await supabase.functions.invoke("proxy-n8n", {
        body: { endpoint: sendEndpoint, payload },
      });

      if (response.error) {
        // Mark message as failed in DB (find by client_message_id)
        await supabase
          .from("messages")
          .update({ status: "failed" } as any)
          .eq("client_message_id" as any, tempMessageId);
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result?.success === false) {
        await supabase
          .from("messages")
          .update({ status: "failed" })
          .eq("message_id", tempMessageId);
        throw new Error(result.error || "Erro no envio via n8n");
      }

      // Update last_message_at on the conversation
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

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
