import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BrandingSection } from "@/components/propostas/BrandingSection";
import { Palette } from "lucide-react";

const Branding = () => (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> Personalização
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Identidade visual e textos institucionais usados nas propostas da sua empresa.
        </p>
      </div>
      <BrandingSection />
    </div>
  </DashboardLayout>
);

export default Branding;
