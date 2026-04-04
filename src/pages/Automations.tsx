import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FlowBuilderWrapper, type FlowBuilderHandle } from "@/components/automations/FlowBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Pause, Trash2, Copy, MoreVertical, Bot, Zap, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAutomations } from "@/hooks/useAutomations";
import { toast } from "sonner";

const Automations = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [automationName, setAutomationName] = useState("Nova Automação");
  const [triggerType, setTriggerType] = useState<string>("keyword");
  const [keyword, setKeyword] = useState("");
  const flowBuilderRef = useRef<FlowBuilderHandle>(null);

  const { automations, isLoading, createAutomation, updateAutomation, deleteAutomation, toggleStatus } = useAutomations();

  const filteredAutomations = automations.filter((auto) =>
    auto.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingFlowId(null);
    setAutomationName("Nova Automação");
    setTriggerType("keyword");
    setKeyword("");
    setActiveTab("builder");
  };

  const handleEditFlow = (id: string) => {
    const auto = automations.find(a => a.id === id);
    setEditingFlowId(id);
    setAutomationName(auto?.name || "Nova Automação");
    setTriggerType(auto?.trigger_type || "keyword");
    setKeyword(auto?.keyword || "");
    setActiveTab("builder");
  };

  const handleSave = () => {
    const flowData = flowBuilderRef.current?.getFlowData();
    if (!flowData) {
      toast.error("Nenhum dado de fluxo encontrado");
      return;
    }

    // Extract trigger settings from the visual trigger node (source of truth)
    let resolvedTriggerType = triggerType;
    let resolvedKeyword = triggerType === "keyword" ? keyword : null;

    if (flowData.nodes && Array.isArray(flowData.nodes)) {
      const triggerNode = flowData.nodes.find((n: any) => n.type === "trigger");
      if (triggerNode?.data) {
        if (triggerNode.data.triggerType) {
          resolvedTriggerType = triggerNode.data.triggerType as string;
        }
        if (triggerNode.data.keyword) {
          resolvedKeyword = triggerNode.data.keyword as string;
        }
      }
    }

    // Ensure keyword is null when not using keyword trigger
    if (resolvedTriggerType !== "keyword") {
      resolvedKeyword = null;
    }

    if (editingFlowId) {
      updateAutomation.mutate({
        id: editingFlowId,
        name: automationName,
        flow_data: flowData,
        status: "active",
        trigger_type: resolvedTriggerType,
        keyword: resolvedKeyword,
      });
    } else {
      createAutomation.mutate({
        name: automationName,
        flow_data: flowData,
        trigger_type: resolvedTriggerType,
        keyword: resolvedKeyword,
      });
    }
    setActiveTab("list");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automações</h1>
            <p className="text-muted-foreground mt-1">
              Crie fluxos automatizados para chatbots e atendimento
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <Zap className="h-4 w-4" />
                Automações
              </TabsTrigger>
              <TabsTrigger value="builder" className="gap-2" onClick={handleCreateNew}>
                <Bot className="h-4 w-4" />
                Editor de Fluxo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <TabsContent value="list" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Buscar automações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAutomations.map((automation) => (
                    <Card key={automation.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{automation.name}</CardTitle>
                              <Badge
                                variant={automation.status === "active" ? "default" : "secondary"}
                                className={automation.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                              >
                                {automation.status === "active" ? "Ativo" : "Pausado"}
                              </Badge>
                            </div>
                            {automation.description && (
                              <CardDescription>{automation.description}</CardDescription>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditFlow(automation.id)}>
                                Editar fluxo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: automation.id, currentStatus: automation.status })}>
                                {automation.status === "active" ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteAutomation.mutate(automation.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            <span>
                              Gatilho: {automation.trigger_type === "first_message" ? "Primeira mensagem" : automation.trigger_type === "keyword" ? "Palavra-chave" : automation.trigger_type || "—"}
                            </span>
                          </div>
                          <div>
                            Execuções: <span className="font-medium text-foreground">{automation.execution_count.toLocaleString()}</span>
                          </div>
                          {automation.last_execution && (
                            <div>
                              Última execução:{" "}
                              <span className="font-medium text-foreground">
                                {new Date(automation.last_execution).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredAutomations.length === 0 && (
                    <Card className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted">
                          <Bot className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Nenhuma automação encontrada</h3>
                          <p className="text-muted-foreground mt-1">
                            Crie sua primeira automação para começar a automatizar seu atendimento
                          </p>
                        </div>
                        <Button onClick={handleCreateNew} className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Automação
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="builder" className="mt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <Input
                placeholder="Nome da automação..."
                className="max-w-xs font-semibold h-9"
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("list")}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSave}
                  disabled={createAutomation.isPending || updateAutomation.isPending}
                >
                  {(createAutomation.isPending || updateAutomation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Salvar e Ativar
                </Button>
              </div>
            </div>
            
            <FlowBuilderWrapper
              flowId={editingFlowId || undefined}
              builderRef={flowBuilderRef}
              initialFlowData={editingFlowId ? automations.find(a => a.id === editingFlowId)?.flow_data : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Automations;
