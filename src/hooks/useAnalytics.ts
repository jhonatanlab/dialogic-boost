import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

export interface MessageStats {
  total_sent: number;
  total_received: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
}

export interface CampaignStats {
  total_campaigns: number;
  campaigns_sent: number;
  campaigns_draft: number;
  campaigns_scheduled: number;
  total_contacts_reached: number;
  total_messages_sent: number;
  total_messages_failed: number;
  success_rate: number;
}

export interface DailyMessageData {
  date: string;
  sent: number;
  received: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  success_rate: number;
  created_at: string;
  sent_at: string | null;
}

// Helper to get company_id
const getCompanyId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();
  return { userId: user.id, companyId: profile?.company_id };
};

export const useAnalytics = (dateRange: { start: Date; end: Date }) => {
  const { data: messageStats, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["analytics", "messages", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { companyId } = await getCompanyId();

      const { data, error } = await supabase
        .from("messages")
        .select("direction, status, message_id, metadata")
        .eq("company_id", companyId || "")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      // Deduplicar por message_id: manter apenas o status mais avançado
      const statusPrio = (s: string) => {
        switch (s) {
          case "sending": return 0;
          case "sent": case "server_ack": return 1;
          case "delivered": case "received": return 2;
          case "read": case "played": return 3;
          case "failed": return 4;
          default: return -1;
        }
      };

      const dedupMap = new Map<string, { direction: string; status: string; metadata: any }>();
      (data || []).forEach((msg) => {
        const key = msg.message_id || msg.message_id === null ? null : msg.message_id;
        if (key) {
          const existing = dedupMap.get(key);
          if (!existing || statusPrio(msg.status) > statusPrio(existing.status)) {
            dedupMap.set(key, msg);
          }
        } else {
          // Sem message_id, usar como está (não deduplicável)
          dedupMap.set(crypto.randomUUID(), msg);
        }
      });

      const stats: MessageStats = {
        total_sent: 0,
        total_received: 0,
        total_delivered: 0,
        total_read: 0,
        total_failed: 0,
      };

      dedupMap.forEach((msg) => {
        // Ignorar shells sem conteúdo
        const meta = msg.metadata as Record<string, any> | null;
        if (meta?.pending_content) return;

        if (msg.direction === "outbound") {
          // Não contar mensagens ainda em "sending"
          if (msg.status === "sending") return;

          stats.total_sent++;
          // Hierarquia: read/played implica delivered
          if (["delivered", "read", "played"].includes(msg.status)) {
            stats.total_delivered++;
          }
          if (["read", "played"].includes(msg.status)) {
            stats.total_read++;
          }
          if (msg.status === "failed") stats.total_failed++;
        } else {
          stats.total_received++;
        }
      });

      return stats;
    },
  });

  const { data: dailyMessages, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["analytics", "daily-messages", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { companyId } = await getCompanyId();

      const { data, error } = await supabase
        .from("messages")
        .select("direction, created_at")
        .eq("company_id", companyId || "")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const dailyData: DailyMessageData[] = days.map((day) => ({
        date: format(day, "dd/MM"),
        sent: 0,
        received: 0,
      }));

      (data || []).forEach((msg) => {
        const msgDate = format(new Date(msg.created_at), "dd/MM");
        const dayIndex = dailyData.findIndex((d) => d.date === msgDate);
        if (dayIndex !== -1) {
          if (msg.direction === "outbound") {
            dailyData[dayIndex].sent++;
          } else {
            dailyData[dayIndex].received++;
          }
        }
      });

      return dailyData;
    },
  });

  const { data: campaignStats, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["analytics", "campaigns", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { companyId } = await getCompanyId();

      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, status")
        .eq("company_id", companyId || "")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (campaignsError) throw campaignsError;

      const campaignIds = (campaigns || []).map((c) => c.id);
      
      let contactsData: any[] = [];
      if (campaignIds.length > 0) {
        const { data, error } = await supabase
          .from("campaign_contacts")
          .select("status")
          .in("campaign_id", campaignIds);
        
        if (error) throw error;
        contactsData = data || [];
      }

      const stats: CampaignStats = {
        total_campaigns: campaigns?.length || 0,
        campaigns_sent: campaigns?.filter((c) => c.status === "sent").length || 0,
        campaigns_draft: campaigns?.filter((c) => c.status === "draft").length || 0,
        campaigns_scheduled: campaigns?.filter((c) => c.status === "scheduled").length || 0,
        total_contacts_reached: contactsData.length,
        total_messages_sent: contactsData.filter((c) => c.status === "sent").length,
        total_messages_failed: contactsData.filter((c) => c.status === "failed").length,
        success_rate: contactsData.length > 0 
          ? Math.round((contactsData.filter((c) => c.status === "sent").length / contactsData.length) * 100) 
          : 0,
      };

      return stats;
    },
  });

  const { data: campaignPerformance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ["analytics", "campaign-performance", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const performanceData: CampaignPerformance[] = await Promise.all(
        (campaigns || []).map(async (campaign) => {
          const { data: contacts } = await supabase
            .from("campaign_contacts")
            .select("status")
            .eq("campaign_id", campaign.id);

          const total = contacts?.length || 0;
          const sent = contacts?.filter((c) => c.status === "sent").length || 0;
          const failed = contacts?.filter((c) => c.status === "failed").length || 0;
          const pending = contacts?.filter((c) => c.status === "pending").length || 0;

          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            total_contacts: total,
            sent_count: sent,
            failed_count: failed,
            pending_count: pending,
            success_rate: total > 0 ? Math.round((sent / total) * 100) : 0,
            created_at: campaign.created_at,
            sent_at: campaign.sent_at,
          };
        })
      );

      return performanceData;
    },
  });

  const { data: conversationStats, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["analytics", "conversations", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      const companyId = profile?.company_id;

      const { data, error } = await supabase
        .from("conversations")
        .select("id, status, created_at, updated_at, assigned_to")
        .eq("company_id", companyId || "")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      // Fetch conversation events for the period (started/closed)
      const { data: events } = await supabase
        .from("conversation_events")
        .select("conversation_id, event_type, created_at, actor_name, actor_user_id")
        .eq("company_id", companyId || "")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      const startedEvents = (events || []).filter(e => e.event_type === "started");
      const closedEvents = (events || []).filter(e => e.event_type === "closed");

      // Calculate avg resolution time from events
      const resolutionTimes: number[] = [];
      closedEvents.forEach(closeEvt => {
        const startEvt = startedEvents.find(s => s.conversation_id === closeEvt.conversation_id);
        if (startEvt) {
          const diff = new Date(closeEvt.created_at).getTime() - new Date(startEvt.created_at).getTime();
          if (diff > 0) resolutionTimes.push(diff);
        }
      });

      const avgResolutionMs = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

      // Avg response time: time between first inbound message and first outbound reply per conversation
      let avgResponseMs = 0;
      if (companyId && data && data.length > 0) {
        const convIds = data.map(c => c.id);
        // Fetch messages for these conversations
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id, direction, created_at")
          .in("conversation_id", convIds.slice(0, 100)) // limit for performance
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          const responseTimes: number[] = [];
          const grouped = new Map<string, typeof msgs>();
          msgs.forEach(m => {
            if (!grouped.has(m.conversation_id)) grouped.set(m.conversation_id, []);
            grouped.get(m.conversation_id)!.push(m);
          });
          grouped.forEach((convMsgs) => {
            const firstInbound = convMsgs.find(m => m.direction === "inbound");
            if (!firstInbound) return;
            const firstReply = convMsgs.find(m => m.direction === "outbound" && new Date(m.created_at) > new Date(firstInbound.created_at));
            if (firstReply) {
              const diff = new Date(firstReply.created_at).getTime() - new Date(firstInbound.created_at).getTime();
              if (diff > 0) responseTimes.push(diff);
            }
          });
          avgResponseMs = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        }
      }

      // Conversations per agent
      const agentMap = new Map<string, number>();
      (data || []).forEach(c => {
        if (c.assigned_to) {
          agentMap.set(c.assigned_to, (agentMap.get(c.assigned_to) || 0) + 1);
        }
      });

      // Fetch agent names from profiles
      const agentIds = Array.from(agentMap.keys());
      let agentConversations: { agent_name: string; count: number }[] = [];
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", agentIds);

        agentConversations = agentIds.map(id => ({
          agent_name: profiles?.find(p => p.user_id === id)?.full_name || "Sem nome",
          count: agentMap.get(id) || 0,
        })).sort((a, b) => b.count - a.count);
      }

      return {
        total: data?.length || 0,
        open: data?.filter((c) => c.status === "open").length || 0,
        in_progress: data?.filter((c) => c.status === "in_progress").length || 0,
        pending: data?.filter((c) => c.status === "pending").length || 0,
        closed: data?.filter((c) => c.status === "closed").length || 0,
        started_count: startedEvents.length,
        closed_count: closedEvents.length,
        avg_resolution_ms: avgResolutionMs,
        avg_response_ms: avgResponseMs,
        agent_conversations: agentConversations,
      };
    },
  });

  return {
    messageStats,
    dailyMessages,
    campaignStats,
    campaignPerformance,
    conversationStats,
    isLoading: isLoadingMessages || isLoadingDaily || isLoadingCampaigns || isLoadingPerformance || isLoadingConversations,
  };
};
