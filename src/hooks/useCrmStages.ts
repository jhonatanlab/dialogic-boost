import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrmStage {
  id: string;
  company_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export function useCrmStages() {
  return useQuery({
    queryKey: ["crm-stages"],
    queryFn: async () => {
      const { data, error } = await db
        .from("crm_stages")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as CrmStage[];
    },
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stage: { name: string; color: string; sort_order: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await db
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await db
        .from("crm_stages")
        .insert([{ ...stage, company_id: profile.company_id }])
        .select()
        .single();
      if (error) throw error;
      return data as CrmStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
      toast.success("Etapa criada!");
    },
    onError: () => toast.error("Não foi possível criar a etapa"),
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<CrmStage> & { id: string }) => {
      const { error } = await db.from("crm_stages").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
    },
    onError: () => toast.error("Não foi possível salvar a etapa"),
  });
}

export function useReorderStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stages: { id: string; sort_order: number }[]) => {
      for (const s of stages) {
        const { error } = await db
          .from("crm_stages")
          .update({ sort_order: s.sort_order })
          .eq("id", s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-stages"] }),
    onError: () => toast.error("Não foi possível reordenar as etapas"),
  });
}

export function useArchiveStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("crm_stages").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Etapa arquivada");
    },
    onError: () => toast.error("Não foi possível arquivar a etapa"),
  });
}
