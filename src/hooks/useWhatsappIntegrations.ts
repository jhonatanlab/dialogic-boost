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

  const testMetaConnection = async (credentials: MetaCredentials): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/?access_token=${credentials.accessToken}`
      );
      return response.ok;
    } catch (error) {
      console.error("Meta connection test failed:", error);
      return false;
    }
  };

  const testZapiConnection = async (credentials: ZapiCredentials): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://api.z-api.io/instances/${credentials.instanceId}/token/${credentials.apiToken}/status`
      );
      return response.ok;
    } catch (error) {
      console.error("Z-API connection test failed:", error);
      return false;
    }
  };

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

      // Test connection before saving
      let connectionSuccess = false;
      if (provider === "meta") {
        connectionSuccess = await testMetaConnection(credentials as MetaCredentials);
      } else if (provider === "zapi") {
        connectionSuccess = await testZapiConnection(credentials as ZapiCredentials);
      }

      if (!connectionSuccess) {
        throw new Error("Falha ao conectar com a API. Verifique suas credenciais.");
      }

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
        title: "Integração conectada com sucesso!",
        description: "Suas credenciais foram validadas e salvas.",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving integration:", error);
      toast({
        title: "Erro ao conectar",
        description: error.message || "Não foi possível conectar. Verifique suas credenciais.",
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
