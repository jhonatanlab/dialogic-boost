import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithStats extends Campaign {
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
}

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      // Get stats for each campaign
      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { data: contacts, error: contactsError } = await supabase
            .from("campaign_contacts")
            .select("status")
            .eq("campaign_id", campaign.id);

          if (contactsError) throw contactsError;

          const total_contacts = contacts?.length || 0;
          const sent_count = contacts?.filter(c => c.status === 'sent' || c.status === 'delivered').length || 0;
          const failed_count = contacts?.filter(c => c.status === 'failed').length || 0;
          const pending_count = contacts?.filter(c => c.status === 'pending').length || 0;

          return {
            ...campaign,
            total_contacts,
            sent_count,
            failed_count,
            pending_count,
          };
        })
      );

      return campaignsWithStats as CampaignWithStats[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: { name: string; message: string; contactIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: campaign.name,
          message: campaign.message,
          status: 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add contacts to campaign
      if (campaign.contactIds.length > 0) {
        const { error: contactsError } = await supabase
          .from("campaign_contacts")
          .insert(
            campaign.contactIds.map(contactId => ({
              campaign_id: campaignData.id,
              contact_id: contactId,
              status: 'pending',
            }))
          );

        if (contactsError) throw contactsError;
      }

      return campaignData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campanha criada",
        description: "A campanha foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campanha atualizada",
        description: "A campanha foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      // Delete campaign contacts first
      const { error: contactsError } = await supabase
        .from("campaign_contacts")
        .delete()
        .eq("campaign_id", id);

      if (contactsError) throw contactsError;

      // Delete campaign
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createCampaign.mutate,
    updateCampaign: updateCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
  };
};