import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Copy, Check, Zap, QrCode, Loader2, Link, Save } from "lucide-react";
import { useWhatsappIntegrations, MetaCredentials, ZapiCredentials } from "@/hooks/useWhatsappIntegrations";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useCompany } from "@/hooks/useCompany";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WhatsappIntegrations = () => {
  const { integrations, isLoading, saveIntegration, testConnection, getIntegration } = useWhatsappIntegrations();
  const { getSettingValue, isLoading: settingsLoading } = useAdminSettings();
  const { toast } = useToast();
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [nativeEnabled, setNativeEnabled] = useState(false);
  const [nativeInitialized, setNativeInitialized] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [automationInbound, setAutomationInbound] = useState("");
  const [automationOutbound, setAutomationOutbound] = useState("");
  const [copiedCompanyId, setCopiedCompanyId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: companyInstance } = useQuery({
    queryKey: ["my-whatsapp-instance", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const zapiWebhookUrl = `${supabaseUrl}/functions/v1/webhook-zapi`;
  const metaWebhookUrl = `${supabaseUrl}/functions/v1/webhook-meta`;

  const metaIntegration = getIntegration("meta");
  const zapiIntegration = getIntegration("zapi");

  const [metaForm, setMetaForm] = useState<MetaCredentials>({
    accessToken: "",
    phoneNumberId: "",
    whatsappBusinessId: "",
  });

  const [zapiForm, setZapiForm] = useState<ZapiCredentials>({
    instanceId: "",
    apiToken: "",
  });

  useEffect(() => {
    if (metaIntegration) {
      setMetaForm({
        accessToken: metaIntegration.access_token || "",
        phoneNumberId: metaIntegration.phone_number_id || "",
        whatsappBusinessId: metaIntegration.business_id || "",
      });
    }
  }, [metaIntegration]);

  useEffect(() => {
    if (zapiIntegration) {
      setZapiForm({
        instanceId: zapiIntegration.instance_id || "",
        apiToken: zapiIntegration.api_token || "",
      });
    }
  }, [zapiIntegration]);

  // Sync nativeEnabled from DB instance
  useEffect(() => {
    if (!nativeInitialized && companyInstance !== undefined) {
      setNativeEnabled(!!companyInstance);
      setNativeInitialized(true);
    }
  }, [companyInstance, nativeInitialized]);

  // Load automation settings from DB
  useEffect(() => {
    if (!companyId) return;
    const loadAutomationSettings = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .eq("company_id", companyId)
        .in("setting_key", ["n8n_automation_enabled", "n8n_automation_inbound", "n8n_automation_outbound"]);
      if (data) {
        for (const row of data) {
          if (row.setting_key === "n8n_automation_enabled") setAutomationEnabled(row.setting_value === "true");
          if (row.setting_key === "n8n_automation_inbound") setAutomationInbound(row.setting_value || "");
          if (row.setting_key === "n8n_automation_outbound") setAutomationOutbound(row.setting_value || "");
        }
      }
    };
    loadAutomationSettings();
  }, [companyId]);


  const handleMetaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaForm.accessToken || !metaForm.phoneNumberId || !metaForm.whatsappBusinessId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    saveIntegration.mutate({ provider: "meta", credentials: metaForm });
  };

  const handleZapiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zapiForm.instanceId || !zapiForm.apiToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    saveIntegration.mutate({ provider: "zapi", credentials: zapiForm });
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleGenerateQrCode = async () => {
    const qrEndpoint = getSettingValue("n8n_generate_qr");
    if (!qrEndpoint) {
      toast({ title: "Endpoint não configurado", description: "O endpoint de QR Code não está configurado.", variant: "destructive" });
      return;
    }
    if (!companyInstance?.instance_id) {
      toast({ title: "Sem instância", description: "Nenhuma instância ativa encontrada para sua empresa.", variant: "destructive" });
      return;
    }
    setGeneratingQr(true);
    try {
      const webhookSecret = getSettingValue("n8n_webhook_secret");
      const response = await supabase.functions.invoke("proxy-n8n", {
        body: {
          endpoint: qrEndpoint,
          payload: {
            company_id: companyId,
            instance_id: companyInstance.instance_id,
            instance_token: companyInstance.instance_token,
            ...(webhookSecret ? { secret: webhookSecret } : {}),
          },
        },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      console.log("QR Code response:", JSON.stringify(result));
      const qrValue = result?.qr_code || result?.qrcode || result?.base64 || result?.code || result?.pairingCode || result?.raw;
      if (qrValue) {
        setQrCodeData(qrValue);
        setQrDialogOpen(true);
      } else if (typeof result === "string" && result.length > 10) {
        setQrCodeData(result);
        setQrDialogOpen(true);
      } else {
        toast({ title: "Resposta inesperada", description: "O n8n não retornou um QR Code reconhecido.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR Code", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingQr(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Integrações WhatsApp
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte sua conta do WhatsApp para enviar mensagens e registrar check-ins.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Integração</CardTitle>
            <CardDescription>
              Escolha e configure uma das opções de integração com WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="meta" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="meta" className="flex items-center gap-2">
                  API Oficial Meta
                  {metaIntegration?.status === 'connected' ? (
                    <Badge variant="default" className="ml-2">
                      Conectado ✅
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      Não conectado ❌
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="zapi" className="flex items-center gap-2">
                  Z-API
                  {zapiIntegration?.status === 'connected' ? (
                    <Badge variant="default" className="ml-2">
                      Conectado ✅
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      Não conectado ❌
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="native" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  API Nativa
                  {automationEnabled ? (
                    <Badge variant="secondary" className="ml-2">
                      Inativo
                    </Badge>
                  ) : companyInstance?.status === 'connected' ? (
                    <Badge variant="default" className="ml-2">
                      Conectado ✅
                    </Badge>
                  ) : nativeEnabled ? (
                    <Badge className="ml-2 bg-amber-500/15 text-amber-600 border-amber-500/30">
                      {companyInstance?.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      Inativo
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="automation" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  API Automação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4 mt-6">
                <form onSubmit={handleMetaSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta-access-token">Access Token *</Label>
                    <Input
                      id="meta-access-token"
                      type="text"
                      placeholder="Digite seu Access Token"
                      value={metaForm.accessToken}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, accessToken: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta-phone-number-id">Phone Number ID *</Label>
                    <Input
                      id="meta-phone-number-id"
                      type="text"
                      placeholder="Digite seu Phone Number ID"
                      value={metaForm.phoneNumberId}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, phoneNumberId: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta-business-id">WhatsApp Business ID *</Label>
                    <Input
                      id="meta-business-id"
                      type="text"
                      placeholder="Digite seu WhatsApp Business ID"
                      value={metaForm.whatsappBusinessId}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, whatsappBusinessId: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta-webhook">Webhook URL (somente leitura)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="meta-webhook"
                        type="text"
                        value={metaWebhookUrl}
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyWebhookUrl(metaWebhookUrl)}
                      >
                        {copiedWebhook ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saveIntegration.isPending}>
                      {saveIntegration.isPending ? "Testando conexão..." : "Salvar Integração"}
                    </Button>
                    {metaIntegration && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => testConnection.mutate("meta")}
                        disabled={testConnection.isPending}
                      >
                        {testConnection.isPending ? "Testando..." : "Testar Conexão"}
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="zapi" className="space-y-4 mt-6">
                <form onSubmit={handleZapiSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="zapi-instance-id">Instance ID *</Label>
                    <Input
                      id="zapi-instance-id"
                      type="text"
                      placeholder="Digite seu Instance ID"
                      value={zapiForm.instanceId}
                      onChange={(e) =>
                        setZapiForm({ ...zapiForm, instanceId: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zapi-api-token">API Token *</Label>
                    <Input
                      id="zapi-api-token"
                      type="text"
                      placeholder="Digite seu API Token"
                      value={zapiForm.apiToken}
                      onChange={(e) =>
                        setZapiForm({ ...zapiForm, apiToken: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zapi-webhook">Webhook URL (somente leitura)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="zapi-webhook"
                        type="text"
                        value={zapiWebhookUrl}
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyWebhookUrl(zapiWebhookUrl)}
                      >
                        {copiedWebhook ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saveIntegration.isPending}>
                      {saveIntegration.isPending ? "Testando conexão..." : "Salvar Integração"}
                    </Button>
                    {zapiIntegration && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => testConnection.mutate("zapi")}
                        disabled={testConnection.isPending}
                      >
                        {testConnection.isPending ? "Testando..." : "Testar Conexão"}
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="native" className="space-y-4 mt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="space-y-1">
                      <h4 className="font-medium">Ativar API Nativa</h4>
                      <p className="text-sm text-muted-foreground">
                        Use nossa API interna gerenciada via n8n Webhooks para enviar e receber mensagens.
                      </p>
                    </div>
                    <Switch
                      checked={nativeEnabled}
                      onCheckedChange={async (checked) => {
                        setNativeEnabled(checked);
                        if (checked) {
                          try {
                            const { data: userData } = await supabase.auth.getUser();
                            if (userData.user && companyId) {
                              // Deactivate Meta/Z-API integrations
                              await supabase
                                .from("whatsapp_integrations")
                                .update({ status: "disconnected", updated_at: new Date().toISOString() })
                                .eq("user_id", userData.user.id);

                              // Deactivate API Automação
                              await supabase
                                .from("admin_settings")
                                .upsert({
                                  user_id: userData.user.id,
                                  company_id: companyId,
                                  setting_key: "n8n_automation_enabled",
                                  setting_value: "false",
                                }, { onConflict: "user_id,setting_key" });

                              // Reconnect API Nativa instance
                              await supabase
                                .from("whatsapp_instances")
                                .update({ status: "connected", updated_at: new Date().toISOString() })
                                .eq("company_id", companyId);

                              setAutomationEnabled(false);
                              queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
                              queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
                              queryClient.invalidateQueries({ queryKey: ["my-whatsapp-instance"] });
                            }
                          } catch (e) {
                            console.error("Error deactivating competing integrations:", e);
                          }
                          toast({
                            title: "API Nativa ativada",
                            description: "As demais integrações foram desativadas automaticamente.",
                          });
                        } else {
                          toast({
                            title: "API Nativa desativada",
                            description: "A API Nativa foi desativada.",
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Connection status */}
                  {nativeEnabled && companyInstance && (
                    <div className="flex items-center gap-3 p-4 rounded-lg border">
                      <div className={`h-3 w-3 rounded-full ${
                        companyInstance.status === 'connected' ? 'bg-emerald-500' :
                        companyInstance.status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                        'bg-destructive'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {companyInstance.status === 'connected' ? 'Conectado' :
                           companyInstance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Instância: {companyInstance.instance_id || 'N/A'}
                        </p>
                      </div>
                      <Badge variant={companyInstance.status === 'connected' ? 'default' : 'secondary'}>
                        {companyInstance.status}
                      </Badge>
                    </div>
                  )}

                  {nativeEnabled && (
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Zap className="h-5 w-5" />
                            <span className="font-medium">Endpoints Configurados</span>
                          </div>

                          <div className="space-y-3">
                            {[
                              { label: "Enviar Mensagem", key: "n8n_send_message" as const },
                              { label: "Criar Instância", key: "n8n_create_instance" as const },
                              { label: "Gerar QR Code", key: "n8n_generate_qr" as const },
                              { label: "Deletar Instância", key: "n8n_delete_instance" as const },
                            ].map((ep) => {
                              const value = getSettingValue(ep.key);
                              return (
                                <div key={ep.key} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{ep.label}</span>
                                  {value ? (
                                    <Badge variant="outline" className="font-mono text-xs max-w-[300px] truncate">
                                      {value}
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">
                                      Não configurado
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <p className="text-xs text-muted-foreground border-t pt-3">
                            Os endpoints são gerenciados pelo administrador do sistema.
                          </p>
                        </CardContent>
                      </Card>

                      {companyInstance?.instance_id && (
                        <Button
                          onClick={handleGenerateQrCode}
                          disabled={generatingQr}
                          className="w-full"
                        >
                          {generatingQr ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          {generatingQr ? "Gerando QR Code..." : "Gerar QR Code"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="automation" className="space-y-4 mt-6">
                <div className="space-y-6">
                  {/* Credenciais de Integração */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Credenciais de Integração</CardTitle>
                      <CardDescription>Use estes dados para configurar seu webhook externo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Company ID</Label>
                          <div className="flex gap-2">
                            <Input value={companyId ?? ""} readOnly className="font-mono text-xs" />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (companyId) {
                                  navigator.clipboard.writeText(companyId);
                                  setCopiedCompanyId(true);
                                  setTimeout(() => setCopiedCompanyId(false), 2000);
                                }
                              }}
                            >
                              {copiedCompanyId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Webhook Secret</Label>
                          {getSettingValue("n8n_webhook_secret") ? (
                            <div className="flex gap-2">
                              <Input value={getSettingValue("n8n_webhook_secret")} readOnly className="font-mono text-xs" />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(getSettingValue("n8n_webhook_secret"));
                                  setCopiedSecret(true);
                                  setTimeout(() => setCopiedSecret(false), 2000);
                                }}
                              >
                                {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center h-10">
                              <Badge variant="secondary">Não configurado</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Toggle card */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="space-y-1">
                      <h4 className="font-medium">Ativar Motor de Automação Customizado</h4>
                      <p className="text-sm text-muted-foreground">
                        Substitui o gateway padrão e roteia a comunicação deste número para um fluxo exclusivo de IA no n8n.
                      </p>
                    </div>
                    <Switch
                      checked={automationEnabled}
                      onCheckedChange={async (checked) => {
                        setAutomationEnabled(checked);
                        if (checked) {
                          try {
                            const { data: userData } = await supabase.auth.getUser();
                            if (userData.user && companyId) {
                              // Deactivate Meta/Z-API integrations
                              await supabase
                                .from("whatsapp_integrations")
                                .update({ status: "disconnected", updated_at: new Date().toISOString() })
                                .eq("user_id", userData.user.id);

                              // Deactivate API Nativa (set status to disconnected instead of deleting)
                              await supabase
                                .from("whatsapp_instances")
                                .update({ status: "disconnected", updated_at: new Date().toISOString() })
                                .eq("company_id", companyId);

                              setNativeEnabled(false);
                              setNativeInitialized(false);
                              queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
                              queryClient.invalidateQueries({ queryKey: ["my-whatsapp-instance"] });
                            }
                          } catch (e) {
                            console.error("Error deactivating competing integrations:", e);
                          }
                          toast({
                            title: "Motor de automação ativado",
                            description: "As demais integrações foram desativadas automaticamente.",
                          });
                        } else {
                          toast({
                            title: "Motor de automação desativado",
                            description: "O motor de automação foi desativado.",
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Connection status */}
                  {automationEnabled && (
                    <div className="flex items-center gap-3 p-4 rounded-lg border">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Motor Ativo</p>
                      </div>
                      <Badge variant="default">connected</Badge>
                    </div>
                  )}

                  {/* Endpoints */}
                  {automationEnabled && (
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Link className="h-5 w-5" />
                          <span className="font-medium">Webhooks de Sincronização</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="automation-inbound">Webhook de Recebimento (Inbound)</Label>
                            <Input
                              id="automation-inbound"
                              type="text"
                              placeholder="http://n8n.../webhook/receber-mensagem"
                              value={automationInbound}
                              onChange={(e) => setAutomationInbound(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="automation-outbound">Endpoint de Envio (Outbound)</Label>
                            <Input
                              id="automation-outbound"
                              type="text"
                              placeholder="http://n8n.../webhook/enviar-mensagem"
                              value={automationOutbound}
                              onChange={(e) => setAutomationOutbound(e.target.value)}
                            />
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Insira as URLs do fluxo n8n isolado deste cliente. O sistema utilizará estes endpoints para sincronizar o Inbox humano com a IA.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Save button */}
                  {automationEnabled && (
                    <Button
                      className="w-full"
                      onClick={async () => {
                        try {
                          const { data: userData } = await supabase.auth.getUser();
                          if (!userData.user) throw new Error("Não autenticado");

                          const settings = [
                            { setting_key: "n8n_automation_enabled", setting_value: String(automationEnabled) },
                            { setting_key: "n8n_automation_inbound", setting_value: automationInbound },
                            { setting_key: "n8n_automation_outbound", setting_value: automationOutbound },
                          ];

                          for (const s of settings) {
                            const { error } = await supabase
                              .from("admin_settings")
                              .upsert({
                                user_id: userData.user.id,
                                company_id: companyId,
                                setting_key: s.setting_key,
                                setting_value: s.setting_value,
                              }, { onConflict: "user_id,setting_key" });
                            if (error) throw error;
                          }

                          toast({
                            title: "Configuração salva!",
                            description: "Os endpoints do motor de automação foram salvos com sucesso.",
                          });
                        } catch (err: any) {
                          toast({
                            title: "Erro ao salvar",
                            description: err.message,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configuração do Motor
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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

export default WhatsappIntegrations;
