import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCheckinRecords } from "@/hooks/useCheckinRecords";
import { useContacts } from "@/hooks/useContacts";
import { useFidelityCards } from "@/hooks/useFidelityCards";
import { useFidelityPrograms } from "@/hooks/useFidelityPrograms";
import { toast } from "sonner";
import { Smartphone, User, Hash } from "lucide-react";

const ProcessCheckin = () => {
  const [token, setToken] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { identifyCheckin } = useCheckinRecords();
  const contactsQuery = useContacts();
  const { updateCardStamps } = useFidelityCards();
  const { programs } = useFidelityPrograms();

  const contacts = contactsQuery.data || [];

  const handleProcess = async () => {
    if (!token || !whatsappNumber) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsProcessing(true);

    try {
      // Find or create contact
      let contact = contacts.find(
        c => c.phone === whatsappNumber
      );

      if (!contact) {
        toast.error("Contato não encontrado. Crie o contato primeiro.");
        setIsProcessing(false);
        return;
      }

      // Identify checkin
      const checkin = await identifyCheckin.mutateAsync({
        token: token.toUpperCase(),
        whatsappNumber,
        contactId: contact.id,
      });

      toast.success("Check-in identificado!");

      // Update fidelity card if there's an active program
      const activeProgram = programs.find(p => p.is_active);
      if (activeProgram && contact) {
        await updateCardStamps.mutateAsync({
          contactId: contact.id,
          programId: activeProgram.id,
          checkinId: checkin.id,
        });
      }

      // Reset form
      setToken("");
      setWhatsappNumber("");
    } catch (error: any) {
      console.error("Erro ao processar check-in:", error);
      toast.error(error.message || "Erro ao processar check-in");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Processar Check-in</h1>
          <p className="text-muted-foreground mt-2">
            Identifique clientes através de tokens do WhatsApp
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Identificar Cliente</CardTitle>
            <CardDescription>
              Associe um check-in ao cliente através do token e número de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Token do Check-in
              </Label>
              <Input
                id="token"
                placeholder="CHK_XXXXXXXX"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                O token enviado pelo cliente via WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Número do WhatsApp
              </Label>
              <Input
                id="whatsapp"
                placeholder="+55 11 99999-9999"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O número de WhatsApp do cliente
              </p>
            </div>

            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              <User className="h-4 w-4 mr-2" />
              {isProcessing ? "Processando..." : "Identificar Cliente"}
            </Button>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
              <p>Cliente escaneia QR Code e é direcionado ao WhatsApp com mensagem contendo o token</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
              <p>Cliente envia a mensagem no WhatsApp</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </div>
              <p>Você copia o token e número do cliente e processa aqui</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                4
              </div>
              <p>Sistema identifica o cliente, registra no CRM e atualiza o cartão fidelidade automaticamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProcessCheckin;
