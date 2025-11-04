import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  type: string;
  category: string | null;
  message: string;
  variables_used: string[] | null;
  attachment_url: string | null;
  quick_replies: any;
  preview: string | null;
  created_at: string;
  updated_at: string;
}

export const useMessageTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: Omit<MessageTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("message_templates")
        .insert({
          ...templateData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "✅ Modelo criado com sucesso!",
        description: "O modelo de mensagem foi salvo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar modelo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Modelo excluído",
        description: "O modelo de mensagem foi removido.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir modelo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
};
