import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CheckIn {
  id: string;
  user_id: string;
  customer_phone: string;
  customer_name?: string;
  source: string;
  created_at: string;
}

export const useCheckins = () => {
  const queryClient = useQueryClient();

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
  });

  const createCheckin = useMutation({
    mutationFn: async (newCheckin: Omit<CheckIn, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("checkins")
        .insert(newCheckin)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["customer-fidelity"] });
    },
  });

  const deleteCheckin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checkins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      toast.success("Check-in removido com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover check-in");
    },
  });

  return {
    checkins,
    isLoading,
    createCheckin,
    deleteCheckin,
  };
};
