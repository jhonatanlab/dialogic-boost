import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FidelityProgram {
  id: string;
  user_id: string;
  name: string;
  goal: number;
  reward: string;
  congratulations_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFidelityPrograms = () => {
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["fidelity-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fidelity_programs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FidelityProgram[];
    },
  });

  const createProgram = useMutation({
    mutationFn: async (program: Omit<FidelityProgram, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("fidelity_programs")
        .insert({
          user_id: user.id,
          company_id: profile?.company_id ?? null,
          ...program,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-programs"] });
      toast.success("Programa de fidelidade criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar programa de fidelidade");
    },
  });

  const updateProgram = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FidelityProgram> & { id: string }) => {
      const { data, error } = await supabase
        .from("fidelity_programs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-programs"] });
      toast.success("Programa atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar programa");
    },
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fidelity_programs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-programs"] });
      toast.success("Programa removido com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover programa");
    },
  });

  return {
    programs,
    isLoading,
    createProgram,
    updateProgram,
    deleteProgram,
  };
};
