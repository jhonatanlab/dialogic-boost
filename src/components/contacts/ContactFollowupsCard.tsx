import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useContactFollowups } from "@/hooks/useContactFollowups";

interface ContactFollowupsCardProps {
  contactId: string;
}

const formatInactivityWindow = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} d`;
};

export function ContactFollowupsCard({ contactId }: ContactFollowupsCardProps) {
  const { data: followups = [], isLoading } = useContactFollowups(contactId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Follow-Ups por Inatividade
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : followups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum follow-up disparado para este contato.
          </p>
        ) : (
          <div className="space-y-2">
            {followups.map((f) => {
              const max = f.automation?.max_followups ?? 1;
              const window = formatInactivityWindow(f.automation?.inactivity_minutes);
              const reachedLimit = f.followup_count >= max;
              return (
                <div
                  key={f.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {f.automation?.name || "Automação removida"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        Janela: {window}
                      </p>
                    </div>
                    <Badge
                      variant={reachedLimit ? "secondary" : "default"}
                      className="shrink-0 text-xs"
                    >
                      {f.followup_count}/{max}
                    </Badge>
                  </div>
                  {f.last_followup_at && (
                    <p className="text-xs text-muted-foreground">
                      Último envio:{" "}
                      {format(new Date(f.last_followup_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
