import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChatSettings, useAgents } from "@/hooks/useChatSettings";
import { Shuffle, Users, ArrowLeft, Trash2, UserPlus, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DISTRIBUTION_MODES = [
  { value: "manual", label: "Manual", description: "Atendente escolhe manualmente" },
  { value: "round_robin", label: "Round Robin", description: "Distribuição sequencial entre atendentes" },
  { value: "least_loaded", label: "Menor Carga", description: "Atribui ao atendente com menos conversas" },
  { value: "hybrid", label: "Híbrido (Recomendado)", description: "Menor carga + round robin entre os melhores" },
];

const ChatDistribution = () => {
  const navigate = useNavigate();
  const { settings, isLoading, saveSettings } = useChatSettings();
  const { agents, isLoading: agentsLoading, toggleAgentStatus, removeAgent } = useAgents();

  const [mode, setMode] = useState<string>("manual");
  const [maxConvs, setMaxConvs] = useState<string>("");
  const [onlyOnline, setOnlyOnline] = useState(false);

  useEffect(() => {
    if (settings) {
      setMode(settings.distribution_mode);
      setMaxConvs(settings.max_conversations_per_agent?.toString() ?? "");
      setOnlyOnline(settings.only_assign_online_agents);
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings.mutate({
      distribution_mode: mode as any,
      max_conversations_per_agent: maxConvs ? parseInt(maxConvs) : null,
      only_assign_online_agents: onlyOnline,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shuffle className="h-6 w-6 text-primary" />
              Distribuição de Conversas
            </h1>
            <p className="text-muted-foreground text-sm">Configure como as conversas são atribuídas aos atendentes.</p>
          </div>
        </div>

        {/* Distribution Mode */}
        <Card className="p-6 space-y-5">
          <h2 className="text-lg font-semibold">Modo de Distribuição</h2>

          <div className="space-y-2">
            <Label>Estratégia</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTRIBUTION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Limite de conversas por atendente (opcional)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Sem limite"
              value={maxConvs}
              onChange={(e) => setMaxConvs(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se todos atingirem o limite, a conversa permanece na fila como "aberta".
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Apenas atendentes online</Label>
              <p className="text-xs text-muted-foreground">Distribui apenas para quem está online.</p>
            </div>
            <Switch checked={onlyOnline} onCheckedChange={setOnlyOnline} />
          </div>

          <Button onClick={handleSave} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </Card>

        {/* Agents List */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Atendentes
            </h2>
          </div>

          {agentsLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : !agents?.length ? (
            <p className="text-muted-foreground text-sm">
              Nenhum atendente cadastrado. Adicione atendentes na página de Usuários e eles aparecerão aqui automaticamente.
            </p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${agent.is_online ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-medium">{agent.user_id.slice(0, 8)}...</span>
                    <div className="flex gap-1">
                      {agent.is_active ? (
                        <Badge variant="default" className="text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                      {agent.is_online ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          <Wifi className="h-3 w-3 mr-1" /> Online
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <WifiOff className="h-3 w-3 mr-1" /> Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={(v) => toggleAgentStatus.mutate({ agentId: agent.id, field: "is_active", value: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAgent.mutate(agent.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ChatDistribution;
