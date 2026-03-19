import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
      conversationId,
      contactId,
      content,
      phone,
      companyId,
      mediaType,
      mediaUrl,
      mimetype,
    }: {
      conversationId: string;
      contactId: string;
      content: string;
      phone: string;
      companyId: string;
      mediaType?: string;
      mediaUrl?: string;
      mimetype?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const effectiveMediaType = mediaType || "text";
      const messageMetadata = mediaUrl ? { media_url: mediaUrl, mimetype: mimetype || null } : null;

      // Save message to database with status "sending"
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: user.id,
          channel: "whatsapp",
          direction: "outbound",
          content: content || (mediaUrl ? `[${effectiveMediaType}]` : ""),
          message_type: effectiveMediaType,
          status: "sending",
          metadata: messageMetadata,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Send via n8n production endpoint
      const payload: Record<string, string> = {
        company_id: companyId,
        number: phone,
        text: content,
        type: effectiveMediaType,
      };

      if (mediaUrl) {
        payload.media_url = mediaUrl;
      }
      if (mimetype) {
        payload.mimetype = mimetype;
      }

      try {
        const response = await fetch(N8N_SEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
          // Update message status to failed
          await supabase
            .from("messages")
            .update({ status: "failed" })
            .eq("id", message.id);
          throw new Error(result.error || `n8n error: ${response.status}`);
        }

        // Update message status to sent
        await supabase
          .from("messages")
          .update({ status: "sent" })
          .eq("id", message.id);
      } catch (sendErr) {
        // Update message status to failed
        await supabase
          .from("messages")
          .update({ status: "failed" })
          .eq("id", message.id);
        throw sendErr;
      }

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Error sending message:", error);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Subscribe to realtime updates for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
  };
};
