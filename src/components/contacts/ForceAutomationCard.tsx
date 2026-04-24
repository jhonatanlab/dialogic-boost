import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ForceAutomationCardProps {
  conversationId: string | undefined;
  contactId: string | undefined;
  companyId: string | undefined;
}

interface AutomationOption {
  id: string;
  name: string;
  trigger_type: string | null;
  inactivity_minutes: number | null;
}

export function ForceAutomationCard({
  conversationId,
  contactId,
  companyId,
}: ForceAutomationCardProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [isFiring, setIsFiring] = useState(false);
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["active-automations", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AutomationOption[]> => {
      const { data, error } = await supabase
        .from("automations")
        .select("id, name, trigger_type, inactivity_minutes")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as AutomationOption[];
    },
  });

  const handleFire = async () => {
    if (!selectedId || !conversationId || !contactId || !companyId) return;
    setIsFiring(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "execute-automation",
        {
          body: {
            automation_id: selectedId,
            conversation_id: conversationId,
            contact_id: contactId,
            company_id: companyId,
          },
        }
      );

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      // For inactivity automations, bump followup tracker so the contact
      // card "Follow-Ups por Inatividade" reflects the manual trigger.
      const automation = automations.find((a) => a.id === selectedId);
      if (automation?.trigger_type === "inactivity") {
        const { data: existing } = await supabase
          .from("automation_followups")
          .select("id, followup_count")
          .eq("automation_id", selectedId)
          .eq("conversation_id", conversationId)
          .maybeSingle();

        const nowIso = new Date().toISOString();
        if (existing) {
          await supabase
            .from("automation_followups")
            .update({
              followup_count: (existing.followup_count || 0) + 1,
              last_followup_at: nowIso,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("automation_followups").insert({
            automation_id: selectedId,
            conversation_id: conversationId,
            contact_id: contactId,
            company_id: companyId,
            followup_count: 1,
            last_followup_at: nowIso,
          });
        }

        queryClient.invalidateQueries({
          queryKey: ["contact-followups", contactId],
        });
      }

      toast.success("Automação disparada com sucesso!");
    } catch (err: any) {
      console.error("[force-automation] error:", err);
      toast.error("Erro ao disparar automação: " + (err.message || "desconhecido"));
    } finally {
      setIsFiring(false);
    }
  };

  const disabled =
    !conversationId || !contactId || !companyId || !selectedId || isFiring;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Forçar Automação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando automações...</p>
        ) : automations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma automação ativa para esta empresa.
          </p>
        ) : (
          <>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione uma automação" />
              </SelectTrigger>
              <SelectContent>
                {automations.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleFire}
              disabled={disabled}
              className="w-full h-9 text-xs"
              size="sm"
            >
              {isFiring ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Disparando...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Disparar agora
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
