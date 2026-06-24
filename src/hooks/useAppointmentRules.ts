import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TimeWindow = { start: string; end: string };
export type WeeklySchedule = Record<DayKey, TimeWindow[]>;

export interface AppointmentRules {
  id: string | null;
  company_id: string;
  user_id: string | null;
  min_duration_minutes: number;
  max_duration_minutes: number;
  buffer_minutes: number;
  max_per_day: number | null;
  max_per_slot: number;
  allow_repeat_same_slot: boolean;
  fixed_duration_enabled: boolean;
  fixed_duration_minutes: number;
  weekly_schedule: WeeklySchedule;
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: [{ start: "08:00", end: "18:00" }],
  tue: [{ start: "08:00", end: "18:00" }],
  wed: [{ start: "08:00", end: "18:00" }],
  thu: [{ start: "08:00", end: "18:00" }],
  fri: [{ start: "08:00", end: "18:00" }],
  sat: [],
  sun: [],
};

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function buildDefaults(companyId: string, userId: string | null): AppointmentRules {
  return {
    id: null,
    company_id: companyId,
    user_id: userId,
    min_duration_minutes: 15,
    max_duration_minutes: 240,
    buffer_minutes: 0,
    max_per_day: null,
    max_per_slot: 1,
    allow_repeat_same_slot: false,
    fixed_duration_enabled: false,
    fixed_duration_minutes: 60,
    weekly_schedule: DEFAULT_WEEKLY_SCHEDULE,
  };
}

export function useAppointmentRules(scope: "company" | "user") {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["appointment-rules", companyId, scope],
    enabled: !!companyId,
    queryFn: async (): Promise<AppointmentRules> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      let q = supabase
        .from("appointment_rules" as any)
        .select("*")
        .eq("company_id", companyId!);
      q = scope === "company" ? q.is("user_id", null) : q.eq("user_id", userId);

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return buildDefaults(companyId!, scope === "user" ? userId : null);
      return data as unknown as AppointmentRules;
    },
  });
}

// Resolves the effective rules for the current user (user override > company > defaults)
export function useResolvedAppointmentRules() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["appointment-rules-resolved", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AppointmentRules> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { data, error } = await supabase
        .from("appointment_rules" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      const rows = (data ?? []) as unknown as AppointmentRules[];
      const userRow = rows.find((r) => r.user_id === userId);
      const companyRow = rows.find((r) => r.user_id === null);
      return userRow ?? companyRow ?? buildDefaults(companyId!, null);
    },
  });
}

export function useUpsertAppointmentRules() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      scope: "company" | "user";
      rules: Omit<AppointmentRules, "id" | "company_id" | "user_id">;
    }) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const payload = {
        company_id: companyId,
        user_id: input.scope === "user" ? userId : null,
        ...input.rules,
      };

      const conflict = input.scope === "user" ? "company_id,user_id" : undefined;

      // Manual upsert because partial unique indexes don't match on conflict cleanly
      let q = supabase
        .from("appointment_rules" as any)
        .select("id")
        .eq("company_id", companyId);
      q = input.scope === "company" ? q.is("user_id", null) : q.eq("user_id", userId);
      const { data: existing } = await q.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("appointment_rules" as any)
          .update(payload)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointment_rules" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["appointment-rules", companyId, vars.scope] });
      toast({ title: "Regras salvas" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteUserOverride() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || !companyId) return;
      const { error } = await supabase
        .from("appointment_rules" as any)
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-rules"] });
      toast({ title: "Override removido. Usando padrão da empresa." });
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}
