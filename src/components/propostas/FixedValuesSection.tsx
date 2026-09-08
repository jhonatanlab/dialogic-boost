import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import {
  useSolarPricingConfig,
  useSaveSolarPricingConfig,
} from "@/hooks/useSolarPricingConfig";

const fields = [
  { key: "margin_percent", label: "Margem (%)", step: "0.01" },
  { key: "price_per_km", label: "Preço por km (R$)", step: "0.01" },
  { key: "base_visit_fee", label: "Taxa base de visita (R$)", step: "0.01" },
  {
    key: "annual_tariff_inflation_percent",
    label: "Inflação anual da tarifa (%)",
    step: "0.01",
  },
  {
    key: "annual_module_degradation_percent",
    label: "Degradação anual do módulo (%)",
    step: "0.01",
  },
] as const;

export function FixedValuesSection() {
  const { profile } = useCompany();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const { data: config, isLoading } = useSolarPricingConfig();
  const saveConfig = useSaveSolarPricingConfig();

  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const base: Record<string, any> = {};
    fields.forEach((f) => {
      base[f.key] = config?.[f.key] ?? "";
    });
    setValues(base);
  }, [config]);

  const handleSave = () => {
    const payload: Record<string, any> = {};
    fields.forEach((f) => {
      payload[f.key] = values[f.key] === "" || values[f.key] === null ? null : Number(values[f.key]);
    });
    if (config?.id) payload.id = config.id;
    saveConfig.mutate(payload);
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="number"
              step={f.step}
              disabled={!canManage}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveConfig.isPending}>
            Salvar alterações
          </Button>
        </div>
      )}
    </Card>
  );
}
