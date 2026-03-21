import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTags, useCreateTag, Tag } from "@/hooks/useTags";
import { useDeleteTag } from "@/hooks/useTags";

interface TagsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagsManager({ open, onOpenChange }: TagsManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#FC6625");
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const presetColors = [
    "#FC6625", "#EF4444", "#F59E0B", "#10B981",
    "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
  ];

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTag.mutate({ name: newTagName.trim(), color: newTagColor });
      setNewTagName("");
      setNewTagColor("#FC6625");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Etiquetas</DialogTitle>
          <DialogDescription>
            Crie e gerencie as etiquetas da sua empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new tag */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Nova Etiqueta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: VIP, Lead Quente..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                />
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newTagColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                  <Input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-7 p-0 border-0 cursor-pointer"
                  />
                </div>
              </div>
              <Button onClick={handleCreateTag} size="sm" className="w-full" disabled={!newTagName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Etiqueta
              </Button>
            </CardContent>
          </Card>

          {/* Existing tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etiquetas ({tags.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma etiqueta criada
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      className="text-sm py-1 px-3 gap-1.5 text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir etiqueta "${tag.name}"?`)) {
                            deleteTag.mutate(tag.id);
                          }
                        }}
                        className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
