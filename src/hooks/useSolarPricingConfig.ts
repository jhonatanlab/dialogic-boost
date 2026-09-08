import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface SolarPricingConfig {
  id?: string;
  company_id?: string;
  margin_percent: number | null;
  price_per_km: number | null;
  base_visit_fee: number | null;
  annual_tariff_inflation_percent: number | null;
  annual_module_degradation_percent: number | null;
}

export function useSolarPricingConfig() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["solar_pricing_config", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("solar_pricing_config" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SolarPricingConfig | null;
    },
  });
}

export function useSaveSolarPricingConfig() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (values: Partial<SolarPricingConfig>) => {
      const { error } = await (supabase.from("solar_pricing_config" as any) as any).upsert(
        { ...values, company_id: companyId },
        { onConflict: "company_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solar_pricing_config"] });
      toast.success("Valores salvos com sucesso");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar"),
  });
}
