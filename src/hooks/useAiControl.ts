import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AiStatus = "active" | "paused";

function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function useAiControlStatus(phone?: string | null, companyId?: string | null) {
  const tel = normalizePhone(phone);
  return useQuery({
    queryKey: ["ai-control", tel, companyId],
    enabled: !!tel && !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_control")
        .select("status, updated_at")
        .eq("telefone", tel)
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return {
        status: ((data?.status as AiStatus) || "active") as AiStatus,
        updated_at: data?.updated_at as string | undefined,
      };
    },
  });
}

export function useToggleAiControl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      phone: string;
      companyId: string;
      conversationId?: string;
      newStatus: AiStatus;
      previousStatus: AiStatus;
    }) => {
      const tel = normalizePhone(params.phone);
      if (!tel) throw new Error("Contato sem telefone");
      if (!params.companyId) throw new Error("Empresa não encontrada");

      const { error } = await supabase
        .from("ai_control")
        .upsert(
          {
            telefone: tel,
            company_id: params.companyId,
            status: params.newStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "telefone,company_id" }
        );
      if (error) throw error;

      // Audit event (best-effort)
      if (params.conversationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();

          await supabase.from("conversation_events").insert({
            conversation_id: params.conversationId,
            company_id: params.companyId,
            event_type: "ai_toggled",
            actor_user_id: user.id,
            actor_name: profile?.full_name || null,
            details: {
              previous_status: params.previousStatus,
              new_status: params.newStatus,
            },
          });
        }
      }
    },
    onSuccess: (_data, vars) => {
      const tel = normalizePhone(vars.phone);
      queryClient.invalidateQueries({ queryKey: ["ai-control", tel, vars.companyId] });
      queryClient.invalidateQueries({ queryKey: ["conversation-events"] });
      toast.success(
        vars.newStatus === "active" ? "IA ativada para este contato" : "IA pausada para este contato"
      );
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao atualizar IA");
    },
  });
}
