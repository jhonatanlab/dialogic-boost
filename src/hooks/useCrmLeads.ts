import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tag } from "@/hooks/useContacts";

export interface CrmLead {
  id: string;
  company_id?: string | null;
  name: string;
  phone?: string | null;
  phone_secondary?: string | null;
  email?: string | null;
  instagram?: string | null;
  avatar_url?: string | null;
  source?: string | null;
  referred_by?: string | null;
  owner_user_id?: string | null;
  pre_sales_user_id?: string | null;
  sales_user_id?: string | null;
  cpf_cnpj?: string | null;
  rg_cnh?: string | null;
  birthday?: string | null;
  profession?: string | null;
  gender?: string | null;
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  crm_stage_id?: string | null;
  crm_position: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

const db = supabase as any;

export function useCrmLeads(searchTerm?: string) {
  return useQuery({
    queryKey: ["crm-leads", searchTerm ?? ""],
    queryFn: async () => {
      let query = db
        .from("contacts")
        .select("*, contact_tags ( tag_id, tags ( id, name, color ) )")
        .order("crm_position", { ascending: true })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        tags: c.contact_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
      })) as CrmLead[];
    },
  });
}

export interface CompanyMember {
  user_id: string;
  full_name: string | null;
  role: string;
}

export function useCompanyMembers() {
  return useQuery({
    queryKey: ["company-members"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("user_id, full_name, role")
        .eq("is_blocked", false)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data || []) as CompanyMember[];
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      stageId,
      position,
    }: {
      leadId: string;
      stageId: string;
      position: number;
    }) => {
      const { error } = await db
        .from("contacts")
        .update({ crm_stage_id: stageId, crm_position: position })
        .eq("id", leadId);
      if (error) throw error;
    },
    onMutate: async ({ leadId, stageId, position }) => {
      await queryClient.cancelQueries({ queryKey: ["crm-leads"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["crm-leads"] });
      snapshots.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        queryClient.setQueryData(
          key,
          (value as CrmLead[]).map((l) =>
            l.id === leadId ? { ...l, crm_stage_id: stageId, crm_position: position } : l
          )
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots?.forEach(([key, value]: any) => queryClient.setQueryData(key, value));
      toast.error("Não foi possível mover o lead");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<CrmLead> & { id: string }) => {
      const payload = { ...values };
      delete (payload as any).tags;
      delete (payload as any).contact_tags;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;

      const { error } = await db.from("contacts").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Dados salvos!");
    },
    onError: () => toast.error("Não foi possível salvar os dados"),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<CrmLead>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await db
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await db
        .from("contacts")
        .insert([{ ...values, user_id: user.id, company_id: profile?.company_id ?? null }])
        .select()
        .single();
      if (error) throw error;
      return data as CrmLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Lead criado!");
    },
    onError: () => toast.error("Não foi possível criar o lead"),
  });
}
