import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Webhook, FileText, MessageSquare, Send, Copy, Pencil, Trash2, Plus, BookOpen, Users, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWebhookIntegrations, buildWebhookUrl, type WebhookIntegration,
} from "@/hooks/useWebhookIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const PAYLOAD_EXAMPLE = `{
  "nome": "João Silva",
  "telefone": "5587999990000",
  "email": "joao@email.com",
  "origem": "Landing Page Solar",
  "mensagem": "Tenho interesse em energia solar"
}`;

const NONE = "__none__";

export default function WebhookIntegrations() {
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { data: webhooks = [], isLoading, create, update, remove } = useWebhookIntegrations();

  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ user_id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("id, name").eq("company_id", companyId).order("name"),
        supabase.from("profiles").select("user_id, full_name").eq("company_id", companyId).order("full_name"),
      ]);
      setTeams(t || []);
      setAgents((p || []) as any);
    })();
  }, [companyId]);

  const [createOpen, setCreateOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookIntegration | null>(null);
  const [form, setForm] = useState<{ name: string; welcome_message: string; default_team_id: string | null; default_assigned_to: string | null }>({
    name: "",
    welcome_message: "",
    default_team_id: null,
    default_assigned_to: null,
  });

  const openCreate = () => {
    setForm({ name: "", welcome_message: "", default_team_id: null, default_assigned_to: null });
    setEditTarget(null);
    setCreateOpen(true);
  };

  const openEdit = (wh: WebhookIntegration) => {
    setEditTarget(wh);
    setForm({
      name: wh.name,
      welcome_message: wh.welcome_message ?? "",
      default_team_id: wh.default_team_id ?? null,
      default_assigned_to: wh.default_assigned_to ?? null,
    });
    setCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe um nome para a integração");
      return;
    }
    const payload = {
      name: form.name,
      welcome_message: form.welcome_message,
      default_team_id: form.default_team_id,
      default_assigned_to: form.default_assigned_to,
    };
    if (editTarget) {
      await update.mutateAsync({ id: editTarget.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setCreateOpen(false);
  };

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(buildWebhookUrl(token));
    toast.success("URL copiada");
  };

  const teamName = (id: string | null) => teams.find(t => t.id === id)?.name;
  const agentName = (id: string | null) => agents.find(a => a.user_id === id)?.full_name;

  const infoCards = [
    { icon: FileText, title: "Formulários externos", description: "Receba leads de qualquer formulário ou landing page." },
    { icon: MessageSquare, title: "Mensagem automática no WhatsApp", description: "Dispare uma boas-vindas automática para cada lead." },
    { icon: Send, title: "Integração simples via POST", description: "Envie um POST com JSON para a URL e pronto." },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Webhook className="h-8 w-8 text-primary" />
              Integrações de Webhook
            </h1>
            <p className="text-muted-foreground mt-1">
              Receba leads externos e dispare mensagens automáticas no WhatsApp.
            </p>
          </div>
          <Button variant="outline" onClick={() => setDocsOpen(true)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Ver documentação
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo webhook
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {infoCards.map((c) => (
            <Card key={c.title} className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : webhooks.length === 0 ? (
            <Card className="p-12 text-center">
              <Webhook className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum webhook cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro webhook para começar a receber leads.
              </p>
            </Card>
          ) : (
            webhooks.map((wh) => (
              <Card key={wh.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{wh.name}</h3>
                      <Badge variant={wh.active ? "default" : "secondary"}>
                        {wh.active ? "Ativo" : "Inativo"}
                      </Badge>
                      {wh.default_team_id && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" /> {teamName(wh.default_team_id) || "Equipe"}
                        </Badge>
                      )}
                      {wh.default_assigned_to && (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" /> {agentName(wh.default_assigned_to) || "Atendente"}
                        </Badge>
                      )}
                      {!wh.default_team_id && !wh.default_assigned_to && (
                        <Badge variant="outline" className="text-muted-foreground">Em aberto</Badge>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                      <div className="flex gap-2 mt-1">
                        <Input readOnly value={buildWebhookUrl(wh.token)} className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copyUrl(wh.token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch
                      checked={wh.active}
                      onCheckedChange={(checked) => update.mutate({ id: wh.id, active: checked })}
                    />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(wh)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A URL deixará de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(wh.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar webhook" : "Novo webhook"}</DialogTitle>
            <DialogDescription>
              Configure o nome, a mensagem de boas-vindas e o destino padrão dos leads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da integração</Label>
              <Input
                placeholder="Ex: Formulário Site, Lead Ads Facebook"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Mensagem de boas-vindas</Label>
              <Textarea
                rows={4}
                placeholder="Olá {nome}, obrigado pelo contato! Em breve um atendente irá te ajudar."
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Equipe padrão</Label>
                <Select
                  value={form.default_team_id ?? NONE}
                  onValueChange={(v) => setForm({ ...form, default_team_id: v === NONE ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma (em aberto)</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Atendente padrão</Label>
                <Select
                  value={form.default_assigned_to ?? NONE}
                  onValueChange={(v) => setForm({ ...form, default_assigned_to: v === NONE ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum (em aberto)</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se um atendente for definido, a conversa já entra como "em atendimento" com ele. Sem atendente e sem equipe, a conversa fica em aberto para distribuição normal.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {editTarget ? "Salvar" : "Criar webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documentação do Webhook</DialogTitle>
            <DialogDescription>
              Envie uma requisição POST para a URL do webhook com o seguinte payload JSON:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Exemplo de payload</Label>
              <pre className="mt-1 p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
{PAYLOAD_EXAMPLE}
              </pre>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Campos</Label>
              <ul className="text-sm mt-2 space-y-1">
                <li><span className="font-mono text-primary">nome</span> — nome do lead (obrigatório)</li>
                <li><span className="font-mono text-primary">telefone</span> — com DDI + DDD, somente dígitos (obrigatório)</li>
                <li><span className="font-mono text-primary">email</span> — opcional</li>
                <li><span className="font-mono text-primary">origem</span> — origem do lead (opcional)</li>
                <li><span className="font-mono text-primary">mensagem</span> — mensagem inicial (opcional)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(PAYLOAD_EXAMPLE);
              toast.success("Exemplo copiado");
            }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar exemplo
            </Button>
            <Button onClick={() => setDocsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
