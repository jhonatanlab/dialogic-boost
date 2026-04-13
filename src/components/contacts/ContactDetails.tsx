import { useState, useEffect } from "react";
import { X, Mail, Phone, Instagram, Plus, Trash2, MessageCircle, Cake, Paperclip, Image, Film, Mic, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Contact } from "@/hooks/useContacts";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useTags, useAddTagToContact, useRemoveTagFromContact } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactDetailsProps {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
  onSendWhatsApp?: () => void;
}

interface MediaMessage {
  id: string;
  message_type: string;
  direction: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const getMediaUrl = (msg: MediaMessage): string | null => {
  const meta = msg.metadata;
  return typeof meta?.media_url === "string" && meta.media_url ? meta.media_url : null;
};

const getMimetype = (msg: MediaMessage): string | null => {
  const meta = msg.metadata;
  return typeof meta?.mimetype === "string" ? meta.mimetype : null;
};

const resolveMediaSrc = (url: string, mimetype: string | null, fallbackType: string): string => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const mimeMap: Record<string, string> = {
    image: "image/jpeg", audio: "audio/ogg", video: "video/mp4", document: "application/octet-stream",
  };
  return `data:${mimetype || mimeMap[fallbackType] || "application/octet-stream"};base64,${url}`;
};

export function ContactDetails({ contact, onClose, onEdit, onSendWhatsApp }: ContactDetailsProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes = [] } = useContactNotes(contact.id);
  const createNote = useCreateContactNote();
  const deleteNote = useDeleteContactNote();
  const { data: allTags = [] } = useTags();
  const addTag = useAddTagToContact();
  const removeTag = useRemoveTagFromContact();
  const [mediaMessages, setMediaMessages] = useState<MediaMessage[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const contactTagIds = contact.tags?.map((t) => t.id) || [];
  const availableTags = allTags.filter((t) => !contactTagIds.includes(t.id));

  // Fetch media messages for this contact's conversation
  useEffect(() => {
    const fetchMedia = async () => {
      setMediaLoading(true);
      try {
        const { data } = await supabase
          .from("messages")
          .select("id, message_type, direction, created_at, metadata")
          .eq("contact_id", contact.id)
          .neq("message_type", "text")
          .order("created_at", { ascending: false });
        const msgs = (data || []) as MediaMessage[];
        setMediaMessages(msgs.filter(m => getMediaUrl(m)));
      } catch {
        setMediaMessages([]);
      }
      setMediaLoading(false);
    };
    fetchMedia();
  }, [contact.id]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      createNote.mutate({ contactId: contact.id, content: newNote });
      setNewNote("");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const images = mediaMessages.filter(m => m.message_type === "image");
  const videos = mediaMessages.filter(m => m.message_type === "video");
  const audios = mediaMessages.filter(m => m.message_type === "audio");
  const docs = mediaMessages.filter(m => m.message_type === "document");

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Detalhes do Contato</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center text-center space-y-3 p-4 pb-2">
        <Avatar className="h-24 w-24">
          <AvatarImage src={contact.avatar_url} />
          <AvatarFallback className="text-2xl">{getInitials(contact.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{contact.name}</h3>
          <p className="text-sm text-muted-foreground">
            Cadastrado em {format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="outline" size="sm">Editar Contato</Button>
          {onSendWhatsApp && contact.phone && (
            <Button onClick={onSendWhatsApp} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mb-0">
          <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
          <TabsTrigger value="files" className="flex-1">
            Arquivos {mediaMessages.length > 0 && `(${mediaMessages.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.email}</span>
                    </div>
                  )}
                  {contact.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.instagram}</span>
                    </div>
                  )}
                  {contact.birthday && (
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(contact.birthday + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {!contact.phone && !contact.email && !contact.instagram && !contact.birthday && (
                    <p className="text-sm text-muted-foreground">Nenhuma informação adicional</p>
                  )}
                </CardContent>
              </Card>

              {/* Resumo IA */}
              <AiSummaryCard contactId={contact.id} />

              {/* Tags */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Etiquetas</CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" />
                        Adicionar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      {availableTags.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma etiqueta disponível</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                              onClick={() => addTag.mutate({ contactId: contact.id, tagId: tag.id })}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent>
                  {contact.tags && contact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <Badge key={tag.id} className="text-white gap-1 pr-1" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => removeTag.mutate({ contactId: contact.id, tagId: tag.id })}
                            className="ml-0.5 hover:bg-black/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma etiqueta</p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Adicionar nova nota..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddNote} size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Nota
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {notes.length > 0 ? (
                      notes.map((note) => (
                        <div key={note.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm flex-1">{note.content}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => deleteNote.mutate({ noteId: note.id, contactId: contact.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma nota registrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {mediaLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <p className="text-sm">Carregando arquivos...</p>
                </div>
              ) : mediaMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Paperclip className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-sm">Nenhum arquivo compartilhado</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {images.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                        <Image className="h-3 w-3" /> Imagens ({images.length})
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {images.map(msg => {
                          const src = resolveMediaSrc(getMediaUrl(msg)!, getMimetype(msg), "image");
                          return (
                            <a key={msg.id} href={src} target="_blank" rel="noopener noreferrer"
                              className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity">
                              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {videos.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                        <Film className="h-3 w-3" /> Vídeos ({videos.length})
                      </Label>
                      <div className="space-y-1.5">
                        {videos.map(msg => (
                          <FileItem key={msg.id} msg={msg} icon={Film} fallbackLabel="Vídeo" />
                        ))}
                      </div>
                    </div>
                  )}
                  {audios.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                        <Mic className="h-3 w-3" /> Áudios ({audios.length})
                      </Label>
                      <div className="space-y-1.5">
                        {audios.map(msg => (
                          <FileItem key={msg.id} msg={msg} icon={Mic} fallbackLabel="Áudio" />
                        ))}
                      </div>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Documentos ({docs.length})
                      </Label>
                      <div className="space-y-1.5">
                        {docs.map(msg => (
                          <FileItem key={msg.id} msg={msg} icon={FileText} fallbackLabel="Documento" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function resolveFileName(msg: MediaMessage, fallback: string): string {
  const meta = msg.metadata;
  if (meta?.file_name && typeof meta.file_name === "string") return meta.file_name as string;
  const url = getMediaUrl(msg);
  if (url) {
    try {
      const pathname = new URL(url as string).pathname;
      const parts = pathname.split("/");
      const last = parts[parts.length - 1];
      const cleaned = last.replace(/^\d+_/, "");
      if (cleaned && cleaned !== last && cleaned.includes(".")) return decodeURIComponent(cleaned);
      if (last.includes(".")) return decodeURIComponent(last);
    } catch { /* ignore */ }
  }
  return fallback;
}

function FileItem({ msg, icon: Icon, fallbackLabel }: { msg: MediaMessage; icon: any; fallbackLabel: string }) {
  const url = getMediaUrl(msg)!;
  const mimetype = getMimetype(msg);
  const src = resolveMediaSrc(url, mimetype, msg.message_type);
  const label = resolveFileName(msg, fallbackLabel);
  return (
    <a href={src} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(msg.created_at), "dd/MM/yy HH:mm")} · {msg.direction === "outbound" ? "Enviado" : "Recebido"}
        </p>
      </div>
      <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </a>
  );
}
