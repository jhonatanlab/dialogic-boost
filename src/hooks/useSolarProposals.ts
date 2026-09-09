import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Recusada",
};

export interface SolarProposal {
  id: string;
  company_id: string;
  created_by: string | null;
  contact_id: string | null;
  client_name: string;
  client_phone: string | null;
  kit_id: string | null;
  city_id: string | null;
  roof_type_id: string | null;
  orientation_id: string | null;
  connection_type_id: string | null;
  utility_id: string | null;
  avg_monthly_consumption_kwh: number;
  distance_km: number;
  financing_bank_id: string | null;
  status: ProposalStatus;
  kwp_total: number | null;
  cash_price: number | null;
  payback_months: number | null;
  result: any;
  quote_number: number | null;
  seller_user_id: string | null;
  valid_until: string | null;
  payment_condition: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSolarProposals() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["solar_proposals", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("solar_proposals" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SolarProposal[];
    },
  });
}

export function useSolarProposal(id?: string) {
  return useQuery({
    queryKey: ["solar_proposal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("solar_proposals" as any) as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SolarProposal | null;
    },
  });
}

export function useSaveSolarProposal() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (values: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { data, error } = await (supabase.from("solar_proposals" as any) as any)
          .update(rest)
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        return data?.id as string;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("solar_proposals" as any) as any)
        .insert({ ...rest, company_id: companyId, created_by: userData.user?.id ?? null })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solar_proposals"] });
      toast.success("Proposta salva com sucesso");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar a proposta"),
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const { error } = await (supabase.from("solar_proposals" as any) as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solar_proposals"] });
      toast.success("Situação atualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar"),
  });
}

export function useDeleteSolarProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("solar_proposals" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solar_proposals"] });
      toast.success("Proposta excluída");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir"),
  });
}
