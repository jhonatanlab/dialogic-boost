import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FlowBuilderWrapper } from "@/components/automations/FlowBuilder";
import type { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Pause, Trash2, Copy, MoreVertical, Bot, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Mock data for automations list
const mockAutomations = [
  {
    id: "1",
    name: "Boas-vindas",
    description: "Mensagem automática de boas-vindas para novos contatos",
    status: "active",
    triggerType: "first_message",
    executionCount: 1247,
    lastExecution: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Horário de Atendimento",
    description: "Informa horário de funcionamento fora do expediente",
    status: "active",
    triggerType: "keyword",
    executionCount: 892,
    lastExecution: "2024-01-15T09:15:00Z",
  },
  {
    id: "3",
    name: "Agendamento",
    description: "Fluxo para agendamento de consultas",
    status: "paused",
    triggerType: "keyword",
    executionCount: 456,
    lastExecution: "2024-01-14T16:45:00Z",
  },
];

const Automations = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const flowDataRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const handleSaveFlow = (nodes: Node[], edges: Edge[]) => {
    flowDataRef.current = { nodes, edges };
    console.log("Flow JSON:", JSON.stringify({ nodes, edges }, null, 2));
  };

  const filteredAutomations = mockAutomations.filter((auto) =>
    auto.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingFlowId(null);
    setActiveTab("builder");
  };

  const handleEditFlow = (id: string) => {
    setEditingFlowId(id);
    setActiveTab("builder");
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
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Automação
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <Zap className="h-4 w-4" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2">
              <Bot className="h-4 w-4" />
              Editor de Fluxo
            </TabsTrigger>
          </TabsList>

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
                          <CardDescription>{automation.description}</CardDescription>
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
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
                            <DropdownMenuItem className="text-destructive">
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
                            Gatilho: {automation.triggerType === "first_message" ? "Primeira mensagem" : "Palavra-chave"}
                          </span>
                        </div>
                        <div>
                          Execuções: <span className="font-medium text-foreground">{automation.executionCount.toLocaleString()}</span>
                        </div>
                        <div>
                          Última execução:{" "}
                          <span className="font-medium text-foreground">
                            {new Date(automation.lastExecution).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
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
            </div>
          </TabsContent>

          <TabsContent value="builder" className="mt-6">
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Nome da automação..."
                      className="max-w-xs font-semibold"
                      defaultValue={editingFlowId ? mockAutomations.find(a => a.id === editingFlowId)?.name : "Nova Automação"}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("list")}>
                      Cancelar
                    </Button>
                    <Button className="gap-2">
                      <Play className="h-4 w-4" />
                      Salvar e Ativar
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <FlowBuilderWrapper flowId={editingFlowId || undefined} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Automations;
