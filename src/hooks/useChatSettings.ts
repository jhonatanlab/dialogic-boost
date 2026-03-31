import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface ChatSettings {
  id: string;
  company_id: string;
  distribution_mode: "manual" | "round_robin" | "least_loaded" | "hybrid";
  max_conversations_per_agent: number | null;
  only_assign_online_agents: boolean;
}

export function useChatSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["chat-settings", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_settings")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChatSettings | null;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (values: Partial<ChatSettings>) => {
      if (!companyId) throw new Error("Empresa não encontrada");

      const payload = { ...values, company_id: companyId };

      const { error } = await supabase
        .from("chat_settings")
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  return { settings, isLoading, saveSettings };
}

export interface Agent {
  id: string;
  user_id: string;
  company_id: string;
  is_online: boolean;
  is_active: boolean;
}

export function useAgents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Agent[];
    },
  });

  const toggleAgentStatus = useMutation({
    mutationFn: async ({ agentId, field, value }: { agentId: string; field: "is_online" | "is_active"; value: boolean }) => {
      const { error } = await supabase
        .from("agents")
        .update({ [field]: value })
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addAgent = useMutation({
    mutationFn: async (userId: string) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await supabase
        .from("agents")
        .insert({ user_id: userId, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Atendente adicionado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Atendente removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return { agents, isLoading, toggleAgentStatus, addAgent, removeAgent };
}
