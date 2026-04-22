import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Zap, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Automation {
  id: string;
  name: string;
  status: string;
  execution_count: number;
  trigger_type: string | null;
  last_execution: string | null;
  created_at: string;
}

interface AutomationStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automations: Automation[];
}

export function AutomationStatsModal({ open, onOpenChange, automations }: AutomationStatsModalProps) {
  const stats = useMemo(() => {
    const total = automations.length;
    const active = automations.filter((a) => a.status === "active").length;
    const paused = total - active;
    const totalExecutions = automations.reduce((sum, a) => sum + a.execution_count, 0);

    const ranked = [...automations]
      .sort((a, b) => b.execution_count - a.execution_count);

    const maxExec = ranked[0]?.execution_count || 1;

    return { total, active, paused, totalExecutions, ranked, maxExec };
  }, [automations]);

  const getTriggerLabel = (type: string | null) => {
    switch (type) {
      case "first_message": return "Primeira mensagem";
      case "keyword": return "Palavra-chave";
      case "inactivity": return "Inatividade";
      case "all_messages": return "Todas mensagens";
      default: return type || "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard de Automações
          </DialogTitle>
          <DialogDescription>
            Visão geral de desempenho dos seus fluxos
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="rounded-lg border bg-card p-3 text-center">
            <Zap className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total de Execuções</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Fluxos Ativos</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <XCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.paused}</p>
            <p className="text-xs text-muted-foreground">Fluxos Pausados</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold">Ranking por Execuções</h4>
          {stats.ranked.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma automação encontrada</p>
          )}
          {stats.ranked.map((auto, i) => {
            const pct = stats.maxExec > 0 ? (auto.execution_count / stats.maxExec) * 100 : 0;
            return (
              <div key={auto.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium truncate max-w-[250px]">{auto.name}</span>
                    <Badge
                      variant={auto.status === "active" ? "default" : "secondary"}
                      className={auto.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 py-0" : "text-[10px] px-1.5 py-0"}
                    >
                      {auto.status === "active" ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold">{auto.execution_count.toLocaleString()}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Gatilho: {getTriggerLabel(auto.trigger_type)}</span>
                  {auto.last_execution && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(auto.last_execution).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
