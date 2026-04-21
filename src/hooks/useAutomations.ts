import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Automation {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string | null;
  keyword: string | null;
  flow_data: any;
  execution_count: number;
  inactivity_minutes: number | null;
  max_followups: number | null;
  last_execution: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutomations() {
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Automation[];
    },
  });

  const createAutomation = useMutation({
    mutationFn: async (params: { name: string; description?: string; flow_data: any; trigger_type?: string; keyword?: string; inactivity_minutes?: number; max_followups?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("automations" as any)
        .insert({
          user_id: user.id,
          company_id: profile.company_id,
          name: params.name,
          description: params.description || null,
          flow_data: params.flow_data,
          trigger_type: params.trigger_type || "first_message",
          keyword: params.keyword || null,
          inactivity_minutes: params.inactivity_minutes || null,
          max_followups: params.max_followups || 1,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação salva e ativada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar automação: " + err.message);
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string; flow_data?: any; status?: string; trigger_type?: string; keyword?: string; inactivity_minutes?: number; max_followups?: number }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("automations" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação excluída!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + err.message);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("automations" as any)
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  return {
    automations,
    isLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleStatus,
  };
}
