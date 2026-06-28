import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAiControlStatus, useToggleAiControl } from "@/hooks/useAiControl";

interface AiControlCardProps {
  conversationId?: string;
  contactPhone?: string | null;
  companyId?: string | null;
}

export function AiControlCard({ conversationId, contactPhone, companyId }: AiControlCardProps) {
  const { data, isLoading } = useAiControlStatus(contactPhone, companyId);
  const toggle = useToggleAiControl();

  const status = data?.status || "active";
  const isActive = status === "active";
  const disabled = !contactPhone || !companyId || isLoading || toggle.isPending;

  const handleChange = (checked: boolean) => {
    if (!contactPhone || !companyId) return;
    toggle.mutate({
      phone: contactPhone,
      companyId,
      conversationId,
      previousStatus: status,
      newStatus: checked ? "active" : "paused",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Atendimento por IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!contactPhone ? (
          <p className="text-sm text-muted-foreground">
            Contato sem telefone — IA não pode ser controlada.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {isActive ? "IA ativa para este contato" : "IA pausada para este contato"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.updated_at
                  ? `Atualizado em ${format(new Date(data.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : "Status padrão (ativa)"}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={handleChange} disabled={disabled} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
