import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Gift } from "lucide-react";
import { useFidelitySettings } from "@/hooks/useFidelitySettings";

export const FidelitySettingsCard = () => {
  const { settings, upsertSettings } = useFidelitySettings();
  const [campaignName, setCampaignName] = useState("");
  const [checkinsGoal, setCheckinsGoal] = useState(10);
  const [rewardDescription, setRewardDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (settings) {
      setCampaignName(settings.campaign_name);
      setCheckinsGoal(settings.checkins_goal);
      setRewardDescription(settings.reward_description);
      setIsActive(settings.is_active);
    }
  }, [settings]);

  const handleSave = () => {
    upsertSettings.mutate({
      campaign_name: campaignName,
      checkins_goal: checkinsGoal,
      reward_description: rewardDescription,
      is_active: isActive,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Configuração do Programa Fidelidade
        </CardTitle>
        <CardDescription>
          Configure as regras do seu programa de fidelidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Nome da Campanha</Label>
          <Input
            id="campaign-name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Ex: Programa VIP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkins-goal">Meta de Check-ins</Label>
          <Input
            id="checkins-goal"
            type="number"
            min="1"
            value={checkinsGoal}
            onChange={(e) => setCheckinsGoal(parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reward">Descrição da Recompensa</Label>
          <Textarea
            id="reward"
            value={rewardDescription}
            onChange={(e) => setRewardDescription(e.target.value)}
            placeholder="Ex: Sobremesa grátis, 10% de desconto..."
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="active">Programa Ativo</Label>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={upsertSettings.isPending}>
          {upsertSettings.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};
