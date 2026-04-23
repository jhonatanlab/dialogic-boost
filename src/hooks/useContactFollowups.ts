import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactFollowup {
  id: string;
  automation_id: string;
  conversation_id: string;
  followup_count: number;
  last_followup_at: string | null;
  created_at: string;
  automation: {
    id: string;
    name: string;
    inactivity_minutes: number | null;
    max_followups: number | null;
    status: string;
  } | null;
}

export const useContactFollowups = (contactId: string | undefined) => {
  return useQuery({
    queryKey: ["contact-followups", contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<ContactFollowup[]> => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("automation_followups")
        .select(
          `id, automation_id, conversation_id, followup_count, last_followup_at, created_at,
           automation:automations(id, name, inactivity_minutes, max_followups, status)`
        )
        .eq("contact_id", contactId)
        .order("last_followup_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as unknown as ContactFollowup[];
    },
  });
};
