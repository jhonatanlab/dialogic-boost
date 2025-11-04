import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, Users, CalendarIcon, CheckCircle2, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const campaignSchema = z.object({
  nome_campanha: z.string().min(1, "Nome da campanha é obrigatório"),
  equipe_id: z.string().optional(),
  canal_id: z.string().optional(),
  chatbot_habilitado: z.boolean().default(false),
  inicio_disparo: z.enum(["agora", "agendar"]).default("agora"),
  data_agendamento: z.date().optional(),
  modelo_disparo: z.string().min(1, "Selecione um modelo de mensagem"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface DisparoConfig {
  intervalo_segundos: number;
  dias_semana: string[];
  data_limite: Date | null;
  delay_resposta: string;
}

interface PublicoTarget {
  tipo: "tags" | "kanban" | "individual" | "csv";
  filtros: string[];
  total_contatos: number;
}

export default function NewCampaign() {
  const navigate = useNavigate();
  const { data: contacts } = useContacts();
  const { data: tags } = useTags();
  const { createCampaign } = useCampaigns();
  const { templates, isLoading: isLoadingTemplates } = useMessageTemplates();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPublicoModal, setShowPublicoModal] = useState(false);
  
  const [disparoConfig, setDisparoConfig] = useState<DisparoConfig>({
    intervalo_segundos: 2,
    dias_semana: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    data_limite: null,
    delay_resposta: "1h",
  });

  const [publico, setPublico] = useState<PublicoTarget>({
    tipo: "tags",
    filtros: [],
    total_contatos: 0,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [csvContacts, setCsvContacts] = useState<string[]>([]);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nome_campanha: "",
      chatbot_habilitado: false,
      inicio_disparo: "agora",
      modelo_disparo: "",
    },
  });

  const handleConfigSave = () => {
    setShowConfigModal(false);
    toast({
      title: "Configurações salvas",
      description: "As configurações de disparo foram atualizadas.",
    });
  };

  const handlePublicoSave = () => {
    let total = 0;
    let filtros: string[] = [];

    if (publico.tipo === "tags") {
      filtros = selectedTags;
      // Calcular total baseado nas tags selecionadas
      total = selectedTags.length * 10; // Mock
    } else if (publico.tipo === "individual") {
      filtros = selectedContacts;
      total = selectedContacts.length;
    } else if (publico.tipo === "csv") {
      filtros = csvContacts;
      total = csvContacts.length;
    }

    setPublico({
      ...publico,
      filtros,
      total_contatos: total,
    });

    setShowPublicoModal(false);
    toast({
      title: "Público definido",
      description: `${total} contatos selecionados`,
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const numbers = text.split(/[\n,]/).filter(n => n.trim());
        setCsvContacts(numbers);
      };
      reader.readAsText(file);
    }
  };

  const onSubmit = (data: CampaignFormData) => {
    const campaignPayload = {
      nome_campanha: data.nome_campanha,
      equipe_id: data.equipe_id || "default",
      canal_id: data.canal_id || "whatsapp",
      chatbot_habilitado: data.chatbot_habilitado,
      inicio_disparo: data.inicio_disparo === "agora" 
        ? new Date().toISOString() 
        : data.data_agendamento?.toISOString() || new Date().toISOString(),
      config_disparo: disparoConfig,
      publico,
      modelo_disparo: data.modelo_disparo,
      mensagem_preview: "Olá! 👋 Esta é uma mensagem automática.",
      status: "rascunho" as const,
    };

    createCampaign({
      name: data.nome_campanha,
      message: "Mensagem da campanha",
      contactIds: publico.filtros,
    });

    toast({
      title: "✅ Campanha criada com sucesso!",
      description: "Redirecionando para a listagem...",
    });

    setTimeout(() => {
      navigate("/campaigns");
    }, 1500);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Rascunho salvo",
      description: "A campanha foi salva como rascunho.",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="p-6 pb-4 border-b">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#474747" }}>
            Nova Campanha
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure e agende sua campanha de marketing conversacional
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden">
            <div className="flex h-full gap-6 p-6 overflow-hidden">
              {/* COLUNA ESQUERDA - Configurações */}
              <Card className="w-1/2 flex flex-col overflow-y-auto p-6 rounded-2xl">
                <h2 className="text-xl font-semibold mb-6" style={{ color: "#474747" }}>
                  Configurações da Campanha
                </h2>

                <div className="space-y-6">
                  {/* Nome da Campanha */}
                  <FormField
                    control={form.control}
                    name="nome_campanha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Nome da Campanha *
                          {field.value && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Promoção Black Friday" 
                            {...field}
                            className="border-[#8F9491]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Equipe */}
                  <FormField
                    control={form.control}
                    name="equipe_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-[#8F9491]">
                              <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="equipe1">Equipe de Vendas</SelectItem>
                            <SelectItem value="equipe2">Equipe de Marketing</SelectItem>
                            <SelectItem value="equipe3">Equipe de Suporte</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Canal de Atendimento */}
                  <FormField
                    control={form.control}
                    name="canal_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de Atendimento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-[#8F9491]">
                              <SelectValue placeholder="Selecione um canal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Habilitar Chatbot */}
                  <FormField
                    control={form.control}
                    name="chatbot_habilitado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Habilitar Chatbot</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "true")} 
                          defaultValue={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger className="border-[#8F9491]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="false">Desabilitado</SelectItem>
                            <SelectItem value="true">Habilitado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Se habilitado, o chatbot será acionado automaticamente quando o contato responder.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Início do Disparo */}
                  <FormField
                    control={form.control}
                    name="inicio_disparo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início do Disparo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-[#8F9491]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="agora">Iniciar agora</SelectItem>
                            <SelectItem value="agendar">Agendar data e hora</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Data de Agendamento */}
                  {form.watch("inicio_disparo") === "agendar" && (
                    <FormField
                      control={form.control}
                      name="data_agendamento"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data e Hora</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-[#8F9491]",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                  ) : (
                                    <span>Selecione data e hora</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Configurações de Disparo */}
                  <div>
                    <Label>Configurações de Disparo</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2 justify-start border-[#8F9491]"
                      onClick={() => setShowConfigModal(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações personalizadas
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Intervalo: {disparoConfig.intervalo_segundos}s | Dias: {disparoConfig.dias_semana.length}
                    </p>
                  </div>

                  {/* Público-alvo */}
                  <div>
                    <Label>Público-alvo</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2 justify-start border-[#8F9491]"
                      onClick={() => setShowPublicoModal(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Definir público
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total de contatos selecionados: {publico.total_contatos}
                    </p>
                  </div>
                </div>
              </Card>

              {/* COLUNA DIREITA - Mensagem e Preview */}
              <Card className="w-1/2 flex flex-col overflow-y-auto p-6 rounded-2xl">
                <h2 className="text-xl font-semibold mb-6" style={{ color: "#474747" }}>
                  Mensagem
                </h2>

                <div className="space-y-6">
                  {/* Modelo de Mensagem */}
                  <FormField
                    control={form.control}
                    name="modelo_disparo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disparo *</FormLabel>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-[#8F9491]">
                                <SelectValue placeholder="Selecione um modelo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white z-50">
                              {isLoadingTemplates ? (
                                <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                              ) : templates && templates.length > 0 ? (
                                templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="_empty" disabled>Nenhum modelo disponível</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => window.open('/message-templates/new', '_blank')}
                            className="whitespace-nowrap px-4 py-2 text-sm font-medium"
                            style={{ backgroundColor: "#FC6625" }}
                          >
                            ➕ Criar novo modelo
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preview da Mensagem */}
                  <div>
                    <Label>Pré-visualização</Label>
                    <div className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: "#E5DDD5" }}>
                      <div className="flex justify-end">
                        <div 
                          className="max-w-[80%] p-3 rounded-lg shadow-sm"
                          style={{ backgroundColor: "#FFFFFF" }}
                        >
                          {form.watch("modelo_disparo") && templates ? (
                            <>
                              {templates.find(t => t.id === form.watch("modelo_disparo"))?.attachment_url && (
                                <img
                                  src={templates.find(t => t.id === form.watch("modelo_disparo"))?.attachment_url || ''}
                                  alt="Anexo"
                                  className="rounded-lg mb-3 w-full object-cover max-h-64 shadow-sm"
                                />
                              )}
                              <p className="text-sm whitespace-pre-wrap" style={{ color: "#474747" }}>
                                {templates.find(t => t.id === form.watch("modelo_disparo"))?.preview || 
                                 templates.find(t => t.id === form.watch("modelo_disparo"))?.message || 
                                 "Selecione um modelo para visualizar"}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Selecione um modelo para visualizar a mensagem
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 text-right">
                            {format(new Date(), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botões de Ação da Campanha */}
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/campaigns')}
                        className="px-4 py-2 text-sm font-medium"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white"
                        style={{ backgroundColor: "#FC6625" }}
                      >
                        🚀 Ativar Campanha
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      💡 As variáveis serão substituídas automaticamente com os dados do contato ao enviar a mensagem.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Rodapé - Botões de Ação */}
            <div className="border-t p-6 flex justify-end gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
              >
                Salvar como Rascunho
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Modal de Configurações de Disparo */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Configurações de Disparo</DialogTitle>
            <DialogDescription>
              Personalize o comportamento do envio da campanha
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Intervalo entre mensagens (segundos)</Label>
              <Input
                type="number"
                value={disparoConfig.intervalo_segundos}
                onChange={(e) => setDisparoConfig({
                  ...disparoConfig,
                  intervalo_segundos: parseInt(e.target.value) || 2
                })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Dias da semana</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
                  <Button
                    key={dia}
                    type="button"
                    variant={disparoConfig.dias_semana.includes(dia) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDisparoConfig({
                        ...disparoConfig,
                        dias_semana: disparoConfig.dias_semana.includes(dia)
                          ? disparoConfig.dias_semana.filter(d => d !== dia)
                          : [...disparoConfig.dias_semana, dia]
                      });
                    }}
                  >
                    {dia}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Atraso entre respostas</Label>
              <Select
                value={disparoConfig.delay_resposta}
                onValueChange={(value) => setDisparoConfig({
                  ...disparoConfig,
                  delay_resposta: value
                })}
              >
                <SelectTrigger className="mt-2 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="30m">30 minutos</SelectItem>
                  <SelectItem value="1h">1 hora</SelectItem>
                  <SelectItem value="2h">2 horas</SelectItem>
                  <SelectItem value="24h">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfigModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfigSave}
              style={{ backgroundColor: "#FC6625", color: "#FFFFFF" }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Público-alvo */}
      <Dialog open={showPublicoModal} onOpenChange={setShowPublicoModal}>
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Definir Público</DialogTitle>
            <DialogDescription>
              Selecione os destinatários da campanha
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="tags" className="w-full" onValueChange={(value) => setPublico({ ...publico, tipo: value as any })}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tags">Por Tags</TabsTrigger>
              <TabsTrigger value="kanban">Por Kanban</TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="csv">Lista CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="tags" className="space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Selecionados: {selectedTags.length}
              </p>
              {tags?.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tag.id}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTags([...selectedTags, tag.id]);
                      } else {
                        setSelectedTags(selectedTags.filter(id => id !== tag.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={tag.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag.name}
                  </label>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="kanban" className="space-y-4">
              <Select>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="novo">Novo Lead</SelectItem>
                  <SelectItem value="contato">Em Contato</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado">Contato Fechado</SelectItem>
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4 max-h-[400px] overflow-y-auto">
              <Input placeholder="Buscar contatos..." className="mb-4" />
              {contacts?.map((contact) => (
                <div key={contact.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={contact.id}
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedContacts([...selectedContacts, contact.id]);
                      } else {
                        setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={contact.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {contact.name} - {contact.phone}
                  </label>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Faça upload de um arquivo .CSV com números
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
              {csvContacts.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Pré-visualização ({csvContacts.length} contatos):
                  </p>
                  <div className="max-h-[200px] overflow-y-auto border rounded p-2">
                    {csvContacts.slice(0, 10).map((num, idx) => (
                      <p key={idx} className="text-sm">{num}</p>
                    ))}
                    {csvContacts.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ...e mais {csvContacts.length - 10} números
                      </p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Total de contatos selecionados: {
                publico.tipo === "tags" ? selectedTags.length * 10 :
                publico.tipo === "individual" ? selectedContacts.length :
                publico.tipo === "csv" ? csvContacts.length : 0
              }
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPublicoModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handlePublicoSave}
                style={{ backgroundColor: "#FC6625", color: "#FFFFFF" }}
              >
                Confirmar Público
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
