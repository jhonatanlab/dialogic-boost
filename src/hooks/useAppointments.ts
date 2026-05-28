import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

export type AppointmentType = "visita_tecnica" | "reuniao" | "ligacao" | "outro";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "done";

export interface Appointment {
  id: string;
  company_id: string;
  contact_id: string | null;
  user_id: string | null;
  title: string;
  phone: string | null;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; name: string } | null;
}

export interface AppointmentInput {
  title: string;
  phone?: string | null;
  scheduled_at: string; // ISO
  duration_minutes?: number;
  type: AppointmentType;
  status?: AppointmentStatus;
  notes?: string | null;
  contact_id?: string | null;
}

export function useAppointments(rangeStart: Date, rangeEnd: Date) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["appointments", companyId, rangeStart.toISOString(), rangeEnd.toISOString()],
    enabled: !!companyId,
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, contact:contacts(id, name)")
        .eq("company_id", companyId!)
        .gte("scheduled_at", rangeStart.toISOString())
        .lt("scheduled_at", rangeEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { companyId } = useCompany();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          company_id: companyId,
          user_id: userData.user?.id ?? null,
          title: input.title,
          phone: input.phone ?? null,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes ?? 60,
          type: input.type,
          status: input.status ?? "pending",
          notes: input.notes ?? null,
          contact_id: input.contact_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Agendamento criado" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao criar agendamento", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: AppointmentInput & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          title: input.title,
          phone: input.phone ?? null,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes ?? 60,
          type: input.type,
          status: input.status ?? "pending",
          notes: input.notes ?? null,
          contact_id: input.contact_id ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Agendamento atualizado" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Agendamento excluído" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  visita_tecnica: "Visita técnica",
  reuniao: "Reunião",
  ligacao: "Ligação",
  outro: "Outro",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  done: "Concluído",
};

export function getStatusClasses(status: AppointmentStatus): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "cancelled":
      return "bg-red-500/15 text-red-600 border-red-500/30";
    case "done":
      return "bg-slate-500/15 text-slate-600 border-slate-500/30";
    case "pending":
    default:
      return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  }
}
