import { useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Webhook, FileText, MessageSquare, Send, Copy, Pencil, Trash2, Plus, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWebhookIntegrations, buildWebhookUrl, type WebhookIntegration,
} from "@/hooks/useWebhookIntegrations";

const PAYLOAD_EXAMPLE = `{
  "nome": "João Silva",
  "telefone": "5587999990000",
  "email": "joao@email.com",
  "origem": "Landing Page Solar",
  "mensagem": "Tenho interesse em energia solar"
}`;

export default function WebhookIntegrations() {
  const navigate = useNavigate();
  const { data: webhooks = [], isLoading, create, update, remove } = useWebhookIntegrations();

  const [createOpen, setCreateOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookIntegration | null>(null);
  const [form, setForm] = useState({ name: "", welcome_message: "" });

  const openCreate = () => {
    setForm({ name: "", welcome_message: "" });
    setEditTarget(null);
    setCreateOpen(true);
  };

  const openEdit = (wh: WebhookIntegration) => {
    setEditTarget(wh);
    setForm({ name: wh.name, welcome_message: wh.welcome_message ?? "" });
    setCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe um nome para a integração");
      return;
    }
    if (editTarget) {
      await update.mutateAsync({ id: editTarget.id, name: form.name, welcome_message: form.welcome_message });
    } else {
      await create.mutateAsync({ name: form.name, welcome_message: form.welcome_message });
    }
    setCreateOpen(false);
  };

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(buildWebhookUrl(token));
    toast.success("URL copiada");
  };

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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{wh.name}</h3>
                      <Badge variant={wh.active ? "default" : "secondary"}>
                        {wh.active ? "Ativo" : "Inativo"}
                      </Badge>
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
              Configure o nome e a mensagem de boas-vindas enviada ao lead.
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
