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
        .select(`
          *,
          contact:contacts (
            id,
            name,
            phone,
            email,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, direction")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMsg || undefined,
          };
        })
      );

      return conversationsWithMessages as Conversation[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    conversations,
    isLoading,
  };
};
