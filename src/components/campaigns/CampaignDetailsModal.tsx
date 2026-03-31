import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send,
  CheckCheck,
  Eye,
  MessageSquareReply,
  Clock,
  Users,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import type { CampaignWithStats } from "@/hooks/useCampaigns";

interface CampaignContact {
  id: string;
  contact_id: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  contact_name?: string;
  contact_phone?: string;
}

interface CampaignDetailsModalProps {
  campaign: CampaignWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  scheduled: "bg-blue-500",
  sending: "bg-yellow-500",
  sent: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  cancelled: "Cancelada",
};

const contactStatusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  failed: "Falhou",
  replied: "Respondeu",
};

const contactStatusColors: Record<string, string> = {
  pending: "text-muted-foreground",
  sent: "text-blue-500",
  delivered: "text-green-500",
  read: "text-emerald-500",
  failed: "text-destructive",
  replied: "text-primary",
};

export function CampaignDetailsModal({
  campaign,
  open,
  onOpenChange,
}: CampaignDetailsModalProps) {
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaign || !open) return;

    const fetchContacts = async () => {
      setLoading(true);
      const { data: campaignContacts } = await supabase
        .from("campaign_contacts")
        .select("id, contact_id, status, sent_at, error_message")
        .eq("campaign_id", campaign.id);

      if (campaignContacts && campaignContacts.length > 0) {
        const contactIds = campaignContacts.map((c) => c.contact_id);
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("id, name, phone")
          .in("id", contactIds);

        const contactsMap = new Map(
          (contactsData || []).map((c) => [c.id, c])
        );

        setContacts(
          campaignContacts.map((cc) => {
            const contact = contactsMap.get(cc.contact_id);
            return {
              ...cc,
              contact_name: contact?.name || "Desconhecido",
              contact_phone: contact?.phone || "-",
            };
          })
        );
      } else {
        setContacts([]);
      }
      setLoading(false);
    };

    fetchContacts();
  }, [campaign, open]);

  if (!campaign) return null;

  const total = contacts.length || campaign.total_contacts;
  const sentCount = contacts.filter(
    (c) => c.status === "sent" || c.status === "delivered" || c.status === "read" || c.status === "replied"
  ).length;
  const deliveredCount = contacts.filter(
    (c) => c.status === "delivered" || c.status === "read" || c.status === "replied"
  ).length;
  const readCount = contacts.filter(
    (c) => c.status === "read" || c.status === "replied"
  ).length;
  const repliedCount = contacts.filter((c) => c.status === "replied").length;
  const failedCount = contacts.filter((c) => c.status === "failed").length;
  const pendingCount = contacts.filter((c) => c.status === "pending").length;

  const progressPercent = total > 0 ? ((sentCount / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{campaign.name}</span>
            <Badge
              variant="secondary"
              className={statusColors[campaign.status] || "bg-gray-500"}
            >
              {statusLabels[campaign.status] || campaign.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Campaign Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Criada em:</span>
              <span className="font-medium">
                {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
            {campaign.scheduled_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Agendada para:</span>
                <span className="font-medium">
                  {format(
                    new Date(campaign.scheduled_at),
                    "dd/MM/yyyy HH:mm",
                    { locale: ptBR }
                  )}
                </span>
              </div>
            )}
            {campaign.sent_at && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Enviada em:</span>
                <span className="font-medium">
                  {format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Message preview */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Mensagem:</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
              {campaign.message}
            </div>
          </div>

          <Separator />

          {/* Stats Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <StatBox
              icon={<Users className="h-4 w-4" />}
              label="Total"
              value={total}
              color="text-foreground"
            />
            <StatBox
              icon={<Send className="h-4 w-4" />}
              label="Enviados"
              value={sentCount}
              color="text-blue-500"
            />
            <StatBox
              icon={<CheckCheck className="h-4 w-4" />}
              label="Entregues"
              value={deliveredCount}
              color="text-green-500"
            />
            <StatBox
              icon={<Eye className="h-4 w-4" />}
              label="Lidos"
              value={readCount}
              color="text-emerald-500"
            />
            <StatBox
              icon={<MessageSquareReply className="h-4 w-4" />}
              label="Respostas"
              value={repliedCount}
              color="text-primary"
            />
            <StatBox
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Falhas"
              value={failedCount}
              color="text-destructive"
            />
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso de envio</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <Separator />

          {/* Contacts list */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Destinatários ({total})
            </h4>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhum destinatário encontrado
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {contact.contact_name}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {contact.contact_phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          contactStatusColors[contact.status] ||
                          "text-muted-foreground"
                        }`}
                      >
                        {contactStatusLabels[contact.status] || contact.status}
                      </span>
                      {contact.sent_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(contact.sent_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {failedCount > 0 && (
              <div className="mt-2">
                <p className="text-xs text-destructive font-medium mb-1">
                  Erros ({failedCount}):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {contacts
                    .filter((c) => c.status === "failed" && c.error_message)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="text-xs bg-destructive/10 text-destructive rounded px-2 py-1"
                      >
                        <strong>{c.contact_name}:</strong> {c.error_message}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 border rounded-lg">
      <div className={color}>{icon}</div>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
