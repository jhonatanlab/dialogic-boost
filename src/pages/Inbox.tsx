import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Send, Phone, Mail, Copy, Calendar, Clock, Heart, Plus, Edit,
  MessageSquare, Zap, Paperclip, X, Loader2, FileText,
} from "lucide-react";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useTags } from "@/hooks/useTags";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useConversations } from "@/hooks/useConversations";
import { useMessages, Message } from "@/hooks/useMessages";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Helpers ──

const AUTO_MEDIA_LABELS = new Set([
  "Mídia enviada", "[mídia]", "[image]", "[video]", "[audio]", "[document]",
]);

const getMediaUrl = (message: Message): string | null => {
  const meta = message.metadata as Record<string, unknown> | null;
  return (typeof meta?.media_url === "string" && meta.media_url) ? meta.media_url : null;
};

const getMimetype = (message: Message): string | null => {
  const meta = message.metadata as Record<string, unknown> | null;
  return typeof meta?.mimetype === "string" ? meta.mimetype : null;
};

/** Ensure base64 data URIs have the correct prefix */
const resolveMediaSrc = (url: string, mimetype: string | null, fallbackType: string): string => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  // Looks like raw base64 — add data URI prefix
  const mimeMap: Record<string, string> = {
    image: "image/jpeg",
    audio: "audio/ogg",
    video: "video/mp4",
    document: "application/octet-stream",
  };
  const mime = mimetype || mimeMap[fallbackType] || "application/octet-stream";
  return `data:${mime};base64,${url}`;
};

// ── Status Ticks Component ──
const StatusTicks = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() ?? "";
  if (s === "sending") return <Loader2 className="h-3 w-3 animate-spin opacity-70" />;
  if (s === "failed") return <span className="text-xs font-bold text-destructive">✕</span>;
  if (s === "sent") return <span className="text-xs opacity-50">✓</span>;
  if (["server_ack", "received", "delivered"].includes(s))
    return <span className="text-xs opacity-50">✓✓</span>;
  if (s === "read") return <span className="text-xs text-blue-500 font-bold">✓✓</span>;
  return null;
};

// ── Media Renderer ──
const MediaContent = ({ message }: { message: Message }) => {
  const mediaUrl = getMediaUrl(message);
  const mimetype = getMimetype(message);
  const type = message.message_type;

  if (!mediaUrl || type === "text") return null;

  const src = resolveMediaSrc(mediaUrl, mimetype, type);

  switch (type) {
    case "image":
      return <img src={src} alt="" className="rounded max-w-full max-h-60 object-cover" loading="lazy" />;
    case "video":
      return <video src={src} controls className="rounded max-w-full max-h-60" />;
    case "audio":
      return <audio src={src} controls className="w-full min-w-[200px]" />;
    case "document":
      return (
        <a href={src} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="text-sm underline truncate">Documento</span>
        </a>
      );
    default:
      return null;
  }
};

// ── Chat Bubble ──
const ChatBubble = ({ message }: { message: Message }) => {
  const direction = message.direction?.toLowerCase() ?? "";
  const isOutbound = direction === "outbound";
  const mediaUrl = getMediaUrl(message);
  const hasMedia = !!mediaUrl && message.message_type !== "text";
  const trimmedContent = message.content?.trim() ?? "";

  // Decide whether to show text content
  const shouldShowText = (() => {
    if (!trimmedContent) return false;
    // Never show auto-generated media labels
    if (AUTO_MEDIA_LABELS.has(trimmedContent)) return false;
    return true;
  })();

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg ${
          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {hasMedia && (
          <div className="mb-1">
            <MediaContent message={message} />
          </div>
        )}
        {shouldShowText && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs opacity-70">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          {isOutbound && <StatusTicks status={message.status} />}
        </div>
      </div>
    </div>
  );
};

// ── Main Inbox Page ──
const Inbox = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [newNote, setNewNote] = useState("");
  const [origin, setOrigin] = useState("whatsapp");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { companyId } = useCompany();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, isLoading: messagesLoading, sendMessage, markAsRead } = useMessages(selectedConversationId);
  const { quickReplies } = useQuickReplies();

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  const { data: notes } = useContactNotes(selectedConversation?.contact_id || "");
  const createNote = useCreateContactNote();
  const deleteNote = useDeleteContactNote();
  const { data: tags } = useTags();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count > 0) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  const getChannelIcon = (channel: string) => {
    if (channel === "whatsapp") return <Phone className="h-4 w-4 text-green-500" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = { open: "Aberto", pending: "Pendente", closed: "Fechado" };
    const variants: Record<string, string> = { open: "default", pending: "secondary", closed: "outline" };
    return <Badge variant={variants[status] as any}>{labels[status] || status}</Badge>;
  };

  const handleCopyPhone = () => {
    if (selectedConversation?.contact.phone) {
      navigator.clipboard.writeText(selectedConversation.contact.phone);
      toast.success("Telefone copiado!");
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedConversation) return;
    try {
      await createNote.mutateAsync({ contactId: selectedConversation.contact_id, content: newNote });
      setNewNote("");
      toast.success("Nota salva com sucesso!");
    } catch { toast.error("Erro ao salvar nota"); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedConversation) return;
    try {
      await deleteNote.mutateAsync({ noteId, contactId: selectedConversation.contact_id });
      toast.success("Nota excluída!");
    } catch { toast.error("Erro ao excluir nota"); }
  };

  const getMediaTypeFromFile = (file: File): string => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !attachedFile) || !selectedConversation || !companyId) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimetype: string | undefined;

    if (attachedFile) {
      setIsUploading(true);
      try {
        const fileExt = attachedFile.name.split(".").pop();
        const filePath = `${companyId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, attachedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
        mediaUrl = urlData.publicUrl;
        mediaType = getMediaTypeFromFile(attachedFile);
        mimetype = attachedFile.type;
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Erro ao enviar arquivo");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessage.mutate({
      conversationId: selectedConversation.id,
      contactId: selectedConversation.contact_id,
      content: messageInput,
      phone: selectedConversation.contact.phone || "",
      companyId,
      mediaType,
      mediaUrl,
      mimetype,
    });
    setMessageInput("");
    removeAttachment();
  };

  const insertQuickReply = (text: string) => {
    setMessageInput(text);
    setShowQuickReplies(false);
  };

  const filteredConversations = conversations?.filter(conv =>
    !searchQuery ||
    conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contact.phone?.includes(searchQuery)
  ) || [];

  // ── Conversation list preview text ──
  const getPreviewText = (conv: typeof filteredConversations[0]) => {
    const lm = conv.last_message;
    if (!lm) return "Sem mensagens";
    const content = lm.content?.trim() ?? "";
    if (AUTO_MEDIA_LABELS.has(content)) {
      const type = lm.message_type || "mídia";
      const icons: Record<string, string> = { image: "📷", video: "🎥", audio: "🎵", document: "📄" };
      return `${icons[type] || "📎"} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
    return content || "Sem mensagens";
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="p-6 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground mt-2">Gerencie todas as suas conversas em um só lugar</p>
        </div>

        <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden">
          {/* Col 1: Conversation list */}
          <Card className="w-1/4 flex flex-col overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar conversas..." className="pl-10" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-4">
              {conversationsLoading ? (
                <div className="text-center text-muted-foreground p-4">Carregando...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">Nenhuma conversa encontrada</div>
              ) : (
                filteredConversations.map((conv) => (
                  <div key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                    className={`p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors ${
                      selectedConversationId === conv.id ? "bg-accent" : ""
                    }`}>
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={conv.contact.avatar_url || undefined} />
                        <AvatarFallback>{conv.contact.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getChannelIcon(conv.channel)}
                            <span className="font-medium text-sm truncate">{conv.contact.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(conv.last_message_at), "HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {conv.last_message?.direction === "outbound" && "Você: "}
                          {getPreviewText(conv)}
                        </p>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(conv.status)}
                          {conv.unread_count > 0 && (
                            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Col 2: Chat window */}
          <Card className="flex-1 flex flex-col overflow-hidden p-6">
            {selectedConversation ? (
              <>
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedConversation.contact.avatar_url || undefined} />
                        <AvatarFallback>{selectedConversation.contact.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{selectedConversation.contact.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getChannelIcon(selectedConversation.channel)}
                          <span className="capitalize">{selectedConversation.channel}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(selectedConversation.status)}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground">Carregando mensagens...</div>
                  ) : !messages || messages.length === 0 ? (
                    <div className="text-center text-muted-foreground">Sem mensagens</div>
                  ) : (
                    messages.map((message) => <ChatBubble key={message.id} message={message} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="relative">
                  {attachedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate flex-1">{attachedFile.name}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={removeAttachment}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={handleFileSelect} />
                  <div className="flex gap-2">
                    <Button type="button" size="icon" variant="ghost"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}>
                      <Zap className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost"
                      onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input placeholder="Digite sua mensagem..." value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                      }} />
                    <Button size="icon" onClick={handleSendMessage}
                      disabled={sendMessage.isPending || isUploading || (!messageInput.trim() && !attachedFile)}>
                      {sendMessage.isPending || isUploading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </Button>
                  </div>

                  {showQuickReplies && quickReplies && quickReplies.length > 0 && (
                    <div className="absolute bottom-16 left-0 right-0 bg-background border rounded-lg shadow-lg p-2 z-50 max-h-64 overflow-y-auto">
                      {quickReplies.map((reply) => (
                        <div key={reply.id} onClick={() => insertQuickReply(reply.text)}
                          className="p-3 hover:bg-accent cursor-pointer rounded-lg transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-3 w-3 text-primary" />
                            <span className="font-medium text-sm">{reply.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecione uma conversa para começar
              </div>
            )}
          </Card>

          {/* Col 3: Contact CRM panel */}
          <Card className="w-1/4 flex flex-col overflow-y-auto p-6">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Informações do Contato</h2>
                  <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                </div>

                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-20 w-20 mb-3">
                    <AvatarImage src={selectedConversation.contact.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">{selectedConversation.contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{selectedConversation.contact.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getChannelIcon(selectedConversation.channel)}
                    <span className="text-sm text-muted-foreground capitalize">{selectedConversation.channel}</span>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="mb-4">
                  <Label className="text-muted-foreground text-xs mb-1 block">Telefone</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{selectedConversation.contact.phone || "Não informado"}</span>
                    {selectedConversation.contact.phone && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyPhone}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-muted-foreground text-xs mb-1 block">Email</Label>
                  <span className="text-sm">{selectedConversation.contact.email || "Não informado"}</span>
                </div>

                <Separator className="my-4" />

                <div className="mb-4">
                  <Label className="text-muted-foreground text-xs mb-2 block">Origem</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

                <div className="flex-1">
                  <Label className="text-muted-foreground text-xs mb-2 block">Notas Internas</Label>
                  <div className="space-y-3">
                    <Textarea placeholder="Adicione uma nota sobre este contato..." value={newNote}
                      onChange={(e) => setNewNote(e.target.value)} rows={3} className="resize-none" />
                    <Button onClick={handleSaveNote} disabled={!newNote.trim() || createNote.isPending}
                      className="w-full" size="sm">Salvar Nota</Button>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {notes && notes.length > 0 ? (
                        notes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted rounded-lg text-sm space-y-1">
                            <p>{note.content}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                              </span>
                              <Button size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => handleDeleteNote(note.id)}>
                                <span className="text-destructive">✕</span>
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma nota cadastrada</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecione uma conversa
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inbox;
