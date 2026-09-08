import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: CrmLead;
  onOpen: (lead: CrmLead) => void;
}

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function LeadCard({ lead, onOpen }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className={cn(
        "cursor-grab rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={lead.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{initials(lead.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium">{lead.name}</span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {lead.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((t) => (
            <Badge
              key={t.id}
              variant="secondary"
              style={{ backgroundColor: t.color }}
              className="text-[10px]"
            >
              {t.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
