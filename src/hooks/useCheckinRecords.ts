import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CheckinRecord {
  id: string;
  checkin_link_id: string;
  user_id: string;
  timestamp: string;
  whatsapp_user: string | null;
  status: string;
  fidelity_progress: number;
}

export const useCheckinRecords = () => {
  const queryClient = useQueryClient();

  const { data: checkinRecords = [], isLoading } = useQuery({
    queryKey: ["checkin-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_records")
        .select(`
          *,
          checkin_links:checkin_link_id (
            name
          )
        `)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createCheckinRecord = useMutation({
    mutationFn: async ({ 
      checkinLinkId, 
      userId 
    }: { 
      checkinLinkId: string; 
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("checkin_records")
        .insert({
          checkin_link_id: checkinLinkId,
          user_id: userId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
    },
  });

  return {
    checkinRecords,
    isLoading,
    createCheckinRecord,
  };
};
