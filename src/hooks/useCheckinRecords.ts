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
  token: string | null;
  contact_id: string | null;
  checkin_links?: {
    name: string;
  };
  contacts?: {
    name: string;
    phone: string | null;
  };
}

// Generate unique token for check-in
export const generateCheckinToken = (): string => {
  return `CHK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

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
          ),
          contacts:contact_id (
            name,
            phone
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
      userId,
      token 
    }: { 
      checkinLinkId: string; 
      userId: string;
      token: string;
    }) => {
      const { data, error } = await supabase
        .from("checkin_records")
        .insert({
          checkin_link_id: checkinLinkId,
          user_id: userId,
          status: "pending",
          token,
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

  const identifyCheckin = useMutation({
    mutationFn: async ({ 
      token, 
      whatsappNumber,
      contactId 
    }: { 
      token: string; 
      whatsappNumber: string;
      contactId: string;
    }) => {
      const { data, error } = await supabase
        .from("checkin_records")
        .update({
          whatsapp_user: whatsappNumber,
          contact_id: contactId,
          status: "identified",
        })
        .eq("token", token)
        .eq("status", "pending")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
    },
  });

  const deleteCheckinRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checkin_records").delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
    },
  });

  return {
    checkinRecords,
    isLoading,
    createCheckinRecord,
    identifyCheckin,
    deleteCheckinRecord,
  };
};
