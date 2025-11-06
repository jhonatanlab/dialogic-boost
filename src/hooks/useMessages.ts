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
    }: {
      conversationId: string;
      contactId: string;
      content: string;
      phone: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Save message to database
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: user.id,
          channel: "whatsapp",
          direction: "outbound",
          content: content,
          message_type: "text",
          status: "sent",
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Send via WhatsApp API
      const { error: sendError } = await supabase.functions.invoke("send-message", {
        body: {
          user_id: user.id,
          phone: phone,
          message: content,
        },
      });

      if (sendError) {
        // Update message status to failed
        await supabase
          .from("messages")
          .update({ status: "failed" })
          .eq("id", message.id);
        throw sendError;
      }

      // Update message status to delivered
      await supabase
        .from("messages")
        .update({ status: "delivered" })
        .eq("id", message.id);

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
          event: "INSERT",
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
