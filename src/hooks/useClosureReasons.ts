import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface ClosureReason {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useClosureReasons = (onlyActive = false) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["closure_reasons", companyId, onlyActive],
    enabled: !!companyId,
    queryFn: async (): Promise<ClosureReason[]> => {
      let q = supabase
        .from("closure_reasons")
        .select("*")
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as ClosureReason[]) || [];
    },
  });
};

export const useCreateClosureReason = () => {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: async (payload: { name: string; sort_order?: number }) => {
      if (!companyId) throw new Error("Sem empresa");
      const { error } = await supabase.from("closure_reasons").insert({
        company_id: companyId,
        name: payload.name.trim(),
        sort_order: payload.sort_order ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closure_reasons"] });
      toast.success("Motivo criado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar motivo"),
  });
};

export const useUpdateClosureReason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; name?: string; is_active?: boolean; sort_order?: number }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("closure_reasons").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closure_reasons"] });
      toast.success("Motivo atualizado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });
};

export const useDeleteClosureReason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("closure_reasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closure_reasons"] });
      toast.success("Motivo removido!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });
};
