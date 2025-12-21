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

export const useAnalytics = (dateRange: { start: Date; end: Date }) => {
  const { data: messageStats, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["analytics", "messages", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .select("direction, status")
        .eq("user_id", user.id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      const stats: MessageStats = {
        total_sent: 0,
        total_received: 0,
        total_delivered: 0,
        total_read: 0,
        total_failed: 0,
      };

      (data || []).forEach((msg) => {
        if (msg.direction === "outbound") {
          stats.total_sent++;
          if (msg.status === "delivered") stats.total_delivered++;
          if (msg.status === "read") stats.total_read++;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .select("direction, created_at")
        .eq("user_id", user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, status")
        .eq("user_id", user.id)
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

      const { data, error } = await supabase
        .from("conversations")
        .select("status, created_at")
        .eq("user_id", user.id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      return {
        total: data?.length || 0,
        open: data?.filter((c) => c.status === "open").length || 0,
        pending: data?.filter((c) => c.status === "pending").length || 0,
        closed: data?.filter((c) => c.status === "closed").length || 0,
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
