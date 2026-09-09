import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToProposals } from "@/components/propostas/BackToProposals";
import { CatalogManager } from "@/components/propostas/CatalogManager";
import type { CatalogField } from "@/components/propostas/catalogTypes";
import { PanelTop } from "lucide-react";

const fields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Canadian 550W" },
  { key: "brand", label: "Marca", type: "text" },
  { key: "model", label: "Modelo", type: "text" },
  { key: "power_wp", label: "Potência (Wp)", type: "number", step: "0.01" },
  { key: "technology", label: "Tecnologia", type: "text", placeholder: "Ex: Monocristalino" },
  { key: "width_mm", label: "Largura (mm)", type: "number" },
  { key: "height_mm", label: "Altura (mm)", type: "number" },
  { key: "weight_kg", label: "Peso (kg)", type: "number", step: "0.01" },
  { key: "price", label: "Preço (R$)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const Modules = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <BackToProposals />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PanelTop className="h-6 w-6 text-primary" /> Módulos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os módulos fotovoltaicos usados nos kits.
        </p>
      </div>

      <CatalogManager
        table="solar_modules"
        singularLabel="módulo"
        fields={fields}
        columns={[
          { key: "brand", label: "Marca" },
          { key: "power_wp", label: "Potência (Wp)" },
        ]}
      />
    </div>
  </DashboardLayout>
);

export default Modules;
