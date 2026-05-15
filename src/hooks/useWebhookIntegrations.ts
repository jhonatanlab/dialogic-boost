import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

export interface WebhookIntegration {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  token: string;
  welcome_message: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function buildWebhookUrl(token: string) {
  return `${SUPABASE_URL}/functions/v1/webhook-leads/${token}`;
}

export function useWebhookIntegrations() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["webhook_integrations", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_integrations" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WebhookIntegration[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; welcome_message?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Sessão inválida");
      const { data, error } = await supabase
        .from("webhook_integrations" as any)
        .insert([{
          name: input.name,
          welcome_message: input.welcome_message ?? null,
          company_id: companyId,
          user_id: user.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook_integrations", companyId] });
      toast({ title: "Webhook criado com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar webhook", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WebhookIntegration> & { id: string }) => {
      const { data, error } = await supabase
        .from("webhook_integrations" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook_integrations", companyId] });
      toast({ title: "Webhook atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_integrations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook_integrations", companyId] });
      toast({ title: "Webhook excluído" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  return { ...query, create, update, remove };
}
