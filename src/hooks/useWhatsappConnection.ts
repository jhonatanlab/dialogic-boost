import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Estado real da conexão do WhatsApp (Evolution ou Zapster) da empresa.
 * Retorna `connected: null` quando a empresa não usa conexão direta (ex.: fluxo n8n).
 */
export function useWhatsappConnection(companyId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-connection", companyId],
    enabled: !!companyId,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_id, status, provider")
        .eq("company_id", companyId!)
        .in("provider", ["evolution", "zapster"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!instance) return { hasInstance: false, connected: null as boolean | null, state: null as string | null };

      if (instance.status !== "connected") {
        return { hasInstance: true, connected: false, state: instance.status as string | null };
      }

      const fn = (instance as any).provider === "zapster" ? "test-zapster-connection" : "test-evolution-connection";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { instance_id: instance.id },
      });

      if (error || !data?.ok) {
        return { hasInstance: true, connected: false, state: "unreachable" as string | null };
      }

      // Se o provedor não informar o estado, não bloqueamos o envio.
      const state = (data.connection_state ?? null) as string | null;
      const connectedStates = ["open", "connected"];
      return {
        hasInstance: true,
        connected: state === null ? true : connectedStates.includes(state),
        state,
      };
    },
  });
}
