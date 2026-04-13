import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

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
  access_token?: string;
  phone_number_id?: string;
  business_id?: string;
  instance_id?: string;
  api_token?: string;
  status: 'connected' | 'disconnected';
  created_at: string;
  updated_at: string;
}

export const useWhatsappIntegrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

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
      return (data || []) as WhatsappIntegration[];
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

      // Prepare data based on provider
      const integrationData = provider === "meta" 
        ? {
            user_id: user.id,
            provider,
            access_token: (credentials as MetaCredentials).accessToken,
            phone_number_id: (credentials as MetaCredentials).phoneNumberId,
            business_id: (credentials as MetaCredentials).whatsappBusinessId,
            instance_id: null,
            api_token: null,
            status: 'connected' as const,
            updated_at: new Date().toISOString(),
          }
        : {
            user_id: user.id,
            provider,
            access_token: null,
            phone_number_id: null,
            business_id: null,
            instance_id: (credentials as ZapiCredentials).instanceId,
            api_token: (credentials as ZapiCredentials).apiToken,
            status: 'connected' as const,
            updated_at: new Date().toISOString(),
          };

      const { data, error } = await supabase
        .from("whatsapp_integrations")
        .upsert(integrationData, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Deactivate competing integrations
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && companyId) {
          // Deactivate API Automação
          await supabase
            .from("admin_settings")
            .upsert({
              user_id: userData.user.id,
              company_id: companyId,
              setting_key: "n8n_automation_enabled",
              setting_value: "false",
            }, { onConflict: "user_id,setting_key" });

          // Deactivate API Nativa instances (set disconnected instead of deleting)
          await supabase
            .from("whatsapp_instances")
            .update({ status: "disconnected", updated_at: new Date().toISOString() })
            .eq("company_id", companyId);
        }
      } catch (e) {
        console.error("Error deactivating competing integrations:", e);
      }

      queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["my-whatsapp-instance"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({
        title: "Integração conectada com sucesso!",
        description: "Suas credenciais foram validadas e salvas. As demais integrações foram desativadas automaticamente.",
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

  const testConnection = useMutation({
    mutationFn: async (provider: WhatsappProvider) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const integration = integrations?.find((i) => i.provider === provider);
      if (!integration) {
        throw new Error("Nenhuma integração encontrada para testar");
      }

      // Get phone number from integration to send test message
      let testPhone = "";
      if (provider === "meta" && integration.phone_number_id) {
        testPhone = integration.phone_number_id;
      } else if (provider === "zapi" && integration.instance_id) {
        testPhone = integration.instance_id;
      }

      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          user_id: user.id,
          phone: testPhone,
          message: "Conexão realizada com sucesso ✅"
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Teste realizado com sucesso!",
        description: "A mensagem de teste foi enviada.",
      });
    },
    onError: (error: Error) => {
      console.error("Error testing connection:", error);
      toast({
        title: "Erro ao testar conexão",
        description: error.message || "Não foi possível enviar mensagem de teste.",
        variant: "destructive",
      });
    },
  });

  return {
    integrations,
    isLoading,
    saveIntegration,
    testConnection,
    getIntegration,
  };
};
