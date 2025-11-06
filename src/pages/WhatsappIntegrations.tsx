import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Copy, Check } from "lucide-react";
import { useWhatsappIntegrations, MetaCredentials, ZapiCredentials } from "@/hooks/useWhatsappIntegrations";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const WhatsappIntegrations = () => {
  const { integrations, isLoading, saveIntegration, getIntegration } = useWhatsappIntegrations();
  const { toast } = useToast();
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = `${window.location.origin}/webhook/zapi`;

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
      setMetaForm(metaIntegration.credentials as MetaCredentials);
    }
  }, [metaIntegration]);

  useEffect(() => {
    if (zapiIntegration) {
      setZapiForm(zapiIntegration.credentials as ZapiCredentials);
    }
  }, [zapiIntegration]);

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

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
    setTimeout(() => setCopiedWebhook(false), 2000);
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="meta" className="flex items-center gap-2">
                  API Oficial Meta
                  {metaIntegration ? (
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
                  {zapiIntegration ? (
                    <Badge variant="default" className="ml-2">
                      Conectado ✅
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      Não conectado ❌
                    </Badge>
                  )}
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

                  <Button type="submit" disabled={saveIntegration.isPending}>
                    {saveIntegration.isPending ? "Salvando..." : "Salvar Integração"}
                  </Button>
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
                        value={webhookUrl}
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyWebhookUrl}
                      >
                        {copiedWebhook ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={saveIntegration.isPending}>
                    {saveIntegration.isPending ? "Salvando..." : "Salvar Integração"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WhatsappIntegrations;
