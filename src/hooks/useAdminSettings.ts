import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminSetting {
  id: string;
  user_id: string;
  setting_key: string;
  setting_value: string | null;
  created_at: string;
  updated_at: string;
}

const SETTING_KEYS = [
  "n8n_base_url",
  "n8n_webhook_secret",
  "n8n_create_instance",
  "n8n_generate_qr",
  "n8n_delete_instance",
  "n8n_send_message",
  "n8n_automation_enabled",
  "n8n_automation_inbound",
  "n8n_automation_outbound",
  "checkin_base_url",
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

export function useAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");
      if (error) throw error;
      return data as AdminSetting[];
    },
  });

  const getSettingValue = (key: SettingKey): string => {
    const setting = settings?.find((s) => s.setting_key === key);
    return setting?.setting_value ?? "";
  };

  const saveSettings = useMutation({
    mutationFn: async (values: Record<SettingKey, string>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      // Get company_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      const upserts = Object.entries(values).map(([key, value]) => ({
        user_id: userData.user!.id,
        setting_key: key,
        setting_value: value,
        company_id: profile?.company_id ?? null,
      }));

      for (const upsert of upserts) {
        const { error } = await supabase
          .from("admin_settings")
          .upsert(upsert, { onConflict: "user_id,setting_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Configuração salva com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  return { settings, isLoading, getSettingValue, saveSettings };
}

export function useWhatsappInstances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instances, isLoading } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInstance = useMutation({
    mutationFn: async (companyName: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { error } = await supabase.from("whatsapp_instances").insert({
        user_id: userData.user.id,
        company_name: companyName,
        instance_id: `inst_${Date.now()}`,
      });
      if (error) throw error;
      console.log("Integração com n8n será feita via Webhook - Criar instância:", companyName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      toast({ title: "Instância criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_instances").delete().eq("id", id);
      if (error) throw error;
      console.log("Integração com n8n será feita via Webhook - Apagar instância:", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      toast({ title: "Instância removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return { instances, isLoading, createInstance, deleteInstance };
}
