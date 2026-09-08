import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FixedValuesSection } from "@/components/propostas/FixedValuesSection";
import { Coins } from "lucide-react";

const FixedValues = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" /> Valores fixos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros usados no cálculo das propostas da sua empresa.
        </p>
      </div>
      <FixedValuesSection />
    </div>
  </DashboardLayout>
);

export default FixedValues;
