import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Columns3, Plus, Search } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { LeadCard } from "@/components/crm/LeadCard";
import { LeadModal } from "@/components/crm/LeadModal";
import { StageManagerDialog } from "@/components/crm/StageManagerDialog";
import { useCrmStages } from "@/hooks/useCrmStages";
import { useCrmLeads, useMoveLead, useCreateLead, type CrmLead } from "@/hooks/useCrmLeads";

const CRM = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [dragging, setDragging] = useState<CrmLead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", email: "", stageId: "" });

  const { data: stages = [], isLoading: loadingStages } = useCrmStages();
  const { data: leads = [], isLoading: loadingLeads } = useCrmLeads(searchTerm);
  const moveLead = useMoveLead();
  const createLead = useCreateLead();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const leadsByStage = useMemo(() => {
    const map = new Map<string, CrmLead[]>();
    stages.forEach((s) => map.set(s.id, []));
    const fallback = stages[0]?.id;
    leads.forEach((lead) => {
      const key = lead.crm_stage_id && map.has(lead.crm_stage_id) ? lead.crm_stage_id : fallback;
      if (key) map.get(key)!.push(lead);
    });
    return map;
  }, [leads, stages]);

  const onDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as CrmLead | undefined;
    setDragging(lead ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const lead = active.data.current?.lead as CrmLead | undefined;
    if (!lead) return;

    const overData = over.data.current as any;
    const targetStageId =
      overData?.type === "stage" ? overData.stage.id : overData?.lead?.crm_stage_id;
    if (!targetStageId) return;

    const targetLeads = leadsByStage.get(targetStageId) ?? [];
    let position = targetLeads.length;
    if (overData?.type === "lead") {
      const index = targetLeads.findIndex((l) => l.id === overData.lead.id);
      if (index >= 0) position = index;
    }

    if (lead.crm_stage_id === targetStageId && lead.crm_position === position) return;
    moveLead.mutate({ leadId: lead.id, stageId: targetStageId, position });
  };

  const openLead = (lead: CrmLead) => {
    setActiveLead(lead);
    setIsModalOpen(true);
  };

  const currentLead = activeLead ? leads.find((l) => l.id === activeLead.id) ?? activeLead : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
            <p className="mt-2 text-muted-foreground">
              Acompanhe seus leads por etapa e arraste para mover no funil
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsStagesOpen(true)}>
              <Columns3 className="mr-2 h-4 w-4" />
              Etapas
            </Button>
            <Button
              onClick={() => {
                setNewLead({ name: "", phone: "", email: "", stageId: stages[0]?.id ?? "" });
                setIsNewOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loadingStages || loadingLeads ? (
          <p className="py-12 text-center text-muted-foreground">Carregando CRM...</p>
        ) : stages.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Nenhuma etapa configurada. Clique em "Etapas" para criar a primeira.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={leadsByStage.get(stage.id) ?? []}
                  onOpenLead={openLead}
                />
              ))}
            </div>
            <DragOverlay>
              {dragging && <LeadCard lead={dragging} onOpen={() => {}} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <LeadModal lead={currentLead} open={isModalOpen} onOpenChange={setIsModalOpen} />
      <StageManagerDialog open={isStagesOpen} onOpenChange={setIsStagesOpen} />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>
              Informe os dados básicos. Os demais campos ficam no cadastro do lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={newLead.phone}
                onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                value={newLead.email}
                onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                placeholder="joao@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select
                value={newLead.stageId}
                onValueChange={(v) => setNewLead((p) => ({ ...p, stageId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newLead.name.trim() || createLead.isPending}
              onClick={() =>
                createLead.mutate(
                  {
                    name: newLead.name.trim(),
                    phone: newLead.phone.trim() || null,
                    email: newLead.email.trim() || null,
                    crm_stage_id: newLead.stageId || null,
                    source: "crm_manual",
                  },
                  { onSuccess: () => setIsNewOpen(false) }
                )
              }
            >
              Criar lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CRM;
