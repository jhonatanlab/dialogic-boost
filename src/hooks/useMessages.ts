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
      const messageMetadata = mediaUrl ? { media_url: mediaUrl, mimetype: mimetype || null } : null;
      const messageContent = content || "";

      // Generate a unique message_id so the webhook can match this message later
      const generatedMessageId = `app-${crypto.randomUUID()}`;

      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: user.id,
          channel: "whatsapp",
          direction: "outbound",
          content: messageContent,
          message_type: effectiveMediaType,
          status: "sending",
          metadata: messageMetadata,
          message_id: generatedMessageId,
        })
        .select()
        .single();
      if (msgError) throw msgError;

      const payload: Record<string, string> = {
        company_id: companyId, number: phone, text: content, type: effectiveMediaType,
      };
      if (mediaUrl) payload.media_url = mediaUrl;
      if (mimetype) payload.mimetype = mimetype;

      try {
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
          await supabase.from("messages").update({ status: "failed" }).eq("id", message.id);
          throw new Error(response.error.message);
        }

        const result = response.data;
        if (result?.success === false) {
          await supabase.from("messages").update({ status: "failed" }).eq("id", message.id);
          throw new Error(result.error || "Erro no envio via n8n");
        }

        await supabase.from("messages").update({ status: "sent" }).eq("id", message.id);
      } catch (sendErr) {
        await supabase.from("messages").update({ status: "failed" }).eq("id", message.id);
        throw sendErr;
      }

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
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
