import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Zap, Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useState } from "react";
import { format } from "date-fns";

const ModeloMessages = () => {
  const navigate = useNavigate();
  const { templates, isLoading: templatesLoading, updateTemplate, deleteTemplate } = useMessageTemplates();
  const { quickReplies, isLoading: repliesLoading, createQuickReply, deleteQuickReply } = useQuickReplies();
  
  const [isQuickReplyDialogOpen, setIsQuickReplyDialogOpen] = useState(false);
  const [quickReplyName, setQuickReplyName] = useState("");
  const [quickReplyText, setQuickReplyText] = useState("");
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const handleCreateQuickReply = () => {
    if (!quickReplyName.trim() || !quickReplyText.trim()) return;
    
    createQuickReply({
      name: quickReplyName,
      text: quickReplyText,
    });
    
    setQuickReplyName("");
    setQuickReplyText("");
    setIsQuickReplyDialogOpen(false);
  };

  const handleEdit = (model: any) => {
    setSelectedModel(model);
    setEditName(model.name);
    setEditType(model.type);
    setEditCategory(model.category || "");
    setEditMessage(model.message);
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedModel) return;
    
    updateTemplate({
      id: selectedModel.id,
      name: editName,
      type: editType,
      category: editCategory || null,
      message: editMessage,
    });
    
    setIsEditModalOpen(false);
    setSelectedModel(null);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedModel(null);
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return <Badge variant="outline">Geral</Badge>;
    
    const colors: Record<string, string> = {
      campanha: "bg-orange-500",
      atendimento: "bg-blue-500",
      marketing: "bg-purple-500",
    };
    
    return (
      <Badge className={colors[category.toLowerCase()] || "bg-gray-500"}>
        {category}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      text: "Texto",
      image: "Imagem",
      template: "Template",
    };
    
    return <Badge variant="secondary">{types[type] || type}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            Modelos e Mensagens
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus modelos reutilizáveis e mensagens rápidas para campanhas e atendimentos.
          </p>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="templates" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Modelos de Mensagem
            </TabsTrigger>
            <TabsTrigger value="quick-replies" className="gap-2">
              <Zap className="h-4 w-4" />
              Mensagens Rápidas
            </TabsTrigger>
          </TabsList>

          {/* Aba 1 - Modelos de Mensagem */}
          <TabsContent value="templates">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Modelos de Mensagem</h2>
                <Button onClick={() => {
                  sessionStorage.setItem('origin', window.location.pathname);
                  navigate("/message-templates/new");
                }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Novo Modelo
                </Button>
              </div>

              {templatesLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : templates && templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Modelo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{getCategoryBadge(template.category)}</TableCell>
                        <TableCell>{getTypeBadge(template.type)}</TableCell>
                        <TableCell>{format(new Date(template.updated_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum modelo cadastrado</p>
                  <Button onClick={() => {
                    sessionStorage.setItem('origin', window.location.pathname);
                    navigate("/message-templates/new");
                  }} className="mt-4">
                    Criar Primeiro Modelo
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Aba 2 - Mensagens Rápidas */}
          <TabsContent value="quick-replies">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Mensagens Rápidas</h2>
                <Dialog open={isQuickReplyDialogOpen} onOpenChange={setIsQuickReplyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Mensagem Rápida
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Mensagem Rápida</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="name">Nome / Atalho</Label>
                        <Input
                          id="name"
                          placeholder="Ex: Saudação inicial"
                          value={quickReplyName}
                          onChange={(e) => setQuickReplyName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="text">Texto da Mensagem</Label>
                        <Textarea
                          id="text"
                          placeholder="Olá {nome}, tudo bem? Como posso te ajudar hoje?"
                          value={quickReplyText}
                          onChange={(e) => setQuickReplyText(e.target.value)}
                          rows={4}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-xs text-muted-foreground mr-1 self-center">Variáveis:</span>
                          {["{nome}", "{telefone}", "{email}", "{atendente}"].map((v) => (
                            <Button
                              key={v}
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                              onClick={() => setQuickReplyText((prev) => prev + v)}
                            >
                              {v}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleCreateQuickReply} className="w-full">
                        Salvar Mensagem Rápida
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {repliesLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : quickReplies && quickReplies.length > 0 ? (
                <div className="space-y-3">
                  {quickReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="font-medium">{reply.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{reply.text}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteQuickReply(reply.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma mensagem rápida cadastrada</p>
                  <Button onClick={() => setIsQuickReplyDialogOpen(true)} className="mt-4">
                    Criar Primeira Mensagem
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Modelo de Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="edit-name">Nome do Modelo</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Confirmação de Pedido"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-type">Tipo de Mensagem</Label>
                <select
                  id="edit-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                  <option value="template">Template</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-category">Categoria</Label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Geral</option>
                  <option value="campanha">Campanha</option>
                  <option value="atendimento">Atendimento</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-message">Mensagem Base</Label>
                <Textarea
                  id="edit-message"
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Digite a mensagem aqui..."
                  rows={6}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ModeloMessages;
