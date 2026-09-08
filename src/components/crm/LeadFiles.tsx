import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Upload, FileText } from "lucide-react";
import {
  useContactFiles,
  useUploadContactFile,
  useDeleteContactFile,
  getContactFileUrl,
} from "@/hooks/useContactFiles";
import { toast } from "sonner";

const formatSize = (bytes?: number | null) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export function LeadFiles({ contactId }: { contactId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading } = useContactFiles(contactId);
  const upload = useUploadContactFile();
  const remove = useDeleteContactFile();

  const openFile = async (path: string) => {
    const url = await getContactFileUrl(path);
    if (!url) {
      toast.error("Não foi possível abrir o arquivo");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate({ contactId, file });
          e.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        <Upload className="mr-2 h-4 w-4" />
        {upload.isPending ? "Enviando..." : "Anexar arquivo"}
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando arquivos...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 p-2.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openFile(f.file_path)}
                aria-label="Abrir arquivo"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Remover "${f.file_name}"?`)) remove.mutate(f);
                }}
                aria-label="Remover arquivo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
