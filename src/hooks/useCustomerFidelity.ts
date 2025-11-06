import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerFidelity {
  id: string;
  user_id: string;
  customer_phone: string;
  customer_name?: string;
  total_checkins: number;
  total_rewards: number;
  last_checkin_at?: string;
  created_at: string;
  updated_at: string;
}

export const useCustomerFidelity = () => {
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customer-fidelity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_fidelity")
        .select("*")
        .order("total_checkins", { ascending: false });

      if (error) throw error;
      return data as CustomerFidelity[];
    },
  });

  const updateCustomerFidelity = useMutation({
    mutationFn: async ({ 
      phone, 
      name, 
      incrementCheckins = false 
    }: { 
      phone: string; 
      name?: string; 
      incrementCheckins?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get existing customer fidelity record
      const { data: existing } = await supabase
        .from("customer_fidelity")
        .select("*")
        .eq("user_id", user.id)
        .eq("customer_phone", phone)
        .maybeSingle();

      const newCheckins = incrementCheckins 
        ? (existing?.total_checkins || 0) + 1 
        : (existing?.total_checkins || 0);

      const { data, error } = await supabase
        .from("customer_fidelity")
        .upsert({
          user_id: user.id,
          customer_phone: phone,
          customer_name: name || existing?.customer_name,
          total_checkins: newCheckins,
          total_rewards: existing?.total_rewards || 0,
          last_checkin_at: incrementCheckins ? new Date().toISOString() : existing?.last_checkin_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-fidelity"] });
    },
  });

  const awardReward = useMutation({
    mutationFn: async (phone: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("customer_fidelity")
        .select("*")
        .eq("user_id", user.id)
        .eq("customer_phone", phone)
        .maybeSingle();

      if (!existing) throw new Error("Cliente não encontrado");

      const { data, error } = await supabase
        .from("customer_fidelity")
        .update({
          total_rewards: existing.total_rewards + 1,
          total_checkins: 0, // Reset checkins
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-fidelity"] });
      toast.success("Prêmio concedido com sucesso! 🎉");
    },
  });

  const resetCustomerFidelity = useMutation({
    mutationFn: async (phone: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("customer_fidelity")
        .update({
          total_checkins: 0,
        })
        .eq("user_id", user.id)
        .eq("customer_phone", phone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-fidelity"] });
      toast.success("Fidelidade do cliente reiniciada!");
    },
  });

  return {
    customers,
    isLoading,
    updateCustomerFidelity,
    awardReward,
    resetCustomerFidelity,
  };
};
