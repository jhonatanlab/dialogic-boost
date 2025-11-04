import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, X, Send, Settings } from "lucide-react";

interface QuickReply {
  id: string;
  text: string;
  action: string;
}

const VARIABLES = [
  { key: "{nome}", description: "Nome do contato" },
  { key: "{empresa}", description: "Nome da empresa" },
  { key: "{telefone}", description: "Telefone do contato" },
  { key: "{cidade}", description: "Cidade do contato" },
  { key: "{data}", description: "Data atual" },
];

const MOCK_VARIABLES = {
  "{nome}": "Maria",
  "{empresa}": "Connectly",
  "{telefone}": "(87) 99999-0000",
  "{cidade}": "São Paulo",
  "{data}": new Date().toLocaleDateString("pt-BR"),
};

export default function NewMessageTemplate() {
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState("");
  const [messageType, setMessageType] = useState("texto");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInsertVariable = (variable: string) => {
    const newMessage =
      message.slice(0, cursorPosition) +
      variable +
      message.slice(cursorPosition);
    setMessage(newMessage);
    setCursorPosition(cursorPosition + variable.length);
  };

  const getPreviewMessage = () => {
    let preview = message;
    Object.entries(MOCK_VARIABLES).forEach(([key, value]) => {
      preview = preview.split(key).join(value);
    });
    return preview;
  };

  const addQuickReply = () => {
    if (quickReplies.length >= 3) {
      toast({
        title: "Limite atingido",
        description: "Máximo de 3 respostas rápidas por mensagem.",
        variant: "destructive",
      });
      return;
    }
    setQuickReplies([
      ...quickReplies,
      { id: Math.random().toString(), text: "", action: "" },
    ]);
  };

  const removeQuickReply = (id: string) => {
    setQuickReplies(quickReplies.filter((reply) => reply.id !== id));
  };

  const updateQuickReply = (id: string, field: string, value: string) => {
    setQuickReplies(
      quickReplies.map((reply) =>
        reply.id === id ? { ...reply, [field]: value } : reply
      )
    );
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o nome do modelo.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 1024) {
      toast({
        title: "Limite excedido",
        description: "A mensagem não pode ter mais de 1024 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Check for unclosed variables
    const openBraces = (message.match(/\{/g) || []).length;
    const closeBraces = (message.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      toast({
        title: "Variável incompleta",
        description: "Verifique se todas as variáveis estão fechadas corretamente.",
        variant: "destructive",
      });
      return;
    }

    const usedVariables = VARIABLES.filter((v) =>
      message.includes(v.key)
    ).map((v) => v.key);

    const templateData = {
      nome_modelo: templateName,
      tipo: messageType,
      categoria_id: category,
      mensagem: message,
      variaveis_utilizadas: usedVariables,
      anexo_url: attachment ? URL.createObjectURL(attachment) : null,
      respostas_rapidas: quickReplies,
      preview: getPreviewMessage(),
    };

    console.log("Saving template:", templateData);

    toast({
      title: "✅ Modelo criado com sucesso!",
      description: "O modelo está disponível para uso em campanhas.",
    });

    navigate("/campaigns");
  };

  const handleTestMessage = () => {
    if (!testNumber.trim()) {
      toast({
        title: "Número obrigatório",
        description: "Por favor, informe o número para teste.",
        variant: "destructive",
      });
      return;
    }

    console.log("Sending test message to:", testNumber);
    console.log("Message:", getPreviewMessage());

    toast({
      title: "✅ Mensagem enviada com sucesso",
      description: `Mensagem enviada para ${testNumber}`,
    });

    setShowTestModal(false);
    setTestNumber("");
  };

  return (
    <div className="h-screen overflow-hidden bg-background p-6">
      <div className="mx-auto h-full max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Novo Modelo de Mensagem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie mensagens reutilizáveis para campanhas e respostas rápidas
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          {/* COLUNA ESQUERDA - Formulário */}
          <div className="overflow-y-auto rounded-2xl bg-card shadow-md p-6 space-y-6">
            {/* Nome do Modelo */}
            <div className="space-y-2">
              <Label htmlFor="templateName">
                Nome do Modelo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="templateName"
                placeholder="Ex: Promoção de boas-vindas"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            {/* Tipo de Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="messageType">Tipo de Mensagem</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Mensagem de Texto</SelectItem>
                  <SelectItem value="imagem">Mensagem com Imagem</SelectItem>
                  <SelectItem value="video">Mensagem com Vídeo</SelectItem>
                  <SelectItem value="botoes">Mensagem com Botões</SelectItem>
                  <SelectItem value="resposta_rapida">Resposta Rápida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mensagem Base */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">
                  Mensagem Base <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Inserir Variável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">
                        Variáveis Disponíveis
                      </h4>
                      {VARIABLES.map((variable) => (
                        <button
                          key={variable.key}
                          onClick={() => handleInsertVariable(variable.key)}
                          className="w-full text-left p-2 hover:bg-accent rounded-md transition-colors"
                        >
                          <div className="font-mono text-sm text-primary">
                            {variable.key}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Textarea
                id="message"
                placeholder="Digite sua mensagem aqui. Use { para inserir variáveis."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setCursorPosition(e.target.selectionStart);
                }}
                onSelect={(e) =>
                  setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
                }
                className="min-h-[150px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Digite <span className="font-mono">{"{"}</span> para inserir
                  variáveis
                </span>
                <span>
                  {message.length}/1024 caracteres
                </span>
              </div>
            </div>

            {/* Anexo (se tipo for imagem ou vídeo) */}
            {(messageType === "imagem" || messageType === "video") && (
              <div className="space-y-2">
                <Label>Anexo</Label>
                {attachment ? (
                  <div className="relative">
                    <Card className="p-4 flex items-center justify-between">
                      <span className="text-sm">{attachment.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAttachment(null);
                          setPreviewImage(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Card>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept={
                      messageType === "imagem"
                        ? "image/jpeg,image/png"
                        : "video/mp4"
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setAttachment(file);
                      if (file && messageType === "imagem") {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPreviewImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Respostas Rápidas */}
            {(messageType === "botoes" || messageType === "resposta_rapida") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Respostas Rápidas</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addQuickReply}
                    disabled={quickReplies.length >= 3}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Resposta
                  </Button>
                </div>
                {quickReplies.map((reply) => (
                  <Card key={reply.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Texto do botão"
                          value={reply.text}
                          onChange={(e) =>
                            updateQuickReply(reply.id, "text", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Ação (ex: link, mensagem)"
                          value={reply.action}
                          onChange={(e) =>
                            updateQuickReply(reply.id, "action", e.target.value)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuickReply(reply.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                <p className="text-xs text-muted-foreground">
                  Máximo de 3 respostas rápidas por mensagem
                </p>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA - Preview */}
          <div className="overflow-y-auto rounded-2xl bg-card shadow-md p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pré-visualização</h3>
                <Button onClick={() => setShowTestModal(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Testar Mensagem
                </Button>
              </div>

              {/* WhatsApp Preview */}
              <div className="bg-[#ECE5DD] rounded-lg p-4 min-h-[400px] relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iI0VDRTVERCIvPjxwYXRoIGQ9Ik0gMCAwIEwgNDAgNDAgTSA0MCAwIEwgMCA0MCIgc3Ryb2tlPSIjRDFEOEM2IiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-50"></div>
                
                <div className="relative">
                  {message ? (
                    <div className="bg-white rounded-lg p-4 shadow-sm max-w-[85%] ml-auto">
                      {attachment && messageType === "imagem" && previewImage && (
                        <div className="mb-3">
                          <img
                            src={previewImage}
                            alt="Pré-visualização da mensagem"
                            className="rounded-lg w-full object-cover max-h-64 shadow-md"
                          />
                        </div>
                      )}
                      {attachment && messageType === "video" && (
                        <div className="mb-2">
                          <div className="bg-muted rounded h-48 flex items-center justify-center text-muted-foreground">
                            🎥 Vídeo anexado
                          </div>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {getPreviewMessage()}
                      </p>
                      {quickReplies.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              className="w-full border border-primary text-primary rounded-full py-1 px-3 text-sm hover:bg-primary/10 transition-colors"
                            >
                              {reply.text || "Botão sem texto"}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2 text-right">
                        {new Date().toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-sm">
                        Digite uma mensagem para visualizar a pré-visualização
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  💡 As variáveis serão substituídas automaticamente com os
                  dados do contato ao enviar a mensagem.
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={() => navigate("/campaigns")}>
            Cancelar
          </Button>
          <div className="flex gap-3">
            <Button variant="outline">Salvar como Rascunho</Button>
            <Button onClick={handleSaveTemplate}>Salvar Modelo</Button>
          </div>
        </div>
      </div>

      {/* Modal de Teste */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testar Mensagem</DialogTitle>
            <DialogDescription>
              Envie a mensagem para o seu WhatsApp para testar como ela ficará
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testNumber">Número de WhatsApp</Label>
              <Input
                id="testNumber"
                placeholder="+55 (87) 99999-0000"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTestMessage}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
