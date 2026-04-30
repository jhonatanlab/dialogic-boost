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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Send, Phone, Copy, Edit, MessageSquare, Zap, Paperclip,
  X, Loader2, FileText, ChevronDown, Save, Plus, Tag, Image as ImageIcon, Download, Film, Mic, Square,
  ImageOff, UserCheck, CheckCircle2, ArrowRightLeft, Users, User, Inbox as InboxIcon, History, PlayCircle,
  XCircle, ArrowRight, Clock, Brain,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { useMessages, Message } from "@/hooks/useMessages";
import { useCompany } from "@/hooks/useCompany";
import { useTags, useCreateTag, useAddTagToContact, useRemoveTagFromContact } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NewConversationDialog } from "@/components/inbox/NewConversationDialog";
import { AiSummaryCard } from "@/components/contacts/AiSummaryCard";
import { ForceAutomationCard } from "@/components/contacts/ForceAutomationCard";

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
            <p className="text-sm font-medium truncate">{(message.metadata as Record<string, unknown>)?.file_name as string || "Documento"}</p>
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
const ChatBubble = ({ message, agentName }: { message: Message; agentName?: string }) => {
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
            {rawContent.split(/(\*[^*]+\*)/).map((part, i) => {
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                return <strong key={i}>{part.slice(1, -1)}</strong>;
              }
              return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
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

/* ─── Channel Icon ─── */
const ChannelIcon = ({ channel }: { channel: string }) => {
  const ch = channel?.toLowerCase() || "whatsapp";
  if (ch === "whatsapp") return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  );
  if (ch === "instagram") return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="#E4405F"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  );
  if (ch === "facebook" || ch === "messenger") return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  );
  if (ch === "telegram") return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
  );
  return <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
};

/* ─── Conversation List Item ─── */
const ConversationItem = ({
  conv, isSelected, onSelect,
}: {
  conv: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const lm = conv.last_message;
  const isMediaMsg = lm?.message_type && lm.message_type !== "text";
  const preview = isMediaMsg
    ? `${getPreviewIcon(lm?.message_type || "document")} ${(lm?.message_type || "mídia").charAt(0).toUpperCase() + (lm?.message_type || "mídia").slice(1)}`
    : lm?.content?.trim() || "Sem mensagens";

  const tags = conv.contact_tags || [];

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
          <div className="flex items-center gap-1.5 min-w-0">
            <ChannelIcon channel={conv.channel} />
            <span className="font-semibold text-sm text-foreground truncate">{conv.contact.name}</span>
          </div>
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

        {/* Tags + Assigned agent */}
        {(tags.length > 0 || conv.assigned_agent_name) && (
          <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
            {tags.slice(0, 3).map(tag => (
              <span key={tag.id} className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} title={tag.name} />
            ))}
            {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
            {conv.assigned_agent_name && (
              <span className="text-[10px] text-muted-foreground truncate ml-1">
                👤 {conv.assigned_agent_name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Event Bubble (system message in chat) ─── */
const EventBubble = ({ event }: { event: any }) => {
  const getEventInfo = () => {
    switch (event.event_type) {
      case "started":
        return { icon: PlayCircle, text: `${event.actor_name} iniciou o atendimento`, color: "text-primary" };
      case "reopened":
        return { icon: PlayCircle, text: `${event.actor_name} reabriu a conversa`, color: "text-primary" };
      case "closed":
        return { icon: XCircle, text: `${event.actor_name} concluiu a conversa`, color: "text-destructive" };
      case "ai_summary":
        return { icon: Brain, text: "Resumo IA salvo no histórico", color: "text-primary" };
      case "transferred_agent":
        return { icon: ArrowRight, text: `${event.actor_name} transferiu para ${event.target_name || "atendente"}`, color: "text-muted-foreground" };
      case "transferred_team":
        return { icon: Users, text: `${event.actor_name} transferiu para equipe ${event.target_team_name || ""}`, color: "text-muted-foreground" };
      default:
        return { icon: Clock, text: event.event_type, color: "text-muted-foreground" };
    }
  };
  const { icon: Icon, text, color } = getEventInfo();
  return (
    <div className="flex items-center justify-center py-2 px-4">
      <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-border/50">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{text}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-1">
          {format(new Date(event.created_at), "HH:mm")}
        </span>
      </div>
    </div>
  );
};

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

  // Filter & queue state
  const [activeFilter, setActiveFilter] = useState<"mine" | "in_service" | "queue" | "closed">("mine");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [connectedChannels, setConnectedChannels] = useState<string[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferType, setTransferType] = useState<"agent" | "team">("agent");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("agent");
  const [companyAgents, setCompanyAgents] = useState<{ user_id: string; full_name: string }[]>([]);
  const [companyTeams, setCompanyTeams] = useState<{ id: string; name: string }[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  const { companyId } = useCompany();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, isLoading: messagesLoading, sendMessage, markAsRead, agentNames } = useMessages(selectedConversationId);
  const { quickReplies } = useQuickReplies();

  // Helper: POST to outbound endpoint (silent on failure or if not configured)
  const postToOutbound = useCallback(async (payload: Record<string, unknown>) => {
    try {
      if (!companyId) return;
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .eq("company_id", companyId)
        .in("setting_key", ["n8n_automation_enabled", "n8n_automation_outbound"]);

      const enabled = settings?.find(s => s.setting_key === "n8n_automation_enabled")?.setting_value;
      const outbound = settings?.find(s => s.setting_key === "n8n_automation_outbound")?.setting_value;

      if (enabled !== "true" || !outbound) return;

      fetch(outbound, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(err => console.error("[postToOutbound] fetch error:", err));
    } catch (err) {
      console.error("[postToOutbound] silent error:", err);
    }
  }, [companyId]);

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
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Fetch current user info, agents, and teams
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id, full_name")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setCurrentUserRole(profile.role || "agent");
        setCurrentUserName(profile.full_name || "");

        // Fetch company agents (include current user too, for filter)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("company_id", profile.company_id);
        setCompanyAgents((profiles || []).filter(p => p.user_id !== user.id));

        // Fetch company teams
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name")
          .eq("company_id", profile.company_id);
        setCompanyTeams(teams || []);

        // Fetch connected channels (currently only WhatsApp via integrations)
        const { data: integ } = await supabase
          .from("whatsapp_integrations")
          .select("status")
          .eq("company_id", profile.company_id)
          .eq("status", "connected");
        setConnectedChannels(integ && integ.length > 0 ? ["whatsapp"] : []);
      }
    };
    fetchUserData();
  }, []);

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

  // Messages from DB, filtering out pending shells and stale optimistic duplicates
  const allMessages = (() => {
    const raw = (messages || []).filter(m => !isPendingShell(m));
    // Deduplicate: hide any temp row (app-xxx or no message_id) that has a real counterpart
    const reconciledIds = new Set<string>();
    for (const msg of raw) {
      const isTemp = msg.message_id?.startsWith("app-") || (!msg.message_id && (msg as any).client_message_id);
      if (!isTemp) continue;
      const hasReal = raw.some(r => {
        if (r.id === msg.id || !r.message_id || r.message_id.startsWith("app-") || r.direction !== msg.direction) return false;
        // For media: compare by media_url — no time window needed
        const rMedia = (r.metadata as Record<string, unknown>)?.media_url;
        const msgMedia = (msg.metadata as Record<string, unknown>)?.media_url;
        if (rMedia && msgMedia) return rMedia === msgMedia;
        // For text: use time window
        if (Math.abs(new Date(r.created_at).getTime() - new Date(msg.created_at).getTime()) >= 30000) return false;
        return r.content === msg.content;
      });
      if (hasReal) reconciledIds.add(msg.id);
    }
    return reconciledIds.size > 0 ? raw.filter(m => !reconciledIds.has(m.id)) : raw;
  })();

  // Auto-scroll only when user is already near bottom
  const isNearBottomRef = useRef(true);
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
    isNearBottomRef.current = distanceFromBottom < 150;
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
      const preferredMime = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" : "audio/webm;codecs=opus";
      const mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMime });
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

      const blob = new Blob(audioChunksRef.current, { type: "audio/ogg;codecs=opus" });
      const file = new File([blob], `audio-${Date.now()}.ogg`, { type: "audio/ogg" });
      setAttachedFile(file);

      // Auto-send after setting the file
      if (!selectedConversation || !companyId) return;
      setIsUploading(true);
      try {
        const filePath = `${companyId}/${Date.now()}.ogg`;
        const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

        setAttachedFile(null);

        sendMessage.mutate({
          conversationId: selectedConversation.id,
          contactId: selectedConversation.contact_id,
          content: "", phone: selectedConversation.contact.phone || "",
          companyId, mediaType: "audio", mediaUrl: urlData.publicUrl,
          mimetype: "audio/ogg; codecs=opus", ptt: true,
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

    const rawText = messageInput.trim();
    // Prefix text content with agent name for WhatsApp bold formatting
    const textContent = rawText && currentUserName ? `*${currentUserName}:*\n${rawText}` : rawText;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimetype: string | undefined;

    if (attachedFile) {
      setIsUploading(true);
      try {
        const sanitizedName = attachedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${companyId}/${Date.now()}_${sanitizedName}`;
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

    setMessageInput("");
    removeAttachment();

    // Generate internal_id for reconciliation
    const msgInternalId = `app-${crypto.randomUUID()}`;

    // Message is saved to DB inside sendMessage (useMessages hook)
    sendMessage.mutate({
      conversationId: selectedConversation.id,
      contactId: selectedConversation.contact_id,
      content: textContent,
      phone: selectedConversation.contact.phone || "",
      companyId,
      mediaType, mediaUrl, mimetype,
      fileName: attachedFile ? attachedFile.name : undefined,
      internalId: msgInternalId,
    });

  };

  const insertQuickReply = (text: string) => {
    const contact = selectedConversation?.contact;
    const resolved = text
      .replace(/\{nome\}/gi, contact?.name || "")
      .replace(/\{telefone\}/gi, contact?.phone || "")
      .replace(/\{email\}/gi, contact?.email || "")
      .replace(/\{atendente\}/gi, currentUserName || "");
    setMessageInput(resolved);
    setShowQuickReplies(false);
  };

  // Helper to log conversation events (non-blocking, never throws)
  const logConversationEvent = async (
    conversationId: string,
    eventType: string,
    extras?: { target_user_id?: string; target_name?: string; target_team_id?: string; target_team_name?: string; details?: Record<string, unknown> }
  ) => {
    try {
      if (!currentUserId || !companyId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", currentUserId)
        .single();

      const { error } = await (supabase as any).from("conversation_events").insert({
        conversation_id: conversationId,
        company_id: companyId,
        event_type: eventType,
        actor_user_id: currentUserId,
        actor_name: profile?.full_name || "Atendente",
        ...(extras || {}),
      });
      if (error) console.error("Error logging conversation event:", error);
      queryClient.invalidateQueries({ queryKey: ["conversation-events", conversationId] });
    } catch (err) {
      console.error("Error in logConversationEvent:", err);
    }
  };

  // Take conversation (assign to current user)
  const handleTakeConversation = async () => {
    if (!selectedConversation || !currentUserId) return;
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to: currentUserId, status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      if (error) { console.error("Take error:", error); throw error; }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa atribuída a você!");
      logConversationEvent(selectedConversation.id, "started");
      // Notify automation to pause AI
      postToOutbound({
        action: "pause_ai",
        phone_number: selectedConversation.contact.phone || "",
        company_id: companyId,
        contact_id: selectedConversation.contact_id,
        type: "control",
      });
    } catch { toast.error("Erro ao assumir conversa"); }
  };

  // Close conversation
  const handleCloseConversation = async () => {
    if (!selectedConversation) return;
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status: "closed", updated_at: new Date().toISOString(), restarted_at: new Date().toISOString() } as any)
        .eq("id", selectedConversation.id);
      if (error) { console.error("Close error:", error); throw error; }

      // Fetch AI summary and save it as a conversation event, then delete it
      const contactId = selectedConversation.contact_id;
      const { data: aiSummary } = await supabase
        .from("contact_ai_summaries")
        .select("summary")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (aiSummary?.summary) {
        await logConversationEvent(selectedConversation.id, "ai_summary", {
          details: { summary: aiSummary.summary },
        });
        await supabase
          .from("contact_ai_summaries")
          .delete()
          .eq("contact_id", contactId);
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa concluída!");
      logConversationEvent(selectedConversation.id, "closed");
      // Notify automation to reactivate AI
      postToOutbound({
        action: "reactivate_ai",
        phone_number: selectedConversation.contact.phone || "",
        company_id: companyId,
        contact_id: selectedConversation.contact_id,
        type: "control",
      });
      setSelectedConversationId(null);
    } catch { toast.error("Erro ao concluir conversa"); }
  };

  // Transfer conversation
  const handleTransfer = async () => {
    if (!selectedConversation || !transferTargetId) return;
    try {
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      let eventExtras: Record<string, unknown> = {};
      if (transferType === "agent") {
        updatePayload.assigned_to = transferTargetId;
        updatePayload.status = "in_progress";
        const agent = companyAgents.find(a => a.user_id === transferTargetId);
        eventExtras = { target_user_id: transferTargetId, target_name: agent?.full_name || "Atendente" };
      } else {
        updatePayload.assigned_team = transferTargetId;
        const team = companyTeams.find(t => t.id === transferTargetId);
        eventExtras = { target_team_id: transferTargetId, target_team_name: team?.name || "Equipe" };
      }
      const { error } = await supabase
        .from("conversations")
        .update(updatePayload)
        .eq("id", selectedConversation.id);
      if (error) throw error;
      await logConversationEvent(
        selectedConversation.id,
        transferType === "agent" ? "transferred_agent" : "transferred_team",
        eventExtras as any
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setShowTransferDialog(false);
      setTransferTargetId("");
      toast.success(transferType === "agent" ? "Transferido para atendente!" : "Transferido para equipe!");
    } catch { toast.error("Erro ao transferir conversa"); }
  };

  // Filter conversations based on active tab
  const isManagerOrAdmin = currentUserRole === "admin" || currentUserRole === "manager";

  const filteredConversations = (() => {
    let filtered = conversations || [];

    // Apply filter tab
    switch (activeFilter) {
      case "mine":
        filtered = filtered.filter(c => c.assigned_to === currentUserId && c.status !== "closed");
        break;
      case "in_service":
        filtered = filtered.filter(c => !!c.assigned_to && c.status !== "closed");
        break;
      case "queue":
        filtered = filtered.filter(c => !c.assigned_to && c.status === "open");
        break;
      case "closed":
        filtered = filtered.filter(c => c.status === "closed");
        break;
    }

    // Filter by team
    if (teamFilter !== "all") {
      filtered = filtered.filter(c => c.assigned_team === teamFilter);
    }

    // Filter by agent (managers/admin only)
    if (isManagerOrAdmin && agentFilter !== "all") {
      filtered = filtered.filter(c =>
        agentFilter === "unassigned" ? !c.assigned_to : c.assigned_to === agentFilter
      );
    }

    // Filter by channel
    if (channelFilter !== "all") {
      filtered = filtered.filter(c => c.channel === channelFilter);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(conv =>
        conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contact.phone?.includes(searchQuery)
      );
    }

    return filtered;
  })();

  // Conversation events query
  const [conversationEvents, setConversationEvents] = useState<any[]>([]);
  useEffect(() => {
    if (!selectedConversationId) { setConversationEvents([]); return; }
    const fetchEvents = async () => {
      const { data } = await (supabase as any)
        .from("conversation_events")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });
      setConversationEvents(data || []);
    };
    fetchEvents();

    const channel = supabase
      .channel(`conv-events-${selectedConversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "conversation_events",
        filter: `conversation_id=eq.${selectedConversationId}`,
      }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversationId]);

  // Check if current user can send messages (must be assigned to them)
  const canSendMessages = selectedConversation?.assigned_to === currentUserId && selectedConversation?.status !== "closed";
  const showInitButton = selectedConversation && (
    selectedConversation.assigned_to !== currentUserId || selectedConversation.status === "closed"
  );

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
    <DashboardLayout noPadding>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ─── Col 1: Conversations ─── */}
        <div className="w-[340px] border-r border-border flex flex-col bg-card shrink-0">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
            <h1 className="text-lg font-bold text-foreground">Conversas</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewConversation(true)}>
                <Plus className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="font-semibold text-xs">
                {filteredConversations.length}
              </Badge>
            </div>
          </div>

          <NewConversationDialog
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
            onConversationCreated={(id) => setSelectedConversationId(id)}
          />

          {/* Filter tabs */}
          <div className="flex border-b border-border/50 bg-card">
            <button onClick={() => setActiveFilter("queue")}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                activeFilter === "queue" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <InboxIcon className="h-3 w-3 mx-auto mb-0.5" />
              Fila
            </button>
            <button onClick={() => setActiveFilter("mine")}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                activeFilter === "mine" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <User className="h-3 w-3 mx-auto mb-0.5" />
              Minhas
            </button>
            {isManagerOrAdmin && (
              <button onClick={() => setActiveFilter("in_service")}
                className={`flex-1 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                  activeFilter === "in_service" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <UserCheck className="h-3 w-3 mx-auto mb-0.5" />
                Atendimento
              </button>
            )}
            <button onClick={() => setActiveFilter("closed")}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                activeFilter === "closed" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <CheckCircle2 className="h-3 w-3 mx-auto mb-0.5" />
              Concluídas
            </button>
          </div>

          <div className="px-3 py-2 border-b border-border/50 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar conversa..."
                className="pl-10 h-9 bg-secondary border-0 text-sm rounded-lg"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Team filter */}
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px] bg-secondary border-0">
                  <SelectValue placeholder="Equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {companyTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Agent filter (managers/admin only) */}
              {isManagerOrAdmin && (
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px] bg-secondary border-0">
                    <SelectValue placeholder="Atendente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os atendentes</SelectItem>
                    <SelectItem value="unassigned">Sem atribuição</SelectItem>
                    {currentUserId && (
                      <SelectItem value={currentUserId}>{currentUserName || "Eu"} (eu)</SelectItem>
                    )}
                    {companyAgents.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "Atendente"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Channel filter (only connected channels) */}
              {connectedChannels.length > 0 && (
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px] bg-secondary border-0">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os canais</SelectItem>
                    {connectedChannels.map(ch => (
                      <SelectItem key={ch} value={ch}>
                        {ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                <div className="flex items-center gap-1.5">
                  {/* Transfer button */}
                  {selectedConversation.status !== "closed" && selectedConversation.assigned_to === currentUserId && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowTransferDialog(true)}>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Transferir
                    </Button>
                  )}
                  {/* Close conversation button */}
                  {selectedConversation.status !== "closed" && selectedConversation.assigned_to === currentUserId && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={handleCloseConversation}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluir
                    </Button>
                  )}
                  <Badge variant={selectedConversation.status === "open" ? "default" : selectedConversation.status === "in_progress" ? "secondary" : "outline"} className="text-[11px]">
                    {selectedConversation.status === "open" ? "Na fila" : selectedConversation.status === "in_progress" ? "Em atendimento" : selectedConversation.status === "closed" ? "Concluído" : selectedConversation.status}
                  </Badge>
                </div>
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
                    (() => {
                      // Merge all messages and events into a single timeline
                      type TimelineItem = { type: "message"; data: Message; timestamp: string } | { type: "event"; data: any; timestamp: string };
                      const timeline: TimelineItem[] = [];

                      // Add all messages
                      for (const group of groupedMessages) {
                        for (const msg of group.msgs) {
                          timeline.push({ type: "message", data: msg, timestamp: (msg as any).sent_at || msg.created_at });
                        }
                      }

                      // Add all events
                      for (const ev of conversationEvents) {
                        timeline.push({ type: "event", data: ev, timestamp: ev.created_at });
                      }

                      // Sort by timestamp ascending
                      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                      // Group by date for date separators
                      let lastDate = "";
                      return timeline.map((item, i) => {
                        const itemDate = format(new Date(item.timestamp), "yyyy-MM-dd");
                        const showSeparator = itemDate !== lastDate;
                        lastDate = itemDate;
                        return (
                          <div key={item.type === "message" ? `msg-${item.data.id}` : `ev-${item.data.id}`}>
                            {showSeparator && <DateSeparator date={item.timestamp} />}
                            {item.type === "event" ? (
                              <EventBubble event={item.data} />
                            ) : (
                              <div className="space-y-1">
                                <ChatBubble message={item.data} agentName={agentNames[item.data.user_id]} />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
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

              {/* Input area or Iniciar button */}
              <div className="bg-card border-t border-border px-4 py-3 shrink-0">
                {showInitButton ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    {selectedConversation.status === "closed" ? (
                      <p className="text-xs text-muted-foreground">Conversa concluída. Clique para reabrir e iniciar atendimento.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Clique para iniciar o atendimento desta conversa</p>
                    )}
                    <Button onClick={async () => {
                      if (!selectedConversation || !currentUserId) return;
                      try {
                        const { error } = await supabase
                          .from("conversations")
                          .update({ assigned_to: currentUserId, status: "in_progress", updated_at: new Date().toISOString() })
                          .eq("id", selectedConversation.id);
                        if (error) {
                          console.error("Error updating conversation:", error);
                          throw error;
                        }
                        queryClient.invalidateQueries({ queryKey: ["conversations"] });
                        toast.success("Conversa atribuída a você!");
                        // Log event in background (non-blocking)
                        logConversationEvent(selectedConversation.id, selectedConversation.status === "closed" ? "reopened" : "started");
                        // Notify automation to pause AI
                        postToOutbound({
                          action: "pause_ai",
                          phone_number: selectedConversation.contact.phone || "",
                          company_id: companyId,
                          contact_id: selectedConversation.contact_id,
                          type: "control",
                        });
                      } catch (err) {
                        console.error("Take conversation error:", err);
                        toast.error("Erro ao assumir conversa");
                      }
                    }} className="gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Iniciar Atendimento
                    </Button>
                  </div>
                ) : (
                  <>
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
                          <Textarea placeholder="Digite uma mensagem" value={messageInput}
                            className="min-h-[44px] max-h-[120px] rounded-xl bg-secondary border-0 pr-12 text-sm resize-none py-3"
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                            }}
                            rows={1} />
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
                  </>
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
                  <TabsTrigger value="details" className="text-xs h-7 px-2">Detalhes</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs h-7 px-2">Arquivos</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs h-7 px-2">Histórico</TabsTrigger>
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
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> Atendente
                        </Label>
                        <span className="text-xs font-medium text-foreground">
                          {selectedConversation.assigned_to === currentUserId
                            ? "Você"
                            : selectedConversation.assigned_agent_name || "Não atribuído"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <Users className="h-3 w-3" /> Equipe
                        </Label>
                        <span className="text-xs font-medium text-foreground">
                          {selectedConversation.assigned_team_name || "Nenhuma"}
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

                    {/* Resumo IA */}
                    <AiSummaryCard contactId={selectedConversation?.contact_id} />

                    <Separator />

                    {/* Forçar Automação */}
                    <ForceAutomationCard
                      conversationId={selectedConversation?.id}
                      contactId={selectedConversation?.contact_id}
                      companyId={selectedConversation?.company_id ?? undefined}
                    />

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

                      const resolveFileName = (msg: Message, fallback: string): string => {
                        const meta = msg.metadata as Record<string, unknown> | null;
                        if (meta?.file_name && typeof meta.file_name === "string") return meta.file_name;
                        const url = getMediaUrl(msg);
                        if (url) {
                          try {
                            const pathname = new URL(url).pathname;
                            const parts = pathname.split("/");
                            const last = parts[parts.length - 1];
                            // Remove timestamp prefix (e.g. "1711475123456_report.pdf" → "report.pdf")
                            const cleaned = last.replace(/^\d+_/, "");
                            if (cleaned && cleaned !== last && cleaned.includes(".")) return decodeURIComponent(cleaned);
                            if (last.includes(".")) return decodeURIComponent(last);
                          } catch { /* ignore */ }
                        }
                        return fallback;
                      };

                      const FileItem = ({ msg, icon: Icon, fallbackLabel }: { msg: Message; icon: any; fallbackLabel: string }) => {
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
                                {videos.map(msg => <FileItem key={msg.id} msg={msg} icon={Film} fallbackLabel="Vídeo" />)}
                              </div>
                            </div>
                          )}
                          {audios.length > 0 && (
                            <div>
                              <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                                <Mic className="h-3 w-3" /> Áudios ({audios.length})
                              </Label>
                              <div className="space-y-1.5">
                                {audios.map(msg => <FileItem key={msg.id} msg={msg} icon={Mic} fallbackLabel="Áudio" />)}
                              </div>
                            </div>
                          )}
                          {docs.length > 0 && (
                            <div>
                              <Label className="text-muted-foreground text-xs mb-2 block flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Documentos ({docs.length})
                              </Label>
                              <div className="space-y-1.5">
                                {docs.map(msg => <FileItem key={msg.id} msg={msg} icon={FileText} fallbackLabel="Documento" />)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {conversationEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <History className="h-8 w-8 opacity-30 mb-2" />
                        <p className="text-xs">Nenhum evento registrado</p>
                      </div>
                    ) : (
                      conversationEvents.map((ev: any) => {
                        const getIcon = () => {
                          switch (ev.event_type) {
                            case "started": case "reopened": return PlayCircle;
                            case "closed": return XCircle;
                            case "ai_summary": return Brain;
                            case "transferred_agent": return ArrowRight;
                            case "transferred_team": return Users;
                            default: return Clock;
                          }
                        };
                        const getLabel = () => {
                          switch (ev.event_type) {
                            case "started": return "Conversa iniciada";
                            case "reopened": return "Conversa reaberta";
                            case "closed": return "Conversa concluída";
                            case "ai_summary": return "Resumo IA";
                            case "transferred_agent": return "Transferido para atendente";
                            case "transferred_team": return "Transferido para equipe";
                            default: return ev.event_type;
                          }
                        };
                        const Icon = getIcon();
                        return (
                          <div key={ev.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{getLabel()}</p>
                              {ev.event_type === "ai_summary" && ev.details?.summary ? (
                                <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-1">{ev.details.summary}</p>
                              ) : (
                                <>
                                  <p className="text-[11px] text-muted-foreground">Por: {ev.actor_name}</p>
                                  {ev.target_name && (
                                    <p className="text-[11px] text-muted-foreground">Para: {ev.target_name}</p>
                                  )}
                                  {ev.target_team_name && (
                                    <p className="text-[11px] text-muted-foreground">Equipe: {ev.target_team_name}</p>
                                  )}
                                </>
                              )}
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {format(new Date(ev.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button variant={transferType === "agent" ? "default" : "outline"}
                className="flex-1 h-9 text-xs" size="sm"
                onClick={() => { setTransferType("agent"); setTransferTargetId(""); }}>
                <User className="h-3.5 w-3.5 mr-1" /> Atendente
              </Button>
              <Button variant={transferType === "team" ? "default" : "outline"}
                className="flex-1 h-9 text-xs" size="sm"
                onClick={() => { setTransferType("team"); setTransferTargetId(""); }}>
                <Users className="h-3.5 w-3.5 mr-1" /> Equipe
              </Button>
            </div>
            <Select value={transferTargetId} onValueChange={setTransferTargetId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder={transferType === "agent" ? "Selecione um atendente" : "Selecione uma equipe"} />
              </SelectTrigger>
              <SelectContent>
                {transferType === "agent"
                  ? companyAgents.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "Atendente"}</SelectItem>
                    ))
                  : companyTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={!transferTargetId}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inbox;
