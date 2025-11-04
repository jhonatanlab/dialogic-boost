import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Phone, MessageSquare, Edit, Plus, Copy, Calendar, Clock, Heart } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useTags, useAddTagToContact, useRemoveTagFromContact } from "@/hooks/useTags";
import { format } from "date-fns";
import { toast } from "sonner";

const Inbox = () => {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [newNote, setNewNote] = useState("");
  const [origin, setOrigin] = useState("whatsapp");
  
  // Mock contact ID - in real app this would come from the selected conversation
  const mockContactId = "1";
  
  const { data: notes } = useContactNotes(mockContactId);
  const createNote = useCreateContactNote();
  const deleteNote = useDeleteContactNote();
  const { data: tags } = useTags();
  const addTag = useAddTagToContact();
  const removeTag = useRemoveTagFromContact();

  const conversations = [
    {
      id: 1,
      name: "Maria Silva",
      channel: "whatsapp",
      lastMessage: "Olá, gostaria de saber mais sobre o produto",
      time: "10:30",
      unread: 2,
      status: "active",
      phone: "+55 11 98765-4321",
      email: "maria.silva@email.com",
      contactTags: [],
      birthday: "1990-05-15",
      lastVisit: new Date().toISOString(),
      coupleAnniversary: "2015-12-20",
    },
    {
      id: 2,
      name: "João Santos",
      channel: "instagram",
      lastMessage: "Obrigado pelo atendimento!",
      time: "09:15",
      unread: 0,
      status: "completed",
      phone: "+55 11 91234-5678",
      email: "joao.santos@email.com",
      contactTags: [],
    },
    {
      id: 3,
      name: "Ana Costa",
      channel: "messenger",
      lastMessage: "Quando posso retirar meu pedido?",
      time: "Ontem",
      unread: 1,
      status: "paused",
      phone: "+55 11 99876-5432",
      email: "ana.costa@email.com",
      contactTags: [],
    },
  ];

  const selectedContact = conversations.find((c) => c.id === selectedConversation);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <Phone className="h-4 w-4 text-green-500" />;
      case "instagram":
        return <MessageSquare className="h-4 w-4 text-pink-500" />;
      case "messenger":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      paused: "secondary",
      completed: "outline",
    };
    const labels = {
      active: "Ativo",
      paused: "Pausado",
      completed: "Concluído",
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Telefone copiado!");
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await createNote.mutateAsync({
        contactId: mockContactId,
        content: newNote,
      });
      setNewNote("");
      toast.success("Nota salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar nota");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync({
        noteId,
        contactId: mockContactId,
      });
      toast.success("Nota excluída!");
    } catch (error) {
      toast.error("Erro ao excluir nota");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="p-6 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as suas conversas em um só lugar
          </p>
        </div>

        <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden">
          {/* Coluna 1: Lista de conversas */}
          <Card className="w-1/4 flex flex-col overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors ${
                    selectedConversation === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(conv.channel)}
                          <span className="font-medium text-sm truncate">
                            {conv.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(conv.status)}
                        {conv.unread > 0 && (
                          <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Coluna 2: Janela de chat */}
          <Card className="flex-1 flex flex-col overflow-hidden p-6">
            <div className="border-b pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedContact?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedContact?.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {selectedContact && getChannelIcon(selectedContact.channel)}
                      <span className="capitalize">{selectedContact?.channel}</span>
                    </div>
                  </div>
                </div>
                {selectedContact && getStatusBadge(selectedContact.status)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              <div className="flex justify-start">
                <div className="max-w-[70%] bg-muted p-3 rounded-lg">
                  <p className="text-sm">{selectedContact?.lastMessage}</p>
                  <span className="text-xs text-muted-foreground mt-1 block">{selectedContact?.time}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[70%] bg-primary text-primary-foreground p-3 rounded-lg">
                  <p className="text-sm">Olá! Claro, como posso ajudar?</p>
                  <span className="text-xs opacity-70 mt-1 block">10:31</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Digite sua mensagem..." />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Coluna 3: Painel CRM do contato */}
          <Card className="w-1/4 flex flex-col overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Informações do Contato</h2>
              <Button size="icon" variant="ghost">
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* Avatar e Nome */}
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback className="text-2xl">{selectedContact?.name[0]}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{selectedContact?.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {selectedContact && getChannelIcon(selectedContact.channel)}
                <span className="text-sm text-muted-foreground capitalize">{selectedContact?.channel}</span>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Telefone */}
            <div className="mb-4">
              <Label className="text-muted-foreground text-xs mb-1 block">Telefone</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">{selectedContact?.phone}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => selectedContact && handleCopyPhone(selectedContact.phone)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <Label className="text-muted-foreground text-xs mb-1 block">Email</Label>
              <span className="text-sm">{selectedContact?.email}</span>
            </div>

            <Separator className="my-4" />

            {/* Etiquetas */}
            <div className="mb-4">
              <Label className="text-muted-foreground text-xs mb-2 block">Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                {selectedContact?.contactTags && selectedContact.contactTags.length > 0 ? (
                  selectedContact.contactTags.map((tag: any) => (
                    <Badge key={tag.id} style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Nenhuma etiqueta</span>
                )}
                <Button size="icon" variant="outline" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Campos de Informação */}
            <div className="space-y-3 mb-4">
              <div>
                <Label className="text-muted-foreground text-xs mb-1 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Aniversário
                </Label>
                <span className="text-sm">
                  {selectedContact?.birthday 
                    ? format(new Date(selectedContact.birthday), "dd/MM/yyyy")
                    : "Não informado"}
                </span>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs mb-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Última Visita
                </Label>
                <span className="text-sm">
                  {selectedContact?.lastVisit
                    ? format(new Date(selectedContact.lastVisit), "dd/MM/yyyy 'às' HH:mm")
                    : "Não informado"}
                </span>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs mb-1 flex items-center gap-2">
                  <Heart className="h-3 w-3" />
                  Aniversário de Casal
                </Label>
                <span className="text-sm">
                  {selectedContact?.coupleAnniversary
                    ? format(new Date(selectedContact.coupleAnniversary), "dd/MM/yyyy")
                    : "Não informado"}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Origem */}
            <div className="mb-4">
              <Label className="text-muted-foreground text-xs mb-2 block">Origem</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="messenger">Messenger</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            {/* Notas Internas */}
            <div className="flex-1">
              <Label className="text-muted-foreground text-xs mb-2 block">Notas Internas</Label>
              <div className="space-y-3">
                <Textarea
                  placeholder="Adicione uma nota sobre este contato..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  onClick={handleSaveNote}
                  disabled={!newNote.trim() || createNote.isPending}
                  className="w-full"
                  size="sm"
                >
                  Salvar Nota
                </Button>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notes && notes.length > 0 ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-muted rounded-lg text-sm space-y-1"
                      >
                        <p>{note.content}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma nota registrada
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inbox;
