import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeadFiles } from "./LeadFiles";
import { LeadConversation } from "./LeadConversation";
import { useCrmStages } from "@/hooks/useCrmStages";
import { useCompanyMembers, useUpdateLead, useMoveLead, type CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import { useContactNotes, useCreateContactNote } from "@/hooks/useContactNotes";
import { describeContactSource } from "@/lib/contactSource";

const NONE = "__none__";

interface Props {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = Record<string, string>;

const FIELDS = [
  "name",
  "phone",
  "phone_secondary",
  "email",
  "instagram",
  "referred_by",
  "cpf_cnpj",
  "rg_cnh",
  "birthday",
  "profession",
  "gender",
  "address_zip",
  "address_street",
  "address_number",
  "address_complement",
  "address_district",
  "address_city",
  "address_state",
  "owner_user_id",
  "pre_sales_user_id",
  "sales_user_id",
  "crm_stage_id",
] as const;

const toForm = (lead: CrmLead | null): FormState => {
  const state: FormState = {};
  FIELDS.forEach((f) => {
    const value = (lead as any)?.[f];
    state[f] = value == null ? "" : String(value);
  });
  return state;
};

export function LeadModal({ lead, open, onOpenChange }: Props) {
  const [form, setForm] = useState<FormState>(toForm(lead));
  const [note, setNote] = useState("");
  const { data: stages = [] } = useCrmStages();
  const { data: members = [] } = useCompanyMembers();
  const updateLead = useUpdateLead();
  const moveLead = useMoveLead();
  const { data: notes = [] } = useContactNotes(lead?.id);
  const createNote = useCreateContactNote();

  useEffect(() => {
    if (open) setForm(toForm(lead));
  }, [open, lead]);

  if (!lead) return null;

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = () => {
    const payload: any = { id: lead.id };
    FIELDS.forEach((f) => {
      payload[f] = form[f] === "" ? null : form[f];
    });
    updateLead.mutate(payload);
  };

  const memberSelect = (key: string, label: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={form[key] || NONE}
        onValueChange={(v) => set(key, v === NONE ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não definido</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.full_name || "Sem nome"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const textField = (key: string, label: string, placeholder?: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const source = describeContactSource(lead.source);

  const wonStage = stages.find((s) => s.is_won);
  const lostStage = stages.find((s) => s.is_lost);
  const openStage = stages.find((s) => !s.is_won && !s.is_lost);
  const currentStageId = form.crm_stage_id || lead.crm_stage_id || "";
  const status =
    wonStage && currentStageId === wonStage.id
      ? "won"
      : lostStage && currentStageId === lostStage.id
      ? "lost"
      : "open";

  const setStatus = (next: "open" | "won" | "lost") => {
    if (status === next) return;
    const target = next === "won" ? wonStage : next === "lost" ? lostStage : openStage;
    if (!target) return;
    set("crm_stage_id", target.id);
    moveLead.mutate(
      { leadId: lead.id, stageId: target.id, position: 0 },
      {
        onSuccess: () =>
          toast.success(
            next === "won"
              ? "Lead marcado como ganho"
              : next === "lost"
              ? "Lead marcado como perdido"
              : "Lead reaberto"
          ),
      }
    );
  };

  const statusButtons: {
    key: "open" | "won" | "lost";
    label: string;
    stage: typeof wonStage;
    activeClass: string;
  }[] = [
    {
      key: "open",
      label: "Aberto",
      stage: openStage,
      activeClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      key: "won",
      label: "Ganho",
      stage: wonStage,
      activeClass: "bg-emerald-600 text-white hover:bg-emerald-600/90",
    },
    {
      key: "lost",
      label: "Perdido",
      stage: lostStage,
      activeClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={lead.avatar_url ?? undefined} />
              <AvatarFallback>
                {lead.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate">{lead.name}</DialogTitle>
              <DialogDescription>
                {source.label} · criado em{" "}
                {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
            <TabsTrigger value="notas">Anotações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4 grid gap-4 sm:grid-cols-2">
            {textField("name", "Nome")}
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select
                value={form.crm_stage_id || NONE}
                onValueChange={(v) => set("crm_stage_id", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem etapa</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {textField("phone", "Telefone", "(11) 99999-9999")}
            {textField("phone_secondary", "Telefone secundário")}
            {textField("email", "E-mail", "cliente@exemplo.com")}
            {textField("instagram", "Instagram", "@cliente")}
            {memberSelect("owner_user_id", "Responsável")}
            {memberSelect("pre_sales_user_id", "Pré-vendedor")}
            {memberSelect("sales_user_id", "Vendedor")}
            {textField("referred_by", "Indicado por")}
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Input value={source.full} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de criação</Label>
              <Input
                value={format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                readOnly
                className="bg-muted"
              />
            </div>
          </TabsContent>

          <TabsContent value="documentos" className="mt-4 grid gap-4 sm:grid-cols-2">
            {textField("cpf_cnpj", "CPF / CNPJ")}
            {textField("rg_cnh", "RG / CNH")}
            {textField("birthday", "Data de nascimento", undefined, "date")}
            {textField("profession", "Profissão")}
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select
                value={form.gender || NONE}
                onValueChange={(v) => set("gender", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="endereco" className="mt-4 grid gap-4 sm:grid-cols-2">
            {textField("address_zip", "CEP")}
            {textField("address_street", "Rua")}
            {textField("address_number", "Número")}
            {textField("address_complement", "Complemento")}
            {textField("address_district", "Bairro")}
            {textField("address_city", "Cidade")}
            {textField("address_state", "Estado")}
          </TabsContent>

          <TabsContent value="arquivos" className="mt-4">
            <LeadFiles contactId={lead.id} />
          </TabsContent>

          <TabsContent value="conversa" className="mt-4">
            <LeadConversation contactId={lead.id} />
          </TabsContent>

          <TabsContent value="notas" className="mt-4 space-y-3">
            <Textarea
              value={note}
              placeholder="Escreva uma anotação sobre este lead..."
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              disabled={!note.trim() || createNote.isPending}
              onClick={() =>
                createNote.mutate(
                  { contactId: lead.id, content: note.trim() },
                  { onSuccess: () => setNote("") }
                )
              }
            >
              Adicionar anotação
            </Button>
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
