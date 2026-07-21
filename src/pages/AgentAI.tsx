import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Bot, Loader2, Save, PlugZap, Sparkles, Eye, EyeOff } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Provider = "openai" | "anthropic" | "groq";

type ModelOption = { value: string; label: string };

const MODEL_OPTIONS: Record<Provider, { value: string; label: string; description?: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "gpt-4o-mini", description: "rápido e barato" },
    { value: "gpt-4o", label: "gpt-4o", description: "mais capaz" },
    { value: "gpt-4.1", label: "gpt-4.1" },
    { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { value: "o3-mini", label: "o3-mini", description: "raciocínio" },
  ],
  anthropic: [
    { value: "claude-haiku-4-5", label: "claude-haiku-4-5", description: "rápido e barato" },
    { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6", description: "equilibrado" },
    { value: "claude-opus-4-7", label: "claude-opus-4-7", description: "mais capaz" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile" },
    { value: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
    { value: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768" },
  ],
};

const getModelOptions = (provider: Provider, currentModel: string): ModelOption[] => {
  const options = MODEL_OPTIONS[provider].map((o) => ({
    value: o.value,
    label: o.description ? `${o.value} — ${o.description}` : o.value,
  }));
  const isInPredefined = MODEL_OPTIONS[provider].some((o) => o.value === currentModel);
  if (!isInPredefined && currentModel && currentModel !== "___other___") {
    options.push({ value: currentModel, label: `Custom: ${currentModel}` });
  }
  options.push({ value: "___other___", label: "Outro (digitar manualmente)" });
  return options;
};

const AgentAI = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, companyId, isLoading: companyLoading } = useCompany();

  const isAllowed = profile?.role === "admin" || profile?.role === "owner";

  useEffect(() => {
    if (!companyLoading && profile && !isAllowed) {
      navigate("/dashboard");
    }
  }, [companyLoading, profile, isAllowed, navigate]);

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["agent-ai-company", companyId],
    enabled: !!companyId && isAllowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, agent_name, llm_provider, llm_model, system_prompt, debounce_seconds, ai_enabled, ai_pipeline_enabled, llm_api_key_encrypted")
        .eq("id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [agentName, setAgentName] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [selectModel, setSelectModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [debounce, setDebounce] = useState<number>(5);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPipelineEnabled, setAiPipelineEnabled] = useState(false);
  const hasKeyConfigured = !!company?.llm_api_key_encrypted;

  useEffect(() => {
    if (!company) return;
    setAgentName(company.agent_name || "");
    const p = (company.llm_provider as Provider) || "openai";
    setProvider(p);
    const savedModel = company.llm_model || "";
    const defaultModel = MODEL_OPTIONS[p][0].value;
    const isInPredefined = MODEL_OPTIONS[p].some((o) => o.value === savedModel);
    if (savedModel === "") {
      setModel(defaultModel);
      setSelectModel(defaultModel);
      setCustomModel(defaultModel);
    } else if (isInPredefined) {
      setModel(savedModel);
      setSelectModel(savedModel);
      setCustomModel(savedModel);
    } else {
      setModel(savedModel);
      setSelectModel("___other___");
      setCustomModel(savedModel);
    }
    setSystemPrompt(company.system_prompt || "");
    setDebounce(Number(company.debounce_seconds ?? 5));
    setAiEnabled(!!company.ai_enabled);
    setApiKey("");
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!["openai", "anthropic", "groq"].includes(provider)) throw new Error("Provider inválido");
      if (debounce < 1 || debounce > 60) throw new Error("Debounce deve estar entre 1 e 60");

      const { error } = await supabase
        .from("companies")
        .update({
          agent_name: agentName.trim() || null,
          llm_provider: provider,
          llm_model: model.trim() || null,
          system_prompt: systemPrompt,
          debounce_seconds: debounce,
          ai_enabled: aiEnabled,
        } as any)
        .eq("id", companyId);
      if (error) throw error;

      if (apiKey.trim().length > 0) {
        const { error: rpcErr } = await supabase.rpc("set_company_llm_api_key" as any, {
          p_company_id: companyId,
          p_api_key: apiKey.trim(),
        });
        if (rpcErr) throw rpcErr;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["agent-ai-company", companyId] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar"),
  });

  const testKeyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-llm-connection", {
        body: { mode: "ping" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha ao testar chave");
      return data as { ok: true; latency_ms: number };
    },
    onSuccess: (data) => toast.success(`Chave OK · ${data.latency_ms}ms`),
    onError: (e: Error) => toast.error(e.message),
  });

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInput, setPreviewInput] = useState("Oi, tudo bem?");
  const [previewResp, setPreviewResp] = useState<string>("");
  const [previewLatency, setPreviewLatency] = useState<number | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-llm-connection", {
        body: { mode: "preview", message: previewInput },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na resposta");
      return data as { ok: true; response: string; latency_ms: number };
    },
    onSuccess: (data) => {
      setPreviewResp(data.response || "");
      setPreviewLatency(data.latency_ms);
    },
    onError: (e: Error) => {
      setPreviewResp("");
      setPreviewLatency(null);
      toast.error(e.message);
    },
  });

  if (companyLoading || !isAllowed) return null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agente IA</h1>
            <p className="text-sm text-muted-foreground">
              Configure o modelo, credenciais e comportamento do agente da sua empresa.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações do Agente</CardTitle>
            <CardDescription>
              Estas configurações são utilizadas apenas para testes nesta página. Nenhum fluxo de mensagem em produção é afetado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingCompany ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Nome do agente</Label>
                    <Input
                      id="agent-name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Ex.: Elo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Provedor</Label>
                    <Select
                      value={provider}
                      onValueChange={(v) => {
                        const p = v as Provider;
                        setProvider(p);
                        const defaultModel = MODEL_OPTIONS[p][0].value;
                        setModel(defaultModel);
                        setSelectModel(defaultModel);
                        setCustomModel(defaultModel);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="groq">Groq</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectModel}
                        onValueChange={(v) => {
                          if (v === "___other___") {
                            setSelectModel("___other___");
                            setModel(customModel);
                          } else {
                            setSelectModel(v);
                            setModel(v);
                            setCustomModel(v);
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {getModelOptions(provider, model).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectModel === "___other___" && (
                        <Input
                          value={customModel}
                          onChange={(e) => {
                            setCustomModel(e.target.value);
                            setModel(e.target.value);
                          }}
                          placeholder="modelo personalizado"
                          className="min-w-[160px]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debounce">Debounce (segundos)</Label>
                    <Input
                      id="debounce"
                      type="number"
                      min={1}
                      max={60}
                      value={debounce}
                      onChange={(e) => setDebounce(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">
                    Chave de API {hasKeyConfigured && <span className="text-xs text-muted-foreground">(salva)</span>}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="api-key"
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={hasKeyConfigured ? "••••••••" : "Cole a chave do provider"}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showKey ? "Ocultar" : "Mostrar"}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testKeyMutation.mutate()}
                      disabled={testKeyMutation.isPending || (!hasKeyConfigured && apiKey.trim().length === 0)}
                    >
                      {testKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                      <span className="ml-2">Testar chave</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para manter a chave atual. Nunca exibimos a chave salva.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="font-mono text-sm"
                    style={{ minHeight: 200 }}
                    placeholder="Descreva o comportamento do agente..."
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">IA habilitada</p>
                    <p className="text-sm text-muted-foreground">
                      Kill switch global da empresa. Não altera fluxos em produção nesta fase.
                    </p>
                  </div>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-2">Salvar</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setPreviewResp(""); setPreviewLatency(null); setPreviewOpen(true); }}
                    disabled={!hasKeyConfigured}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="ml-2">Testar agente</span>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Testar agente</DialogTitle>
            <DialogDescription>
              Envia uma mensagem simulada usando o system prompt salvo. Nenhum dado é persistido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="preview-input">Mensagem</Label>
              <Textarea
                id="preview-input"
                value={previewInput}
                onChange={(e) => setPreviewInput(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Resposta {previewLatency !== null && <span className="text-xs text-muted-foreground">· {previewLatency}ms</span>}</Label>
              <div className="min-h-[120px] rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {previewMutation.isPending ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando resposta...
                  </span>
                ) : previewResp ? previewResp : (
                  <span className="text-muted-foreground">Aguardando envio...</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending || previewInput.trim().length === 0}
            >
              {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2">Enviar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AgentAI;
