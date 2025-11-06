import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type WhatsappProvider = "meta" | "zapi";

export interface MetaCredentials {
  accessToken: string;
  phoneNumberId: string;
  whatsappBusinessId: string;
}

export interface ZapiCredentials {
  instanceId: string;
  apiToken: string;
}

export interface WhatsappIntegration {
  id: string;
  user_id: string;
  provider: WhatsappProvider;
  credentials: MetaCredentials | ZapiCredentials;
  created_at: string;
  updated_at: string;
}

export const useWhatsappIntegrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["whatsapp-integrations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("whatsapp_integrations")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        credentials: item.credentials as unknown as MetaCredentials | ZapiCredentials
      })) as WhatsappIntegration[];
    },
  });

  const saveIntegration = useMutation({
    mutationFn: async ({
      provider,
      credentials,
    }: {
      provider: WhatsappProvider;
      credentials: MetaCredentials | ZapiCredentials;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("whatsapp_integrations")
        .upsert(
          {
            user_id: user.id,
            provider,
            credentials: credentials as any,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,provider",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
      toast({
        title: "Integração salva com sucesso!",
        description: "Suas credenciais foram armazenadas.",
      });
    },
    onError: (error) => {
      console.error("Error saving integration:", error);
      toast({
        title: "Erro ao salvar integração",
        description: "Não foi possível salvar as credenciais. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const getIntegration = (provider: WhatsappProvider) => {
    return integrations?.find((i) => i.provider === provider);
  };

  return {
    integrations,
    isLoading,
    saveIntegration,
    getIntegration,
  };
};
