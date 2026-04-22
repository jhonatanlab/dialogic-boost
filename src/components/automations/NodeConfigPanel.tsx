import { useEffect, useState } from "react";
import { type Node } from "@xyflow/react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete?: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData(node.data);
    }
  }, [node]);

  if (!node) return null;

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onUpdate(node.id, newData);
  };

  const renderFields = () => {
    switch (node.type) {
      case "trigger":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Gatilho</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Boas-vindas"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select
                value={formData.triggerType || ""}
                onValueChange={(value) => handleChange("triggerType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="first_message">Primeira mensagem</SelectItem>
                  <SelectItem value="all_messages">Todas as mensagens</SelectItem>
                  <SelectItem value="inactivity">Inatividade (follow-up)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.triggerType === "keyword" && (
              <div className="space-y-2">
                <Label>Palavra-chave</Label>
                <Input
                  value={formData.keyword || ""}
                  onChange={(e) => handleChange("keyword", e.target.value)}
                  placeholder="Ex: oi, olá, ajuda"
                />
              </div>
            )}
            {formData.triggerType === "inactivity" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Tempo de Inatividade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.inactivityValue || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const unit = formData.inactivityUnit || "minutes";
                        const multiplier = unit === "hours" ? 60 : unit === "days" ? 1440 : 1;
                        handleChange("inactivityValue", val);
                        handleChange("inactivityMinutes", val * multiplier);
                      }}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={formData.inactivityUnit || "minutes"}
                      onValueChange={(value) => {
                        const val = formData.inactivityValue || 0;
                        const multiplier = value === "hours" ? 60 : value === "days" ? 1440 : 1;
                        handleChange("inactivityUnit", value);
                        handleChange("inactivityMinutes", val * multiplier);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Máximo de Follow-ups</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxFollowups || 1}
                    onChange={(e) => handleChange("maxFollowups", parseInt(e.target.value) || 1)}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantas vezes enviar o follow-up por conversa
                  </p>
                </div>
              </>
            )}
          </>
        );

      case "message": {
        const messageVariables = [
          { label: "Nome", value: "{nome}" },
          { label: "Telefone", value: "{telefone}" },
          { label: "E-mail", value: "{email}" },
          { label: "Empresa", value: "{empresa}" },
          { label: "Data", value: "{data}" },
          { label: "Hora", value: "{hora}" },
        ];

        const insertVariable = (variable: string) => {
          const textarea = document.querySelector<HTMLTextAreaElement>("#message-textarea");
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const current = formData.message || "";
            const newValue = current.substring(0, start) + variable + current.substring(end);
            handleChange("message", newValue);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
          } else {
            handleChange("message", (formData.message || "") + variable);
          }
        };

        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Mensagem de boas-vindas"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                id="message-textarea"
                value={formData.message || ""}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="Digite a mensagem..."
                rows={4}
              />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Inserir variável:</p>
                <div className="flex flex-wrap gap-1">
                  {messageVariables.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => insertVariable(v.value)}
                      className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL da Mídia (opcional)</Label>
              <Input
                value={formData.mediaUrl || ""}
                onChange={(e) => handleChange("mediaUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </>
        );
      }

      case "question":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Coletar nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Textarea
                value={formData.question || ""}
                onChange={(e) => handleChange("question", e.target.value)}
                placeholder="Digite a pergunta..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Opções de Resposta (uma por linha)</Label>
              <Textarea
                value={(formData.options || []).join("\n")}
                onChange={(e) => handleChange("options", e.target.value.split("\n").filter(Boolean))}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                rows={4}
              />
            </div>
          </>
        );

      case "delay":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Aguardar resposta"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Tempo</Label>
                <Input
                  type="number"
                  value={formData.delay || ""}
                  onChange={(e) => handleChange("delay", parseInt(e.target.value))}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={formData.unit || "seconds"}
                  onValueChange={(value) => handleChange("unit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Segundos</SelectItem>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );

      case "condition":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Verificar horário"
              />
            </div>
            <div className="space-y-2">
              <Label>Condição</Label>
              <Textarea
                value={formData.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                placeholder="Ex: resposta contém 'sim'"
                rows={3}
              />
            </div>
          </>
        );

      case "tag":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Marcar como interessado"
              />
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select
                value={formData.action || "add"}
                onValueChange={(value) => handleChange("action", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar etiqueta</SelectItem>
                  <SelectItem value="remove">Remover etiqueta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input
                value={formData.tagName || ""}
                onChange={(e) => handleChange("tagName", e.target.value)}
                placeholder="Ex: Lead Quente"
              />
            </div>
          </>
        );

      case "transfer":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Transferir para vendas"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Input
                value={formData.teamName || ""}
                onChange={(e) => handleChange("teamName", e.target.value)}
                placeholder="Ex: Equipe de Vendas"
              />
            </div>
          </>
        );

      case "aiAgent":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ex: Assistente Virtual"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input
                value={formData.agentName || ""}
                onChange={(e) => handleChange("agentName", e.target.value)}
                placeholder="Ex: SAC Virtual"
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt do Sistema</Label>
              <Textarea
                value={formData.prompt || ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                placeholder="Descreva o comportamento do agente..."
                rows={5}
              />
            </div>
          </>
        );

      default:
        return <p className="text-muted-foreground text-sm">Selecione um bloco para configurar</p>;
    }
  };

  return (
    <div className="w-80 border-l bg-card h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Configurar Bloco</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {renderFields()}
          
          {node.type !== "trigger" && onDelete && (
            <Button
              variant="destructive"
              className="w-full mt-4"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Bloco
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
