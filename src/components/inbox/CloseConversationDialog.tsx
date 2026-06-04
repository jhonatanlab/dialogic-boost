import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useClosureReasons } from "@/hooks/useClosureReasons";
import { useTags } from "@/hooks/useTags";
import { Loader2, Tag as TagIcon, X } from "lucide-react";
import { Link } from "react-router-dom";

export interface ClosurePayload {
  reasonId: string;
  reasonName: string;
  notes: string;
  tagIds: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: ClosurePayload) => Promise<void> | void;
}

export const CloseConversationDialog = ({ open, onOpenChange, onConfirm }: Props) => {
  const { data: reasons = [], isLoading: loadingReasons } = useClosureReasons(true);
  const { data: tags = [] } = useTags();

  const [reasonId, setReasonId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; notes?: string }>({});

  useEffect(() => {
    if (open) {
      setReasonId("");
      setNotes("");
      setTagIds([]);
      setErrors({});
    }
  }, [open]);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleConfirm = async () => {
    const errs: typeof errors = {};
    if (!reasonId) errs.reason = "Selecione um motivo";
    if (notes.trim().length < 3) errs.notes = "Descreva as observações (mín. 3 caracteres)";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const reason = reasons.find((r) => r.id === reasonId);
    if (!reason) return;
    try {
      setSubmitting(true);
      await onConfirm({
        reasonId: reason.id,
        reasonName: reason.name,
        notes: notes.trim(),
        tagIds,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir conversa</DialogTitle>
          <DialogDescription>
            Informe o motivo da conclusão e observações. As etiquetas são opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo da conclusão *</Label>
            {loadingReasons ? (
              <div className="flex items-center text-xs text-muted-foreground gap-2 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando motivos...
              </div>
            ) : reasons.length === 0 ? (
              <div className="text-xs text-muted-foreground border rounded-md p-3">
                Nenhum motivo cadastrado. Peça ao administrador para criar em{" "}
                <Link to="/settings/closure-reasons" className="text-primary underline">
                  Configurações › Motivos de Conclusão
                </Link>
                .
              </div>
            ) : (
              <Select value={reasonId} onValueChange={setReasonId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.reason && <p className="text-[11px] text-destructive">{errors.reason}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi tratado, próximos passos, etc."
              rows={4}
              className="text-sm resize-none"
            />
            {errors.notes && <p className="text-[11px] text-destructive">{errors.notes}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <TagIcon className="h-3 w-3" /> Etiquetas (opcional)
            </Label>
            {tags.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhuma etiqueta disponível.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t: any) => {
                  const selected = tagIds.includes(t.id);
                  return (
                    <Badge
                      key={t.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-[11px] gap-1"
                      style={selected && t.color ? { backgroundColor: t.color, borderColor: t.color } : undefined}
                      onClick={() => toggleTag(t.id)}
                    >
                      {t.name}
                      {selected && <X className="h-3 w-3" />}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || reasons.length === 0}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Concluir conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
