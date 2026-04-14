import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CheckinLinksManager } from "@/components/checkin/CheckinLinksManager";
import { FidelityProgramsManager } from "@/components/checkin/FidelityProgramsManager";
import { CheckinRecordsTable } from "@/components/checkin/CheckinRecordsTable";
import { FidelityCardsManager } from "@/components/checkin/FidelityCardsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/hooks/useCompany";

const CheckIn = () => {
  const navigate = useNavigate();
  const { profile } = useCompany();

  useEffect(() => {
    if (profile && profile.role === "agent") {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-ins & Fidelidade</h1>
          <p className="text-muted-foreground mt-2">
            Sistema completo de check-in com múltiplos links e programa de fidelidade
          </p>
        </div>

        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="manage">Gerenciar Check-ins</TabsTrigger>
            <TabsTrigger value="programs">Programas de Fidelidade</TabsTrigger>
            <TabsTrigger value="cards">Cartões Fidelidade</TabsTrigger>
            <TabsTrigger value="records">Acompanhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            <CheckinLinksManager />
          </TabsContent>

          <TabsContent value="programs" className="space-y-6">
            <FidelityProgramsManager />
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <FidelityCardsManager />
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <CheckinRecordsTable />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
