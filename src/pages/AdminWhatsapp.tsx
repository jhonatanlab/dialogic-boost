import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Link,
  Save,
  QrCode,
  Loader2,
} from "lucide-react";
import { useAdminSettings, useWhatsappInstances } from "@/hooks/useAdminSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminWhatsapp = () => {
  const { getSettingValue, saveSettings, isLoading: settingsLoading } = useAdminSettings();
  const { instances, isLoading: instancesLoading, createInstance, deleteInstance } = useWhatsappInstances();

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [n8nBaseUrl, setN8nBaseUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [createEndpoint, setCreateEndpoint] = useState("");
  const [qrEndpoint, setQrEndpoint] = useState("");
  const [deleteEndpoint, setDeleteEndpoint] = useState("");
  const [sendEndpoint, setSendEndpoint] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [generatingQr, setGeneratingQr] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    if (!settingsLoading) {
      setN8nBaseUrl(getSettingValue("n8n_base_url") || "https://seu-n8n.app.n8n.cloud");
      setWebhookSecret(getSettingValue("n8n_webhook_secret"));
      setCreateEndpoint(getSettingValue("n8n_create_instance") || "https://seu-n8n.app.n8n.cloud/webhook/create-instance");
      setQrEndpoint(getSettingValue("n8n_generate_qr") || "https://seu-n8n.app.n8n.cloud/webhook/generate-qrcode");
      setDeleteEndpoint(getSettingValue("n8n_delete_instance") || "https://seu-n8n.app.n8n.cloud/webhook/delete-instance");
      setSendEndpoint(getSettingValue("n8n_send_message") || "https://seu-n8n.app.n8n.cloud/webhook/send-message");
    }
  }, [settingsLoading]);

  const handleSave = () => {
    saveSettings.mutate({
      n8n_base_url: n8nBaseUrl,
      n8n_webhook_secret: webhookSecret,
      n8n_create_instance: createEndpoint,
      n8n_generate_qr: qrEndpoint,
      n8n_delete_instance: deleteEndpoint,
      n8n_send_message: sendEndpoint,
    });
  };

  const { toast } = useToast();

  const handleCreateInstanceWebhook = async (company: { id: string; company_name: string }) => {
    if (!createEndpoint) {
      toast({ title: "Endpoint não configurado", description: "Configure o Create Instance Endpoint primeiro.", variant: "destructive" });
      return;
    }
    setCreatingInstance(true);
    try {
      const response = await fetch(createEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company.company_name,
          company_id: company.id,
          ...(webhookSecret ? { secret: webhookSecret } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      toast({ title: "Instância criada com sucesso!" });
      console.log("Webhook Create Instance acionado para:", company.company_name);
    } catch (error: any) {
      toast({ title: "Erro ao criar instância", description: error.message, variant: "destructive" });
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleDeleteInstance = () => {
    if (!selectedCompany) return;
    deleteInstance.mutate(selectedCompany);
    setSelectedCompany("");
  };

  const handleRefreshInstance = (id: string) => {
    console.log("Integração com n8n será feita via Webhook - Atualizar status:", id);
  };

  const handleGenerateQr = async (inst: { id: string; instance_id: string | null; instance_token: string | null; company_id: string | null }) => {
    if (!qrEndpoint) {
      toast({ title: "Endpoint não configurado", description: "Configure o Generate QR Code Endpoint primeiro.", variant: "destructive" });
      return;
    }
    if (!inst.instance_id) {
      toast({ title: "Sem instance_id", description: "Esta instância não possui instance_id.", variant: "destructive" });
      return;
    }
    setGeneratingQr(inst.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("proxy-n8n", {
        body: {
          endpoint: qrEndpoint,
          payload: {
            company_id: inst.company_id,
            instance_id: inst.instance_id,
            instance_token: inst.instance_token,
            ...(webhookSecret ? { secret: webhookSecret } : {}),
          },
        },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      console.log("QR Code response from n8n:", JSON.stringify(result));

      // Try multiple possible response formats from n8n
      const qrValue = result?.qrcode || result?.base64 || result?.code || result?.pairingCode || result?.raw;
      if (qrValue) {
        setQrCodeData(qrValue);
        setQrDialogOpen(true);
      } else {
        // If the result itself is a string, use it directly
        if (typeof result === "string" && result.length > 10) {
          setQrCodeData(result);
          setQrDialogOpen(true);
        } else {
          toast({ title: "Resposta inesperada", description: "O n8n não retornou um QR Code reconhecido. Verifique os logs.", variant: "destructive" });
          console.log("Full n8n response:", result);
        }
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR Code", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingQr(null);
    }
  };

  const isConnected = n8nBaseUrl.trim().length > 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-orange-500/20">
            <Settings className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin SaaS</h1>
            <p className="text-muted-foreground">WhatsApp - n8n Webhooks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conexão com n8n */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link className="h-5 w-5 text-orange-500" />
                  Conexão com n8n
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>N8N Base URL</Label>
                    <Input
                      value={n8nBaseUrl}
                      onChange={(e) => setN8nBaseUrl(e.target.value)}
                      placeholder="https://seu-n8n.app.n8n.cloud"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Secret (opcional)</Label>
                    <Input
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="seu-webhook-secret"
                      type="password"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Endpoints</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Create Instance Endpoint</Label>
                      <Input
                        value={createEndpoint}
                        onChange={(e) => setCreateEndpoint(e.target.value)}
                        placeholder="https://seu-n8n.app.n8n.cloud/webhook/create-instance"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Generate QR Code Endpoint</Label>
                      <Input
                        value={qrEndpoint}
                        onChange={(e) => setQrEndpoint(e.target.value)}
                        placeholder="https://seu-n8n.app.n8n.cloud/webhook/generate-qrcode"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delete Instance Endpoint</Label>
                      <Input
                        value={deleteEndpoint}
                        onChange={(e) => setDeleteEndpoint(e.target.value)}
                        placeholder="https://seu-n8n.app.n8n.cloud/webhook/delete-instance"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Send Message Endpoint</Label>
                      <Input
                        value={sendEndpoint}
                        onChange={(e) => setSendEndpoint(e.target.value)}
                        placeholder="https://seu-n8n.app.n8n.cloud/webhook/send-message"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saveSettings.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveSettings.isPending ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </CardContent>
            </Card>

            {/* Instância por Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instância por Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecione a Empresa</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCompany && (() => {
                  const selected = companies?.find((c) => c.id === selectedCompany);
                  if (!selected) return null;
                  const companyInstance = instances?.find((i) => i.company_id === selected.id);
                  const hasInstance = !!companyInstance?.instance_id;
                  return (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selected.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {hasInstance ? companyInstance.instance_id : "Sem instância criada"}
                          </p>
                        </div>
                        {hasInstance ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Wifi className="h-3 w-3 mr-1" /> Instância ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                            Sem instância
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {!hasInstance && (
                          <Button
                            onClick={() => handleCreateInstanceWebhook({ id: selected.id, company_name: selected.name })}
                            disabled={creatingInstance}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {creatingInstance ? "Criando..." : "Criar Instância"}
                          </Button>
                        )}
                        {hasInstance && (
                          <Button
                            onClick={() => handleGenerateQr(companyInstance!)}
                            disabled={generatingQr === companyInstance!.id}
                            variant="outline"
                          >
                            {generatingQr === companyInstance!.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4 mr-2" />
                            )}
                            Gerar QR Code
                          </Button>
                        )}
                        {companyInstance && (
                          <Button
                            onClick={() => {
                              deleteInstance.mutate(companyInstance.id);
                              setSelectedCompany("");
                            }}
                            disabled={deleteInstance.isPending}
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Apagar Instância
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Instâncias Ativas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instâncias Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Empresa</TableHead>
                      <TableHead>ID da Instância</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instancesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : !instances?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma instância cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      instances.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{inst.company_name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {inst.instance_id || "—"}
                          </TableCell>
                          <TableCell>
                            {inst.status === "connected" ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <Wifi className="h-3 w-3 mr-1" /> Conectado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-400 border-red-500/30">
                                <WifiOff className="h-3 w-3 mr-1" /> Desconectado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Gerar QR Code"
                                onClick={() => handleGenerateQr(inst)}
                                disabled={generatingQr === inst.id || !inst.instance_id}
                              >
                                {generatingQr === inst.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <QrCode className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefreshInstance(inst.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteInstance.mutate(inst.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Status da Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <div className="p-2 rounded-full bg-green-500/20">
                      <Wifi className="h-5 w-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-red-500/20">
                      <WifiOff className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {isConnected ? "Conectado" : "Não configurado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? "n8n ativo" : "Configure a URL do n8n"}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">URL Ativa</p>
                    <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                      {n8nBaseUrl}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Instâncias</p>
                  <p className="text-2xl font-bold">{instances?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {instances?.filter((i) => i.status === "connected").length ?? 0} conectadas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {qrCodeData && (
                qrCodeData.startsWith("data:") ? (
                  <img src={qrCodeData} alt="QR Code" className="max-w-full" />
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-mono break-all">{qrCodeData}</p>
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWhatsapp;
