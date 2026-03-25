import React, { useState, useEffect, useRef, useCallback } from "react";
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
  X, Loader2, FileText, ChevronDown, Save, Plus, Tag, Image as ImageIcon, Download, Film, Mic, Square,
  ImageOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

/* ─── URL image detection ─── */
const isImageUrl = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("http")) return false;
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed)) return true;
  if (/mmg\.whatsapp\.net/i.test(trimmed)) return true;
  if (/fbcdn\.net/i.test(trimmed) && /mms/i.test(trimmed)) return true;
  return false;
};

/* ─── Chat Bubble ─── */
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

  // Never show auto-generated labels like "Mídia enviada", "[image]", etc.
  const autoLabels = new Set(["mídia enviada", "[mídia]", "[image]", "[video]", "[audio]", "[document]"]);
  const isAutoLabel = autoLabels.has(rawContent.toLowerCase());

  const showText =
    !isContentImage &&
    !hasMedia &&
    rawContent.length > 0 &&
    !isAutoLabel &&
    !rawContent.startsWith("data:") &&
    !isImageUrl(rawContent) &&
    !looksLikeBase64;

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
            <ImageOff className="h-5 w-5" />
            <span>Imagem não pôde ser carregada</span>
          </div>
        )}
        {showText && (
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words px-3 pt-2 pb-1">
            {rawContent}
          </p>
        )}
        <div className="flex items-center justify-end gap-1 px-3 pb-2 pt-0.5">
          <span className="text-[11px] opacity-50 tabular-nums">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          {isOutbound && <StatusTicks status={message.status} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Date Separator ─── */
const DateSeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Hoje";
  else if (isYesterday(d)) label = "Ontem";
  else label = format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex items-center justify-center py-3">
      <span className="text-[11px] bg-card text-muted-foreground px-4 py-1.5 rounded-full shadow-sm font-medium">
        {label}
      </span>
    </div>
  );
};

/* ─── Conversation List Item ─── */
const ConversationItem = ({
  conv, isSelected, onSelect,
}: {
  conv: {
    id: string; contact: { name: string; phone: string | null; avatar_url: string | null };
    last_message_at: string; unread_count: number;
    last_message?: { content: string; message_type?: string };
  };
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const lm = conv.last_message;
  const isMediaMsg = lm?.message_type && lm.message_type !== "text";
  const preview = isMediaMsg
    ? `${getPreviewIcon(lm?.message_type || "document")} ${(lm?.message_type || "mídia").charAt(0).toUpperCase() + (lm?.message_type || "mídia").slice(1)}`
    : lm?.content?.trim() || "Sem mensagens";

  return (
    <div onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 hover:bg-secondary/60 ${
        isSelected ? "bg-secondary" : ""
      }`}>
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={conv.contact.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {conv.contact.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-sm text-foreground truncate">{conv.contact.name}</span>
          <span className={`text-[11px] shrink-0 tabular-nums ${
            conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground"
          }`}>
            {formatConvDate(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground truncate flex-1">{preview}</p>
          {conv.unread_count > 0 && (
            <span className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 shrink-0">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════ */
/* ─── MAIN INBOX ─── */
/* ═══════════════════════════════════════════ */
const Inbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [newNote, setNewNote] = useState("");
  const [origin, setOrigin] = useState("whatsapp");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  // optimisticMessages no longer needed — messages are persisted to DB before n8n call
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { companyId } = useCompany();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, isLoading: messagesLoading, sendMessage, markAsRead } = useMessages(selectedConversationId);
  const { quickReplies } = useQuickReplies();

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);
  const { data: notes } = useContactNotes(selectedConversation?.contact_id || "");
  const createNote = useCreateContactNote();
  const deleteNote = useDeleteContactNote();
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const addTagToContact = useAddTagToContact();
  const removeTagFromContact = useRemoveTagFromContact();
  const [newInboxTagName, setNewInboxTagName] = useState("");
  const [newInboxTagColor, setNewInboxTagColor] = useState("#FC6625");
  const [contactTags, setContactTags] = useState<{ id: string; name: string; color: string }[]>([]);

  // Fetch contact tags for selected conversation
  useEffect(() => {
    const fetchContactTags = async () => {
      if (!selectedConversation?.contact_id) { setContactTags([]); return; }
      const { data } = await supabase
        .from("contact_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("contact_id", selectedConversation.contact_id);
      setContactTags(data?.map((ct: any) => ct.tags).filter(Boolean) || []);
    };
    fetchContactTags();
  }, [selectedConversation?.contact_id, allTags]);

  const availableInboxTags = allTags.filter(t => !contactTags.some(ct => ct.id === t.id));

  // Helper: detect if a message is a pending shell (status arrived before content)
  const isPendingShell = (msg: Message): boolean => {
    if (msg.direction !== "outbound") return false;
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.pending_content === true) return true;
    const hasContent = msg.content && msg.content.trim().length > 0;
    const hasMediaMeta = meta?.media_url && typeof meta.media_url === "string";
    return !hasContent && !hasMediaMeta && !msg.message_id?.startsWith("app-");
  };

  // Messages from DB, filtering out pending shells
  const allMessages = (messages || []).filter(m => !isPendingShell(m));

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count && selectedConversation.unread_count > 0) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Auto-select conversation from contactId URL param
  useEffect(() => {
    const contactId = searchParams.get("contactId");
    if (!contactId || !conversations) return;

    const match = conversations.find(c => c.contact_id === contactId);
    if (match && match.id !== selectedConversationId) {
      setSelectedConversationId(match.id);
      setSearchParams({}, { replace: true });
    } else if (!match && conversations.length >= 0) {
      // No conversation exists for this contact — create one
      const createConversation = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

          const { data: newConv, error } = await supabase
            .from("conversations")
            .insert({
              user_id: user.id,
              contact_id: contactId,
              channel: "whatsapp",
              status: "open",
              company_id: profile?.company_id || null,
            })
            .select()
            .single();

          if (error) {
            // If unique constraint violation, conversation was created concurrently — retry find
            if (error.code === "23505") {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            } else {
              console.error("Error creating conversation:", error);
            }
            return;
          }

          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          setSelectedConversationId(newConv.id);
          setSearchParams({}, { replace: true });
        } catch (err) {
          console.error("Error creating conversation:", err);
        }
      };
      createConversation();
    }
  }, [conversations, searchParams]);

  // Populate edit fields
  useEffect(() => {
    if (selectedConversation) {
      setEditName(selectedConversation.contact.name || "");
      setEditEmail(selectedConversation.contact.email || "");
      setIsEditingContact(false);
    }
  }, [selectedConversationId]);

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
      toast.success("Nota salva!");
    } catch { toast.error("Erro ao salvar nota"); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedConversation) return;
    try {
      await deleteNote.mutateAsync({ noteId, contactId: selectedConversation.contact_id });
      toast.success("Nota excluída!");
    } catch { toast.error("Erro ao excluir nota"); }
  };

  const handleSaveContact = async () => {
    if (!selectedConversation) return;
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ name: editName.trim(), email: editEmail.trim() || null })
        .eq("id", selectedConversation.contact_id);
      if (error) throw error;
      setIsEditingContact(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Contato atualizado!");
    } catch { toast.error("Erro ao atualizar contato"); }
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

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const sendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingTime(0);

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      setAttachedFile(file);

      // Auto-send after setting the file
      if (!selectedConversation || !companyId) return;
      setIsUploading(true);
      try {
        const filePath = `${companyId}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

        setAttachedFile(null);

        sendMessage.mutate({
          conversationId: selectedConversation.id,
          contactId: selectedConversation.contact_id,
          content: "", phone: selectedConversation.contact.phone || "",
          companyId, mediaType: "audio", mediaUrl: urlData.publicUrl, mimetype: "audio/webm",
        });
      } catch (err) {
        console.error("Upload audio error:", err);
        toast.error("Erro ao enviar áudio");
      }
      setIsUploading(false);
    };
    mediaRecorderRef.current.stop();
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !attachedFile) || !selectedConversation || !companyId) return;

    const textContent = messageInput.trim();
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimetype: string | undefined;

    if (attachedFile) {
      setIsUploading(true);
      try {
        const fileExt = attachedFile.name.split(".").pop();
        const filePath = `${companyId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(filePath, attachedFile);
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

    // Optimistic message
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: selectedConversation.id,
      contact_id: selectedConversation.contact_id,
      user_id: "",
      channel: "whatsapp",
      direction: "outbound",
      content: textContent || "",
      message_type: mediaType || "text",
      status: "sending",
      created_at: new Date().toISOString(),
      metadata: mediaUrl ? { media_url: mediaUrl, mimetype: mimetype || null } : null,
    };
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    setMessageInput("");
    removeAttachment();

    // Send in background — no toast on success, only on failure
    sendMessage.mutate(
      {
        conversationId: selectedConversation.id,
        contactId: selectedConversation.contact_id,
        content: textContent,
        phone: selectedConversation.contact.phone || "",
        companyId,
        mediaType, mediaUrl, mimetype,
      },
      {
        onError: () => {
          // Mark optimistic message as failed
          setOptimisticMessages(prev =>
            prev.map(m => m.id === optimisticId ? { ...m, status: "failed" } : m)
          );
        },
      }
    );
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

  // Group messages by date
  const groupedMessages = (() => {
    if (!allMessages || allMessages.length === 0) return [];
    const groups: { date: string; msgs: Message[] }[] = [];
    let currentDate = "";
    for (const msg of allMessages) {
      const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, msgs: [msg] });
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    }
    return groups;
  })();

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ─── Col 1: Conversations ─── */}
        <div className="w-[340px] border-r border-border flex flex-col bg-card shrink-0">
          <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
            <h1 className="text-lg font-bold text-foreground">Conversas</h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {conversations?.length || 0}
            </Badge>
          </div>

          <div className="px-3 py-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar ou começar nova conversa"
                className="pl-10 h-9 bg-secondary border-0 text-sm rounded-lg"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                Nenhuma conversa
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem key={conv.id} conv={conv}
                  isSelected={selectedConversationId === conv.id}
                  onSelect={() => setSelectedConversationId(conv.id)} />
              ))
            )}
          </div>
        </div>

        {/* ─── Col 2: Chat ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-chat-bg">
          {selectedConversation ? (
            <>
              <div className="h-16 px-5 flex items-center gap-3 bg-card border-b border-border shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {selectedConversation.contact.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {selectedConversation.contact.name}
                  </h3>
                  <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedConversation.contact.phone || "Sem telefone"}
                  </p>
                </div>
                <Badge variant={selectedConversation.status === "open" ? "default" : "secondary"} className="text-[11px]">
                  {selectedConversation.status === "open" ? "Aberto" : selectedConversation.status === "closed" ? "Fechado" : selectedConversation.status}
                </Badge>
              </div>

              {/* Messages */}
              <div ref={chatContainerRef} onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto relative"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                <div className="py-4 space-y-1">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    groupedMessages.map((group, gi) => (
                      <div key={gi}>
                        <DateSeparator date={group.date} />
                        <div className="space-y-1">
                          {group.msgs.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {showScrollBtn && (
                  <button onClick={scrollToBottom}
                    className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-card shadow-md border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Input */}
              <div className="bg-card border-t border-border px-4 py-3 shrink-0">
                {attachedFile && !isRecording && (
                  <div className="flex items-center gap-2 mb-2 p-2.5 bg-secondary rounded-lg">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{attachedFile.name}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={removeAttachment}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  onChange={handleFileSelect} />

                {isRecording ? (
                  <div className="flex items-center gap-3">
                    <Button type="button" size="icon" variant="ghost"
                      className="h-10 w-10 rounded-full shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={cancelRecording}>
                      <X className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 flex items-center gap-3 px-3 h-11 rounded-xl bg-secondary">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
                      <span className="text-sm font-mono font-medium text-foreground">{formatRecordingTime(recordingTime)}</span>
                      <div className="flex-1">
                        <Progress value={(recordingTime % 60) / 60 * 100} className="h-1.5" />
                      </div>
                    </div>
                    <Button size="icon" onClick={sendRecording}
                      className="h-11 w-11 rounded-full shrink-0">
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="ghost"
                      className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <div className="relative flex-1">
                      <Input placeholder="Digite uma mensagem" value={messageInput}
                        className="h-11 rounded-xl bg-secondary border-0 pr-12 text-sm"
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                        }} />
                      <Button type="button" size="icon" variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}>
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                    {messageInput.trim() || attachedFile ? (
                      <Button size="icon" onClick={handleSendMessage}
                        className="h-11 w-11 rounded-full shrink-0"
                        disabled={isUploading}>
                        {isUploading
                          ? <Loader2 className="h-5 w-5 animate-spin" />
                          : <Send className="h-5 w-5" />}
                      </Button>
                    ) : (
                      <Button size="icon" onClick={startRecording}
                        className="h-11 w-11 rounded-full shrink-0"
                        variant="ghost">
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}

                {showQuickReplies && quickReplies && quickReplies.length > 0 && (
                  <div className="absolute bottom-20 left-4 right-4 bg-card border border-border rounded-xl shadow-lg p-2 z-50 max-h-56 overflow-y-auto">
                    {quickReplies.map((reply) => (
                      <div key={reply.id} onClick={() => insertQuickReply(reply.text)}
                        className="p-3 hover:bg-secondary cursor-pointer rounded-lg transition-colors">
                        <div className="flex items-center gap-2 mb-0.5">
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
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
                <MessageSquare className="h-10 w-10 opacity-30" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">Inbox</h3>
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Col 3: Contact CRM ─── */}
        {selectedConversation && (
          <div className="w-[300px] border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
            <Tabs defaultValue="details" className="flex flex-col flex-1 overflow-hidden">
              <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
                <TabsList className="h-8 bg-secondary/60">
                  <TabsTrigger value="details" className="text-xs h-7 px-3">Detalhes</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs h-7 px-3">Arquivos</TabsTrigger>
                </TabsList>
                <Button size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => {
                    if (isEditingContact) {
                      handleSaveContact();
                    } else {
                      setEditName(selectedConversation.contact.name || "");
                      setEditEmail(selectedConversation.contact.email || "");
                      setIsEditingContact(true);
                    }
                  }}>
                  {isEditingContact ? <Save className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <TabsContent value="details" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-5">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={selectedConversation.contact.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {selectedConversation.contact.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isEditingContact ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="text-center h-8 text-sm font-bold" placeholder="Nome" />
                      ) : (
                        <h3 className="font-bold text-foreground">{selectedConversation.contact.name}</h3>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.contact.phone || "—"}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs">Telefone</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-foreground">
                            {selectedConversation.contact.phone || "—"}
                          </span>
                          {selectedConversation.contact.phone && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyPhone}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs">Email</Label>
                        {isEditingContact ? (
                          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                            className="h-7 text-xs w-40 text-right" placeholder="email@exemplo.com" />
                        ) : (
                          <span className="text-xs font-medium text-foreground">
                            {selectedConversation.contact.email || "—"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs">Canal</Label>
                        <span className="text-xs font-medium text-foreground capitalize">
                          {selectedConversation.channel}
                        </span>
                      </div>
                    </div>

                    {isEditingContact && (
                      <div className="flex gap-2">
                        <Button onClick={handleSaveContact} className="flex-1 h-8 text-xs" size="sm">
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button onClick={() => setIsEditingContact(false)} variant="outline" className="flex-1 h-8 text-xs" size="sm">
                          Cancelar
                        </Button>
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
                                <ImageIcon className="h-3 w-3" /> Imagens ({images.length})
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
