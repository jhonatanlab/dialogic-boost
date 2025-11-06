import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus, X, Check } from "lucide-react";
import { useFidelityPrograms } from "@/hooks/useFidelityPrograms";
import { Badge } from "@/components/ui/badge";

export const FidelityProgramsManager = () => {
  const { programs, isLoading, createProgram, updateProgram, deleteProgram } = useFidelityPrograms();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    goal: 10,
    reward: "",
    congratulations_message: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      goal: 10,
      reward: "",
      congratulations_message: "",
      is_active: true,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateProgram.mutate({ id: editingId, ...formData }, {
        onSuccess: resetForm,
      });
    } else {
      createProgram.mutate(formData, {
        onSuccess: resetForm,
      });
    }
  };

  const handleEdit = (program: any) => {
    setFormData({
      name: program.name,
      goal: program.goal,
      reward: program.reward,
      congratulations_message: program.congratulations_message,
      is_active: program.is_active,
    });
    setEditingId(program.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Programa
        </Button>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar" : "Novo"} Programa de Fidelidade</CardTitle>
            <CardDescription>
              Configure as regras do programa de fidelidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Programa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Programa VIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Meta de Check-ins</Label>
              <Input
                id="goal"
                type="number"
                min="1"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward">Recompensa</Label>
              <Input
                id="reward"
                value={formData.reward}
                onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                placeholder="Ex: Sobremesa grátis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem de Parabéns</Label>
              <Textarea
                id="message"
                value={formData.congratulations_message}
                onChange={(e) => setFormData({ ...formData, congratulations_message: e.target.value })}
                placeholder="Ex: Parabéns! Você completou o cartão fidelidade!"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createProgram.isPending || updateProgram.isPending}>
                <Check className="h-4 w-4 mr-2" />
                {editingId ? "Salvar" : "Criar"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Programas Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Recompensa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum programa cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell>{program.goal} check-ins</TableCell>
                    <TableCell>{program.reward}</TableCell>
                    <TableCell>
                      <Badge variant={program.is_active ? "default" : "secondary"}>
                        {program.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(program)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteProgram.mutate(program.id)}
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
        </CardContent>
      </Card>
    </div>
  );
};
