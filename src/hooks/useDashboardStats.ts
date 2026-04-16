import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFilters {
  dateFrom: string | null;
  dateTo: string | null;
  agentId: string | null;
  teamId: string | null;
}

export interface DashboardStats {
  activeConversations: number;
  totalContacts: number;
  totalMessages: number;
  avgResponseTime: string;
  recentConversations: Array<{
    id: string;
    contactName: string;
    lastMessageAt: string;
    channel: string;
    status: string;
  }>;
  channelDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  sourceDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

export function useDashboardStats(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard-stats", filters],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const companyId = profile.company_id;

      // Build conversation query with filters
      let convQuery = supabase
        .from("conversations")
        .select("id, status, channel, last_message_at, assigned_to, assigned_team, contact:contacts(name)")
        .eq("company_id", companyId);

      if (filters.dateFrom) convQuery = convQuery.gte("created_at", filters.dateFrom);
      if (filters.dateTo) convQuery = convQuery.lte("created_at", filters.dateTo + "T23:59:59");
      if (filters.agentId) convQuery = convQuery.eq("assigned_to", filters.agentId);
      if (filters.teamId) convQuery = convQuery.eq("assigned_team", filters.teamId);

      const { data: conversations } = await convQuery;

      // Messages count
      let msgQuery = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      if (filters.dateFrom) msgQuery = msgQuery.gte("created_at", filters.dateFrom);
      if (filters.dateTo) msgQuery = msgQuery.lte("created_at", filters.dateTo + "T23:59:59");

      const { count: totalMessages } = await msgQuery;

      // Contacts count
      let contactQuery = supabase
        .from("contacts")
        .select("id, source", { count: "exact" })
        .eq("company_id", companyId);

      if (filters.dateFrom) contactQuery = contactQuery.gte("created_at", filters.dateFrom);
      if (filters.dateTo) contactQuery = contactQuery.lte("created_at", filters.dateTo + "T23:59:59");

      const { data: contacts, count: totalContacts } = await contactQuery;

      const convs = conversations || [];
      const activeConversations = convs.filter(c => c.status === "open" || c.status === "in_progress").length;

      // Channel distribution
      const channelCounts: Record<string, number> = {};
      convs.forEach(c => {
        const ch = c.channel || "whatsapp";
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      });
      const totalConvs = convs.length || 1;
      const channelDistribution = Object.entries(channelCounts)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
          percentage: Math.round((count / totalConvs) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Source distribution (contacts)
      const sourceCounts: Record<string, number> = {};
      (contacts || []).forEach(c => {
        const src = c.source || "manual";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const totalCt = (contacts || []).length || 1;
      const sourceDistribution = Object.entries(sourceCounts)
        .map(([name, count]) => ({
          name: formatSourceName(name),
          count,
          percentage: Math.round((count / totalCt) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Recent conversations
      const recentConversations = convs
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          contactName: (c.contact as any)?.name || "Desconhecido",
          lastMessageAt: c.last_message_at,
          channel: c.channel,
          status: c.status,
        }));

      // Calculate average first response time
      let avgResponseTime = "—";
      const convIds = convs.map(c => c.id);
      if (convIds.length > 0) {
        const batchSize = 50;
        const allMsgs: Array<{ conversation_id: string; direction: string; sent_at: string }> = [];
        for (let i = 0; i < convIds.length; i += batchSize) {
          const batch = convIds.slice(i, i + batchSize);
          const { data: msgs } = await supabase
            .from("messages")
            .select("conversation_id, direction, sent_at")
            .eq("company_id", companyId)
            .in("conversation_id", batch)
            .in("direction", ["inbound", "outbound"])
            .order("sent_at", { ascending: true });
          if (msgs) allMsgs.push(...msgs);
        }

        const grouped: Record<string, typeof allMsgs> = {};
        allMsgs.forEach(m => {
          if (!grouped[m.conversation_id]) grouped[m.conversation_id] = [];
          grouped[m.conversation_id].push(m);
        });

        const deltas: number[] = [];
        Object.values(grouped).forEach(msgs => {
          const firstInbound = msgs.find(m => m.direction === "inbound");
          if (!firstInbound) return;
          const firstOutbound = msgs.find(
            m => m.direction === "outbound" && new Date(m.sent_at).getTime() > new Date(firstInbound.sent_at).getTime()
          );
          if (!firstOutbound) return;
          const delta = new Date(firstOutbound.sent_at).getTime() - new Date(firstInbound.sent_at).getTime();
          if (delta > 0) deltas.push(delta);
        });

        if (deltas.length > 0) {
          const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          avgResponseTime = formatDuration(avgMs);
        }
      }

      return {
        activeConversations,
        totalContacts: totalContacts || 0,
        totalMessages: totalMessages || 0,
        avgResponseTime,
        recentConversations,
        channelDistribution,
        sourceDistribution,
      };
    },
  });
}

export function useAgentsAndTeams() {
  return useQuery({
    queryKey: ["dashboard-agents-teams"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return { agents: [], teams: [] };

      const [{ data: agents }, { data: teams }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("company_id", profile.company_id),
        supabase
          .from("teams")
          .select("id, name")
          .eq("company_id", profile.company_id),
      ]);

      return {
        agents: (agents || []).map(a => ({ id: a.user_id, name: a.full_name || "Sem nome" })),
        teams: (teams || []).map(t => ({ id: t.id, name: t.name })),
      };
    },
  });
}

function formatSourceName(source: string): string {
  const map: Record<string, string> = {
    manual: "Manual",
    whatsapp: "WhatsApp",
    import: "Importação",
    checkin: "Check-in",
    campaign: "Campanha",
    api: "API",
    webhook: "Webhook",
  };
  return map[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1);
}
