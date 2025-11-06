import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCustomerFidelity } from "@/hooks/useCustomerFidelity";
import { useFidelitySettings } from "@/hooks/useFidelitySettings";

const PublicCheckIn = () => {
  const { userId, phone } = useParams();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState(phone || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInComplete, setCheckInComplete] = useState(false);
  const { updateCustomerFidelity, awardReward } = useCustomerFidelity();
  const { settings } = useFidelitySettings();

  const handleCheckIn = async () => {
    if (!customerPhone) {
      toast.error("Por favor, informe seu telefone");
      return;
    }

    setIsProcessing(true);

    try {
      // Create check-in record
      const { error: checkinError } = await supabase.from("checkins").insert({
        user_id: userId,
        customer_phone: customerPhone,
        customer_name: customerName || null,
        source: phone ? "qr_code" : "link",
      });

      if (checkinError) throw checkinError;

      // Update customer fidelity
      await updateCustomerFidelity.mutateAsync({
        phone: customerPhone,
        name: customerName || undefined,
        incrementCheckins: true,
      });

      // Check if customer earned a reward
      const { data: customerData } = await supabase
        .from("customer_fidelity")
        .select("*")
        .eq("user_id", userId)
        .eq("customer_phone", customerPhone)
        .maybeSingle();

      if (customerData && settings && customerData.total_checkins >= settings.checkins_goal) {
        // Award reward
        await awardReward.mutateAsync(customerPhone);
        
        // Send WhatsApp message about reward
        const rewardMessage = `Parabéns! 🎉 Você completou seu cartão fidelidade e ganhou: ${settings.reward_description}!\n\nApresente essa mensagem no caixa para receber. 👏`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(rewardMessage)}`;
        window.location.href = whatsappUrl;
      } else {
        // Regular check-in confirmation
        setCheckInComplete(true);
        
        // Redirect to WhatsApp after 2 seconds
        setTimeout(() => {
          const message = "Olá! Confirmei presença ✅";
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.location.href = whatsappUrl;
        }, 2000);
      }

      toast.success("Check-in realizado com sucesso!");
    } catch (error) {
      console.error("Error during check-in:", error);
      toast.error("Erro ao realizar check-in. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (checkInComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Check-in Confirmado! ✅</h2>
            <p className="text-muted-foreground">
              Redirecionando para o WhatsApp...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Confirmar Check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Seu nome"
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              disabled={isProcessing || !!phone}
            />
          </div>

          <Button
            onClick={handleCheckIn}
            className="w-full"
            disabled={isProcessing || !customerPhone}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Check-in"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicCheckIn;
