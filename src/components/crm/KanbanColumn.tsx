import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import type { CrmStage } from "@/hooks/useCrmStages";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: CrmStage;
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
}

export function KanbanColumn({ stage, leads, onOpenLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "stage", stage } });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="truncate text-sm font-semibold">{stage.name}</span>
        </div>
        <span className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 p-2 transition-colors",
          isOver && "bg-primary/5"
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Arraste leads para cá
          </p>
        )}
      </div>
    </div>
  );
}
