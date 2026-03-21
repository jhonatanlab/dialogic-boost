import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search, Send, Phone, Copy, Edit, MessageSquare, Zap, Paperclip,
  X, Loader2, FileText, ChevronDown, Save, Plus, Tag, Image, Download, Film, Mic,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useConversations } from "@/hooks/useConversations";
import { useMessages, Message } from "@/hooks/useMessages";
import { useCompany } from "@/hooks/useCompany";
import { useTags, useCreateTag, useAddTagToContact, useRemoveTagFromContact } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/* ─── Helpers ─── */

const getMediaUrl = (msg: Message): string | null => {
  const meta = msg.metadata as Record<string, unknown> | null;
  return typeof meta?.media_url === "string" && meta.media_url ? meta.media_url : null;
};

const getMimetype = (msg: Message): string | null => {
  const meta = msg.metadata as Record<string, unknown> | null;
  return typeof meta?.mimetype === "string" ? meta.mimetype : null;
};

const resolveMediaSrc = (url: string, mimetype: string | null, fallbackType: string): string => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const mimeMap: Record<string, string> = {
    image: "image/jpeg", audio: "audio/ogg", video: "video/mp4", document: "application/octet-stream",
  };
  return `data:${mimetype || mimeMap[fallbackType] || "application/octet-stream"};base64,${url}`;
};

const formatConvDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM/yy");
};

const getPreviewIcon = (type: string) => {
  const map: Record<string, string> = { image: "📷", video: "🎥", audio: "🎵", document: "📄" };
  return map[type] || "📎";
};

/* ─── Status Ticks (outbound only) ─── */
const StatusTicks = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() ?? "";
  if (s === "sending")
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />;
  if (s === "failed")
    return <span className="text-[10px] font-bold text-destructive leading-none">✕</span>;
  if (s === "sent" || s === "server_ack")
    return <span className="text-[10px] text-muted-foreground/50 leading-none">✓</span>;
  if (s === "delivered" || s === "received")
    return <span className="text-[10px] text-muted-foreground/50 leading-none">✓✓</span>;
  if (s === "read" || s === "played")
    return <span className="text-[10px] font-semibold text-blue-500 leading-none">✓✓</span>;
  return null;
};

/* ─── Media Renderer ─── */
const MediaContent = ({ message }: { message: Message }) => {
  const mediaUrl = getMediaUrl(message);
  const mimetype = getMimetype(message);
  const type = message.message_type;
  if (!mediaUrl || type === "text") return null;
  const src = resolveMediaSrc(mediaUrl, mimetype, type);

  switch (type) {
    case "image":
      return (
        <div className="overflow-hidden rounded-md">
          <img src={src} alt="" className="w-full max-h-64 object-cover" loading="lazy" />
        </div>
      );
    case "video":
      return <video src={src} controls className="w-full max-h-64 rounded-md" />;
    case "audio":
      return <audio src={src} controls className="w-full min-w-[220px]" />;
    case "document":
      return (
        <a href={src} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-md bg-background/30 hover:bg-background/50 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Documento</p>
            <p className="text-[11px] opacity-60">Clique para baixar</p>
          </div>
        </a>
      );
    default:
      return null;
  }
};

/* ─── Chat Bubble ─── */
/* ─── URL image detection ─── */
const isImageUrl = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("http")) return false;
  // Common image extensions
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed)) return true;
  // WhatsApp CDN media URLs (mmg.whatsapp.net)
  if (/mmg\.whatsapp\.net/i.test(trimmed)) return true;
  // Facebook CDN media
  if (/fbcdn\.net/i.test(trimmed) && /mms/i.test(trimmed)) return true;
  return false;
};

const ChatBubble = ({ message }: { message: Message }) => {
  const isOutbound = message.direction?.toLowerCase() === "outbound";
  const mediaUrl = getMediaUrl(message);
  const hasMedia = !!mediaUrl && message.message_type !== "text";
  const rawContent = message.content?.trim() ?? "";

  // Detect if content is an image: data URI, URL, or raw Base64
  const looksLikeBase64 = rawContent.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(rawContent.slice(0, 200));
  const isContentImage =
    !hasMedia &&
    rawContent.length > 0 &&
    (
      message.message_type === "image" ||
      rawContent.startsWith("data:image/") ||
      isImageUrl(rawContent) ||
      looksLikeBase64
    );

  const contentImageSrc = isContentImage
    ? (rawContent.startsWith("http") || rawContent.startsWith("data:")
        ? rawContent
        : `data:image/jpeg;base64,${rawContent}`)
    : null;

  const [imgError, setImgError] = React.useState(false);

  // Never show auto-generated labels
  const autoLabels = new Set(["mídia enviada", "[mídia]", "[image]", "[video]", "[audio]", "[document]"]);
  const isAutoLabel = autoLabels.has(rawContent.toLowerCase());

  const showText =
    !isContentImage &&
    rawContent.length > 0 &&
    !isAutoLabel;

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} px-4`}>
      <div className={`relative max-w-[65%] rounded-xl shadow-sm ${
        isOutbound
          ? "bg-chat-outbound text-chat-outbound-foreground rounded-tr-sm"
          : "bg-chat-inbound text-chat-inbound-foreground rounded-tl-sm"
      }`}>
        {hasMedia && (
          <div className="p-1">
            <MediaContent message={message} />
          </div>
        )}
        {contentImageSrc && !imgError && (
          <div className="p-1">
            <a href={contentImageSrc} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md">
              <img
                src={contentImageSrc}
                alt="Imagem"
                className="max-w-[300px] w-full max-h-64 object-cover rounded-lg"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </a>
          </div>
        )}
        {contentImageSrc && imgError && (
          <div className="p-3 flex items-center gap-2 text-muted-foreground text-sm">
            <ImageIcon className="h-5 w-5" />
            <span>Imagem não pôde ser carregada</span>
          </div>
        )}
                    <Separator />

                    {/* Etiquetas */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <Tag className="h-3 w-3" /> Etiquetas
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="end">
                            <p className="text-xs font-semibold mb-2">Adicionar etiqueta</p>
                            {availableInboxTags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3 max-h-32 overflow-y-auto">
                                {availableInboxTags.map(tag => (
                                  <Badge key={tag.id} className="text-[11px] py-0.5 px-2 cursor-pointer hover:opacity-80 text-white"
                                    style={{ backgroundColor: tag.color }}
                                    onClick={() => {
                                      addTagToContact.mutate(
                                        { contactId: selectedConversation!.contact_id, tagId: tag.id },
                                        { onSuccess: () => setContactTags(prev => [...prev, { id: tag.id, name: tag.name, color: tag.color }]) }
                                      );
                                    }}>
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <Separator className="my-2" />
                            <p className="text-[11px] text-muted-foreground mb-1.5">Criar nova etiqueta</p>
                            <div className="flex gap-1.5">
                              <Input placeholder="Nome..." value={newInboxTagName}
                                onChange={(e) => setNewInboxTagName(e.target.value)}
                                className="h-7 text-xs flex-1" />
                              <input type="color" value={newInboxTagColor}
                                onChange={(e) => setNewInboxTagColor(e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                              <Button size="sm" className="h-7 text-xs px-2"
                                disabled={!newInboxTagName.trim()}
                                onClick={() => {
                                  createTag.mutate({ name: newInboxTagName.trim(), color: newInboxTagColor }, {
                                    onSuccess: () => { setNewInboxTagName(""); setNewInboxTagColor("#FC6625"); }
                                  });
                                }}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {contactTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {contactTags.map(tag => (
                            <Badge key={tag.id} className="text-[11px] py-0.5 px-2 gap-1 text-white"
                              style={{ backgroundColor: tag.color }}>
                              {tag.name}
                              <button type="button" className="hover:bg-black/20 rounded-full p-0.5"
                                onClick={() => {
                                  removeTagFromContact.mutate(
                                    { contactId: selectedConversation!.contact_id, tagId: tag.id },
                                    { onSuccess: () => setContactTags(prev => prev.filter(t => t.id !== tag.id)) }
                                  );
                                }}>
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Nenhuma etiqueta</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block">Origem</Label>
                      <Select value={origin} onValueChange={setOrigin}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="messenger">Messenger</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="indicacao">Indicação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-muted-foreground text-xs mb-2 block">Notas internas</Label>
                      <Textarea placeholder="Adicione uma nota..." value={newNote}
                        onChange={(e) => setNewNote(e.target.value)} rows={2} className="resize-none text-sm mb-2" />
                      <Button onClick={handleSaveNote} disabled={!newNote.trim() || createNote.isPending}
                        className="w-full h-8 text-xs" size="sm">Salvar</Button>

                      <div className="space-y-2 mt-3">
                        {notes && notes.length > 0 ? (
                          notes.map((note) => (
                            <div key={note.id} className="p-2.5 bg-secondary rounded-lg text-xs space-y-1">
                              <p className="text-foreground">{note.content}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-[10px]">
                                  {format(new Date(note.created_at), "dd/MM 'às' HH:mm")}
                                </span>
                                <Button size="icon" variant="ghost" className="h-5 w-5"
                                  onClick={() => handleDeleteNote(note.id)}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma nota</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="files" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {(() => {
                      const mediaMessages = (allMessages || []).filter(m =>
                        m.message_type !== "text" && getMediaUrl(m)
                      );
                      if (mediaMessages.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <Paperclip className="h-8 w-8 opacity-30 mb-2" />
                            <p className="text-xs">Nenhum arquivo nesta conversa</p>
                          </div>
                        );
                      }

                      const images = mediaMessages.filter(m => m.message_type === "image");
                      const videos = mediaMessages.filter(m => m.message_type === "video");
                      const audios = mediaMessages.filter(m => m.message_type === "audio");
                      const docs = mediaMessages.filter(m => m.message_type === "document");

                      const FileItem = ({ msg, icon: Icon, label }: { msg: Message; icon: any; label: string }) => {
                        const url = getMediaUrl(msg)!;
                        const mimetype = getMimetype(msg);
                        const src = resolveMediaSrc(url, mimetype, msg.message_type);
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
                      };

                      return (
                        <div className="space-y-4">
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
                                {videos.map(msg => <FileItem key={msg.id} msg={msg} icon={Film} label="Vídeo" />)}
                              </div>
                            </div>
                          )}
                          {audios.length > 0 && (
                            <div>
                              <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                                <Mic className="h-3 w-3" /> Áudios ({audios.length})
                              </Label>
                              <div className="space-y-1.5">
                                {audios.map(msg => <FileItem key={msg.id} msg={msg} icon={Mic} label="Áudio" />)}
                              </div>
                            </div>
                          )}
                          {docs.length > 0 && (
                            <div>
                              <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Documentos ({docs.length})
                              </Label>
                              <div className="space-y-1.5">
                                {docs.map(msg => <FileItem key={msg.id} msg={msg} icon={FileText} label="Documento" />)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Inbox;
