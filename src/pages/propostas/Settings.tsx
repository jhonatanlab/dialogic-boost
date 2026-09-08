import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogManager } from "@/components/propostas/CatalogManager";
import type { CatalogField } from "@/components/propostas/catalogTypes";
import { FinancingSection } from "@/components/propostas/FinancingSection";
import { FixedValuesSection } from "@/components/propostas/FixedValuesSection";
import { Settings2 } from "lucide-react";

const utilityFields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Equatorial" },
  { key: "state", label: "Estado (UF)", type: "text" },
  { key: "tariff_kwh", label: "Tarifa (R$/kWh)", type: "number", step: "0.0001" },
  { key: "minimum_fee", label: "Taxa mínima (R$)", type: "number", step: "0.01" },
  { key: "price", label: "Preço (R$)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const months = [
  ["irradiance_jan", "Jan"],
  ["irradiance_fev", "Fev"],
  ["irradiance_mar", "Mar"],
  ["irradiance_abr", "Abr"],
  ["irradiance_mai", "Mai"],
  ["irradiance_jun", "Jun"],
  ["irradiance_jul", "Jul"],
  ["irradiance_ago", "Ago"],
  ["irradiance_set", "Set"],
  ["irradiance_out", "Out"],
  ["irradiance_nov", "Nov"],
  ["irradiance_dez", "Dez"],
] as const;

const cityFields: CatalogField[] = [
  { key: "name", label: "Cidade", type: "text" },
  { key: "state", label: "Estado (UF)", type: "text" },
  { key: "latitude", label: "Latitude", type: "number", step: "0.000001" },
  { key: "longitude", label: "Longitude", type: "number", step: "0.000001" },
  ...months.map(([key, label]) => ({
    key,
    label: `Irradiação ${label}`,
    type: "number" as const,
    step: "0.01",
  })),
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const roofFields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Cerâmico" },
  { key: "loss_factor", label: "Fator de perda (%)", type: "number", step: "0.01" },
  { key: "price", label: "Preço (R$)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const orientationFields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Norte" },
  { key: "azimuth", label: "Azimute (°)", type: "number", step: "0.01" },
  { key: "loss_factor", label: "Fator de perda (%)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const connectionFields: CatalogField[] = [
  { key: "name", label: "Nome", type: "text", placeholder: "Ex: Bifásico" },
  { key: "phases", label: "Fases", type: "number" },
  { key: "voltage", label: "Tensão (V)", type: "number", step: "0.01" },
  { key: "minimum_kwh", label: "Consumo mínimo (kWh)", type: "number", step: "0.01" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const ProposalSettings = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" /> Configurações de Propostas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastros de apoio usados no dimensionamento das propostas.
        </p>
      </div>

      <Tabs defaultValue="utilities">
        <TabsList>
          <TabsTrigger value="utilities">Concessionárias</TabsTrigger>
          <TabsTrigger value="cities">Cidades</TabsTrigger>
          <TabsTrigger value="roofs">Telhados</TabsTrigger>
          <TabsTrigger value="orientations">Orientações</TabsTrigger>
          <TabsTrigger value="connections">Tipos de ligação</TabsTrigger>
          <TabsTrigger value="financing">Financiamento</TabsTrigger>
          <TabsTrigger value="fixed">Valores fixos</TabsTrigger>
        </TabsList>

        <TabsContent value="utilities" className="mt-4">
          <CatalogManager
            table="solar_utilities"
            singularLabel="concessionária"
            fields={utilityFields}
            columns={[
              { key: "state", label: "UF" },
              { key: "tariff_kwh", label: "Tarifa (R$/kWh)" },
            ]}
          />
        </TabsContent>

        <TabsContent value="cities" className="mt-4">
          <CatalogManager
            table="solar_cities"
            singularLabel="cidade"
            fields={cityFields}
            showPrice={false}
            columns={[
              { key: "state", label: "UF" },
              {
                key: "irradiance_jan",
                label: "Irradiação média",
                format: (r) => {
                  const vals = months
                    .map(([k]) => r[k])
                    .filter((v) => v !== null && v !== undefined && v !== "")
                    .map(Number);
                  if (!vals.length) return "-";
                  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
                },
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="roofs" className="mt-4">
          <CatalogManager
            table="solar_roof_types"
            singularLabel="tipo de telhado"
            fields={roofFields}
            columns={[{ key: "loss_factor", label: "Perda (%)" }]}
          />
        </TabsContent>

        <TabsContent value="orientations" className="mt-4">
          <CatalogManager
            table="solar_orientations"
            singularLabel="orientação"
            fields={orientationFields}
            showPrice={false}
            columns={[
              { key: "azimuth", label: "Azimute" },
              { key: "loss_factor", label: "Perda (%)" },
            ]}
          />
        </TabsContent>

        <TabsContent value="connections" className="mt-4">
          <CatalogManager
            table="solar_connection_types"
            singularLabel="tipo de ligação"
            fields={connectionFields}
            showPrice={false}
            columns={[
              { key: "phases", label: "Fases" },
              { key: "voltage", label: "Tensão" },
              { key: "minimum_kwh", label: "Mínimo (kWh)" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default ProposalSettings;
