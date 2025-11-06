import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Trash2, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useCheckinLinks } from "@/hooks/useCheckinLinks";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const CheckinLinksManager = () => {
  const { checkinLinks, isLoading, createCheckinLink, deleteCheckinLink } = useCheckinLinks();
  const [newLinkName, setNewLinkName] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedLink, setSelectedLink] = useState("");

  const handleCreate = () => {
    if (!newLinkName.trim()) {
      toast.error("Digite um nome para o check-in");
      return;
    }

    createCheckinLink.mutate(newLinkName, {
      onSuccess: () => {
        setNewLinkName("");
      },
    });
  };

  const copyToClipboard = (urlToken: string) => {
    const url = `${window.location.origin}/checkin/${urlToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const showQR = (urlToken: string) => {
    const url = `${window.location.origin}/checkin/${urlToken}`;
    setSelectedLink(url);
    setShowQRCode(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Check-ins</CardTitle>
          <CardDescription>
            Crie múltiplos links/QR Codes para diferentes pontos de check-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do check-in (ex: Garçom Gabriel, Mesa 3)"
              value={newLinkName}
              onChange={(e) => setNewLinkName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={createCheckinLink.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Criar
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : checkinLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum check-in criado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  checkinLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        /checkin/{link.url_token.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => showQR(link.url_token)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(link.url_token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteCheckinLink.mutate(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code de Check-in</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <QRCode value={selectedLink} size={256} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Escaneie para fazer check-in
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
