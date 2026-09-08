import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FinancingSection } from "@/components/propostas/FinancingSection";
import { Landmark } from "lucide-react";

const Financing = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" /> Financiamento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os bancos e os prazos com a taxa de juros mensal de cada um.
        </p>
      </div>
      <FinancingSection />
    </div>
  </DashboardLayout>
);

export default Financing;
