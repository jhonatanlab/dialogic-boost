import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  channel: string;
  status: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  last_message?: {
    content: string;
    direction: string;
    message_type?: string;
    metadata?: unknown;
  };
}

export const useConversations = () => {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .select(`*, contact:contacts (id, name, phone, email, avatar_url)`)
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          // Fetch a few recent messages to skip pending shells
          const { data: lastMessages } = await supabase
            .from("messages")
            .select("content, direction, message_type, metadata")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(5);

          // Find first message that isn't a pending shell
          const validMsg = lastMessages?.find(m => {
            const meta = m.metadata as Record<string, unknown> | null;
            if (meta?.pending_content === true) return false;
            if (m.direction === "outbound" && (!m.content || !m.content.trim()) && !meta?.media_url) return false;
            return true;
          });

          return { ...conv, last_message: validMsg || undefined };
        })
      );

      return conversationsWithMessages as Conversation[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("conv-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { conversations, isLoading };
};
