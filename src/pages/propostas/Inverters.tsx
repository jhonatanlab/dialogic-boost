import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CatalogManager } from "@/components/propostas/CatalogManager";
import type { CatalogField } from "@/components/propostas/catalogTypes";
import { Zap } from "lucide-react";

const fields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Growatt MIN 5000TL-X" },
  { key: "brand", label: "Marca", type: "text" },
  { key: "model", label: "Modelo", type: "text" },
  { key: "power_kw", label: "Potência (kW)", type: "number", step: "0.01" },
  { key: "mppt_count", label: "MPPTs", type: "number" },
  { key: "input_count", label: "Entradas", type: "number" },
  { key: "phases", label: "Fases", type: "number" },
  { key: "efficiency", label: "Eficiência (%)", type: "number", step: "0.01" },
  { key: "price", label: "Preço (R$)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const Inverters = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Inversores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os inversores disponíveis para montar os kits.
        </p>
      </div>

      <CatalogManager
        table="solar_inverters"
        singularLabel="inversor"
        fields={fields}
        columns={[
          { key: "brand", label: "Marca" },
          { key: "power_kw", label: "Potência (kW)" },
        ]}
      />
    </div>
  </DashboardLayout>
);

export default Inverters;
