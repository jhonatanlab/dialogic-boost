import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CatalogManager } from "@/components/propostas/CatalogManager";
import type { CatalogField } from "@/components/propostas/catalogTypes";
import { useSolarCatalog } from "@/hooks/useSolarCatalog";
import { Package } from "lucide-react";

const Kits = () => {
  const { data: inverters = [] } = useSolarCatalog("solar_inverters");
  const { data: modules = [] } = useSolarCatalog("solar_modules");

  const fields: CatalogField[] = useMemo(
    () => [
      { key: "name", label: "Nome do kit", type: "text", colSpan: 2 },
      {
        key: "inverter_id",
        label: "Inversor",
        type: "select",
        options: inverters.map((i) => ({ value: i.id, label: i.name })),
      },
      {
        key: "module_id",
        label: "Módulo",
        type: "select",
        options: modules.map((m) => ({ value: m.id, label: m.name })),
      },
      { key: "module_quantity", label: "Quantidade de módulos", type: "number" },
      { key: "kwp_total", label: "kWp total (calculado)", type: "number", readOnly: true },
      { key: "price", label: "Preço (R$)", type: "number", step: "0.01" },
      { key: "is_active", label: "Status", type: "switch" },
      { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
    ],
    [inverters, modules]
  );

  const computeValues = (values: Record<string, any>) => {
    const mod = modules.find((m) => m.id === values.module_id);
    const qty = Number(values.module_quantity ?? 0);
    const wp = Number(mod?.power_wp ?? 0);
    if (!mod || !qty || !wp) return { kwp_total: "" };
    return { kwp_total: Number(((wp * qty) / 1000).toFixed(3)) };
  };

  const modName = (id: string | null) => modules.find((m) => m.id === id)?.name ?? "-";
  const invName = (id: string | null) => inverters.find((i) => i.id === id)?.name ?? "-";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Kits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monte kits com inversor, módulo e quantidade. O kWp total é calculado automaticamente.
          </p>
        </div>

        <CatalogManager
          table="solar_kits"
          singularLabel="kit"
          fields={fields}
          computeValues={computeValues}
          columns={[
            { key: "inverter_id", label: "Inversor", format: (r) => invName(r.inverter_id) },
            { key: "module_id", label: "Módulo", format: (r) => modName(r.module_id) },
            { key: "module_quantity", label: "Qtd." },
            {
              key: "kwp_total",
              label: "kWp",
              format: (r) => (r.kwp_total ? String(r.kwp_total) : "-"),
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
};

export default Kits;
