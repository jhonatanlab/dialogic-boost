import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import {
  useCrmStages,
  useCreateStage,
  useUpdateStage,
  useReorderStages,
  useArchiveStage,
} from "@/hooks/useCrmStages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageManagerDialog({ open, onOpenChange }: Props) {
  const { data: stages = [] } = useCrmStages();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const reorder = useReorderStages();
  const archive = useArchiveStage();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#00D4D4");
  const [edits, setEdits] = useState<Record<string, { name: string; color: string }>>({});

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((s, i) => ({ id: s.id, sort_order: i })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Etapas do funil</DialogTitle>
          <DialogDescription>
            Renomeie, reordene, mude a cor ou arquive as etapas do seu CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {stages.map((stage, index) => {
            const edit = edits[stage.id] ?? { name: stage.name, color: stage.color };
            const changed = edit.name !== stage.name || edit.color !== stage.color;
            return (
              <div key={stage.id} className="flex items-center gap-2 rounded-lg border p-2">
                <input
                  type="color"
                  value={edit.color}
                  onChange={(e) =>
                    setEdits((p) => ({ ...p, [stage.id]: { ...edit, color: e.target.value } }))
                  }
                  className="h-8 w-8 cursor-pointer rounded border bg-transparent"
                  aria-label={`Cor da etapa ${stage.name}`}
                />
                <Input
                  value={edit.name}
                  onChange={(e) =>
                    setEdits((p) => ({ ...p, [stage.id]: { ...edit, name: e.target.value } }))
                  }
                  className="h-8"
                />
                {changed && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() =>
                      updateStage.mutate({ id: stage.id, name: edit.name.trim(), color: edit.color })
                    }
                    aria-label="Salvar etapa"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => move(index, -1)}
                  aria-label="Mover para a esquerda"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => move(index, 1)}
                  aria-label="Mover para a direita"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    if (confirm(`Arquivar a etapa "${stage.name}"?`)) archive.mutate(stage.id);
                  }}
                  aria-label="Arquivar etapa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Nova etapa</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border bg-transparent"
              aria-label="Cor da nova etapa"
            />
            <Input
              placeholder="Ex.: Negociação"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              disabled={!newName.trim()}
              onClick={() => {
                createStage.mutate(
                  { name: newName.trim(), color: newColor, sort_order: stages.length },
                  { onSuccess: () => setNewName("") }
                );
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
