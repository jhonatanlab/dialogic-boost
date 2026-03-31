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
  company_id: string | null;
}

export interface CampaignWithStats extends Campaign {
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
}

async function getUserContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, companyId: profile?.company_id ?? null };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function dispatchCampaignNow(campaignId: string, contactIds: string[], message: string, companyId: string | null, intervalSeconds: number = 2, attachmentUrl?: string, mediaType?: string) {
  const { data: contactsData, error: contactsErr } = await supabase
    .from("contacts")
    .select("id, phone, name, email")
    .in("id", contactIds);

  if (contactsErr) throw contactsErr;

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "n8n_send_message")
    .maybeSingle();

  const endpoint = settings?.setting_value;
  if (!endpoint) {
    await supabase
      .from("campaign_contacts")
      .update({ status: "failed", error_message: "Endpoint de envio não configurado" })
      .eq("campaign_id", campaignId);

    await supabase
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", campaignId);

    throw new Error("Endpoint de envio (n8n_send_message) não configurado nas configurações administrativas.");
  }

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < (contactsData || []).length; i++) {
    const contact = contactsData![i];

    if (!contact.phone) {
      await supabase
        .from("campaign_contacts")
        .update({ status: "failed", error_message: "Contato sem telefone" })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contact.id);
      failedCount++;
      continue;
    }

    // Apply interval between messages (skip delay for the first contact)
    if (i > 0 && intervalSeconds > 0) {
      await sleep(intervalSeconds * 1000);
    }

    try {
      const resolvedMessage = message
        .replace(/\{nome\}/gi, contact.name || '')
        .replace(/\{telefone\}/gi, contact.phone || '')
        .replace(/\{email\}/gi, (contact as any).email || '');

      const payload: Record<string, unknown> = {
            company_id: companyId,
            number: contact.phone,
            text: resolvedMessage,
            type: (attachmentUrl && mediaType && mediaType !== 'text') ? mediaType : "text",
            internal_id: `campaign-${campaignId}-${contact.id}`,
            contact_name: contact.name,
            campaign_id: campaignId,
          };
          if (attachmentUrl) {
            payload.media_url = attachmentUrl;
          }

      const { data: response, error: invokeError } = await supabase.functions.invoke("proxy-n8n", {
        body: {
          endpoint,
          payload,
        },
      });

      if (invokeError) throw invokeError;

      await supabase
        .from("campaign_contacts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contact.id);
      sentCount++;
    } catch (err: any) {
      await supabase
        .from("campaign_contacts")
        .update({ status: "failed", error_message: err?.message || "Erro desconhecido" })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contact.id);
      failedCount++;
    }
  }

  await supabase
    .from("campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId);

  return { sentCount, failedCount };
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

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: { name: string; message: string; contactIds: string[]; scheduledAt?: string; intervalSeconds?: number; attachmentUrl?: string; mediaType?: string }) => {
      const { userId, companyId } = await getUserContext();

      const status = campaign.scheduledAt ? 'scheduled' : 'sending';

      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: userId,
          company_id: companyId,
          name: campaign.name,
          message: campaign.message,
          status,
          scheduled_at: campaign.scheduledAt || null,
          attachment_url: campaign.attachmentUrl || null,
          media_type: campaign.mediaType || 'text',
        } as any)
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
              company_id: companyId,
              status: 'pending',
            }))
          );

        if (contactsError) throw contactsError;
      }

      // Dispatch immediately if not scheduled
      if (!campaign.scheduledAt && campaign.contactIds.length > 0) {
        const result = await dispatchCampaignNow(campaignData.id, campaign.contactIds, campaign.message, companyId, campaign.intervalSeconds ?? 2, campaign.attachmentUrl, campaign.mediaType);
        return { ...campaignData, ...result };
      }

      return campaignData;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (data?.sentCount !== undefined) {
        toast({
          title: "Campanha enviada",
          description: `${data.sentCount} enviadas, ${data.failedCount} falharam.`,
        });
      } else {
        toast({
          title: "Campanha agendada",
          description: "A campanha foi agendada com sucesso.",
        });
      }
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
      const { error: contactsError } = await supabase
        .from("campaign_contacts")
        .delete()
        .eq("campaign_id", id);

      if (contactsError) throw contactsError;

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
    createCampaign: createCampaignMutation.mutate,
    createCampaignAsync: createCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,
    updateCampaign: updateCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
  };
};
