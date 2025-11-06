import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CheckInLinkGenerator } from "@/components/checkin/CheckInLinkGenerator";
import { FidelitySettingsCard } from "@/components/checkin/FidelitySettingsCard";
import { CheckInList } from "@/components/checkin/CheckInList";
import { CustomerFidelityList } from "@/components/checkin/CustomerFidelityList";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CheckIn = () => {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-in & Fidelidade</h1>
          <p className="text-muted-foreground mt-2">
            Sistema completo de Check-in e Programa de Fidelidade Digital
          </p>
        </div>

        <Tabs defaultValue="checkins" className="space-y-6">
          <TabsList>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="fidelity">Programa Fidelidade</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins" className="space-y-6">
            {userId && <CheckInLinkGenerator userId={userId} />}
            <CheckInList />
          </TabsContent>

          <TabsContent value="fidelity" className="space-y-6">
            <CustomerFidelityList />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <FidelitySettingsCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
