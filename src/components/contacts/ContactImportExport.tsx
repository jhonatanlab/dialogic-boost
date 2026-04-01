import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Contact } from "@/hooks/useContacts";

interface ContactImportExportProps {
  contacts: Contact[];
}

export function ContactImportExport({ contacts }: ContactImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const exportContacts = () => {
    if (contacts.length === 0) {
      toast.error("Nenhum contato para exportar");
      return;
    }

    const headers = ["Nome", "Telefone", "Email", "Instagram", "Aniversário", "Etiquetas"];
    const rows = contacts.map((c) => [
      c.name,
      c.phone || "",
      c.email || "",
      c.instagram || "",
      c.birthday || "",
      c.tags?.map((t) => t.name).join("; ") || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contatos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${contacts.length} contatos exportados com sucesso!`);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const mapField = (row: Record<string, string>, keys: string[]): string => {
    for (const k of keys) {
      if (row[k]?.trim()) return row[k].trim();
    }
    return "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("Arquivo CSV vazio ou formato inválido");
        return;
      }
      setPreviewData(parsed);
      setIsPreviewOpen(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!previewData || previewData.length === 0) return;
    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const contactsToInsert = previewData
        .map((row) => {
          const name = mapField(row, ["nome", "name", "contato", "contact"]);
          if (!name) return null;
          return {
            user_id: user.id,
            name,
            phone: mapField(row, ["telefone", "phone", "celular", "whatsapp", "número"]) || null,
            email: mapField(row, ["email", "e-mail"]) || null,
            instagram: mapField(row, ["instagram", "ig"]) || null,
            birthday: mapField(row, ["aniversário", "aniversario", "birthday", "nascimento"]) || null,
          };
        })
        .filter(Boolean);

      if (contactsToInsert.length === 0) {
        toast.error("Nenhum contato válido encontrado. Verifique se o CSV tem a coluna 'Nome'.");
        return;
      }

      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("contacts").insert(batch as any[]);
        if (error) throw error;
        imported += batch.length;
      }

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${imported} contatos importados com sucesso!`);
      setIsPreviewOpen(false);
      setPreviewData(null);
    } catch (err: any) {
      toast.error(`Erro ao importar: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Importar / Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Importar Contatos</DialogTitle>
            <DialogDescription>
              {previewData?.length ?? 0} contatos encontrados no arquivo. Confira a prévia abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Telefone</th>
                  <th className="text-left p-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {previewData?.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{mapField(row, ["nome", "name", "contato", "contact"]) || <span className="text-destructive">—</span>}</td>
                    <td className="p-2">{mapField(row, ["telefone", "phone", "celular", "whatsapp", "número"]) || "—"}</td>
                    <td className="p-2">{mapField(row, ["email", "e-mail"]) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(previewData?.length ?? 0) > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                ... e mais {(previewData?.length ?? 0) - 20} contatos
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmImport} disabled={isImporting}>
              {isImporting ? "Importando..." : `Importar ${previewData?.length ?? 0} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
