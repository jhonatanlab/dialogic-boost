import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CheckInLinkGeneratorProps {
  userId: string;
}

export const CheckInLinkGenerator = ({ userId }: CheckInLinkGeneratorProps) => {
  const [showQRCode, setShowQRCode] = useState(false);
  const checkinLink = `${window.location.origin}/checkin/${userId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(checkinLink);
    toast.success("Link copiado!");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link de Check-in
          </CardTitle>
          <CardDescription>
            Compartilhe este link ou QR Code com seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={checkinLink} readOnly />
            <Button onClick={copyToClipboard} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowQRCode(true)} className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            Gerar QR Code
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code de Check-in</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <QRCode value={checkinLink} size={256} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Seus clientes podem escanear este código para fazer check-in
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
