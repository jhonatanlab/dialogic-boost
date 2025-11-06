import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FidelitySettings {
  id: string;
  user_id: string;
  campaign_name: string;
  checkins_goal: number;
  reward_description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFidelitySettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["fidelity-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fidelity_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as FidelitySettings | null;
    },
  });

  const upsertSettings = useMutation({
    mutationFn: async (newSettings: Partial<FidelitySettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fidelity_settings")
        .upsert({
          user_id: user.id,
          ...newSettings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-settings"] });
      toast.success("Configurações de fidelidade salvas!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    settings,
    isLoading,
    upsertSettings,
  };
};
