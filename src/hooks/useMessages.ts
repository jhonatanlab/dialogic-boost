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

      // Build payload for n8n — NO database insert here
      const payload: Record<string, string> = {
        company_id: companyId,
        number: phone,
        text: messageContent,
        type: effectiveMediaType,
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
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result?.success === false) {
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
