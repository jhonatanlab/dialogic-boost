import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export type SolarTable =
  | "solar_inverters"
  | "solar_modules"
  | "solar_kits"
  | "solar_utilities"
  | "solar_cities"
  | "solar_roof_types"
  | "solar_orientations"
  | "solar_connection_types";

export type CatalogRow = {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  is_active: boolean;
  created_at: string;
  [key: string]: any;
};

export function useSolarCatalog(table: SolarTable) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: [table, companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });
}

export function useSaveSolarItem(table: SolarTable) {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (values: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await (supabase.from(table as any) as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from(table as any) as any).insert({
          ...rest,
          company_id: companyId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Registro salvo com sucesso");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar"),
  });
}

export function useDeleteSolarItem(table: SolarTable) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Registro excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir"),
  });
}
