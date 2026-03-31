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
  assigned_to: string | null;
  assigned_team: string | null;
  company_id: string | null;
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
  assigned_agent_name?: string | null;
  assigned_team_name?: string | null;
}

export const useConversations = () => {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      // Fetch ALL conversations for this company (not just user's own)
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, contact:contacts (id, name, phone, email, avatar_url)`)
        .eq("company_id", profile.company_id)
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      // Fetch agent names and team names for assignment display
      const agentIds = [...new Set((data || []).map(c => c.assigned_to).filter(Boolean))] as string[];
      const teamIds = [...new Set((data || []).map(c => c.assigned_team).filter(Boolean))] as string[];

      let agentMap: Record<string, string> = {};
      let teamMap: Record<string, string> = {};

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", agentIds);
        agentMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name || "Atendente"]));
      }

      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", teamIds);
        teamMap = Object.fromEntries((teams || []).map(t => [t.id, t.name]));
      }

      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessages } = await supabase
            .from("messages")
            .select("content, direction, message_type, metadata")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(5);

          const validMsg = lastMessages?.find(m => {
            const meta = m.metadata as Record<string, unknown> | null;
            if (meta?.pending_content === true) return false;
            if (m.direction === "outbound" && (!m.content || !m.content.trim()) && !meta?.media_url) return false;
            return true;
          });

          return {
            ...conv,
            last_message: validMsg || undefined,
            assigned_agent_name: conv.assigned_to ? (agentMap[conv.assigned_to] || "Atendente") : null,
            assigned_team_name: conv.assigned_team ? (teamMap[conv.assigned_team] || "Equipe") : null,
          };
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
